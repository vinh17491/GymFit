import * as bcrypt from 'bcryptjs';
import { closePool, query } from '../config/database';
import { COACH_BOOKING_TIME_ZONE } from '../utils/coachBooking';
import { todayInTimeZone } from '../utils/timezone';

if (process.env.COACH_ACCEPTANCE !== '1' || !process.env.DB_NAME || !['GYMFIT_DB_COACH_ACCEPTANCE_', 'GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_'].some(prefix => process.env.DB_NAME!.startsWith(prefix))) {
  throw new Error('Coach quota acceptance requires COACH_ACCEPTANCE=1 and an isolated Coach acceptance database');
}

const base = process.env.COACH_API_BASE || 'http://localhost:5000/api';
const suffix = process.env.COACH_QUOTA_FIXTURE_SUFFIX || `${Date.now()}`;
const password = process.env.COACH_QUOTA_PASSWORD || `CoachQuota#${suffix.slice(-8)}`;
const emails = {
  coachA: `quota-coach-a-${suffix}@example.test`,
  coachB: `quota-coach-b-${suffix}@example.test`,
  starter: `quota-starter-${suffix}@example.test`,
  pro: `quota-pro-${suffix}@example.test`,
  proRace: `quota-pro-race-${suffix}@example.test`,
  elite: `quota-elite-${suffix}@example.test`,
  noMembership: `quota-no-membership-${suffix}@example.test`,
  admin: `quota-admin-${suffix}@example.test`,
};

type AccountKey = keyof typeof emails;
type Account = { id: number; email: string; password: string; token?: string };
const accounts = Object.fromEntries(Object.entries(emails).map(([key, email]) => [key, { id: 0, email, password }])) as Record<AccountKey, Account>;
const check = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`ASSERTION_FAILED ${message}`);
  console.log(`PASS ${message}`);
};

type ApiResult = { status: number; data: { data?: unknown; message?: string; errors?: unknown } };
type Quota = { included: boolean; monthlyLimit: number | null; used: number; remaining: number | null; bookingMonth: string; timezone: string; reason?: string };

function datePlus(days: number): string {
  const today = todayInTimeZone(COACH_BOOKING_TIME_ZONE);
  const [year, month, day] = today.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day) + days * 86400000);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

