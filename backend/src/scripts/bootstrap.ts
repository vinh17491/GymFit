import { promises as fs } from 'fs';
import path from 'path';
import type { ConnectionPool } from 'mssql';
import { closePool, getPool, sql } from '../config/database';
import { config } from '../config/config';

const FOUNDATION_SQL_PATH = path.resolve(__dirname, '../../../db/bootstrap/foundation.sql');
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../db/migrations');

type ColumnContract = {
  name: string;
  dataType: string;
  nullable: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  identity: boolean;
};

type FoundationContract = {
  table: string;
  columns: ColumnContract[];
  uniqueKeys: string[][];
  foreignKeys: string[];
  indexKeys: string[][];
  checkKeywords: string[][];
};

const text = (name: string, length: number, nullable: boolean, identity = false): ColumnContract => ({
  name, dataType: 'nvarchar', nullable, maxLength: length === -1 ? -1 : length * 2, identity,
});
const integer = (name: string, nullable: boolean, identity = false): ColumnContract => ({ name, dataType: 'int', nullable, identity });
const decimal = (name: string, precision: number, scale: number, nullable: boolean): ColumnContract => ({
  name, dataType: 'decimal', nullable, precision, scale, identity: false,
});
const bit = (name: string, nullable: boolean): ColumnContract => ({ name, dataType: 'bit', nullable, identity: false });
const dateTime = (name: string, nullable: boolean): ColumnContract => ({ name, dataType: 'datetime2', nullable, identity: false });
const date = (name: string, nullable: boolean): ColumnContract => ({ name, dataType: 'date', nullable, identity: false });
const time = (name: string, nullable: boolean): ColumnContract => ({ name, dataType: 'time', nullable, scale: 7, identity: false });

