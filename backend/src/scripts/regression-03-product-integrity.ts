import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config/config';
import { closePool, query } from '../config/database';

if (process.env.REGRESSION03_CANONICAL_READONLY !== '1' || config.db.database !== 'GYMFIT_DB') {
  throw new Error('Read-only canonical gate failed');
}

const checks: Array<[string, number, string, string]> = [];
const add = (name: string, count: unknown, severity = 'HIGH') => {
  const value = Number(count);
  checks.push([name, value, value === 0 ? 'NONE' : severity, value === 0 ? 'PASS' : 'FINDING']);
};

async function main() {
  const row = (await query<any>(`
    SELECT
      (SELECT COUNT(*) FROM dbo.Products) products,
      (SELECT COUNT(*) FROM dbo.Products p LEFT JOIN dbo.Categories c ON c.id=p.category_id WHERE c.id IS NULL) orphan_category,
      (SELECT COUNT(*) FROM dbo.Products p LEFT JOIN dbo.Brands b ON b.id=p.brand_id WHERE p.brand_id IS NOT NULL AND b.id IS NULL) orphan_brand,
      (SELECT COUNT(*) FROM dbo.Products p LEFT JOIN dbo.Shops s ON s.id=p.shop_id WHERE s.id IS NULL) orphan_shop,
      (SELECT COUNT(*) FROM dbo.Products WHERE moderation_status NOT IN(N'DRAFT',N'PENDING_REVIEW',N'PUBLISHED',N'REJECTED',N'SUSPENDED')) invalid_status,
      (SELECT COUNT(*) FROM dbo.Products WHERE price IS NULL OR price<0 OR stock<0) invalid_price_stock,
      (SELECT COUNT(*) FROM (SELECT sku FROM dbo.Products GROUP BY sku HAVING COUNT(*)>1) d) duplicate_product_sku,
      (SELECT COUNT(*) FROM (SELECT slug FROM dbo.Products GROUP BY slug HAVING COUNT(*)>1) d) duplicate_slug,
      (SELECT COUNT(*) FROM dbo.Products WHERE id=0) product_zero,
      (SELECT COUNT(*) FROM dbo.ProductImages) images,
      (SELECT COUNT(*) FROM dbo.ProductImages i LEFT JOIN dbo.Products p ON p.id=i.product_id WHERE p.id IS NULL) orphan_images,
      (SELECT COUNT(*) FROM dbo.ProductImages WHERE NULLIF(LTRIM(RTRIM(image_url)),N'') IS NULL) empty_image_url,
      (SELECT COUNT(*) FROM (SELECT product_id FROM dbo.ProductImages WHERE is_primary=1 GROUP BY product_id HAVING COUNT(*)>1) d) multiple_primary,
      (SELECT COUNT(*) FROM (SELECT product_id FROM dbo.ProductImages GROUP BY product_id HAVING SUM(CASE WHEN is_primary=1 THEN 1 ELSE 0 END)=0) d) missing_primary,
      (SELECT COUNT(*) FROM (SELECT product_id,sort_order FROM dbo.ProductImages GROUP BY product_id,sort_order HAVING COUNT(*)>1) d) duplicate_sort,
      (SELECT COUNT(*) FROM dbo.ProductImages WHERE LOWER(image_url) NOT LIKE N'%.jpg' AND LOWER(image_url) NOT LIKE N'%.jpeg' AND LOWER(image_url) NOT LIKE N'%.png' AND LOWER(image_url) NOT LIKE N'%.webp' AND image_url NOT LIKE N'http%') invalid_extension,
      (SELECT COUNT(*) FROM dbo.Products p JOIN dbo.Categories c ON c.id=p.category_id WHERE p.is_active=1 AND p.moderation_status=N'PUBLISHED' AND c.is_active=0) public_inactive_category,
      (SELECT COUNT(*) FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id WHERE p.is_active=1 AND p.moderation_status=N'PUBLISHED' AND s.status<>N'ACTIVE') published_inactive_shop,
      (SELECT COUNT(*) FROM dbo.Brands WHERE normalized_name IS NULL OR normalized_name<>LOWER(LTRIM(RTRIM(name)))) invalid_brand_normalized,
      (SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) untrusted_foreign_keys,
      (SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) untrusted_checks,
      (SELECT COUNT(*) FROM dbo.Products WHERE product_name LIKE N'REGRESSION-03%' OR sku LIKE N'REGRESSION03-%') regression_fixtures
  `)).recordset[0];
  console.log(`R03_CANONICAL_COUNTS products=${row.products} images=${row.images} product0=${row.product_zero}`);
  add('Product orphan Category', row.orphan_category);
  add('Product orphan Brand', row.orphan_brand);
  add('Product orphan Shop', row.orphan_shop);
  add('Invalid moderation status', row.invalid_status);
  add('Invalid price/stock', row.invalid_price_stock);
  add('Duplicate Product SKU', row.duplicate_product_sku);
  add('Duplicate Product slug', row.duplicate_slug);
  add('Product ID 0 missing/duplicate', Number(row.product_zero) === 1 ? 0 : 1);
  add('Orphan ProductImage', row.orphan_images);
  add('Empty image URL', row.empty_image_url);
  add('Multiple primary images', row.multiple_primary);
  add('Products with images but no primary', row.missing_primary, 'MEDIUM');
  add('Duplicate image sort order', row.duplicate_sort, 'MEDIUM');
  add('Invalid image extension metadata', row.invalid_extension, 'LOW');
  add('Published Product with inactive Category', row.public_inactive_category, 'MEDIUM');
  add('Published Product under inactive Shop', row.published_inactive_shop, 'INFO');
  add('Invalid Brand normalized_name', row.invalid_brand_normalized, 'MEDIUM');
  add('Disabled/untrusted foreign keys', row.untrusted_foreign_keys);
  add('Disabled/untrusted checks', row.untrusted_checks);
  add('REGRESSION-03 canonical fixtures', row.regression_fixtures);
  const leftoverDatabases=Number((await query<any>("SELECT COUNT(*) count FROM sys.databases WHERE name LIKE N'GYMFIT_REGRESSION[_]%'")).recordset[0].count);
  add('Leftover GYMFIT_REGRESSION databases', leftoverDatabases);

  const uploadRoot = path.resolve(config.upload.dir);
  const urls = (await query<{image_url:string}>("SELECT image_url FROM dbo.ProductImages WHERE image_url LIKE N'/uploads/%'")).recordset;
  let missing = 0;
  for (const { image_url: url } of urls) {
    const target = path.resolve(uploadRoot, url.slice('/uploads/'.length).replace(/\//g, path.sep));
    if (target !== uploadRoot && !target.startsWith(uploadRoot + path.sep)) { missing++; continue; }
    try { await fs.stat(target); } catch { missing++; }
  }
  add('Local upload URLs with missing file', missing, 'MEDIUM');
  for (const item of checks) console.log(`R03_INTEGRITY ${item.join('|')}`);
  console.log(`R03_CANONICAL_READONLY PASS database=${config.db.database} uploadRoot=${uploadRoot} checks=${checks.length}`);
}

main().catch(error => {
  console.error('R03_CANONICAL_READONLY FAIL', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(closePool);
