import * as sql from 'mssql';
import { getPool, query } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export type PlanEntitlementKey = 'COACH_BOOKING_ENABLED' | 'COACH_BOOKING_MONTHLY_LIMIT';
export type PlanEntitlementValueType = 'BOOLEAN' | 'INTEGER' | 'UNLIMITED';

export interface PlanEntitlement {
  id: number;
  plan_id: number;
  entitlement_key: PlanEntitlementKey;
  entitlement_value: string;
  value_type: PlanEntitlementValueType;
  created_at: Date;
  updated_at: Date;
}

export interface PlanEntitlementInput {
  entitlement_key: PlanEntitlementKey;
  entitlement_value: string;
  value_type: PlanEntitlementValueType;
}

export interface ActiveMembershipPlan {
  membership_id: number;
  plan_id: number;
  end_date: Date;
  entitlements: PlanEntitlement[];
}

const keys = new Set<PlanEntitlementKey>(['COACH_BOOKING_ENABLED', 'COACH_BOOKING_MONTHLY_LIMIT']);
const types = new Set<PlanEntitlementValueType>(['BOOLEAN', 'INTEGER', 'UNLIMITED']);
type SqlExecutor = sql.ConnectionPool | sql.Transaction;

function requestFor(executor: SqlExecutor): sql.Request {
  return executor instanceof sql.Transaction ? new sql.Request(executor) : executor.request();
}

function migrationError(error: unknown): never | null {
  if ((error as { number?: number }).number === 208) {
    throw new AppError(503, 'Plan entitlement migration is required', 'PLAN_ENTITLEMENTS_MIGRATION_REQUIRED');
  }
  return null;
}

export function normalizeEntitlements(value: unknown): PlanEntitlementInput[] {
  if (!Array.isArray(value)) throw new AppError(400, 'Entitlements must be an array', 'INVALID_ENTITLEMENTS');
  const seen = new Set<string>();
  return value.map((entry): PlanEntitlementInput => {
    const input = entry as Partial<PlanEntitlementInput>;
    const key = String(input.entitlement_key || '') as PlanEntitlementKey;
    const valueType = String(input.value_type || '') as PlanEntitlementValueType;
    const entitlementValue = String(input.entitlement_value ?? '').trim();
    if (!keys.has(key) || !types.has(valueType) || !entitlementValue) throw new AppError(400, 'Invalid Plan entitlement', 'INVALID_ENTITLEMENT');
    if (seen.has(key)) throw new AppError(400, 'Each Plan entitlement key may appear only once', 'DUPLICATE_ENTITLEMENT_KEY');
    seen.add(key);
    if (key === 'COACH_BOOKING_ENABLED' && (valueType !== 'BOOLEAN' || !['true', 'false'].includes(entitlementValue))) {
      throw new AppError(400, 'COACH_BOOKING_ENABLED must be a BOOLEAN true/false value', 'INVALID_ENTITLEMENT_VALUE');
    }
    if (key === 'COACH_BOOKING_MONTHLY_LIMIT') {
      const integer = Number(entitlementValue);
      const validInteger = valueType === 'INTEGER' && Number.isInteger(integer) && integer >= 0;
      const validUnlimited = valueType === 'UNLIMITED' && entitlementValue === '-1';
      if (!validInteger && !validUnlimited) throw new AppError(400, 'COACH_BOOKING_MONTHLY_LIMIT must be a non-negative INTEGER or UNLIMITED -1', 'INVALID_ENTITLEMENT_VALUE');
    }
    return { entitlement_key: key, entitlement_value: entitlementValue, value_type: valueType };
  });
}

export async function listPlanEntitlements(planIds?: number[]): Promise<Map<number, PlanEntitlement[]>> {
  try {
    const normalizedIds = planIds === undefined
      ? undefined
      : [...new Set(planIds.map(Number).filter(value => Number.isSafeInteger(value) && value > 0))];
    if (normalizedIds && normalizedIds.length === 0) return new Map();
    const params: Record<string, unknown> = {};
    const filter = normalizedIds
      ? ` WHERE plan_id IN (${normalizedIds.map((planId, index) => {
        const parameter = `planId${index}`;
        params[parameter] = planId;
        return `@${parameter}`;
      }).join(',')})`
      : '';
    const result = await query<PlanEntitlement>(`SELECT id, plan_id, entitlement_key, entitlement_value, value_type, created_at, updated_at
      FROM dbo.PlanEntitlements${filter} ORDER BY plan_id, entitlement_key`, params);
    const allowed = normalizedIds ? new Set(normalizedIds) : null;
    const grouped = new Map<number, PlanEntitlement[]>();
    for (const row of result.recordset) {
      const planId = Number(row.plan_id);
      if (allowed && !allowed.has(planId)) continue;
      const list = grouped.get(planId) || [];
      list.push({ ...row, id: Number(row.id), plan_id: planId });
      grouped.set(planId, list);
    }
    return grouped;
  } catch (error) {
    migrationError(error);
    throw error;
  }
}

