import * as mssql from 'mssql';
import { config } from '../config/config';
import { closePool, query } from '../config/database';

type Counts = Record<string, number>;

async function run() {
  try {
    const database = await query<{ name: string }>('SELECT DB_NAME() name');
    const result = await query<Counts>(`SELECT
      (SELECT COUNT(*) FROM dbo.Shops s LEFT JOIN dbo.Users u ON u.id=s.owner_user_id WHERE s.is_system=0 AND u.id IS NULL) shop_orphan_owner,
      (SELECT COUNT(*) FROM dbo.Shops WHERE status NOT IN(N'ACTIVE',N'SUSPENDED')) invalid_shop_status,
      (SELECT COUNT(*) FROM (SELECT owner_user_id FROM dbo.Shops WHERE owner_user_id IS NOT NULL GROUP BY owner_user_id HAVING COUNT(*)>1) d) duplicate_shop_owner,
      (SELECT COUNT(*) FROM (SELECT slug FROM dbo.Shops GROUP BY slug HAVING COUNT(*)>1) d) duplicate_shop_slug,
      (SELECT COUNT(*) FROM dbo.Shops WHERE NULLIF(LTRIM(RTRIM(slug)),N'') IS NULL) empty_shop_slug,
      (SELECT COUNT(*) FROM dbo.Users u WHERE u.role=N'seller' AND NOT EXISTS(SELECT 1 FROM dbo.Shops s WHERE s.owner_user_id=u.id)) seller_without_shop,
      (SELECT COUNT(*) FROM dbo.Products p LEFT JOIN dbo.Shops s ON s.id=p.shop_id WHERE s.id IS NULL) product_orphan_shop,
      (SELECT COUNT(*) FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id WHERE p.moderation_status=N'PUBLISHED' AND s.status<>N'ACTIVE') published_product_nonactive_shop,
      (SELECT COUNT(*) FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id WHERE p.is_active=1 AND s.status=N'ACTIVE' AND p.moderation_status<>N'PUBLISHED') active_nonpublished_product,
      (SELECT COUNT(*) FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id WHERE p.is_active=0 AND p.moderation_status=N'PUBLISHED' AND s.status=N'ACTIVE') inactive_published_product,
      (SELECT COUNT(*) FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id WHERE p.is_active=1 AND p.moderation_status=N'PUBLISHED' AND s.status=N'ACTIVE'
        AND NOT EXISTS(SELECT 1 FROM dbo.ProductVariants v WHERE v.product_id=p.id AND v.is_active=1)) public_candidate_without_active_variant,
      (SELECT COUNT(*) FROM dbo.ProductImages pi LEFT JOIN dbo.Products p ON p.id=pi.product_id WHERE p.id IS NULL) orphan_product_image,
      (SELECT COUNT(*) FROM (SELECT product_id FROM dbo.ProductImages WHERE is_primary=1 GROUP BY product_id HAVING COUNT(*)>1) d) multiple_primary_images,
      (SELECT COUNT(*) FROM dbo.Products p WHERE p.id=0 AND NOT EXISTS(SELECT 1 FROM dbo.Shops s WHERE s.id=p.shop_id AND s.system_key=N'GYMFIT_OFFICIAL' AND s.is_system=1 AND s.status=N'ACTIVE')) product_zero_official_mismatch,
      (SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) disabled_or_untrusted_fk,
      (SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) disabled_or_untrusted_check,
      (SELECT COUNT(*) FROM dbo.Products WHERE sku LIKE N'SELLER007-VERIFY-%' OR sku LIKE N'SELLER007-%') seller007_fixture_products,
      (SELECT COUNT(*) FROM dbo.Users WHERE email LIKE N'seller007-verification-%@example.test' OR email LIKE N'seller007-%@example.test') seller007_fixture_users`);
    const master = await new mssql.ConnectionPool({ ...config.db, database: 'master' }).connect();
    try {
      const leftovers = await master.request().query<{ name: string }>(`SELECT name FROM sys.databases WHERE name LIKE N'GYMFIT[_]REGRESSION[_]%' OR name LIKE N'GYMFIT[_]DB[_]SELLER007[_]ACCEPTANCE[_]%'`);
      console.log(`SELLER007_INTEGRITY ${JSON.stringify({
        database: database.recordset[0].name,
        ...result.recordset[0],
        regression_database_leftovers: leftovers.recordset.length,
        regression_databases: leftovers.recordset.map(row => row.name),
      })}`);
    } finally { await master.close(); }
  } finally { await closePool(); }
}

run().catch(error => {
  console.error('[SELLER-007 INTEGRITY FAIL]', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