const foundationContracts: FoundationContract[] = [
  {
    table: 'Users',
    columns: [
      integer('id', false, true), text('email', 255, false), text('password', 255, false), text('name', 100, false),
      text('phone', 20, true), text('role', 20, false), text('referral_code', 10, true), integer('referred_by', true),
      text('avatar_url', 500, true), bit('is_active', false), bit('email_verified', false), dateTime('last_login_at', true),
      dateTime('created_at', false), dateTime('updated_at', false),
    ],
    uniqueKeys: [['email']],
    foreignKeys: ['referred_by:Users:id'],
    indexKeys: [['email'], ['role']],
    checkKeywords: [['role', 'member', 'coach', 'admin']],
  },
  {
    table: 'Plans',
    columns: [
      integer('id', false, true), text('name', 100, false), text('description', 500, true), decimal('price', 10, 2, false),
      integer('duration_days', false), text('type', 20, false), text('features', -1, true), bit('is_active', false),
      integer('sort_order', false), dateTime('created_at', false),
    ],
    uniqueKeys: [], foreignKeys: [], indexKeys: [], checkKeywords: [['type', 'monthly', 'quarterly', 'yearly', 'custom']],
  },
  {
    table: 'Brands',
    columns: [
      integer('id', false, true), text('name', 100, false), text('slug', 100, false), text('logo_url', 500, true),
      text('description', 500, true), bit('is_active', false), dateTime('created_at', false), dateTime('updated_at', false),
    ],
    uniqueKeys: [['slug']], foreignKeys: [], indexKeys: [['slug']], checkKeywords: [],
  },
  {
    table: 'Categories',
    columns: [
      integer('id', false, true), text('name', 100, false), text('slug', 100, false), text('description', 500, true),
      text('image_url', 500, true), bit('is_active', false), integer('sort_order', false), dateTime('created_at', false),
      dateTime('updated_at', false),
    ],
    uniqueKeys: [['slug']], foreignKeys: [], indexKeys: [['slug']], checkKeywords: [],
  },
  {
    table: 'Products',
    columns: [
      integer('id', false, true), text('product_name', 200, false), text('slug', 200, false), text('description', -1, true),
      text('specifications', -1, true), text('features', -1, true), text('sku', 100, false), text('barcode', 50, true),
      decimal('price', 10, 2, false), decimal('sale_price', 10, 2, true), integer('stock', false), decimal('weight', 8, 2, true),
      text('flavor', 100, true), text('color', 50, true), text('size', 50, true), text('target_users', 200, true),
      decimal('rating', 3, 1, false), integer('review_count', false), text('main_image', 500, true), text('gallery_images', -1, true),
      integer('brand_id', true), integer('category_id', true), text('sub_category', 100, true), bit('is_active', false),
      bit('is_featured', false), bit('is_on_sale', false), bit('is_new_arrival', false), bit('is_best_seller', false),
      bit('is_new', false), bit('is_bestseller', false), text('tags', -1, true), dateTime('created_at', false), dateTime('updated_at', false),
    ],
    uniqueKeys: [['slug'], ['sku']],
    foreignKeys: ['brand_id:Brands:id', 'category_id:Categories:id'],
    indexKeys: [['slug'], ['brand_id'], ['category_id']], checkKeywords: [],
  },
  {
    table: 'ProductVariants',
    columns: [
      integer('id', false, true), integer('product_id', false), text('variant_name', 100, false), text('sku', 50, true),
      decimal('price', 10, 2, true), integer('stock', true), bit('is_active', true), dateTime('created_at', true),
    ],
    uniqueKeys: [], foreignKeys: ['product_id:Products:id'], indexKeys: [], checkKeywords: [],
  },
  {
    table: 'ProductImages',
    columns: [
      integer('id', false, true), integer('product_id', false), text('image_url', 500, false), text('alt_text', 200, true),
      integer('sort_order', true), bit('is_primary', true), dateTime('created_at', true),
    ],
    uniqueKeys: [], foreignKeys: ['product_id:Products:id'], indexKeys: [], checkKeywords: [],
  },
  {
    table: 'Inventory',
    columns: [
      integer('id', false, true), integer('product_id', false), integer('variant_id', true), integer('quantity', true),
      integer('reserved', true), text('warehouse', 100, true), dateTime('last_restocked', true), dateTime('updated_at', true),
    ],
    uniqueKeys: [], foreignKeys: ['product_id:Products:id', 'variant_id:ProductVariants:id'], indexKeys: [], checkKeywords: [],
  },
  {
    table: 'Exercises',
    columns: [
      integer('id', false, true), text('name', 200, false), text('slug', 200, false), text('description', -1, true),
      text('instructions', -1, true), text('muscle_group', 100, true), text('equipment', 100, true), text('difficulty', 20, true),
      text('video_url', 500, true), text('thumbnail_url', 500, true), bit('is_active', false), dateTime('created_at', false),
      dateTime('updated_at', false),
    ],
    uniqueKeys: [], foreignKeys: [], indexKeys: [], checkKeywords: [],
  },
  {
    table: 'Bookings',
    columns: [
      integer('id', false, true), integer('coach_id', false), integer('member_id', false), date('booking_date', false),
      time('start_time', false), time('end_time', false), text('status', 20, false), text('notes', 500, true),
      dateTime('created_at', false), dateTime('updated_at', false),
    ],
    uniqueKeys: [], foreignKeys: ['coach_id:Users:id', 'member_id:Users:id'], indexKeys: [['coach_id', 'booking_date'], ['member_id', 'booking_date']],
    checkKeywords: [['status', 'pending', 'confirmed', 'cancelled', 'completed', 'no_show']],
  },
  {
    table: 'Notifications',
    columns: [
      integer('id', false, true), integer('user_id', false), text('title', 200, false), text('message', -1, false),
      text('type', 50, false), bit('is_read', false), dateTime('created_at', false),
    ],
    uniqueKeys: [], foreignKeys: ['user_id:Users:id'], indexKeys: [], checkKeywords: [],
  },
  {
    table: 'CRMCustomers',
    columns: [
      integer('id', false, true), integer('user_id', false), text('tags', 500, true), dateTime('last_contact_at', true),
      integer('assigned_coach_id', true), decimal('lifetime_value', 12, 2, false), integer('risk_score', false), dateTime('created_at', false),
    ],
    uniqueKeys: [['user_id']], foreignKeys: ['user_id:Users:id', 'assigned_coach_id:Users:id'], indexKeys: [], checkKeywords: [],
  },
  {
    table: 'Memberships',
    columns: [
      integer('id', false, true), integer('user_id', false), integer('plan_id', false), dateTime('start_date', false),
      dateTime('end_date', false), text('status', 20, false), integer('payment_id', true), bit('auto_renew', false), dateTime('created_at', false),
    ],
    uniqueKeys: [], foreignKeys: ['user_id:Users:id', 'plan_id:Plans:id'], indexKeys: [],
    checkKeywords: [['status', 'active', 'expired', 'cancelled', 'suspended']],
  },
];