export async function getPlanEntitlements(planId: number): Promise<PlanEntitlement[]> {
  const grouped = await listPlanEntitlements([planId]);
  return grouped.get(planId) || [];
}

async function readActiveMembershipPlan(executor: SqlExecutor, userId: number): Promise<ActiveMembershipPlan | null> {
  try {
    const result = await requestFor(executor)
      .input('userId', sql.Int, userId)
      .query<{
      membership_id: number;
      plan_id: number;
      end_date: Date;
      entitlement_id: number | null;
      entitlement_key: PlanEntitlementKey | null;
      entitlement_value: string | null;
      value_type: PlanEntitlementValueType | null;
      entitlement_created_at: Date | null;
      entitlement_updated_at: Date | null;
      }>(`SELECT m.id AS membership_id, m.plan_id, m.end_date,
          e.id AS entitlement_id, e.entitlement_key, e.entitlement_value, e.value_type,
          e.created_at AS entitlement_created_at, e.updated_at AS entitlement_updated_at
        FROM dbo.Memberships m WITH (UPDLOCK,HOLDLOCK)
        LEFT JOIN dbo.PlanEntitlements e ON e.plan_id = m.plan_id
        WHERE m.user_id=@userId AND m.status=N'active'
          AND m.start_date <= SYSUTCDATETIME() AND m.end_date > SYSUTCDATETIME()
        ORDER BY m.id DESC, e.entitlement_key`);
    const membershipIds = [...new Set(result.recordset.map(row => Number(row.membership_id)))];
    if (membershipIds.length > 1) throw new AppError(409, 'Membership data has more than one active record', 'MEMBERSHIP_DATA_CONFLICT');
    const first = result.recordset[0];
    if (!first) return null;
    return {
      membership_id: Number(first.membership_id),
      plan_id: Number(first.plan_id),
      end_date: first.end_date,
      entitlements: result.recordset
        .filter(row => row.entitlement_id !== null && row.entitlement_key !== null && row.entitlement_value !== null && row.value_type !== null)
        .map(row => ({
          id: Number(row.entitlement_id),
          plan_id: Number(row.plan_id),
          entitlement_key: row.entitlement_key as PlanEntitlementKey,
          entitlement_value: String(row.entitlement_value),
          value_type: row.value_type as PlanEntitlementValueType,
          created_at: row.entitlement_created_at as Date,
          updated_at: row.entitlement_updated_at as Date,
        })),
    };
  } catch (error) {
    migrationError(error);
    throw error;
  }
}

export async function getActiveMembershipPlan(userId: number): Promise<ActiveMembershipPlan | null> {
  return readActiveMembershipPlan(await getPool(), userId);
}

export async function getActiveMembershipPlanForTransaction(tx: sql.Transaction, userId: number): Promise<ActiveMembershipPlan | null> {
  return readActiveMembershipPlan(tx, userId);
}

export async function replacePlanEntitlements(planId: number, value: unknown): Promise<PlanEntitlement[]> {
  const entitlements = normalizeEntitlements(value);
  const tx = new sql.Transaction(await getPool());
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const plan = await new sql.Request(tx)
      .input('planId', sql.Int, planId)
      .query('SELECT id FROM dbo.Plans WITH (UPDLOCK, HOLDLOCK) WHERE id=@planId');
    if (!plan.recordset[0]) throw new AppError(404, 'Plan not found', 'PLAN_NOT_FOUND');
    await new sql.Request(tx).input('planIdDelete', sql.Int, planId).query('DELETE FROM dbo.PlanEntitlements WHERE plan_id=@planIdDelete');
    for (const entitlement of entitlements) {
      await new sql.Request(tx)
        .input('planIdInsert', sql.Int, planId)
        .input('key', sql.NVarChar(100), entitlement.entitlement_key)
        .input('value', sql.NVarChar(50), entitlement.entitlement_value)
        .input('valueType', sql.NVarChar(20), entitlement.value_type)
        .query(`INSERT dbo.PlanEntitlements(plan_id, entitlement_key, entitlement_value, value_type)
                VALUES(@planIdInsert, @key, @value, @valueType)`);
    }
    const result = await new sql.Request(tx)
      .input('planIdRead', sql.Int, planId)
      .query<PlanEntitlement>(`SELECT id, plan_id, entitlement_key, entitlement_value, value_type, created_at, updated_at
        FROM dbo.PlanEntitlements WHERE plan_id=@planIdRead ORDER BY entitlement_key`);
    await tx.commit();
    return result.recordset.map(row => ({ ...row, id: Number(row.id), plan_id: Number(row.plan_id) }));
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve the original failure */ }
    migrationError(error);
    throw error;
  }
}
