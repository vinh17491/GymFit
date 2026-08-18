import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { ConnectionPool, Transaction } from 'mssql';
import { closePool, getPool, sql } from '../config/database';

const MIGRATION_PATTERN = /^(\d{4})_(.+)\.sql$/;
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../db/migrations');
const REQUIRED_TABLES = ['Products', 'ProductVariants', 'ProductImages', 'Inventory', 'Brands', 'Categories'];
const BOOTSTRAP_COMMAND = 'npm run db:bootstrap';
const MIGRATION_TABLE_OWNERS: Record<string, string> = {
  ProductOptions: '0001',
  ProductOptionValues: '0001',
  VariantOptionValues: '0001',
  InventoryAdjustments: '0002',
  Orders: '0003',
  OrderItems: '0003',
  OrderStatusHistory: '0003',
  PaymentStatusHistory: '0004',
  AuthSessions: '0006',
  WorkoutPrograms: '0007',
  WorkoutProgramDays: '0007',
  WorkoutProgramExercises: '0007',
  CoachProgramAssignments: '0007',
  CoachProgramSchedules: '0007',
  MemberWorkoutSessions: '0008',
  MemberWorkoutSessionExercises: '0008',
  MemberWorkoutSetLogs: '0008',
  CoachProfiles: '0010',
  CoachAvailabilityRules: '0011',
  CoachAvailabilityExceptions: '0011',
  PlanEntitlements: '0012',
  CoachMemberContexts: '0013',
  SellerApplications: '0100',
  SellerApplicationStatusHistory: '0100',
  Shops: '0101',
  BrandRequests: '0102',
  BrandRequestStatusHistory: '0102',
  ProductModerationHistory: '0104',
  ShopOrders: '0105',
  ShopOrderStatusHistory: '0105',
  Carts: '0106',
  CartItems: '0106',
  Refunds: '0107',
  RefundStatusHistory: '0107',
  CompensationVouchers: '0107',
  MarketplaceSettings: '0107',
  MarketplaceNotifications: '0107',
  OrderLogisticsStatusHistory: '0108',
  ShopOrderSettlements: '0109',
  SettlementStatusHistory: '0109',
  SettlementAdjustments: '0109',
  SettlementAdjustmentHistory: '0109',
  SettlementBatches: '0109',
  SettlementBatchItems: '0109',
  MarketplaceComplaints: '0110',
  ComplaintEventHistory: '0110',
  ComplaintReplacements: '0110',
  ReplacementStatusHistory: '0110',
  ProductReviews: '0111',
  ShopReviews: '0111',
  ReviewModerationHistory: '0111',
  ReferralCodes: '0112',
  ReferralTransactions: '0112',
  Coupons: '0113',
  CouponUsages: '0113',
  Points: '0114',
  PointTransactions: '0114',
  RewardsCatalog: '0114',
  RewardRedemptions: '0114',
};

interface MigrationFile {
  version: string;
  name: string;
  filename: string;
  checksum: string;
  sqlText: string;
}

interface AppliedMigration {
  version: string;
  name: string;
  checksum: string;
  applied_at: Date;
}

interface ProductRow { id: number; stock: number | null }
interface VariantRow { id: number; product_id: number; stock: number | null }
interface InventoryRow {
  id: number;
  product_id: number | null;
  variant_id: number | null;
  quantity: number | null;
  reserved: number | null;
}

interface PreflightProfile {
  products_count: number;
  active_products_count: number;
  variants_count: number;
  product_images_count: number;
  inventory_count: number;
  no_variant_products: number;
  one_variant_products: number;
  multi_variant_products: number;
  null_variant_inventory: number;
  duplicate_inventory_variant_groups: number;
  null_variant_sku: number;
  duplicate_variant_sku_groups: number;
  null_variant_price: number;
  flavor_products: number;
  color_products: number;
  size_products: number;
  main_image_products: number;
  gallery_image_products: number;
  products_stock_sum: number;
  invalid_gallery_products: number;
  invalid_gallery_product_ids: number[];
}

interface StockClassification {
  no_variant_products: number;
  single_variant_products: number;
  multi_variant_products: number;
  ambiguous_products: number;
  ambiguous_product_ids: number[];
  source_counts: Record<string, number>;
}