const FOUNDATION_TABLES = foundationContracts.map(contract => contract.table);

const MIGRATION_OWNED_COLUMNS: Record<string, string[]> = {
  Users: ['token_version', 'coach_status', 'coach_status_reason', 'coach_status_updated_at'],
  Products: ['shop_id', 'moderation_status', 'submitted_at', 'review_reason', 'brand_request_id', 'reviewed_at', 'published_at', 'reviewed_by_user_id'],
  ProductVariants: ['barcode', 'sale_price', 'weight', 'updated_at', 'is_default'],
  Inventory: ['on_hand', 'available', 'low_stock_threshold'],
  Brands: ['normalized_name', 'is_generic'],
  Notifications: ['recipient_user_id', 'action_url', 'read_at', 'deduplication_key'],
  Bookings: ['session_mode', 'location'],
};

class BootstrapError extends Error {
  constructor(public readonly code: 'BOOTSTRAP_REFUSED' | 'BOOTSTRAP_SCHEMA_CONFLICT', detail: string) {
    super(`${code}: ${detail}`);
    this.name = 'BootstrapError';
  }
}

function normalizeDefinition(value: string): string {
  return value.toLowerCase().replace(/\s/g, '').replaceAll('[', '').replaceAll(']', '').replaceAll('`', '');
}

async function discoverMigrationOwnedNames(): Promise<Set<string>> {
  const names = new Set<string>();
  const files = (await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.sql'));
  const patterns = [
    /\bCREATE\s+TABLE\s+dbo\.([A-Za-z0-9_]+)/gi,
    /\bCREATE\s+(?:OR\s+ALTER\s+)?(?:TRIGGER|VIEW|PROCEDURE)\s+dbo\.([A-Za-z0-9_]+)/gi,
    /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+([A-Za-z0-9_]+)/gi,
    /\b(?:ADD|DROP)\s+CONSTRAINT\s+([A-Za-z0-9_]+)/gi,
    /\bCONSTRAINT\s+([A-Za-z0-9_]+)\s+(?:PRIMARY|UNIQUE|FOREIGN|CHECK|DEFAULT)/gi,
  ];
  for (const file of files) {
    const source = await fs.readFile(path.join(MIGRATIONS_DIR, file.name), 'utf8');
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        if (match[1]) names.add(match[1]);
      }
    }
  }
  return names;
}

async function databaseName(pool: ConnectionPool): Promise<string> {
  const result = await pool.request().query<{ database_name: string }>('SELECT DB_NAME() AS database_name');
  return String(result.recordset[0]?.database_name ?? '');
}

async function existingTableNames(pool: ConnectionPool): Promise<Set<string>> {
  const result = await pool.request().query<{ name: string }>(`
    SELECT t.name
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE s.name = N'dbo' AND t.is_ms_shipped = 0`);
  return new Set(result.recordset.map(row => row.name));
}

