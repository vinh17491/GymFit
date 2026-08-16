import * as bcrypt from 'bcryptjs';
import { closePool, query } from '../config/database';

if (process.env.COACH_ACCEPTANCE !== '1' || !process.env.DB_NAME?.startsWith('GYMFIT_DB_COACH_ACCEPTANCE_')) {
  throw new Error('Coach membership acceptance requires COACH_ACCEPTANCE=1 and an isolated GYMFIT_DB_COACH_ACCEPTANCE_* database');
}

const base = process.env.COACH_API_BASE || 'http://localhost:5000/api';
const suffix = process.env.COACH_MEMBERSHIP_FIXTURE_SUFFIX || `${Date.now()}`;
const password = process.env.COACH_MEMBERSHIP_PASSWORD || `Membership#${suffix.slice(-8)}`;
const emails = {
  memberA: `membership-member-a-${suffix}@example.test`,
  memberB: `membership-member-b-${suffix}@example.test`,
  coach: `membership-coach-${suffix}@example.test`,
  admin: `membership-admin-${suffix}@example.test`,
};

type AccountKey = keyof typeof emails;
type Account = { id: number; email: string; password: string; token?: string };
const accounts = Object.fromEntries(Object.entries(emails).map(([key, email]) => [key, { id: 0, email, password }])) as Record<AccountKey, Account>;
const check = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`ASSERTION_FAILED ${message}`);
  console.log(`PASS ${message}`);
};

type ApiResponse = {
  status: number;
  data: { data?: any; message?: string; errors?: any };
};

async function cleanup(): Promise<void> {
  const users = await query<{ id: number }>('SELECT id FROM dbo.Users WHERE email LIKE @pattern', { pattern: `%membership-%-${suffix}@example.test` });
  const ids = users.recordset.map(row => Number(row.id));
  if (ids.length === 0) return;
  const csv = ids.join(',');
  await query(`DELETE FROM dbo.Memberships WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Payments WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuditLogs WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuthSessions WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Users WHERE id IN (${csv})`);
}

async function seed(): Promise<void> {
  await cleanup();
  const hash = await bcrypt.hash(password, 10);
  const roles: Record<AccountKey, string> = { memberA: 'member', memberB: 'member', coach: 'coach', admin: 'admin' };
  for (const key of Object.keys(emails) as AccountKey[]) {
    const result = await query<{ id: number }>(
      `INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version)
       OUTPUT INSERTED.id VALUES(@email,@password,@name,@role,1,1,0)`,
      { email: emails[key], password: hash, name: `Membership ${key}`, role: roles[key] },
    );
    accounts[key].id = Number(result.recordset[0].id);
  }
}