function nextMonthDate(): string {
  const today = todayInTimeZone(COACH_BOOKING_TIME_ZONE);
  const [year, month] = today.split('-').map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-02`;
}

function dataOf<T>(result: ApiResult): T {
  return result.data.data as T;
}

async function cleanup(): Promise<void> {
  const users = await query<{ id: number }>('SELECT id FROM dbo.Users WHERE email LIKE @pattern', { pattern: `%quota-%-${suffix}@example.test` });
  const ids = users.recordset.map(row => Number(row.id));
  if (ids.length === 0) return;
  const csv = ids.join(',');
  await query(`DELETE FROM dbo.Bookings WHERE coach_id IN (${csv}) OR member_id IN (${csv})`);
  await query(`DELETE FROM dbo.Memberships WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Payments WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuditLogs WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachAvailabilityRules WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachProfiles WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuthSessions WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Users WHERE id IN (${csv})`);
}

async function seed(): Promise<void> {
  await cleanup();
  const hash = await bcrypt.hash(password, 10);
  const roles: Record<AccountKey, string> = {
    coachA: 'coach', coachB: 'coach', starter: 'member', pro: 'member', proRace: 'member', elite: 'member', noMembership: 'member', admin: 'admin',
  };
  for (const key of Object.keys(emails) as AccountKey[]) {
    const result = await query<{ id: number }>(
      `INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version,coach_status)
       OUTPUT INSERTED.id VALUES(@email,@password,@name,@role,1,1,0,@coachStatus)`,
      { email: emails[key], password: hash, name: `Quota ${key}`, role: roles[key], coachStatus: roles[key] === 'coach' ? 'ACTIVE' : null },
    );
    accounts[key].id = Number(result.recordset[0].id);
  }
  await query(
    `INSERT dbo.CoachProfiles(coach_id,specialty,bio,experience_years,session_mode,location,booking_enabled)
     VALUES(@coachA,N'Strength',N'Quota Coach A',5,N'BOTH',N'GYMFIT',1),
           (@coachB,N'Mobility',N'Quota Coach B',4,N'ONLINE',N'Online',1)`,
    { coachA: accounts.coachA.id, coachB: accounts.coachB.id },
  );
  for (const coachId of [accounts.coachA.id, accounts.coachB.id]) {
    await query(
      `INSERT dbo.CoachAvailabilityRules(coach_id,weekday,start_time,end_time,mode,location,is_active)
       VALUES(@coachId,1,N'08:00',N'18:00',N'BOTH',N'GYMFIT',1),(@coachId,2,N'08:00',N'18:00',N'BOTH',N'GYMFIT',1),
             (@coachId,3,N'08:00',N'18:00',N'BOTH',N'GYMFIT',1),(@coachId,4,N'08:00',N'18:00',N'BOTH',N'GYMFIT',1),
             (@coachId,5,N'08:00',N'18:00',N'BOTH',N'GYMFIT',1),(@coachId,6,N'08:00',N'18:00',N'BOTH',N'GYMFIT',1),
             (@coachId,7,N'08:00',N'18:00',N'BOTH',N'GYMFIT',1)`,
      { coachId },
    );
  }
  const plans = await query<{ id: number; sort_order: number }>(
    'SELECT id, sort_order FROM dbo.Plans WHERE is_active=1 AND sort_order IN (1,2,3)',
  );
  const planByRank = new Map(plans.recordset.map(row => [Number(row.sort_order), Number(row.id)]));
  check(planByRank.size === 3, 'quota fixture has Starter/Pro/Elite Plan slots');
  await query(
    `INSERT dbo.Memberships(user_id,plan_id,start_date,end_date,status,auto_renew,created_at)
     VALUES(@starter,@starterPlan,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME()),
           (@pro,@proPlan,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME()),
           (@proRace,@proPlan,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME()),
           (@elite,@elitePlan,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME())`,
    { starter: accounts.starter.id, pro: accounts.pro.id, proRace: accounts.proRace.id, elite: accounts.elite.id, starterPlan: planByRank.get(1), proPlan: planByRank.get(2), elitePlan: planByRank.get(3) },
  );
}

async function call(method: string, path: string, account?: Account, body?: unknown): Promise<ApiResult> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(account?.token ? { Authorization: `Bearer ${account.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data: ApiResult['data'] = {};
  try { data = JSON.parse(text) as ApiResult['data']; } catch { data = { message: text }; }
  return { status: response.status, data };
}

async function login(account: Account): Promise<void> {
  const result = await call('POST', '/auth/login', undefined, { email: account.email, password: account.password });
  check(result.status === 200 && typeof (dataOf<{ accessToken?: unknown }>(result).accessToken) === 'string', `${account.email} login`);
  account.token = String(dataOf<{ accessToken: string }>(result).accessToken);
}

