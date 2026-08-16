import * as bcrypt from 'bcryptjs';
import { closePool, query } from '../config/database';

if (process.env.COACH_ACCEPTANCE !== '1' || !process.env.DB_NAME || !['GYMFIT_DB_COACH_ACCEPTANCE_', 'GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_'].some(prefix => process.env.DB_NAME!.startsWith(prefix))) {
  throw new Error('Coach Member Context acceptance requires COACH_ACCEPTANCE=1 and an isolated Coach acceptance database');
}

const base = process.env.COACH_API_BASE || 'http://localhost:5000/api';
const suffix = process.env.COACH_MEMBER_CONTEXT_FIXTURE_SUFFIX || `${Date.now()}`;
const password = process.env.COACH_MEMBER_CONTEXT_PASSWORD || `CoachContext#${suffix.slice(-8)}`;
const emails = {
  coachA: `context-coach-a-${suffix}@example.test`,
  coachB: `context-coach-b-${suffix}@example.test`,
  member: `context-member-${suffix}@example.test`,
  admin: `context-admin-${suffix}@example.test`,
};

type AccountKey = keyof typeof emails;
type Account = { id: number; email: string; password: string; token?: string };
type Json = Record<string, any>;
type ApiResult = { status: number; body: Json };
type Context = { id: number; coach_id: number; member_id: number; goal: string | null; limitations: string | null; private_note: string | null; next_review_date: string | null; created_at: string; updated_at: string };
type ContextResponse = { context: Context | null; readOnly: boolean; currentCoachId: number | null };

const accounts = Object.fromEntries(Object.entries(emails).map(([key, email]) => [key, { id: 0, email, password }])) as Record<AccountKey, Account>;
const check = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`ASSERTION_FAILED ${message}`);
  console.log(`PASS ${message}`);
};
const dataOf = <T,>(result: ApiResult): T => result.body.data as T;