async function assertNoUnexpectedObjects(pool: ConnectionPool, migrationOwnedNames: Set<string>): Promise<void> {
  const tableNames = await existingTableNames(pool);
  for (const table of tableNames) {
    if (table === 'SchemaMigrations') throw new BootstrapError('BOOTSTRAP_REFUSED', 'dbo.SchemaMigrations already exists');
    if (FOUNDATION_TABLES.includes(table)) continue;
    if (migrationOwnedNames.has(table)) throw new BootstrapError('BOOTSTRAP_REFUSED', `migration-owned table dbo.${table} already exists`);
    throw new BootstrapError('BOOTSTRAP_SCHEMA_CONFLICT', `unexpected user table dbo.${table} already exists`);
  }

  const objectResult = await pool.request().query<{ name: string; type_desc: string }>(`
    SELECT o.name, o.type_desc
    FROM sys.objects o
    JOIN sys.schemas s ON s.schema_id = o.schema_id
    WHERE s.name = N'dbo' AND o.is_ms_shipped = 0
      AND o.type IN ('V','P','FN','IF','TF','FS','FT','TR')`);
  for (const row of objectResult.recordset) {
    if (migrationOwnedNames.has(row.name)) throw new BootstrapError('BOOTSTRAP_REFUSED', `migration-owned ${row.type_desc} dbo.${row.name} already exists`);
    throw new BootstrapError('BOOTSTRAP_SCHEMA_CONFLICT', `unexpected user ${row.type_desc} dbo.${row.name} already exists`);
  }

  const indexResult = await pool.request().query<{ name: string }>(`
    SELECT i.name
    FROM sys.indexes i
    JOIN sys.tables t ON t.object_id = i.object_id
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE s.name = N'dbo' AND i.name IS NOT NULL AND i.is_hypothetical = 0`);
  for (const row of indexResult.recordset) {
    if (migrationOwnedNames.has(row.name)) throw new BootstrapError('BOOTSTRAP_REFUSED', `migration-owned index ${row.name} already exists`);
  }

  const constraintResult = await pool.request().query<{ name: string }>(`
    SELECT o.name
    FROM sys.objects o
    JOIN sys.schemas s ON s.schema_id = o.schema_id
    WHERE s.name = N'dbo' AND o.is_ms_shipped = 0
      AND o.type IN ('C','D','F','PK','UQ')`);
  for (const row of constraintResult.recordset) {
    if (migrationOwnedNames.has(row.name)) throw new BootstrapError('BOOTSTRAP_REFUSED', `migration-owned constraint ${row.name} already exists`);
  }
}

async function validateColumns(pool: ConnectionPool, contract: FoundationContract): Promise<void> {
  const result = await pool.request()
    .input('tableName', sql.NVarChar(128), contract.table)
    .query<{
      name: string;
      data_type: string;
      max_length: number;
      precision: number;
      scale: number;
      is_nullable: number;
      is_identity: number;
    }>(`
      SELECT c.name, LOWER(TYPE_NAME(c.user_type_id)) AS data_type, c.max_length,
        c.precision, c.scale, c.is_nullable, c.is_identity
      FROM sys.columns c
      WHERE c.object_id = OBJECT_ID(N'dbo.' + @tableName, N'U')
      ORDER BY c.column_id`);
  const expected = new Map(contract.columns.map(column => [column.name, column]));
  const actual = new Map(result.recordset.map(column => [column.name, column]));
  if (actual.size !== expected.size || [...expected.keys()].some(name => !actual.has(name))) {
    throw new BootstrapError('BOOTSTRAP_SCHEMA_CONFLICT', `dbo.${contract.table} columns do not match the foundation contract`);
  }
  for (const expectedColumn of expected.values()) {
    const actualColumn = actual.get(expectedColumn.name);
    if (!actualColumn
      || actualColumn.data_type !== expectedColumn.dataType
      || Number(actualColumn.is_nullable) !== (expectedColumn.nullable ? 1 : 0)
      || Number(actualColumn.is_identity) !== (expectedColumn.identity ? 1 : 0)
      || (expectedColumn.maxLength !== undefined && Number(actualColumn.max_length) !== expectedColumn.maxLength)
      || (expectedColumn.precision !== undefined && Number(actualColumn.precision) !== expectedColumn.precision)
      || (expectedColumn.scale !== undefined && Number(actualColumn.scale) !== expectedColumn.scale)) {
      throw new BootstrapError('BOOTSTRAP_SCHEMA_CONFLICT', `dbo.${contract.table}.${expectedColumn.name} metadata is incompatible`);
    }
  }
}