async function run(): Promise<void> {
  await seed();
  await Promise.all(Object.values(accounts).map(login));
  const currentDate = datePlus(2);
  const nextDate = nextMonthDate();

  check((await call('GET', '/bookings/quota')).status === 401, 'guest cannot read Coach booking quota');
  check((await call('GET', '/bookings/quota', accounts.coachA)).status === 403, 'Coach cannot read Member quota endpoint');
  check((await call('GET', '/bookings/quota', accounts.admin)).status === 403, 'Admin cannot bypass Member quota endpoint');

  const starterQuota = await call('GET', `/bookings/quota?date=${currentDate}`, accounts.starter);
  check(starterQuota.status === 200 && !(dataOf<Quota>(starterQuota).included) && dataOf<Quota>(starterQuota).remaining === 0, 'Starter-like Membership is excluded from Coach Booking');
  const starterBooking = await call('POST', '/bookings', accounts.starter, { coachId: accounts.coachA.id, date: currentDate, startTime: '08:00', sessionMode: 'ONLINE' });
  check(starterBooking.status === 403 && Boolean(starterBooking.data.errors) && JSON.stringify(starterBooking.data.errors).includes('COACH_BOOKING_NOT_INCLUDED'), 'Starter booking is blocked server-side');
  const noMembershipBooking = await call('POST', '/bookings', accounts.noMembership, { coachId: accounts.coachA.id, date: currentDate, startTime: '08:00', sessionMode: 'ONLINE' });
  check(noMembershipBooking.status === 403, 'Member without active Membership is blocked');

  const proInitial = await call('GET', `/bookings/quota?date=${currentDate}`, accounts.pro);
  check(proInitial.status === 200 && dataOf<Quota>(proInitial).included && dataOf<Quota>(proInitial).monthlyLimit === 2 && dataOf<Quota>(proInitial).used === 0 && dataOf<Quota>(proInitial).remaining === 2, 'Pro quota starts at two remaining reservations');
  const firstPro = await call('POST', '/bookings', accounts.pro, { coachId: accounts.coachA.id, date: currentDate, startTime: '08:00', sessionMode: 'ONLINE' });
  const secondPro = await call('POST', '/bookings', accounts.pro, { coachId: accounts.coachA.id, date: currentDate, startTime: '09:00', sessionMode: 'ONLINE' });
  check(firstPro.status === 201 && secondPro.status === 201, 'Pro can create reservations up to its monthly limit');
  const proFull = await call('GET', `/bookings/quota?date=${currentDate}`, accounts.pro);
  check(proFull.status === 200 && dataOf<Quota>(proFull).used === 2 && dataOf<Quota>(proFull).remaining === 0, 'Pro quota reports used and remaining counts');
  const thirdPro = await call('POST', '/bookings', accounts.pro, { coachId: accounts.coachA.id, date: currentDate, startTime: '10:00', sessionMode: 'ONLINE' });
  check(thirdPro.status === 409 && Boolean(thirdPro.data.errors) && JSON.stringify(thirdPro.data.errors).includes('COACH_BOOKING_QUOTA_EXCEEDED'), 'Pro third reservation is rejected at quota boundary');
  const cancelledPro = await call('PUT', `/bookings/${Number(dataOf<{ id: number }>(firstPro).id)}/status`, accounts.pro, { status: 'cancelled' });
  check(cancelledPro.status === 200, 'Member can cancel a quota-consuming reservation');
  const afterCancel = await call('POST', '/bookings', accounts.pro, { coachId: accounts.coachA.id, date: currentDate, startTime: '10:00', sessionMode: 'ONLINE' });
  check(afterCancel.status === 409, 'Cancelled reservation does not refund monthly quota');
  const nextMonthBooking = await call('POST', '/bookings', accounts.pro, { coachId: accounts.coachB.id, date: nextDate, startTime: '08:00', sessionMode: 'ONLINE' });
  check(nextMonthBooking.status === 201, 'Quota is evaluated against the requested Asia/Ho_Chi_Minh calendar month');
  const nextMonthQuota = await call('GET', `/bookings/quota?date=${nextDate}`, accounts.pro);
  check(nextMonthQuota.status === 200 && dataOf<Quota>(nextMonthQuota).used === 1 && dataOf<Quota>(nextMonthQuota).remaining === 1, 'next-month quota is independent from the current month');

  const eliteQuota = await call('GET', `/bookings/quota?date=${currentDate}`, accounts.elite);
  check(eliteQuota.status === 200 && dataOf<Quota>(eliteQuota).included && dataOf<Quota>(eliteQuota).monthlyLimit === null && dataOf<Quota>(eliteQuota).remaining === null, 'Elite quota is unlimited');
  const eliteBooking = await call('POST', '/bookings', accounts.elite, { coachId: accounts.coachA.id, date: currentDate, startTime: '11:00', sessionMode: 'ONLINE' });
  check(eliteBooking.status === 201, 'Elite can create Coach Booking without a finite quota');

  const raceSeed = await call('POST', '/bookings', accounts.proRace, { coachId: accounts.coachA.id, date: currentDate, startTime: '12:00', sessionMode: 'ONLINE' });
  check(raceSeed.status === 201, 'quota race fixture consumes one Pro reservation');
  const race = await Promise.all([
    call('POST', '/bookings', accounts.proRace, { coachId: accounts.coachA.id, date: currentDate, startTime: '13:00', sessionMode: 'ONLINE' }),
    call('POST', '/bookings', accounts.proRace, { coachId: accounts.coachB.id, date: currentDate, startTime: '14:00', sessionMode: 'ONLINE' }),
  ]);
  check(race.map(item => item.status).sort((a, b) => a - b).join(',') === '201,409', 'concurrent last-quota requests allow only one reservation');

  console.log(JSON.stringify({ verdict: 'PASS', database: process.env.DB_NAME, timezone: COACH_BOOKING_TIME_ZONE, currentDate, nextDate }));
}

run()
  .catch(error => {
    console.error('[COACH QUOTA ACCEPTANCE FAIL]', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => { await closePool(); });