function numberValue(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

async function tableExists(pool: ConnectionPool, tableName: string): Promise<boolean> {
  const result = await pool.request().input('name', sql.NVarChar, tableName)
    .query('SELECT CASE WHEN OBJECT_ID(N\'dbo.\' + @name, N\'U\') IS NULL THEN 0 ELSE 1 END AS present');
  return Boolean(result.recordset[0]?.present);
}

async function columnExists(pool: ConnectionPool, tableName: string, columnName: string): Promise<boolean> {
  const result = await pool.request()
    .input('tableName', sql.NVarChar, tableName)
    .input('columnName', sql.NVarChar, columnName)
    .query(`SELECT CASE WHEN COL_LENGTH(N'dbo.' + @tableName, @columnName) IS NULL THEN 0 ELSE 1 END AS present`);
  return Boolean(result.recordset[0]?.present);
}

async function discoverMigrations(): Promise<MigrationFile[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const sqlFiles = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.sql'));
  const migrations: MigrationFile[] = [];
  const versions = new Set<string>();

  for (const entry of sqlFiles) {
    const match = MIGRATION_PATTERN.exec(entry.name);
    if (!match) throw new Error(`Invalid migration filename: ${entry.name}`);
    if (versions.has(match[1])) throw new Error(`Duplicate migration version: ${match[1]}`);
    versions.add(match[1]);
    const filePath = path.join(MIGRATIONS_DIR, entry.name);
    const content = await fs.readFile(filePath);
    migrations.push({
      version: match[1],
      name: match[2],
      filename: entry.name,
      checksum: createHash('sha256').update(content).digest('hex'),
      sqlText: content.toString('utf8'),
    });
  }
  return migrations.sort((a, b) => a.filename.localeCompare(b.filename));
}

async function trackingTableExists(pool: ConnectionPool): Promise<boolean> {
  return tableExists(pool, 'SchemaMigrations');
}

async function readApplied(pool: ConnectionPool, trackingPresent: boolean): Promise<AppliedMigration[]> {
  if (!trackingPresent) return [];
  const result = await pool.request().query<AppliedMigration>(
    'SELECT version, name, checksum, applied_at FROM dbo.SchemaMigrations ORDER BY version',
  );
  return result.recordset;
}

async function validateTrackingTableShape(pool: ConnectionPool): Promise<void> {
  const result = await pool.request().query(`
    SELECT c.name,
      LOWER(TYPE_NAME(c.user_type_id)) AS data_type,
      c.max_length,
      c.is_nullable,
      CASE WHEN EXISTS (
        SELECT 1
        FROM sys.index_columns ic
        JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        WHERE ic.object_id = c.object_id AND ic.column_id = c.column_id AND i.is_primary_key = 1
      ) THEN 1 ELSE 0 END AS is_primary_key
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.SchemaMigrations', N'U')
    ORDER BY c.column_id`);

  const expected: Record<string, { dataType: string; maxLength: number; nullable: number; primaryKey: number }> = {
    version: { dataType: 'nvarchar', maxLength: 40, nullable: 0, primaryKey: 1 },
    name: { dataType: 'nvarchar', maxLength: 510, nullable: 0, primaryKey: 0 },
    checksum: { dataType: 'char', maxLength: 64, nullable: 0, primaryKey: 0 },
    applied_at: { dataType: 'datetime2', maxLength: 8, nullable: 0, primaryKey: 0 },
  };
  const rows = result.recordset as Array<{ name: string; data_type: string; max_length: number; is_nullable: number; is_primary_key: number }>;
  const valid = rows.length === Object.keys(expected).length
    && rows.every((row) => {
      const requirement = expected[row.name];
      return requirement !== undefined
        && row.data_type === requirement.dataType
        && row.max_length === requirement.maxLength
        && Number(row.is_nullable) === requirement.nullable
        && Number(row.is_primary_key) === requirement.primaryKey;
    });
  if (!valid) throw new Error(`SCHEMA_MISMATCH: dbo.SchemaMigrations metadata does not match the canonical ledger contract: ${JSON.stringify(rows)}`);
}

function validateAppliedLedger(applied: AppliedMigration[], discovered: MigrationFile[]): void {
  const discoveredByVersion = new Map(discovered.map((migration) => [migration.version, migration]));
  for (const entry of applied) {
    const migration = discoveredByVersion.get(entry.version);
    if (!migration) throw new Error(`MIGRATION_LEDGER_UNKNOWN_VERSION: ${entry.version}`);
    if (entry.name !== migration.filename) {
      throw new Error(`SCHEMA_MISMATCH: SchemaMigrations ${entry.version}.name=${entry.name} expected ${migration.filename}`);
    }
  }
}

async function validateMigrationTableLedger(pool: ConnectionPool, appliedByVersion: Map<string, AppliedMigration>): Promise<void> {
  const names = Object.keys(MIGRATION_TABLE_OWNERS);
  const request = pool.request();
  const placeholders = names.map((name, index) => {
    request.input(`table${index}`, sql.NVarChar(128), name);
    return `@table${index}`;
  }).join(', ');
  const result = await request.query<{ name: string }>(`
    SELECT t.name
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE s.name = N'dbo' AND t.name IN (${placeholders})
    ORDER BY t.name`);
  for (const row of result.recordset) {
    const owner = MIGRATION_TABLE_OWNERS[row.name];
    if (owner && !appliedByVersion.has(owner)) {
      throw new Error(`SCHEMA_ADOPTION_REQUIRED: dbo.${row.name} exists but migration ${owner} is not recorded in dbo.SchemaMigrations`);
    }
  }
}

async function validateRequiredTables(pool: ConnectionPool): Promise<void> {
  const missing: string[] = [];
  for (const table of REQUIRED_TABLES) if (!(await tableExists(pool, table))) missing.push(table);
  console.log(`Required foundation tables: ${missing.length === 0 ? 'PRESENT' : 'MISSING'}`);
  if (missing.length > 0) {
    throw new Error(`BOOTSTRAP_REQUIRED: canonical foundation is missing (${missing.join(', ')}). Run ${BOOTSTRAP_COMMAND} against the explicitly verified target database, then rerun migration status.`);
  }
}

async function collectProfile(pool: ConnectionPool): Promise<PreflightProfile> {
  const hasVariantStock = await columnExists(pool, 'ProductVariants', 'stock');
  const hasInventoryQuantity = await columnExists(pool, 'Inventory', 'quantity');
  const hasInventoryProduct = await columnExists(pool, 'Inventory', 'product_id');
  const variantStockSelect = hasVariantStock ? 'stock' : 'CAST(NULL AS INT) AS stock';
  const inventoryQuantitySelect = hasInventoryQuantity ? 'quantity' : 'CAST(NULL AS INT) AS quantity';
  const inventoryProductSelect = hasInventoryProduct ? 'product_id' : 'CAST(NULL AS INT) AS product_id';

  const productResult = await pool.request().query(`
    SELECT COUNT(*) products_count,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) active_products_count,
      SUM(CAST(ISNULL(stock, 0) AS BIGINT)) products_stock_sum,
      SUM(CASE WHEN NULLIF(LTRIM(RTRIM(flavor)), '') IS NOT NULL THEN 1 ELSE 0 END) flavor_products,
      SUM(CASE WHEN NULLIF(LTRIM(RTRIM(color)), '') IS NOT NULL THEN 1 ELSE 0 END) color_products,
      SUM(CASE WHEN NULLIF(LTRIM(RTRIM(size)), '') IS NOT NULL THEN 1 ELSE 0 END) size_products,
      SUM(CASE WHEN NULLIF(LTRIM(RTRIM(main_image)), '') IS NOT NULL THEN 1 ELSE 0 END) main_image_products,
      SUM(CASE WHEN NULLIF(LTRIM(RTRIM(gallery_images)), '') IS NOT NULL THEN 1 ELSE 0 END) gallery_image_products
    FROM dbo.Products`);
  const variantResult = await pool.request().query(`
    SELECT COUNT(*) variants_count,
      SUM(CASE WHEN sku IS NULL OR LTRIM(RTRIM(sku)) = '' THEN 1 ELSE 0 END) null_variant_sku,
      SUM(CASE WHEN price IS NULL THEN 1 ELSE 0 END) null_variant_price
    FROM dbo.ProductVariants`);
  const duplicateSkuResult = await pool.request().query(`
    SELECT COUNT(*) duplicate_variant_sku_groups FROM (
      SELECT LTRIM(RTRIM(sku)) normalized_sku FROM dbo.ProductVariants
      WHERE NULLIF(LTRIM(RTRIM(sku)), '') IS NOT NULL
      GROUP BY LTRIM(RTRIM(sku)) HAVING COUNT(*) > 1
    ) duplicates`);
  const imageResult = await pool.request().query('SELECT COUNT(*) product_images_count FROM dbo.ProductImages');
  const inventoryResult = await pool.request().query(`
    SELECT COUNT(*) inventory_count,
      SUM(CASE WHEN variant_id IS NULL THEN 1 ELSE 0 END) null_variant_inventory
    FROM dbo.Inventory`);
  const duplicateInventoryResult = await pool.request().query(`
    SELECT COUNT(*) duplicate_inventory_variant_groups FROM (
      SELECT variant_id FROM dbo.Inventory WHERE variant_id IS NOT NULL
      GROUP BY variant_id HAVING COUNT(*) > 1
    ) duplicates`);
  const shapeResult = await pool.request().query(`
    SELECT SUM(CASE WHEN variant_count = 0 THEN 1 ELSE 0 END) no_variant_products,
      SUM(CASE WHEN variant_count = 1 THEN 1 ELSE 0 END) one_variant_products,
      SUM(CASE WHEN variant_count > 1 THEN 1 ELSE 0 END) multi_variant_products
    FROM (
      SELECT p.id, COUNT(v.id) variant_count FROM dbo.Products p
      LEFT JOIN dbo.ProductVariants v ON v.product_id = p.id GROUP BY p.id
    ) shapes`);
  const invalidGalleryResult = await pool.request().query(`
    SELECT id FROM dbo.Products
    WHERE NULLIF(LTRIM(RTRIM(gallery_images)), '') IS NOT NULL AND ISJSON(gallery_images) <> 1
    ORDER BY id`);

  const products = await pool.request().query<ProductRow>('SELECT id, stock FROM dbo.Products ORDER BY id');
  const variants = await pool.request().query<VariantRow>(`SELECT id, product_id, ${variantStockSelect} FROM dbo.ProductVariants ORDER BY product_id, id`);
  const inventory = await pool.request().query<InventoryRow>(
    `SELECT id, ${inventoryProductSelect}, variant_id, ${inventoryQuantitySelect}, reserved FROM dbo.Inventory ORDER BY id`,
  );
  const p = productResult.recordset[0] ?? {};
  const v = variantResult.recordset[0] ?? {};
  const i = inventoryResult.recordset[0] ?? {};
  const s = shapeResult.recordset[0] ?? {};
  const classification = hasVariantStock && hasInventoryQuantity && hasInventoryProduct
    ? classifyStock(products.recordset, variants.recordset, inventory.recordset, true, true)
    : {
        no_variant_products: numberValue(s.no_variant_products),
        single_variant_products: numberValue(s.one_variant_products),
        multi_variant_products: numberValue(s.multi_variant_products),
        ambiguous_products: 0,
        ambiguous_product_ids: [],
        source_counts: { CANONICAL_INVENTORY_ON_HAND: inventory.recordset.length },
      };

  const profile: PreflightProfile = {
    products_count: numberValue(p.products_count),
    active_products_count: numberValue(p.active_products_count),
    variants_count: numberValue(v.variants_count),
    product_images_count: numberValue(imageResult.recordset[0]?.product_images_count),
    inventory_count: numberValue(i.inventory_count),
    no_variant_products: numberValue(s.no_variant_products),
    one_variant_products: numberValue(s.one_variant_products),
    multi_variant_products: numberValue(s.multi_variant_products),
    null_variant_inventory: numberValue(i.null_variant_inventory),
    duplicate_inventory_variant_groups: numberValue(duplicateInventoryResult.recordset[0]?.duplicate_inventory_variant_groups),
    null_variant_sku: numberValue(v.null_variant_sku),
    duplicate_variant_sku_groups: numberValue(duplicateSkuResult.recordset[0]?.duplicate_variant_sku_groups),
    null_variant_price: numberValue(v.null_variant_price),
    flavor_products: numberValue(p.flavor_products),
    color_products: numberValue(p.color_products),
    size_products: numberValue(p.size_products),
    main_image_products: numberValue(p.main_image_products),
    gallery_image_products: numberValue(p.gallery_image_products),
    products_stock_sum: numberValue(p.products_stock_sum),
    invalid_gallery_products: invalidGalleryResult.recordset.length,
    invalid_gallery_product_ids: invalidGalleryResult.recordset.map((row: { id: number }) => row.id),
  };
  console.log(`PRE_MIGRATION_PROFILE ${JSON.stringify(profile)}`);
  console.log(`STOCK_CLASSIFICATION ${JSON.stringify(classification)}`);
  return profile;
}

function incrementSource(target: Record<string, number>, source: string, amount = 1): void {
  target[source] = (target[source] ?? 0) + amount;
}

function classifyStock(
  products: ProductRow[],
  variants: VariantRow[],
  inventory: InventoryRow[],
  hasVariantStock: boolean,
  hasInventoryQuantity: boolean,
): StockClassification {
  const ambiguous = new Set<number>();
  const sourceCounts: Record<string, number> = {};
  let noVariant = 0;
  let singleVariant = 0;
  let multiVariant = 0;

  for (const product of products) {
    const productVariants = variants.filter((variant) => variant.product_id === product.id);
    const variantIds = new Set(productVariants.map((variant) => variant.id));
    const productInventory = inventory.filter((row) => row.product_id === product.id || (row.variant_id !== null && variantIds.has(row.variant_id)));
    const productLevel = productInventory.filter((row) => row.variant_id === null);
    const perVariant = new Map<number, InventoryRow[]>();
    for (const variant of productVariants) {
      perVariant.set(variant.id, productInventory.filter((row) => row.variant_id === variant.id));
    }

    if (productVariants.length === 0) {
      noVariant += 1;
      incrementSource(sourceCounts, 'PRODUCTS_STOCK_DEFAULT_VARIANT');
      continue;
    }

    const duplicateVariantInventory = [...perVariant.values()].some((rows) => rows.length > 1);
    const invalidReserved = productInventory.some((row) => numberValue(row.reserved) < 0);
    if (duplicateVariantInventory || invalidReserved || productLevel.length > 1) {
      ambiguous.add(product.id);
      continue;
    }

    if (productVariants.length === 1) {
      singleVariant += 1;
      const variant = productVariants[0];
      const rows = perVariant.get(variant.id) ?? [];
      if (rows.length === 1 && hasInventoryQuantity && rows[0].quantity !== null) {
        if (numberValue(rows[0].reserved) > numberValue(rows[0].quantity)) ambiguous.add(product.id);
        else incrementSource(sourceCounts, 'VARIANT_INVENTORY_QUANTITY');
      } else if (rows.length === 0 && productLevel.length === 1 && hasInventoryQuantity && productLevel[0].quantity !== null) {
        if (numberValue(productLevel[0].reserved) > numberValue(productLevel[0].quantity)) ambiguous.add(product.id);
        else incrementSource(sourceCounts, 'PRODUCT_INVENTORY_QUANTITY');
      } else if (rows.length === 0 && productLevel.length === 0 && hasVariantStock && (numberValue(variant.stock) > 0 || numberValue(product.stock) === 0)) {
        incrementSource(sourceCounts, 'PRODUCT_VARIANT_STOCK');
      } else if (rows.length === 0 && productLevel.length === 0) {
        incrementSource(sourceCounts, 'PRODUCTS_STOCK_COMPATIBILITY');
      } else {
        ambiguous.add(product.id);
      }
      continue;
    }

    multiVariant += 1;
    const coverage = productVariants.map((variant) => perVariant.get(variant.id) ?? []);
    const completeInventory = hasInventoryQuantity && coverage.every((rows) => rows.length === 1 && rows[0].quantity !== null);
    const partialInventory = coverage.some((rows) => rows.length > 0) && !completeInventory;
    if (completeInventory) {
      const invalid = coverage.some((rows) => numberValue(rows[0].reserved) > numberValue(rows[0].quantity));
      if (invalid) ambiguous.add(product.id);
      else incrementSource(sourceCounts, 'VARIANT_INVENTORY_QUANTITY', productVariants.length);
      continue;
    }
    if (partialInventory || productLevel.length > 0) {
      ambiguous.add(product.id);
      continue;
    }
    const variantStockMeaningful = hasVariantStock
      && productVariants.every((variant) => variant.stock !== null)
      && !(productVariants.every((variant) => numberValue(variant.stock) === 0) && numberValue(product.stock) > 0);
    if (variantStockMeaningful) incrementSource(sourceCounts, 'PRODUCT_VARIANT_STOCK', productVariants.length);
    else ambiguous.add(product.id);
  }

  return {
    no_variant_products: noVariant,
    single_variant_products: singleVariant,
    multi_variant_products: multiVariant,
    ambiguous_products: ambiguous.size,
    ambiguous_product_ids: [...ambiguous].sort((a, b) => a - b),
    source_counts: sourceCounts,
  };
}

async function runPreflight(pool: ConnectionPool): Promise<StockClassification> {
  await validateRequiredTables(pool);
  const hasVariantStock = await columnExists(pool, 'ProductVariants', 'stock');
  const hasInventoryQuantity = await columnExists(pool, 'Inventory', 'quantity');
  const hasInventoryProduct = await columnExists(pool, 'Inventory', 'product_id');
  await collectProfile(pool);
  if (!hasVariantStock || !hasInventoryQuantity || !hasInventoryProduct) {
    return { no_variant_products: 0, single_variant_products: 0, multi_variant_products: 0, ambiguous_products: 0, ambiguous_product_ids: [], source_counts: { ALREADY_MIGRATED: 1 } };
  }
  const products = (await pool.request().query<ProductRow>('SELECT id, stock FROM dbo.Products')).recordset;
  const variants = (await pool.request().query<VariantRow>('SELECT id, product_id, stock FROM dbo.ProductVariants')).recordset;
  const inventory = (await pool.request().query<InventoryRow>('SELECT id, product_id, variant_id, quantity, reserved FROM dbo.Inventory')).recordset;
  const classification = classifyStock(products, variants, inventory, true, true);
  if (classification.ambiguous_products > 0) {
    throw new Error(`AMBIGUOUS VARIANT STOCK BACKFILL product_ids=${classification.ambiguous_product_ids.join(',')}`);
  }
  return classification;
}

async function collectPostMigrationVerification(pool: ConnectionPool): Promise<void> {
  const result = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.SchemaMigrations) AS schema_migrations,
      (SELECT COUNT(*) FROM dbo.ProductVariants) AS product_variants,
      (SELECT COUNT(*) FROM dbo.ProductOptions) AS product_options,
      (SELECT COUNT(*) FROM dbo.ProductOptionValues) AS product_option_values,
      (SELECT COUNT(*) FROM dbo.VariantOptionValues) AS variant_option_values,
      (SELECT COUNT(*) FROM dbo.Inventory) AS inventory,
      (SELECT COUNT(*) FROM dbo.ProductImages) AS product_images,
      (SELECT COUNT(*) FROM dbo.Products p WHERE NOT EXISTS (SELECT 1 FROM dbo.ProductVariants v WHERE v.product_id = p.id)) AS products_without_variant,
      (SELECT COUNT(*) FROM dbo.ProductVariants v WHERE NOT EXISTS (SELECT 1 FROM dbo.Products p WHERE p.id = v.product_id)) AS orphan_variants,
      (SELECT COUNT(*) FROM dbo.ProductVariants WHERE variant_name = N'Default') AS default_variants,
      (SELECT COUNT(*) FROM dbo.ProductVariants WHERE sku IS NULL OR LTRIM(RTRIM(sku)) = '') AS null_variant_sku,
      (SELECT COUNT(*) FROM (SELECT sku FROM dbo.ProductVariants GROUP BY sku HAVING COUNT(*) > 1) d) AS duplicate_variant_sku_groups,
      (SELECT COUNT(*) FROM dbo.ProductVariants WHERE price IS NULL) AS null_variant_price,
      (SELECT COUNT(*) FROM dbo.Products p WHERE NULLIF(LTRIM(RTRIM(p.flavor)), '') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.ProductOptions po JOIN dbo.ProductOptionValues pov ON pov.product_option_id = po.id
        WHERE po.product_id = p.id AND po.name = N'Flavor' AND pov.value = LTRIM(RTRIM(p.flavor)))) AS missing_flavor_backfill,
      (SELECT COUNT(*) FROM dbo.Products p WHERE NULLIF(LTRIM(RTRIM(p.color)), '') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.ProductOptions po JOIN dbo.ProductOptionValues pov ON pov.product_option_id = po.id
        WHERE po.product_id = p.id AND po.name = N'Color' AND pov.value = LTRIM(RTRIM(p.color)))) AS missing_color_backfill,
      (SELECT COUNT(*) FROM dbo.Products p WHERE NULLIF(LTRIM(RTRIM(p.size)), '') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.ProductOptions po JOIN dbo.ProductOptionValues pov ON pov.product_option_id = po.id
        WHERE po.product_id = p.id AND po.name = N'Size' AND pov.value = LTRIM(RTRIM(p.size)))) AS missing_size_backfill,
      (SELECT COUNT(*) FROM (SELECT variant_id, product_option_id FROM dbo.VariantOptionValues GROUP BY variant_id, product_option_id HAVING COUNT(*) > 1) d) AS duplicate_variant_option_groups,
      (SELECT COUNT(*) FROM dbo.ProductOptions po WHERE NOT EXISTS (SELECT 1 FROM dbo.Products p WHERE p.id = po.product_id)) AS orphan_product_options,
      (SELECT COUNT(*) FROM dbo.ProductOptionValues pov WHERE NOT EXISTS (SELECT 1 FROM dbo.ProductOptions po WHERE po.id = pov.product_option_id)) AS orphan_product_option_values,
      (SELECT COUNT(*) FROM dbo.VariantOptionValues vov WHERE NOT EXISTS (SELECT 1 FROM dbo.ProductVariants v WHERE v.id = vov.variant_id)) AS orphan_variant_option_variants,
      (SELECT COUNT(*) FROM dbo.VariantOptionValues vov WHERE NOT EXISTS (SELECT 1 FROM dbo.ProductOptions po WHERE po.id = vov.product_option_id)) AS orphan_variant_option_options,
      (SELECT COUNT(*) FROM dbo.VariantOptionValues vov WHERE NOT EXISTS (SELECT 1 FROM dbo.ProductOptionValues pov WHERE pov.id = vov.product_option_value_id)) AS orphan_variant_option_values,
      (SELECT COUNT(*) FROM dbo.Products p WHERE NULLIF(LTRIM(RTRIM(p.flavor)), '') IS NOT NULL AND EXISTS (
        SELECT 1 FROM dbo.ProductOptions po JOIN dbo.ProductOptionValues pov ON pov.product_option_id = po.id
        WHERE po.product_id = p.id AND po.name = N'Flavor' AND pov.value = LTRIM(RTRIM(p.flavor)))) AS flavor_products_migrated,
      (SELECT COUNT(*) FROM dbo.Products p WHERE NULLIF(LTRIM(RTRIM(p.color)), '') IS NOT NULL AND EXISTS (
        SELECT 1 FROM dbo.ProductOptions po JOIN dbo.ProductOptionValues pov ON pov.product_option_id = po.id
        WHERE po.product_id = p.id AND po.name = N'Color' AND pov.value = LTRIM(RTRIM(p.color)))) AS color_products_migrated,
      (SELECT COUNT(*) FROM dbo.Products p WHERE NULLIF(LTRIM(RTRIM(p.size)), '') IS NOT NULL AND EXISTS (
        SELECT 1 FROM dbo.ProductOptions po JOIN dbo.ProductOptionValues pov ON pov.product_option_id = po.id
        WHERE po.product_id = p.id AND po.name = N'Size' AND pov.value = LTRIM(RTRIM(p.size)))) AS size_products_migrated,
      (SELECT COUNT(*) FROM dbo.Products p WHERE NULLIF(LTRIM(RTRIM(p.main_image)), '') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.ProductImages pi WHERE pi.product_id = p.id AND pi.image_url = LTRIM(RTRIM(p.main_image)))) AS missing_main_images,
      (SELECT COUNT(*) FROM (SELECT product_id FROM dbo.ProductImages WHERE is_primary = 1 GROUP BY product_id HAVING COUNT(*) > 1) d) AS products_with_multiple_primary_images,
      (SELECT COUNT(*) FROM dbo.ProductImages pi WHERE NOT EXISTS (SELECT 1 FROM dbo.Products p WHERE p.id = pi.product_id)) AS orphan_product_images,
      (SELECT COUNT(*) FROM dbo.Products p JOIN dbo.ProductImages pi ON pi.product_id = p.id AND pi.image_url = LTRIM(RTRIM(p.main_image))
        WHERE NULLIF(LTRIM(RTRIM(p.main_image)), '') IS NOT NULL) AS main_image_matches,
      (SELECT COUNT(*) FROM dbo.Products WHERE NULLIF(LTRIM(RTRIM(gallery_images)), '') IS NOT NULL) AS gallery_source_values,
      (SELECT COUNT(*) FROM dbo.Products p WHERE NULLIF(LTRIM(RTRIM(p.gallery_images)), '') IS NOT NULL
        AND (ISJSON(p.gallery_images) <> 1 OR LEFT(LTRIM(p.gallery_images), 1) <> N'[')) AS unmigrated_gallery_values,
      (SELECT COUNT(*) FROM dbo.ProductVariants v WHERE NOT EXISTS (SELECT 1 FROM dbo.Inventory i WHERE i.variant_id = v.id)) AS variants_without_inventory,
      (SELECT COUNT(*) FROM (SELECT variant_id FROM dbo.Inventory GROUP BY variant_id HAVING COUNT(*) > 1) d) AS variants_with_duplicate_inventory,
      (SELECT COUNT(*) FROM dbo.Inventory WHERE variant_id IS NULL) AS null_inventory_variant,
      (SELECT COUNT(*) FROM dbo.Inventory WHERE on_hand < 0) AS negative_on_hand,
      (SELECT COUNT(*) FROM dbo.Inventory WHERE reserved < 0) AS negative_reserved,
      (SELECT COUNT(*) FROM dbo.Inventory WHERE reserved > on_hand) AS reserved_over_on_hand,
      (SELECT COUNT(*) FROM dbo.Inventory WHERE available <> on_hand - reserved) AS available_mismatch,
      (SELECT COUNT(*) FROM dbo.Inventory i WHERE NOT EXISTS (SELECT 1 FROM dbo.ProductVariants v WHERE v.id = i.variant_id)) AS orphan_inventory,
      (SELECT SUM(CAST(on_hand AS BIGINT)) FROM dbo.Inventory) AS inventory_on_hand_sum`);
  const columns = {
    product_variants_stock: await columnExists(pool, 'ProductVariants', 'stock'),
    inventory_quantity: await columnExists(pool, 'Inventory', 'quantity'),
    inventory_product_id: await columnExists(pool, 'Inventory', 'product_id'),
    inventory_warehouse: await columnExists(pool, 'Inventory', 'warehouse'),
    products_stock: await columnExists(pool, 'Products', 'stock'),
  };
  console.log(`POST_MIGRATION_VERIFICATION ${JSON.stringify({ ...result.recordset[0], legacy_columns: columns })}`);

  const variantColumns = await pool.request().query(`
    SELECT c.name, TYPE_NAME(c.user_type_id) AS data_type, c.max_length, c.is_nullable
    FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.ProductVariants') ORDER BY c.column_id`);
  const inventoryColumns = await pool.request().query(`
    SELECT c.name, TYPE_NAME(c.user_type_id) AS data_type, c.max_length, c.is_nullable, c.is_computed
    FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.Inventory') ORDER BY c.column_id`);
  const optionConstraints = await pool.request().query(`
    SELECT name, type_desc FROM sys.objects
    WHERE parent_object_id IN (OBJECT_ID(N'dbo.ProductOptions'), OBJECT_ID(N'dbo.ProductOptionValues'), OBJECT_ID(N'dbo.VariantOptionValues'))
      AND type IN ('PK','UQ','F') ORDER BY name`);
  const imageIndexes = await pool.request().query(`
    SELECT i.name, i.is_unique, i.has_filter, i.filter_definition
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(N'dbo.ProductImages') AND i.name IS NOT NULL ORDER BY i.name`);
  const imageColumns = await pool.request().query(`
    SELECT c.name, c.is_nullable FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.ProductImages') AND c.name IN (N'sort_order', N'is_primary', N'created_at') ORDER BY c.name`);
  console.log(`SCHEMA_METADATA ${JSON.stringify({
    product_variant_columns: variantColumns.recordset,
    inventory_columns: inventoryColumns.recordset,
    option_constraints: optionConstraints.recordset,
    product_image_indexes: imageIndexes.recordset,
    product_image_columns: imageColumns.recordset,
  })}`);
}