async function validatePrimaryKey(pool: ConnectionPool, contract: FoundationContract): Promise<void> {
  const result = await pool.request()
    .input('tableName', sql.NVarChar(128), contract.table)
    .query<{ column_name: string; key_ordinal: number }>(`
      SELECT c.name AS column_name, ic.key_ordinal
      FROM sys.indexes i
      JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE i.object_id = OBJECT_ID(N'dbo.' + @tableName, N'U')
        AND i.is_primary_key = 1 AND ic.is_included_column = 0
      ORDER BY ic.key_ordinal`);
  const columns = result.recordset.map(row => row.column_name);
  if (columns.length !== 1 || columns[0] !== 'id') {
    throw new BootstrapError('BOOTSTRAP_SCHEMA_CONFLICT', `dbo.${contract.table} primary key is incompatible`);
  }
}

async function validateUniqueKeys(pool: ConnectionPool, contract: FoundationContract): Promise<void> {
  if (!contract.uniqueKeys.length) return;
  const result = await pool.request()
    .input('tableName', sql.NVarChar(128), contract.table)
    .query<{ index_id: number; key_ordinal: number; column_name: string }>(`
      SELECT i.index_id, ic.key_ordinal, c.name AS column_name
      FROM sys.indexes i
      JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE i.object_id = OBJECT_ID(N'dbo.' + @tableName, N'U')
        AND i.is_unique = 1 AND i.is_primary_key = 0 AND ic.is_included_column = 0
      ORDER BY i.index_id, ic.key_ordinal`);
  const actual = new Map<number, string[]>();
  for (const row of result.recordset) actual.set(row.index_id, [...(actual.get(row.index_id) ?? []), row.column_name]);
  const signatures = [...actual.values()].map(columns => columns.join('|'));
  for (const expected of contract.uniqueKeys) {
    if (!signatures.includes(expected.join('|'))) {
      throw new BootstrapError('BOOTSTRAP_SCHEMA_CONFLICT', `dbo.${contract.table} is missing unique key (${expected.join(',')})`);
    }
  }
}

async function validateForeignKeys(pool: ConnectionPool, contract: FoundationContract): Promise<void> {
  if (!contract.foreignKeys.length) return;
  const result = await pool.request()
    .input('tableName', sql.NVarChar(128), contract.table)
    .query<{ parent_column: string; referenced_table: string; referenced_column: string }>(`
      SELECT pc.name AS parent_column, rt.name AS referenced_table, rc.name AS referenced_column
      FROM sys.foreign_keys fk
      JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
      JOIN sys.columns pc ON pc.object_id = fkc.parent_object_id AND pc.column_id = fkc.parent_column_id
      JOIN sys.tables rt ON rt.object_id = fkc.referenced_object_id
      JOIN sys.columns rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
      WHERE fk.parent_object_id = OBJECT_ID(N'dbo.' + @tableName, N'U')`);
  const actual = new Set(result.recordset.map(row => `${row.parent_column}:${row.referenced_table}:${row.referenced_column}`));
  for (const expected of contract.foreignKeys) {
    if (!actual.has(expected)) throw new BootstrapError('BOOTSTRAP_SCHEMA_CONFLICT', `dbo.${contract.table} is missing foreign key ${expected}`);
  }
}

async function validateIndexes(pool: ConnectionPool, contract: FoundationContract): Promise<void> {
  if (!contract.indexKeys.length) return;
  const result = await pool.request()
    .input('tableName', sql.NVarChar(128), contract.table)
    .query<{ index_id: number; key_ordinal: number; column_name: string }>(`
      SELECT i.index_id, ic.key_ordinal, c.name AS column_name
      FROM sys.indexes i
      JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE i.object_id = OBJECT_ID(N'dbo.' + @tableName, N'U')
        AND i.is_primary_key = 0 AND i.is_unique = 0 AND ic.is_included_column = 0
      ORDER BY i.index_id, ic.key_ordinal`);
  const actual = new Map<number, string[]>();
  for (const row of result.recordset) actual.set(row.index_id, [...(actual.get(row.index_id) ?? []), row.column_name]);
  const signatures = [...actual.values()].map(columns => columns.join('|'));
  for (const expected of contract.indexKeys) {
    if (!signatures.includes(expected.join('|'))) {
      throw new BootstrapError('BOOTSTRAP_SCHEMA_CONFLICT', `dbo.${contract.table} is missing foundation index (${expected.join(',')})`);
    }
  }
}