async function call(method: string, path: string, account?: Account, body?: unknown): Promise<ApiResult> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(account?.token ? { Authorization: `Bearer ${account.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: Json;
  try { parsed = JSON.parse(text) as Json; } catch { parsed = { message: text }; }
  return { status: response.status, body: parsed };
}

async function login(account: Account): Promise<void> {
  const result = await call('POST', '/auth/login', undefined, { email: account.email, password: account.password });
  check(result.status === 200 && typeof dataOf<{ accessToken?: unknown }>(result).accessToken === 'string', `${account.email} login`);
  account.token = String(dataOf<{ accessToken: string }>(result).accessToken);
}

async function cleanup(): Promise<void> {
  const users = await query<{ id: number }>('SELECT id FROM dbo.Users WHERE email LIKE @pattern', { pattern: `%context-%-${suffix}@example.test` });
  const ids = users.recordset.map(row => Number(row.id));
  if (!ids.length) return;
  const csv = ids.join(',');
  await query(`DELETE FROM dbo.CoachMemberContexts WHERE coach_id IN (${csv}) OR member_id IN (${csv})`);
  await query(`DELETE FROM dbo.CRMCustomers WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuditLogs WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuthSessions WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Users WHERE id IN (${csv})`);
}

async function seed(): Promise<void> {
  await cleanup();
  const hash = await bcrypt.hash(password, 10);
  const roles: Record<AccountKey, string> = { coachA: 'coach', coachB: 'coach', member: 'member', admin: 'admin' };
  for (const key of Object.keys(emails) as AccountKey[]) {
    const result = await query<{ id: number }>(
      `INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version,coach_status)
       OUTPUT INSERTED.id VALUES(@email,@password,@name,@role,1,1,0,@coachStatus)`,
      { email: emails[key], password: hash, name: `Context ${key}`, role: roles[key], coachStatus: roles[key] === 'coach' ? 'ACTIVE' : null },
    );
    accounts[key].id = Number(result.recordset[0].id);
  }
  await query('INSERT dbo.CRMCustomers(user_id,assigned_coach_id) VALUES(@member,@coachA)', { member: accounts.member.id, coachA: accounts.coachA.id });
}

function hasCode(result: ApiResult, code: string): boolean {
  return JSON.stringify(result.body.errors ?? result.body).includes(code);
}

async function run(): Promise<void> {
  await seed();
  await Promise.all(Object.values(accounts).map(login));

  check((await call('GET', `/coach/members/${accounts.member.id}/context`)).status === 401, 'Guest cannot read Coach Member context');
  check((await call('GET', `/coach/members/${accounts.member.id}/context`, accounts.member)).status === 403, 'Member cannot read private Coach context');
  check((await call('PATCH', `/coach/members/${accounts.member.id}/context`, accounts.admin, { goal: 'leak' })).status === 403, 'Admin cannot use Coach private context route');

  const initial = await call('GET', `/coach/members/${accounts.member.id}/context`, accounts.coachA);
  check(initial.status === 200 && dataOf<ContextResponse>(initial).context === null && !dataOf<ContextResponse>(initial).readOnly && dataOf<ContextResponse>(initial).currentCoachId === accounts.coachA.id, 'Current Coach can read an empty context');

  const created = await call('PATCH', `/coach/members/${accounts.member.id}/context`, accounts.coachA, {
    goal: 'Build consistent strength',
    limitations: 'Previous shoulder discomfort',
    privateNote: 'Private coaching note: review overhead press form.',
    nextReviewDate: '2026-08-20',
    expectedUpdatedAt: null,
  });
  check(created.status === 200 && dataOf<ContextResponse>(created).context?.private_note === 'Private coaching note: review overhead press form.' && !dataOf<ContextResponse>(created).readOnly, 'Current Coach can create private goals and notes');

  const loaded = await call('GET', `/coach/members/${accounts.member.id}/context`, accounts.coachA);
  const loadedContext = dataOf<ContextResponse>(loaded).context!;
  check(loaded.status === 200 && loadedContext.goal === 'Build consistent strength' && loadedContext.next_review_date === '2026-08-20', 'Context round-trips with stable date and text fields');

  check((await call('GET', `/coach/members/${accounts.member.id}/context`, accounts.coachB)).status === 404, 'Non-owner Coach cannot read another Coach context');
  check((await call('PATCH', `/coach/members/${accounts.member.id}/context`, accounts.coachB, { goal: 'cross-owner write' })).status === 404, 'Non-owner Coach cannot write another Coach context');

  const concurrent = await Promise.all([
    call('PATCH', `/coach/members/${accounts.member.id}/context`, accounts.coachA, { goal: 'Concurrent winner A', expectedUpdatedAt: loadedContext.updated_at }),
    call('PATCH', `/coach/members/${accounts.member.id}/context`, accounts.coachA, { goal: 'Concurrent winner B', expectedUpdatedAt: loadedContext.updated_at }),
  ]);
  check(concurrent.map(result => result.status).sort((a, b) => a - b).join(',') === '200,409', 'Concurrent context updates have one optimistic-lock winner');
  check(concurrent.some(result => result.status === 409 && hasCode(result, 'COACH_CONTEXT_CONFLICT')), 'Stale context update returns a stable conflict code');

  await query('UPDATE dbo.CRMCustomers SET assigned_coach_id=@coachB WHERE user_id=@member', { coachB: accounts.coachB.id, member: accounts.member.id });
  const oldCoachRead = await call('GET', `/coach/members/${accounts.member.id}/context`, accounts.coachA);
  check(oldCoachRead.status === 200 && dataOf<ContextResponse>(oldCoachRead).readOnly && dataOf<ContextResponse>(oldCoachRead).currentCoachId === accounts.coachB.id, 'Previous Coach can read historical context as read-only after reassignment');
  const oldCoachWrite = await call('PATCH', `/coach/members/${accounts.member.id}/context`, accounts.coachA, { goal: 'must not change', expectedUpdatedAt: dataOf<ContextResponse>(oldCoachRead).context?.updated_at });
  check(oldCoachWrite.status === 403 && hasCode(oldCoachWrite, 'COACH_CONTEXT_READ_ONLY'), 'Previous Coach cannot edit context after reassignment');

  const newCoachRead = await call('GET', `/coach/members/${accounts.member.id}/context`, accounts.coachB);
  check(newCoachRead.status === 200 && dataOf<ContextResponse>(newCoachRead).context === null && !dataOf<ContextResponse>(newCoachRead).readOnly, 'New Coach receives a separate empty context scope');
  const newCoachWrite = await call('PATCH', `/coach/members/${accounts.member.id}/context`, accounts.coachB, {
    goal: 'New Coach onboarding goal',
    limitations: null,
    privateNote: 'New Coach private context',
    nextReviewDate: null,
    expectedUpdatedAt: null,
  });
  check(newCoachWrite.status === 200 && dataOf<ContextResponse>(newCoachWrite).context?.coach_id === accounts.coachB.id, 'New Coach can create only its own context');
  const oldCoachAfter = await call('GET', `/coach/members/${accounts.member.id}/context`, accounts.coachA);
  check(oldCoachAfter.status === 200 && dataOf<ContextResponse>(oldCoachAfter).context?.coach_id === accounts.coachA.id && Boolean(dataOf<ContextResponse>(oldCoachAfter).context?.private_note?.includes('Private coaching note')), 'Old Coach remains scoped to the historical context and cannot see the new Coach note');

  console.log(JSON.stringify({ verdict: 'PASS', database: process.env.DB_NAME, policy: 'previous Coach read-only; new Coach gets separate context' }));
}

if (process.argv.includes('--cleanup')) {
  cleanup().then(() => console.log(`COACH_MEMBER_CONTEXT_CLEANUP PASS ${process.env.DB_NAME}`)).catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
} else {
  run().catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
}
