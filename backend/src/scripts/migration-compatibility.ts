import type { ConnectionPool } from 'mssql';
import { sql } from '../config/database';

type DataType = 'int' | 'bigint' | 'bit' | 'date' | 'datetime2' | 'decimal' | 'nvarchar';

interface ColumnContract {
  name: string;
  dataType: DataType;
  maxLength?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  identity?: boolean;
}

interface KeyContract {
  columns: readonly string[];
  filteredPredicate?: string;
}

interface ForeignKeyContract {
  columns: readonly string[];
  referencedTable: string;
  referencedColumns: readonly string[];
}

interface CheckContract {
  description: string;
  definitionIncludes: readonly string[];
}

export interface MigrationCompatibilityContract {
  migration: string;
  table: string;
  columns: readonly ColumnContract[];
  primaryKey: readonly string[];
  uniqueKeys: readonly KeyContract[];
  foreignKeys: readonly ForeignKeyContract[];
  checks: readonly CheckContract[];
  dataQuery: string;
}

interface ColumnRow {
  name: string;
  data_type: DataType;
  max_length: number;
  precision: number;
  scale: number;
  is_nullable: number;
  is_identity: number;
}

interface IndexColumnRow {
  index_name: string;
  is_primary_key: number;
  is_unique: number;
  filter_definition: string | null;
  key_ordinal: number;
  column_name: string;
}

interface ForeignKeyRow {
  fk_name: string;
  parent_column: string;
  referenced_table: string;
  referenced_column: string;
  constraint_column_id: number;
}

interface CheckRow {
  name: string;
  definition: string;
}

const int = (name: string, nullable = false, identity = false): ColumnContract => ({ name, dataType: 'int', maxLength: 4, nullable, identity });
const bigint = (name: string, nullable = false): ColumnContract => ({ name, dataType: 'bigint', maxLength: 8, nullable });
const bit = (name: string, nullable = false): ColumnContract => ({ name, dataType: 'bit', maxLength: 1, nullable });
const date = (name: string, nullable = false): ColumnContract => ({ name, dataType: 'date', maxLength: 3, nullable });
const datetime2 = (name: string, nullable = false): ColumnContract => ({ name, dataType: 'datetime2', maxLength: 8, nullable });
const decimal = (name: string, precision: number, scale: number, nullable = false): ColumnContract => ({ name, dataType: 'decimal', precision, scale, nullable });
const nvarchar = (name: string, characters: number | 'max', nullable = false): ColumnContract => ({ name, dataType: 'nvarchar', maxLength: characters === 'max' ? -1 : characters * 2, nullable });

const fk = (columns: readonly string[], referencedTable: string, referencedColumns: readonly string[] = ['id']): ForeignKeyContract => ({ columns, referencedTable, referencedColumns });
const unique = (columns: readonly string[], filteredPredicate?: string): KeyContract => ({ columns, filteredPredicate });
const check = (description: string, ...definitionIncludes: string[]): CheckContract => ({ description, definitionIncludes });
const key = (name: string): readonly string[] => [name];

function validDataQuery(table: string, predicate: string): string {
  return `SELECT CASE WHEN EXISTS (SELECT 1 FROM dbo.${table} WHERE ${predicate}) THEN 1 ELSE 0 END AS invalid_count`;
}

function validDataQueryWithDuplicate(table: string, predicate: string, duplicateQuery: string): string {
  return `SELECT CASE WHEN EXISTS (SELECT 1 FROM dbo.${table} WHERE ${predicate}) OR EXISTS (${duplicateQuery}) THEN 1 ELSE 0 END AS invalid_count`;
}