async function validateChecks(pool: ConnectionPool, contract: FoundationContract): Promise<void> {
  if (!contract.checkKeywords.length) return;
  const result = await pool.request()
    .input('tableName', sql.NVarChar(128), contract.table)
    .query<{ definition: string }>(`
      SELECT cc.definition
      FROM sys.check_constraints cc
      WHERE cc.parent_object_id = OBJECT_ID(N'dbo.' + @tableName, N'U')`);
  const definitions = result.recordset.map(row => normalizeDefinition(String(row.definition)));
  for (const keywords of contract.checkKeywords) {
    if (!definitions.some(definition => keywords.every(keyword => definition.includes(normalizeDefinition(keyword))))) {
      throw new BootstrapError('BOOTSTRAP_SCHEMA_CONFLICT', `dbo.${contract.table} is missing a required check contract`);
    }
  }
}

async function validateMigrationColumns(pool: ConnectionPool): Promise<void> {
  for (const [table, columns] of Object.entries(MIGRATION_OWNED_COLUMNS)) {
    const existing = await pool.request()
      .input('tableName', sql.NVarChar(128), table)
      .query<{ name: string }>(`
        SELECT c.name
        FROM sys.columns c
        WHERE c.object_id = OBJECT_ID(N'dbo.' + @tableName, N'U')`);
    const actual = new Set(existing.recordset.map(row => row.name));
    const found = columns.find(column => actual.has(column));
    if (found) throw new BootstrapError('BOOTSTRAP_REFUSED', `migration-owned column dbo.${table}.${found} already exists`);
  }
}

async function validateExistingFoundation(pool: ConnectionPool, existingTables: Set<string>): Promise<string[]> {
  const missing: string[] = [];
  for (const contract of foundationContracts) {
    if (!existingTables.has(contract.table)) {
      missing.push(contract.table);
      continue;
    }
    await validateColumns(pool, contract);
    await validatePrimaryKey(pool, contract);
    await validateUniqueKeys(pool, contract);
    await validateForeignKeys(pool, contract);
    await validateIndexes(pool, contract);
    await validateChecks(pool, contract);
  }
  return missing;
}

export async function bootstrapFoundation(pool: ConnectionPool): Promise<void> {
  const configuredDatabase = config.db.database.trim();
  const actualDatabase = await databaseName(pool);
  if (!configuredDatabase || actualDatabase.toLowerCase() !== configuredDatabase.toLowerCase()) {
    throw new BootstrapError('BOOTSTRAP_REFUSED', 'connected database does not match configured DB_NAME');
  }

  const migrationOwnedNames = await discoverMigrationOwnedNames();
  await assertNoUnexpectedObjects(pool, migrationOwnedNames);
  await validateMigrationColumns(pool);
  const existingTables = await existingTableNames(pool);
  const missing = await validateExistingFoundation(pool, existingTables);
  if (missing.length === 0) {
    console.log('Foundation bootstrap: compatible foundation already present; no changes made.');
    return;
  }

  const foundationSql = await fs.readFile(FOUNDATION_SQL_PATH, 'utf8');
  const transaction = pool.transaction();
  await transaction.begin();
  try {
    await new sql.Request(transaction).batch(foundationSql);
    await transaction.commit();
  } catch (error) {
    try { await transaction.rollback(); } catch { /* preserve the original error */ }
    throw new BootstrapError('BOOTSTRAP_SCHEMA_CONFLICT', 'foundation creation failed and was rolled back');
  }
  console.log(`Foundation bootstrap created: ${missing.join(', ')}`);
}

async function main(): Promise<void> {
  try {
    await bootstrapFoundation(await getPool());
    console.log('FOUNDATION_BOOTSTRAP_COMPLETE');
  } catch (error) {
    if (error instanceof BootstrapError) console.error(error.message);
    else console.error('BOOTSTRAP_REFUSED: foundation bootstrap failed');
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) void main();
