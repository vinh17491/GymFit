import { closePool, query } from '../config/database';
import { getActiveMembershipPlan } from '../modules/plans/entitlements.service';

if (process.env.COACH_ACCEPTANCE !== '1' || !process.env.DB_NAME?.startsWith('GYMFIT_DB_COACH_ACCEPTANCE_')) {
  throw new Error('Coach entitlement acceptance requires COACH_ACCEPTANCE=1 and an isolated GYMFIT_DB_COACH_ACCEPTANCE_* database');
}

const base = process.env.COACH_API_BASE || 'http://localhost:5000/api';
const check = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`ASSERTION_FAILED ${message}`);
  console.log(`PASS ${message}`);
};

type EntitlementRow = {
  plan_id: number;
  sort_order: number;
  entitlement_key: string;
  entitlement_value: string;
  value_type: string;
};

type ApiPlan = {
  id: number;
  sort_order: number;
  entitlements?: Array<{
    entitlement_key: string;
    entitlement_value: string;
    value_type: string;
  }>;
};

async function verifyDatabase(): Promise<void> {
  const object = await query<{ present: number }>(
    `SELECT CASE WHEN OBJECT_ID(N'dbo.PlanEntitlements', N'U') IS NULL THEN 0 ELSE 1 END AS present`,
  );
  check(Number(object.recordset[0]?.present) === 1, 'PlanEntitlements table exists');

  const rows = await query<EntitlementRow>(
    `SELECT p.id AS plan_id, p.sort_order, e.entitlement_key, e.entitlement_value, e.value_type
     FROM dbo.Plans p
     LEFT JOIN dbo.PlanEntitlements e ON e.plan_id = p.id
     WHERE p.is_active = 1 AND p.sort_order IN (1, 2, 3)
     ORDER BY p.sort_order, e.entitlement_key`,
  );
  const grouped = new Map<number, EntitlementRow[]>();
  for (const row of rows.recordset) {
    if (!row.entitlement_key) continue;
    const list = grouped.get(Number(row.sort_order)) || [];
    list.push({ ...row, plan_id: Number(row.plan_id), sort_order: Number(row.sort_order) });
    grouped.set(Number(row.sort_order), list);
  }
  check(grouped.size === 3 && [...grouped.values()].every(list => list.length === 2), 'Starter/Pro/Elite slots each have two structured entitlements');

  const expected: Record<number, Record<string, [string, string]>> = {
    1: {
      COACH_BOOKING_ENABLED: ['false', 'BOOLEAN'],
      COACH_BOOKING_MONTHLY_LIMIT: ['0', 'INTEGER'],
    },
    2: {
      COACH_BOOKING_ENABLED: ['true', 'BOOLEAN'],
      COACH_BOOKING_MONTHLY_LIMIT: ['2', 'INTEGER'],
    },
    3: {
      COACH_BOOKING_ENABLED: ['true', 'BOOLEAN'],
      COACH_BOOKING_MONTHLY_LIMIT: ['-1', 'UNLIMITED'],
    },
  };
  for (const sortOrder of [1, 2, 3]) {
    for (const [key, [value, valueType]] of Object.entries(expected[sortOrder])) {
      const row = grouped.get(sortOrder)?.find(item => item.entitlement_key === key);
      check(Boolean(row), `structured entitlement ${sortOrder}/${key} exists`);
      if (!row) continue;
      check(row.entitlement_value === value && row.value_type === valueType, `structured entitlement ${sortOrder}/${key} is correct`);
    }
  }

  const activeMember = await query<{ user_id: number }>(
    `SELECT TOP (1) user_id FROM dbo.Memberships
     WHERE status=N'active' AND start_date <= SYSUTCDATETIME() AND end_date > SYSUTCDATETIME()
     ORDER BY id`,
  );
  const activeMembershipPlan = activeMember.recordset[0]
    ? await getActiveMembershipPlan(Number(activeMember.recordset[0].user_id))
    : null;
  check(Boolean(activeMembershipPlan) && (activeMembershipPlan?.entitlements.length || 0) === 2, 'active Membership helper resolves structured Plan entitlements');

  const duplicatePlan = await query<{ id: number }>('SELECT TOP (1) id FROM dbo.Plans WHERE is_active = 1 AND sort_order = 1');
  const duplicatePlanId = Number(duplicatePlan.recordset[0]?.id);
  let duplicateRejected = false;
  try {
    await query(
      `INSERT dbo.PlanEntitlements(plan_id, entitlement_key, entitlement_value, value_type)
       VALUES(@planId, N'COACH_BOOKING_ENABLED', N'false', N'BOOLEAN')`,
      { planId: duplicatePlanId },
    );
  } catch (error) {
    const number = Number((error as { number?: number }).number);
    duplicateRejected = number === 2601 || number === 2627;
  }
  check(duplicateRejected, 'unique Plan entitlement key rejects duplicate rows');

  let invalidRejected = false;
  const invalidPlan = await query<{ id: number }>('SELECT TOP (1) id FROM dbo.Plans WHERE is_active = 1 AND sort_order = 4');
  const invalidPlanId = Number(invalidPlan.recordset[0]?.id);
  try {
    await query(
      `INSERT dbo.PlanEntitlements(plan_id, entitlement_key, entitlement_value, value_type)
       VALUES(@planId, N'COACH_BOOKING_ENABLED', N'not-a-boolean', N'BOOLEAN')`,
      { planId: invalidPlanId },
    );
  } catch (error) {
    const number = Number((error as { number?: number }).number);
    invalidRejected = number === 547;
  }
  check(invalidRejected, 'check constraint rejects invalid entitlement values');
}

async function verifyApi(): Promise<void> {
  const response = await fetch(`${base}/plans`);
  const body = await response.json() as { data?: ApiPlan[] };
  check(response.status === 200 && Array.isArray(body.data), 'public Plans API returns structured plan data');
  const plans = (body.data || []).filter(plan => [1, 2, 3].includes(Number(plan.sort_order)));
  check(plans.length === 3 && plans.every(plan => Array.isArray(plan.entitlements) && plan.entitlements.length === 2), 'public Plans API includes typed entitlements without parsing features');
}

async function run(): Promise<void> {
  await verifyDatabase();
  await verifyApi();
  console.log(JSON.stringify({ verdict: 'PASS', database: process.env.DB_NAME, migration: '0012_membership_entitlements' }));
}

run()
  .catch(error => {
    console.error('[COACH ENTITLEMENT ACCEPTANCE FAIL]', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => { await closePool(); });