export const MIGRATION_COMPATIBILITY_REGISTRY: readonly MigrationCompatibilityContract[] = [
  {
    migration: '0112', table: 'ReferralCodes',
    columns: [int('id', false, true), int('user_id'), nvarchar('code', 20), nvarchar('status', 20), datetime2('created_at')],
    primaryKey: key('id'), uniqueKeys: [unique(key('user_id')), unique(key('code'))],
    foreignKeys: [fk(key('user_id'), 'Users')],
    checks: [check('referral status', 'status', "n'active'", "n'disabled'"), check('referral code length', 'len', 'ltrim', 'rtrim', 'code')],
    dataQuery: validDataQueryWithDuplicate('ReferralCodes', "status NOT IN (N'active',N'disabled') OR LEN(LTRIM(RTRIM(code))) < 3 OR NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=ReferralCodes.user_id)", 'SELECT user_id FROM dbo.ReferralCodes GROUP BY user_id HAVING COUNT(*) > 1'),
  },
  {
    migration: '0112', table: 'ReferralTransactions',
    columns: [int('id', false, true), int('referrer_id'), int('referred_id'), decimal('commission_amount', 10, 2), nvarchar('transaction_type', 50), nvarchar('status', 20), datetime2('created_at')],
    primaryKey: key('id'), uniqueKeys: [unique(['referrer_id', 'referred_id', 'transaction_type'], "transaction_type=N'registration'")],
    foreignKeys: [fk(key('referrer_id'), 'Users'), fk(key('referred_id'), 'Users')],
    checks: [check('referral commission', 'commission_amount', '>=', '0'), check('referral transaction status', 'status', "n'pending'", "n'confirmed'", "n'paid"), check('referral users differ', 'referrer_id', '<>', 'referred_id')],
    dataQuery: validDataQueryWithDuplicate('ReferralTransactions', "commission_amount < 0 OR status NOT IN (N'pending',N'confirmed',N'paid') OR referrer_id=referred_id OR NOT EXISTS (SELECT 1 FROM dbo.Users referrer WHERE referrer.id=ReferralTransactions.referrer_id) OR NOT EXISTS (SELECT 1 FROM dbo.Users referred WHERE referred.id=ReferralTransactions.referred_id)", "SELECT referrer_id,referred_id,transaction_type FROM dbo.ReferralTransactions WHERE transaction_type=N'registration' GROUP BY referrer_id,referred_id,transaction_type HAVING COUNT(*) > 1"),
  },
  {
    migration: '0113', table: 'Coupons',
    columns: [int('id', false, true), nvarchar('code', 50), nvarchar('type', 20), decimal('value', 10, 2), decimal('min_purchase', 10, 2), datetime2('start_date'), datetime2('end_date'), int('usage_limit', true), int('user_limit'), nvarchar('applicable_plans', 500, true), bit('is_active'), int('created_by', true), datetime2('created_at')],
    primaryKey: key('id'), uniqueKeys: [unique(key('code'))], foreignKeys: [fk(key('created_by'), 'Users')],
    checks: [check('coupon type', 'type', "n'fixed'", "n'percentage'", "n'free_trial'", "n'first_purchase'", "n'referral'", "n'flash_sale'"), check('coupon value', 'value', '>=', '0'), check('coupon minimum', 'min_purchase', '>=', '0'), check('coupon dates', 'end_date', '>=', 'start_date'), check('coupon usage limit', 'usage_limit', 'is', 'null', '>', '0'), check('coupon user limit', 'user_limit', '>', '0'), check('coupon code length', 'len', 'ltrim', 'rtrim', 'code')],
    dataQuery: validDataQuery('Coupons', "type NOT IN (N'fixed',N'percentage',N'free_trial',N'first_purchase',N'referral',N'flash_sale') OR value < 0 OR min_purchase < 0 OR end_date < start_date OR (usage_limit IS NOT NULL AND usage_limit <= 0) OR user_limit <= 0 OR LEN(LTRIM(RTRIM(code))) < 3 OR (created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=Coupons.created_by))"),
  },
  {
    migration: '0113', table: 'CouponUsages',
    columns: [int('id', false, true), int('coupon_id'), int('user_id'), int('order_id', true), decimal('discount_amount', 10, 2), datetime2('used_at')],
    primaryKey: key('id'), uniqueKeys: [], foreignKeys: [fk(key('coupon_id'), 'Coupons'), fk(key('user_id'), 'Users')],
    checks: [check('coupon usage discount', 'discount_amount', '>=', '0')],
    dataQuery: validDataQuery('CouponUsages', "discount_amount < 0 OR NOT EXISTS (SELECT 1 FROM dbo.Coupons c WHERE c.id=CouponUsages.coupon_id) OR NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=CouponUsages.user_id)"),
  },
  {
    migration: '0114', table: 'Points',
    columns: [int('id', false, true), int('user_id'), int('balance'), int('lifetime_earned'), int('lifetime_spent'), datetime2('created_at'), datetime2('updated_at')],
    primaryKey: key('id'), uniqueKeys: [unique(key('user_id'))], foreignKeys: [fk(key('user_id'), 'Users')],
    checks: [check('points balance', 'balance', '>=', '0'), check('points earned', 'lifetime_earned', '>=', '0'), check('points spent', 'lifetime_spent', '>=', '0')],
    dataQuery: validDataQuery('Points', 'balance < 0 OR lifetime_earned < 0 OR lifetime_spent < 0 OR NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=Points.user_id)'),
  },
  {
    migration: '0114', table: 'PointTransactions',
    columns: [int('id', false, true), int('user_id'), nvarchar('type', 20), int('points'), nvarchar('source', 50), int('reference_id', true), nvarchar('description', 200, true), datetime2('created_at')],
    primaryKey: key('id'), uniqueKeys: [], foreignKeys: [fk(key('user_id'), 'Users')],
    checks: [check('point transaction type', 'type', "n'earn'", "n'spend'"), check('point transaction amount', 'points', '>', '0'), check('point transaction source', 'len', 'ltrim', 'rtrim', 'source')],
    dataQuery: validDataQuery('PointTransactions', "type NOT IN (N'earn',N'spend') OR points <= 0 OR LEN(LTRIM(RTRIM(source))) = 0 OR NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=PointTransactions.user_id)"),
  },
  {
    migration: '0114', table: 'RewardsCatalog',
    columns: [int('id', false, true), nvarchar('name', 100), nvarchar('description', 500, true), int('points_cost'), int('stock'), nvarchar('image', 500, true), nvarchar('category', 50, true), bit('is_active'), datetime2('created_at')],
    primaryKey: key('id'), uniqueKeys: [], foreignKeys: [],
    checks: [check('reward points cost', 'points_cost', '>', '0'), check('reward stock', 'stock', '>=', '0')],
    dataQuery: validDataQuery('RewardsCatalog', 'points_cost <= 0 OR stock < 0'),
  },
  {
    migration: '0114', table: 'RewardRedemptions',
    columns: [int('id', false, true), int('user_id'), int('reward_id'), int('points_spent'), nvarchar('status', 20), datetime2('created_at')],
    primaryKey: key('id'), uniqueKeys: [], foreignKeys: [fk(key('user_id'), 'Users'), fk(key('reward_id'), 'RewardsCatalog')],
    checks: [check('redemption points', 'points_spent', '>', '0'), check('redemption status', 'status', "n'pending'", "n'fulfilled'", "n'cancelled'")],
    dataQuery: validDataQuery('RewardRedemptions', "points_spent <= 0 OR status NOT IN (N'pending',N'fulfilled',N'cancelled') OR NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=RewardRedemptions.user_id) OR NOT EXISTS (SELECT 1 FROM dbo.RewardsCatalog r WHERE r.id=RewardRedemptions.reward_id)"),
  },
  {
    migration: '0115', table: 'Tickets',
    columns: [int('id', false, true), int('user_id'), nvarchar('subject', 200), nvarchar('category', 50), nvarchar('priority', 10), nvarchar('status', 20), int('assigned_to', true), datetime2('created_at'), datetime2('updated_at')],
    primaryKey: key('id'), uniqueKeys: [], foreignKeys: [fk(key('user_id'), 'Users'), fk(key('assigned_to'), 'Users')],
    checks: [check('ticket priority', 'priority', "n'low'", "n'medium'", "n'high'", "n'urgent'"), check('ticket status', 'status', "n'open'", "n'pending'", "n'resolved'", "n'closed'")],
    dataQuery: validDataQuery('Tickets', "priority NOT IN (N'low',N'medium',N'high',N'urgent') OR status NOT IN (N'open',N'pending',N'resolved',N'closed') OR NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=Tickets.user_id) OR (assigned_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Users a WHERE a.id=Tickets.assigned_to))"),
  },
  {
    migration: '0115', table: 'TicketMessages',
    columns: [int('id', false, true), int('ticket_id'), int('sender_id'), nvarchar('message', 'max'), bit('is_internal'), datetime2('created_at')],
    primaryKey: key('id'), uniqueKeys: [], foreignKeys: [fk(key('ticket_id'), 'Tickets'), fk(key('sender_id'), 'Users')], checks: [],
    dataQuery: validDataQuery('TicketMessages', 'NOT EXISTS (SELECT 1 FROM dbo.Tickets t WHERE t.id=TicketMessages.ticket_id) OR NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=TicketMessages.sender_id)'),
  },
  {
    migration: '0116', table: 'Payments',
    columns: [int('id', false, true), int('user_id'), int('plan_id', true), decimal('amount', 10, 2), nvarchar('method', 50), nvarchar('status', 20), nvarchar('transaction_id', 255, true), datetime2('created_at')],
    primaryKey: key('id'), uniqueKeys: [], foreignKeys: [fk(key('user_id'), 'Users'), fk(key('plan_id'), 'Plans')],
    checks: [check('payment amount', 'amount', '>=', '0'), check('payment status', 'status', "n'pending'", "n'completed'", "n'failed'", "n'refunded'"), check('payment method', 'len', 'ltrim', 'rtrim', 'method')],
    dataQuery: validDataQuery('Payments', "amount < 0 OR status NOT IN (N'pending',N'completed',N'failed',N'refunded') OR LEN(LTRIM(RTRIM(method))) = 0 OR NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=Payments.user_id) OR (plan_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Plans p WHERE p.id=Payments.plan_id))"),
  },
  {
    migration: '0116', table: 'Invoices',
    columns: [int('id', false, true), nvarchar('invoice_number', 50), int('user_id'), int('payment_id', true), decimal('amount', 10, 2), decimal('tax', 10, 2), decimal('discount', 10, 2), decimal('total', 10, 2), nvarchar('pdf_path', 500, true), bit('email_sent'), datetime2('created_at')],
    primaryKey: key('id'), uniqueKeys: [unique(key('invoice_number')), unique(key('payment_id'), 'payment_id IS NOT NULL')], foreignKeys: [fk(key('user_id'), 'Users'), fk(key('payment_id'), 'Payments')],
    checks: [check('invoice amounts', 'amount', '>=', '0', 'tax', 'discount', 'total')],
    dataQuery: validDataQueryWithDuplicate('Invoices', 'amount < 0 OR tax < 0 OR discount < 0 OR total < 0 OR NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=Invoices.user_id) OR (payment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Payments p WHERE p.id=Invoices.payment_id))', 'SELECT payment_id FROM dbo.Invoices WHERE payment_id IS NOT NULL GROUP BY payment_id HAVING COUNT(*) > 1'),
  },
  {
    migration: '0117', table: 'AuditLogs',
    columns: [bigint('id', false), int('user_id', true), nvarchar('action', 100), nvarchar('entity_type', 50), int('entity_id', true), nvarchar('old_value', 'max', true), nvarchar('new_value', 'max', true), nvarchar('ip', 45, true), nvarchar('device', 500, true), datetime2('timestamp')],
    primaryKey: key('id'), uniqueKeys: [], foreignKeys: [fk(key('user_id'), 'Users')], checks: [],
    dataQuery: validDataQuery('AuditLogs', 'user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=AuditLogs.user_id)'),
  },
  {
    migration: '0117', table: 'BackupLogs',
    columns: [int('id', false, true), nvarchar('type', 20), nvarchar('status', 20), nvarchar('file_path', 500, true), bigint('file_size', true), int('duration_seconds', true), bit('verified'), int('created_by', true), datetime2('created_at')],
    primaryKey: key('id'), uniqueKeys: [], foreignKeys: [fk(key('created_by'), 'Users')],
    checks: [check('backup type', 'type', "n'daily'", "n'weekly'", "n'monthly'", "n'manual'"), check('backup status', 'status', "n'pending'", "n'running'", "n'completed'", "n'failed'"), check('backup size', 'file_size', 'is', 'null', '>=', '0'), check('backup duration', 'duration_seconds', 'is', 'null', '>=', '0')],
    dataQuery: validDataQuery('BackupLogs', "type NOT IN (N'daily',N'weekly',N'monthly',N'manual') OR status NOT IN (N'pending',N'running',N'completed',N'failed') OR (file_size IS NOT NULL AND file_size < 0) OR (duration_seconds IS NOT NULL AND duration_seconds < 0) OR (created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=BackupLogs.created_by))"),
  },
  {
    migration: '0117', table: 'CRMNotes',
    columns: [int('id', false, true), int('customer_id'), int('author_id'), nvarchar('content', 'max'), nvarchar('type', 20), datetime2('created_at')],
    primaryKey: key('id'), uniqueKeys: [], foreignKeys: [fk(key('customer_id'), 'CRMCustomers'), fk(key('author_id'), 'Users')],
    checks: [check('CRM note type', 'type', "n'note'", "n'follow_up'", "n'coach_note'")],
    dataQuery: validDataQuery('CRMNotes', "type NOT IN (N'note',N'follow_up',N'coach_note') OR NOT EXISTS (SELECT 1 FROM dbo.CRMCustomers c WHERE c.id=CRMNotes.customer_id) OR NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=CRMNotes.author_id)"),
  },
  {
    migration: '0117', table: 'CRMTasks',
    columns: [int('id', false, true), int('customer_id'), int('assigned_to', true), nvarchar('title', 200), nvarchar('description', 'max', true), datetime2('due_date'), nvarchar('status', 20), datetime2('created_at')],
    primaryKey: key('id'), uniqueKeys: [], foreignKeys: [fk(key('customer_id'), 'CRMCustomers'), fk(key('assigned_to'), 'Users')],
    checks: [check('CRM task status', 'status', "n'pending'", "n'in_progress'", "n'completed'", "n'cancelled'")],
    dataQuery: validDataQuery('CRMTasks', "status NOT IN (N'pending',N'in_progress',N'completed',N'cancelled') OR NOT EXISTS (SELECT 1 FROM dbo.CRMCustomers c WHERE c.id=CRMTasks.customer_id) OR (assigned_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.id=CRMTasks.assigned_to))"),
  },
  {
    migration: '0118', table: 'AnalyticsDaily',
    columns: [int('id', false, true), date('date'), int('dau'), int('new_users'), int('new_memberships'), decimal('revenue', 12, 2), int('workouts_completed'), int('tickets_created'), int('coupons_used'), int('points_earned'), int('points_redeemed')],
    primaryKey: key('id'), uniqueKeys: [unique(key('date'))], foreignKeys: [],
    checks: [check('analytics daily counts', 'dau', 'new_users', 'new_memberships', 'workouts_completed', 'tickets_created', 'coupons_used', 'points_earned', 'points_redeemed', 'revenue')],
    dataQuery: validDataQueryWithDuplicate('AnalyticsDaily', 'dau < 0 OR new_users < 0 OR new_memberships < 0 OR workouts_completed < 0 OR tickets_created < 0 OR coupons_used < 0 OR points_earned < 0 OR points_redeemed < 0 OR revenue < 0', 'SELECT date FROM dbo.AnalyticsDaily GROUP BY date HAVING COUNT(*) > 1'),
  },
  {
    migration: '0119', table: 'AnalyticsRetention',
    columns: [int('id', false, true), date('cohort_date'), int('day_1', true), int('day_7', true), int('day_14', true), int('day_30', true), int('day_60', true), int('day_90', true), int('total_users')],
    primaryKey: key('id'), uniqueKeys: [unique(key('cohort_date'))], foreignKeys: [],
    checks: [check('analytics retention counts', 'day_1', 'day_7', 'day_14', 'day_30', 'day_60', 'day_90', 'total_users')],
    dataQuery: validDataQueryWithDuplicate('AnalyticsRetention', '(day_1 IS NOT NULL AND day_1 < 0) OR (day_7 IS NOT NULL AND day_7 < 0) OR (day_14 IS NOT NULL AND day_14 < 0) OR (day_30 IS NOT NULL AND day_30 < 0) OR (day_60 IS NOT NULL AND day_60 < 0) OR (day_90 IS NOT NULL AND day_90 < 0) OR total_users < 0', 'SELECT cohort_date FROM dbo.AnalyticsRetention GROUP BY cohort_date HAVING COUNT(*) > 1'),
  },
];