function splitBatches(sqlText: string): string[] {
  const batches: string[] = [];
  let current: string[] = [];
  for (const line of sqlText.split(/\r?\n/)) {
    if (/^\s*GO\s*$/i.test(line)) {
      const batch = current.join('\n').trim();
      if (batch) batches.push(batch);
      current = [];
    } else current.push(line);
  }
  const finalBatch = current.join('\n').trim();
  if (finalBatch) batches.push(finalBatch);
  return batches;
}

async function ensureTrackingTable(pool: ConnectionPool): Promise<void> {
  await pool.request().query(`
    IF OBJECT_ID(N'dbo.SchemaMigrations', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.SchemaMigrations (
        version NVARCHAR(20) NOT NULL CONSTRAINT PK_SchemaMigrations PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        checksum CHAR(64) NOT NULL,
        applied_at DATETIME2 NOT NULL
      );
    END`);
}

async function applyMigration(transaction: Transaction, migration: MigrationFile): Promise<void> {
  console.log(`Migration ${migration.version}: ${migration.filename}`);
  console.log(`Checksum: ${migration.checksum}`);
  console.log('Transaction: STARTED');
  for (const batch of splitBatches(migration.sqlText)) await transaction.request().batch(batch);
  await transaction.request()
    .input('version', sql.NVarChar(20), migration.version)
    .input('name', sql.NVarChar(255), migration.filename)
    .input('checksum', sql.Char(64), migration.checksum)
    .query(`INSERT INTO dbo.SchemaMigrations (version, name, checksum, applied_at)
            VALUES (@version, @name, @checksum, SYSUTCDATETIME())`);
}