async function call(method: string, path: string, account?: Account, body?: unknown): Promise<ApiResponse> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(account?.token ? { Authorization: `Bearer ${account.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data: ApiResponse['data'] = {};
  try { data = JSON.parse(text) as ApiResponse['data']; } catch { data = { message: text }; }
  return { status: response.status, data };
}

async function login(account: Account): Promise<void> {
  const result = await call('POST', '/auth/login', undefined, { email: account.email, password: account.password });
  check(result.status === 200 && typeof result.data.data?.accessToken === 'string', `${account.email} login`);
  account.token = result.data.data.accessToken;
}

async function run(): Promise<void> {
  await seed();
  await Promise.all(Object.values(accounts).map(login));

  const plans = await query<{ id: number; price: number }>('SELECT id, price FROM dbo.Plans WHERE is_active=1 ORDER BY price, id');
  check(plans.recordset.length >= 3, 'at least three active plans are available');
  const [basic, premium, vip] = plans.recordset.slice(0, 3).map(row => ({ id: Number(row.id), price: Number(row.price) }));

  check((await call('GET', '/plans/my-membership')).status === 401, 'guest cannot read membership state');
  check((await call('POST', '/plans/subscribe', accounts.coach, { plan_id: basic.id })).status === 403, 'Coach cannot subscribe through Member route');
  check((await call('POST', '/plans/subscribe', accounts.admin, { plan_id: basic.id })).status === 403, 'Admin cannot subscribe through Member route');

  const initial = await call('GET', '/plans/my-membership', accounts.memberA);
  check(initial.status === 200 && initial.data.data.lifecycle === null && initial.data.data.membership === null && initial.data.data.pendingPayment === null, 'new Member has no membership or pending payment');

  const pending = await call('POST', '/plans/subscribe', accounts.memberA, { plan_id: basic.id });
  const pendingPaymentId = Number(pending.data.data?.pendingPayment?.id);
  check(pending.status === 201 && pending.data.data.lifecycle === 'PENDING_PAYMENT' && pending.data.data.membership === null && pending.data.data.pendingPayment?.status === 'pending', 'subscribe creates pending payment without Membership');
  const beforeConfirm = await query<{ memberships: number; payments: number; method: string }>(
    `SELECT (SELECT COUNT(*) FROM dbo.Memberships WHERE user_id=@userId) memberships,
            (SELECT COUNT(*) FROM dbo.Payments WHERE user_id=@userId AND status=N'pending') payments,
            (SELECT TOP 1 method FROM dbo.Payments WHERE user_id=@userId ORDER BY id DESC) method`,
    { userId: accounts.memberA.id },
  );
  check(Number(beforeConfirm.recordset[0].memberships) === 0 && Number(beforeConfirm.recordset[0].payments) === 1 && beforeConfirm.recordset[0].method === 'SIMULATED_SUBSCRIPTION', 'pending state uses Payments.method and does not activate early');
  check((await call('POST', '/plans/subscribe', accounts.memberA, { plan_id: basic.id })).status === 409, 'duplicate pending subscription is rejected');

  const confirmed = await call('POST', '/plans/subscribe/confirm', accounts.memberA, { payment_id: pendingPaymentId });
  const membershipId = Number(confirmed.data.data?.membership?.id);
  check(confirmed.status === 200 && confirmed.data.data.lifecycle === 'ACTIVE' && confirmed.data.data.membership?.status === 'active' && confirmed.data.data.pendingPayment === null, 'simulated confirmation atomically activates Membership');
  const confirmedAgain = await call('POST', '/plans/subscribe/confirm', accounts.memberA, { payment_id: pendingPaymentId });
  check(confirmedAgain.status === 200 && Number(confirmedAgain.data.data.membership?.id) === membershipId, 'payment confirmation is idempotent');
  check((await call('POST', '/plans/subscribe/confirm', accounts.memberB, { payment_id: pendingPaymentId })).status === 404, 'Member cannot confirm another Member payment');

  const upgradePending = await call('POST', '/plans/upgrade', accounts.memberA, { plan_id: premium.id });
  const upgradePaymentId = Number(upgradePending.data.data?.pendingPayment?.id);
  check(upgradePending.status === 201 && upgradePending.data.data.lifecycle === 'PENDING_PAYMENT' && upgradePending.data.data.membership?.id === membershipId, 'upgrade keeps current Membership while payment is pending');
  const activeDuringUpgrade = await query<{ count: number }>(`SELECT COUNT(*) count FROM dbo.Memberships WHERE user_id=@userId AND status=N'active' AND end_date>SYSUTCDATETIME()`, { userId: accounts.memberA.id });
  check(Number(activeDuringUpgrade.recordset[0].count) === 1, 'upgrade pending state keeps one active Membership');
  const upgrade = await call('POST', '/plans/subscribe/confirm', accounts.memberA, { payment_id: upgradePaymentId });
  check(upgrade.status === 200 && upgrade.data.data.lifecycle === 'ACTIVE' && Number(upgrade.data.data.membership?.plan_id) === premium.id, 'upgrade confirmation replaces the active Membership atomically');
  const afterUpgrade = await query<{ active_count: number; cancelled_count: number }>(`SELECT SUM(CASE WHEN status=N'active' THEN 1 ELSE 0 END) active_count, SUM(CASE WHEN status=N'cancelled' THEN 1 ELSE 0 END) cancelled_count FROM dbo.Memberships WHERE user_id=@userId`, { userId: accounts.memberA.id });
  check(Number(afterUpgrade.recordset[0].active_count) === 1 && Number(afterUpgrade.recordset[0].cancelled_count) >= 1, 'upgrade leaves historical Membership cancelled and only one active');

  const downgradePending = await call('POST', '/plans/downgrade', accounts.memberA, { plan_id: basic.id });
  const downgradePaymentId = Number(downgradePending.data.data?.pendingPayment?.id);
  check(downgradePending.status === 201 && downgradePending.data.data.pendingPayment?.method === 'SIMULATED_DOWNGRADE', 'downgrade creates a typed simulated payment');
  const downgrade = await call('POST', '/plans/subscribe/confirm', accounts.memberA, { payment_id: downgradePaymentId });
  check(downgrade.status === 200 && Number(downgrade.data.data.membership?.plan_id) === basic.id, 'downgrade confirmation activates the target plan');
  check((await call('POST', '/plans/upgrade', accounts.memberA, { plan_id: basic.id })).status === 409, 'same-price plan is not accepted as an upgrade');
  check((await call('POST', '/plans/downgrade', accounts.memberA, { plan_id: vip.id })).status === 409, 'higher-price plan is not accepted as a downgrade');

  const cancelled = await call('POST', '/plans/cancel', accounts.memberA);
  check(cancelled.status === 200 && cancelled.data.data.lifecycle === 'CANCELLED' && cancelled.data.data.membership?.status === 'cancelled', 'Member can cancel an active Membership without updated_at column');
  check((await call('POST', '/plans/cancel', accounts.memberA)).status === 404, 'repeated Membership cancellation is rejected');

  const concurrentSubscriptions = await Promise.all([
    call('POST', '/plans/subscribe', accounts.memberB, { plan_id: basic.id }),
    call('POST', '/plans/subscribe', accounts.memberB, { plan_id: basic.id }),
  ]);
  const concurrentStatuses = concurrentSubscriptions.map(result => result.status).sort((a, b) => a - b).join(',');
  check(concurrentStatuses === '201,409', 'concurrent subscribe has one pending payment winner');
  const memberBState = await call('GET', '/plans/my-membership', accounts.memberB);
  const memberBPaymentId = Number(memberBState.data.data?.pendingPayment?.id);
  const concurrentConfirmations = await Promise.all([
    call('POST', '/plans/subscribe/confirm', accounts.memberB, { payment_id: memberBPaymentId }),
    call('POST', '/plans/subscribe/confirm', accounts.memberB, { payment_id: memberBPaymentId }),
  ]);
  check(concurrentConfirmations.every(result => result.status === 200) && concurrentConfirmations.every(result => result.data.data.lifecycle === 'ACTIVE'), 'concurrent confirmation is idempotent and activates once');
  const memberBCounts = await query<{ active_count: number; completed_count: number; audit_count: number }>(
    `SELECT (SELECT COUNT(*) FROM dbo.Memberships WHERE user_id=@userId AND status=N'active') active_count,
            (SELECT COUNT(*) FROM dbo.Payments WHERE user_id=@userId AND status=N'completed') completed_count,
            (SELECT COUNT(*) FROM dbo.AuditLogs WHERE user_id=@userId AND entity_type IN (N'Payment',N'Membership')) audit_count`,
    { userId: accounts.memberB.id },
  );
  check(Number(memberBCounts.recordset[0].active_count) === 1 && Number(memberBCounts.recordset[0].completed_count) === 1 && Number(memberBCounts.recordset[0].audit_count) >= 3, 'membership/payment mutations are auditable and single-active');

  console.log(JSON.stringify({ verdict: 'PASS', database: process.env.DB_NAME, accounts: emails, password, planIds: { basic: basic.id, premium: premium.id, vip: vip.id } }));
}

if (process.argv.includes('--cleanup')) {
  cleanup().then(() => console.log(`COACH_MEMBERSHIP_CLEANUP PASS ${process.env.DB_NAME}`)).catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
} else {
  run().catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
}