const registryByTable = new Map(MIGRATION_COMPATIBILITY_REGISTRY.map((contract) => [contract.table, contract]));

export function getMigrationCompatibilityContract(table: string, migration: string): MigrationCompatibilityContract | undefined {
  const contract = registryByTable.get(table);
  return contract?.migration === migration ? contract : undefined;
}

function normalized(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

async function validateColumns(pool: ConnectionPool, contract: MigrationCompatibilityContract): Promise<void> {
  const result = await pool.request().input('tableName', sql.NVarChar(128), contract.table).query<ColumnRow>(`
    SELECT c.name,LOWER(t.name) AS data_type,c.max_length,c.precision,c.scale,c.is_nullable,c.is_identity
    FROM sys.columns c
    JOIN sys.types t ON t.user_type_id=c.user_type_id
    WHERE c.object_id=OBJECT_ID(N'dbo.'+@tableName,N'U')
    ORDER BY c.column_id`);
  const actual = new Map(result.recordset.map((row) => [row.name, row]));
  const mismatches: string[] = [];
  for (const expected of contract.columns) {
    const row = actual.get(expected.name);
    if (!row) { mismatches.push(`missing column ${expected.name}`); continue; }
    if (row.data_type !== expected.dataType) mismatches.push(`${expected.name}.type=${row.data_type} expected ${expected.dataType}`);
    if (expected.maxLength !== undefined && Number(row.max_length) !== expected.maxLength) mismatches.push(`${expected.name}.max_length=${row.max_length} expected ${expected.maxLength}`);
    if (expected.precision !== undefined && Number(row.precision) !== expected.precision) mismatches.push(`${expected.name}.precision=${row.precision} expected ${expected.precision}`);
    if (expected.scale !== undefined && Number(row.scale) !== expected.scale) mismatches.push(`${expected.name}.scale=${row.scale} expected ${expected.scale}`);
    if (Boolean(row.is_nullable) !== expected.nullable) mismatches.push(`${expected.name}.nullable=${row.is_nullable} expected ${expected.nullable ? 1 : 0}`);
    if (expected.identity !== undefined && Boolean(row.is_identity) !== expected.identity) mismatches.push(`${expected.name}.identity=${row.is_identity} expected ${expected.identity ? 1 : 0}`);
  }
  if (mismatches.length > 0) throw new Error(`SCHEMA_MISMATCH: dbo.${contract.table} column contract failed: ${mismatches.join('; ')}`);
}

function sameColumns(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((column, index) => column.toLowerCase() === expected[index].toLowerCase());
}

async function readIndexes(pool: ConnectionPool, table: string): Promise<IndexColumnRow[]> {
  const result = await pool.request().input('tableName', sql.NVarChar(128), table).query<IndexColumnRow>(`
    SELECT i.name AS index_name,i.is_primary_key,i.is_unique,i.filter_definition,ic.key_ordinal,c.name AS column_name
    FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal > 0
    JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
    WHERE i.object_id=OBJECT_ID(N'dbo.'+@tableName,N'U') AND i.is_hypothetical=0
    ORDER BY i.name,ic.key_ordinal`);
  return result.recordset;
}

async function validateKeys(pool: ConnectionPool, contract: MigrationCompatibilityContract): Promise<void> {
  const rows = await readIndexes(pool, contract.table);
  const grouped = new Map<string, { primary: boolean; unique: boolean; filter: string | null; columns: string[] }>();
  for (const row of rows) {
    const key = grouped.get(row.index_name) ?? { primary: Boolean(row.is_primary_key), unique: Boolean(row.is_unique), filter: row.filter_definition, columns: [] };
    key.columns.push(row.column_name);
    grouped.set(row.index_name, key);
  }
  const values = [...grouped.values()];
  const primary = values.find((item) => item.primary);
  if (!primary || !sameColumns(primary.columns, contract.primaryKey)) throw new Error(`SCHEMA_MISMATCH: dbo.${contract.table} primary-key contract failed`);
  for (const expected of contract.uniqueKeys) {
    const found = values.some((item) => item.unique && !item.primary && sameColumns(item.columns, expected.columns)
      && (!expected.filteredPredicate || normalized(item.filter ?? '').includes(normalized(expected.filteredPredicate))));
    if (!found) throw new Error(`SCHEMA_MISMATCH: dbo.${contract.table} unique-key contract failed for (${expected.columns.join(',')})`);
  }
}

async function validateForeignKeys(pool: ConnectionPool, contract: MigrationCompatibilityContract): Promise<void> {
  const result = await pool.request().input('tableName', sql.NVarChar(128), contract.table).query<ForeignKeyRow>(`
    SELECT fk.name AS fk_name,pc.name AS parent_column,rt.name AS referenced_table,rc.name AS referenced_column,fkc.constraint_column_id
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id
    JOIN sys.columns pc ON pc.object_id=fkc.parent_object_id AND pc.column_id=fkc.parent_column_id
    JOIN sys.tables rt ON rt.object_id=fkc.referenced_object_id
    JOIN sys.columns rc ON rc.object_id=fkc.referenced_object_id AND rc.column_id=fkc.referenced_column_id
    WHERE fk.parent_object_id=OBJECT_ID(N'dbo.'+@tableName,N'U')
    ORDER BY fk.name,fkc.constraint_column_id`);
  const grouped = new Map<string, { table: string; columns: string[]; referencedColumns: string[] }>();
  for (const row of result.recordset) {
    const item = grouped.get(row.fk_name) ?? { table: row.referenced_table, columns: [], referencedColumns: [] };
    item.columns.push(row.parent_column);
    item.referencedColumns.push(row.referenced_column);
    grouped.set(row.fk_name, item);
  }
  const values = [...grouped.values()];
  for (const expected of contract.foreignKeys) {
    const found = values.some((item) => item.table.toLowerCase() === expected.referencedTable.toLowerCase()
      && sameColumns(item.columns, expected.columns) && sameColumns(item.referencedColumns, expected.referencedColumns));
    if (!found) throw new Error(`SCHEMA_MISMATCH: dbo.${contract.table} foreign-key contract failed for (${expected.columns.join(',')}) -> dbo.${expected.referencedTable}`);
  }
}

async function validateChecks(pool: ConnectionPool, contract: MigrationCompatibilityContract): Promise<void> {
  if (contract.checks.length === 0) return;
  const result = await pool.request().input('tableName', sql.NVarChar(128), contract.table).query<CheckRow>(`
    SELECT cc.name,cc.definition
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id=OBJECT_ID(N'dbo.'+@tableName,N'U')`);
  const definitions = result.recordset.map((row) => normalized(row.definition));
  for (const expected of contract.checks) {
    const found = definitions.some((definition) => expected.definitionIncludes.every((token) => definition.includes(normalized(token))));
    if (!found) throw new Error(`SCHEMA_MISMATCH: dbo.${contract.table} check contract failed for ${expected.description}`);
  }
}

async function validateData(pool: ConnectionPool, contract: MigrationCompatibilityContract): Promise<void> {
  const result = await pool.request().query<{ invalid_count: number }>(contract.dataQuery);
  if (Number(result.recordset[0]?.invalid_count ?? 0) > 0) {
    throw new Error(`SCHEMA_DATA_MISMATCH: dbo.${contract.table} contains rows outside the ${contract.migration} compatibility contract`);
  }
}

export async function validateMigrationCompatibility(pool: ConnectionPool, contract: MigrationCompatibilityContract): Promise<void> {
  await validateColumns(pool, contract);
  await validateKeys(pool, contract);
  await validateForeignKeys(pool, contract);
  await validateChecks(pool, contract);
  await validateData(pool, contract);
}