async function main(): Promise<void> {
  const statusOnly = process.argv.includes('--status');
  const throughArgument = process.argv.find(argument => argument.startsWith('--through='));
  const throughIndex=process.argv.indexOf('--through');
  const throughVersion = process.argv.includes('--historical-pre-0105')
    ? '0104'
    : throughArgument?.slice('--through='.length) ?? (throughIndex>=0?process.argv[throughIndex+1]:undefined);
  if (throughVersion && !/^\d{4}$/.test(throughVersion)) throw new Error('Invalid --through migration version');
  const discoveredMigrations = await discoverMigrations();
  const migrations = throughVersion
    ? discoveredMigrations.filter(migration => migration.version <= throughVersion)
    : discoveredMigrations;
  const pool = await getPool();
  const dbResult = await pool.request().query('SELECT DB_NAME() AS database_name');
  console.log(`Target database: ${String(dbResult.recordset[0]?.database_name ?? 'UNKNOWN')}`);
  await validateRequiredTables(pool);

  const trackingPresent = await trackingTableExists(pool);
  if (trackingPresent) await validateTrackingTableShape(pool);
  const applied = await readApplied(pool, trackingPresent);
  validateAppliedLedger(applied, discoveredMigrations);
  const appliedByVersion = new Map(applied.map((item) => [item.version, item]));
  await validateMigrationTableLedger(pool, appliedByVersion);
  // Applied migration immutability is a global ledger rule. Do not narrow
  // checksum validation when an operator asks to plan/apply only through an
  // earlier version.
  const mismatches = discoveredMigrations.filter((migration) => {
    const current = appliedByVersion.get(migration.version);
    return current !== undefined && current.checksum !== migration.checksum;
  });
  const pending = migrations.filter((migration) => !appliedByVersion.has(migration.version));

  console.log(`Tracking table: ${trackingPresent ? 'PRESENT' : 'NOT PRESENT'}`);
  console.log(`Applied migrations: ${applied.length}`);
  console.log(`Pending migrations: ${pending.length}`);
  console.log(`Checksum mismatches: ${mismatches.length}`);
  for (const migration of migrations) {
    const appliedMigration = appliedByVersion.get(migration.version);
    const state = !appliedMigration ? 'PENDING' : appliedMigration.checksum === migration.checksum ? 'APPLIED' : 'CHECKSUM_MISMATCH';
    console.log(`${migration.version} ${migration.filename}: ${state}`);
    if (appliedMigration) {
      console.log(`${migration.version} current checksum: ${migration.checksum}`);
      console.log(`${migration.version} stored checksum: ${appliedMigration.checksum}`);
    }
  }
  if (statusOnly) {
    await runPreflight(pool);
    if (appliedByVersion.has('0001')) await collectPostMigrationVerification(pool);
    if (mismatches.length > 0) throw new Error(`Migration checksum mismatch: ${mismatches.map((item) => item.version).join(', ')}`);
    return;
  }
  if (mismatches.length > 0) throw new Error(`Migration checksum mismatch: ${mismatches.map((item) => item.version).join(', ')}`);
  if (pending.length === 0) {
    console.log('0 pending migrations; nothing applied.');
    return;
  }

  await runPreflight(pool);
  await ensureTrackingTable(pool);
  for (const migration of pending) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await applyMigration(transaction, migration);
      await transaction.commit();
      console.log('Transaction: COMMITTED');
    } catch (error) {
      try { await transaction.rollback(); } catch { /* transaction may already be aborted */ }
      console.error('Transaction: ROLLED BACK');
      throw error;
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
