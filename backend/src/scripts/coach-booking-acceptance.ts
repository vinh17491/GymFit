import * as bcrypt from 'bcryptjs';
import { closePool, query } from '../config/database';
import { COACH_BOOKING_TIME_ZONE } from '../utils/coachBooking';
import { todayInTimeZone } from '../utils/timezone';

if (process.env.COACH_BOOKING_ACCEPTANCE !== '1' || !process.env.DB_NAME?.startsWith('GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_')) {
  throw new Error('Coach booking acceptance requires COACH_BOOKING_ACCEPTANCE=1 and an isolated GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_* database');
}

const base = process.env.COACH_API_BASE || 'http://localhost:5000/api';
const suffix = process.env.COACH_BOOKING_FIXTURE_SUFFIX || `${Date.now()}`;
const password = process.env.COACH_BOOKING_PASSWORD || `CoachBook#${suffix.slice(-8)}`;
const emails = {
  coachA: `coach-booking-a-${suffix}@example.test`,
  coachB: `coach-booking-b-${suffix}@example.test`,
  suspended: `coach-booking-suspended-${suffix}@example.test`,
  inactive: `coach-booking-inactive-${suffix}@example.test`,
  disabled: `coach-booking-disabled-${suffix}@example.test`,
  memberA: `member-booking-a-${suffix}@example.test`,
  memberB: `member-booking-b-${suffix}@example.test`,
  admin: `admin-booking-${suffix}@example.test`,
  seller: `seller-booking-${suffix}@example.test`,
};

type AccountKey = keyof typeof emails;
type Account = { id: number; email: string; password: string; token?: string };
const accounts = Object.fromEntries(Object.entries(emails).map(([key, email]) => [key, { id: 0, email, password }])) as Record<AccountKey, Account>;
const check = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`ASSERTION_FAILED ${message}`);
  console.log(`PASS ${message}`);
};

function datePlus(days: number): string {
  const today = todayInTimeZone(COACH_BOOKING_TIME_ZONE);
  const [year, month, day] = today.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day) + days * 86400000);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

async function cleanup(): Promise<void> {
  const users = await query<{ id: number }>(
    `SELECT id FROM dbo.Users
     WHERE email LIKE @coachPattern OR email LIKE @memberPattern OR email LIKE @adminPattern OR email LIKE @sellerPattern`,
    {
      coachPattern: 'coach-booking-%@example.test',
      memberPattern: 'member-booking-%@example.test',
      adminPattern: 'admin-booking-%@example.test',
      sellerPattern: 'seller-booking-%@example.test',
    },
  );
  const ids = users.recordset.map(row => Number(row.id));
  if (ids.length === 0) return;
  const csv = ids.join(',');
  await query(`DELETE FROM dbo.CoachAvailabilityExceptions WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachAvailabilityRules WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.Bookings WHERE coach_id IN (${csv}) OR member_id IN (${csv})`);
  await query(`DELETE FROM dbo.Memberships WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Payments WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuditLogs WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachProfiles WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuthSessions WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Users WHERE id IN (${csv})`);
}

async function seed(): Promise<void> {
  await cleanup();
  const hash = await bcrypt.hash(password, 10);
  const roles: Record<AccountKey, string> = {
    coachA: 'coach', coachB: 'coach', suspended: 'coach', inactive: 'coach', disabled: 'coach', memberA: 'member', memberB: 'member', admin: 'admin', seller: 'seller',
  };
  for (const key of Object.keys(emails) as AccountKey[]) {
    const result = await query<{ id: number }>(
      `INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version,coach_status)
       OUTPUT INSERTED.id VALUES(@email,@password,@name,@role,@isActive,1,0,@coachStatus)`,
      { email: emails[key], password: hash, name: `Booking ${key}`, role: roles[key], isActive: key === 'inactive' ? 0 : 1, coachStatus: key === 'suspended' ? 'SUSPENDED' : key === 'inactive' ? 'INACTIVE' : roles[key] === 'coach' ? 'ACTIVE' : null },
    );
    accounts[key].id = Number(result.recordset[0].id);
  }
  await query(
     `INSERT dbo.CoachProfiles(coach_id,specialty,bio,experience_years,session_mode,location,booking_enabled)
      VALUES(@coachA,N'Strength',N'Acceptance Coach A',5,N'BOTH',N'GYMFIT',1),
            (@coachB,N'Mobility',N'Acceptance Coach B',4,N'ONLINE',N'Online',1),
            (@suspended,N'Suspended',N'Not publicly bookable',3,N'IN_PERSON',N'GYMFIT',1),
            (@inactive,N'Inactive',N'Not publicly visible',2,N'ONLINE',N'Online',1),
            (@disabled,N'Booking disabled',N'Visible but not bookable',6,N'BOTH',N'GYMFIT',0)`,
    { coachA: accounts.coachA.id, coachB: accounts.coachB.id, suspended: accounts.suspended.id, inactive: accounts.inactive.id, disabled: accounts.disabled.id },
  );
  await query(
    `INSERT dbo.CoachAvailabilityRules(coach_id,weekday,start_time,end_time,mode,location,is_active)
     VALUES
       (@coachA,1,N'09:00',N'12:00',N'BOTH',N'GYMFIT',1),(@coachA,1,N'13:00',N'18:00',N'BOTH',N'GYMFIT',1),
       (@coachA,2,N'09:00',N'12:00',N'BOTH',N'GYMFIT',1),(@coachA,2,N'13:00',N'18:00',N'BOTH',N'GYMFIT',1),
       (@coachA,3,N'09:00',N'12:00',N'BOTH',N'GYMFIT',1),(@coachA,3,N'13:00',N'18:00',N'BOTH',N'GYMFIT',1),
       (@coachA,4,N'09:00',N'12:00',N'BOTH',N'GYMFIT',1),(@coachA,4,N'13:00',N'18:00',N'BOTH',N'GYMFIT',1),
       (@coachA,5,N'09:00',N'12:00',N'BOTH',N'GYMFIT',1),(@coachA,5,N'13:00',N'18:00',N'BOTH',N'GYMFIT',1),
       (@coachA,6,N'09:00',N'12:00',N'BOTH',N'GYMFIT',1),(@coachA,6,N'13:00',N'18:00',N'BOTH',N'GYMFIT',1),
       (@coachA,7,N'09:00',N'12:00',N'BOTH',N'GYMFIT',1),(@coachA,7,N'13:00',N'18:00',N'BOTH',N'GYMFIT',1),
       (@coachB,1,N'09:00',N'12:00',N'ONLINE',N'Online',1),(@coachB,1,N'13:00',N'18:00',N'ONLINE',N'Online',1),
       (@coachB,2,N'09:00',N'12:00',N'ONLINE',N'Online',1),(@coachB,2,N'13:00',N'18:00',N'ONLINE',N'Online',1),
       (@coachB,3,N'09:00',N'12:00',N'ONLINE',N'Online',1),(@coachB,3,N'13:00',N'18:00',N'ONLINE',N'Online',1),
       (@coachB,4,N'09:00',N'12:00',N'ONLINE',N'Online',1),(@coachB,4,N'13:00',N'18:00',N'ONLINE',N'Online',1),
       (@coachB,5,N'09:00',N'12:00',N'ONLINE',N'Online',1),(@coachB,5,N'13:00',N'18:00',N'ONLINE',N'Online',1),
       (@coachB,6,N'09:00',N'12:00',N'ONLINE',N'Online',1),(@coachB,6,N'13:00',N'18:00',N'ONLINE',N'Online',1),
       (@coachB,7,N'09:00',N'12:00',N'ONLINE',N'Online',1),(@coachB,7,N'13:00',N'18:00',N'ONLINE',N'Online',1)`,
    { coachA: accounts.coachA.id, coachB: accounts.coachB.id },
  );
  const elitePlan = await query<{ id: number }>('SELECT TOP (1) id FROM dbo.Plans WHERE is_active=1 AND sort_order=3 ORDER BY id');
  if (!elitePlan.recordset[0]) throw new Error('Coach booking acceptance requires migration 0012 and an Elite entitlement seed');
  await query(
    `INSERT dbo.Memberships(user_id,plan_id,start_date,end_date,status,auto_renew,created_at)
     VALUES(@memberA,@planId,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME()),
           (@memberB,@planId,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME())`,
    { memberA: accounts.memberA.id, memberB: accounts.memberB.id, planId: Number(elitePlan.recordset[0].id) },
  );
}

type ApiResult = { status: number; data: { data?: any; message?: string; pagination?: { page: number; limit: number; total: number; totalPages: number } } };
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
  check(result.status === 200 && typeof result.data.data?.accessToken === 'string', `${account.email} login`);
  account.token = result.data.data.accessToken;
}

async function run(): Promise<void> {
  await seed();
  await Promise.all([accounts.coachA, accounts.coachB, accounts.suspended, accounts.disabled, accounts.memberA, accounts.memberB, accounts.admin, accounts.seller].map(login));

  const bookingDate = datePlus(2);
  const secondDate = datePlus(3);
  const list = await call('GET', '/coaches');
  check(list.status === 200 && list.data.data.coaches.some((coach: any) => Number(coach.id) === accounts.coachA.id), 'public list returns active Coach');
  check(!list.data.data.coaches.some((coach: any) => Number(coach.id) === accounts.suspended.id), 'suspended Coach is hidden from public list');
  check(!list.data.data.coaches.some((coach: any) => Number(coach.id) === accounts.inactive.id), 'inactive Coach is hidden from public list');
  check(list.data.data.coaches.some((coach: any) => Number(coach.id) === accounts.disabled.id && coach.bookingEnabled === false), 'booking-disabled Coach remains visible with bookingEnabled=false');
  check((await call('GET', `/coaches/${accounts.suspended.id}`)).status === 404, 'suspended Coach detail is 404');
  check((await call('GET', `/coaches/${accounts.inactive.id}`)).status === 404, 'inactive Coach detail is 404');
  const paged = await call('GET', '/coaches?page=1&limit=1');
  check(paged.status === 200 && paged.data.data.pagination.page === 1 && paged.data.data.pagination.limit === 1 && paged.data.data.pagination.totalPages >= 1 && paged.data.data.coaches.length <= 1, 'public Coach list returns server pagination metadata');
  const searched = await call('GET', '/coaches?search=Mobility&page=1&limit=10');
  check(searched.status === 200 && searched.data.data.coaches.length === 1 && Number(searched.data.data.coaches[0].id) === accounts.coachB.id, 'public Coach search is server-side');
  check((await call('GET', '/coaches/not-an-id')).status === 400, 'invalid Coach ID is rejected');
  const availability = await call('GET', `/coaches/${accounts.coachA.id}/availability?date=${bookingDate}`);
  check(availability.status === 200 && availability.data.data.active === true && availability.data.data.booking_enabled === true
    && availability.data.data.duration_minutes === 60 && availability.data.data.timezone === COACH_BOOKING_TIME_ZONE
    && Array.isArray(availability.data.data.rules) && Array.isArray(availability.data.data.slots)
    && availability.data.data.available_slots.includes('10:00') && !availability.data.data.available_slots.includes('12:00'), 'availability uses database rules and canonical timezone');
  check((await call('GET', `/coaches/${accounts.coachA.id}/availability?date=2026-02-31`)).status === 400, 'invalid availability date is rejected');
  check((await call('GET', `/coaches/${accounts.suspended.id}/availability?date=${bookingDate}`)).status === 404, 'suspended Coach availability is hidden');
  const disabledAvailability = await call('GET', `/coaches/${accounts.disabled.id}/availability?date=${bookingDate}`);
  check(disabledAvailability.status === 200 && disabledAvailability.data.data.active === true && disabledAvailability.data.data.booking_enabled === false && disabledAvailability.data.data.available_slots.length === 0, 'booking-disabled Coach exposes no public slots');
  const selfRules = await call('GET', '/coach/availability/rules', accounts.coachA);
  check(selfRules.status === 200 && selfRules.data.data.some((rule: any) => rule.weekday === 5 && rule.start_time === '09:00'), 'Coach can read own availability rules');
  const overlapRule = await call('POST', '/coach/availability/rules', accounts.coachA, { weekday: 5, startTime: '10:00', endTime: '11:00', mode: 'BOTH' });
  check(overlapRule.status === 409, 'overlapping weekly availability rule is rejected');
  const extraRule = await call('POST', '/coach/availability/rules', accounts.coachA, { weekday: 7, startTime: '18:00', endTime: '19:00', mode: 'BOTH' });
  check(extraRule.status === 201, 'Coach can create a non-overlapping weekly rule');
  const extraRuleId = Number(extraRule.data.data.id);
  const updatedRule = await call('PATCH', `/coach/availability/rules/${extraRuleId}`, accounts.coachA, { location: 'Updated Gym' });
  check(updatedRule.status === 200 && updatedRule.data.data.location === 'Updated Gym', 'Coach can update an owned availability rule');
  check((await call('DELETE', `/coach/availability/rules/${extraRuleId}`, accounts.coachB)).status === 404, 'Coach cannot delete another Coach availability rule');
  check((await call('DELETE', `/coach/availability/rules/${extraRuleId}`, accounts.coachA)).status === 200, 'Coach can delete an owned availability rule');
  const blockException = await call('POST', '/coach/availability/exceptions', accounts.coachA, { exceptionDate: datePlus(10), exceptionType: 'BLOCK' });
  check(blockException.status === 201, 'Coach can create a date block exception');
  const blockedAvailability = await call('GET', `/coaches/${accounts.coachA.id}/availability?date=${datePlus(10)}`);
  check(blockedAvailability.status === 200 && blockedAvailability.data.data.available_slots.length === 0, 'date block suppresses recurring availability');
  const openException = await call('POST', '/coach/availability/exceptions', accounts.coachA, { exceptionDate: datePlus(10), exceptionType: 'OPEN', startTime: '10:00', endTime: '12:00', mode: 'BOTH' });
  check(openException.status === 201, 'Coach can add an explicit open window');
  const reopenedAvailability = await call('GET', `/coaches/${accounts.coachA.id}/availability?date=${datePlus(10)}`);
  check(reopenedAvailability.status === 200 && reopenedAvailability.data.data.available_slots.includes('10:00'), 'open exception adds a real slot after a block');
  const patchedException = await call('PATCH', `/coach/availability/exceptions/${Number(openException.data.data.id)}`, accounts.coachA, { note: 'Special opening' });
  check(patchedException.status === 200 && patchedException.data.data.note === 'Special opening', 'Coach can update an owned availability exception');
  check((await call('DELETE', `/coach/availability/exceptions/${Number(openException.data.data.id)}`, accounts.coachA)).status === 200, 'Coach can delete an owned availability exception');
  check((await call('DELETE', `/coach/availability/exceptions/${Number(blockException.data.data.id)}`, accounts.coachA)).status === 200, 'Coach can delete an owned date block');

  check((await call('POST', '/bookings', undefined, { coachId: accounts.coachA.id, date: bookingDate, startTime: '10:00' })).status === 401, 'guest cannot create booking');
  check((await call('POST', '/bookings', accounts.coachA, { coachId: accounts.coachA.id, date: bookingDate, startTime: '10:00' })).status === 403, 'Coach cannot create member booking');
  check((await call('POST', '/bookings', accounts.admin, { coachId: accounts.coachA.id, date: bookingDate, startTime: '10:00' })).status === 403, 'Admin cannot create member booking');
  check((await call('POST', '/bookings', accounts.seller, { coachId: accounts.coachA.id, date: bookingDate, startTime: '10:00' })).status === 403, 'Seller cannot create member booking');

  const created = await call('POST', '/bookings', accounts.memberA, { coachId: accounts.coachA.id, date: bookingDate, startTime: '10:00', sessionMode: 'ONLINE', note: 'Real pending booking' });
  check(created.status === 201 && created.data.data.status === 'pending' && created.data.data.end_time.slice(0, 5) === '11:00', 'member creates a pending 60-minute booking');
  check(typeof created.data.data.booking_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(created.data.data.booking_date)
    && typeof created.data.data.start_time === 'string' && typeof created.data.data.end_time === 'string'
    && typeof created.data.data.created_at === 'string' && typeof created.data.data.updated_at === 'string', 'create response uses normalized Booking DTO strings');
  const bookingId = Number(created.data.data.id);
  const memberList = await call('GET', '/bookings?limit=10', accounts.memberA);
  check(memberList.status === 200 && Array.isArray(memberList.data.data) && memberList.data.data.every((item: any) => typeof item.booking_date === 'string' && typeof item.start_time === 'string' && typeof item.created_at === 'string'), 'list response uses normalized Booking DTO');
  const memberDetail = await call('GET', `/bookings/${bookingId}`, accounts.memberA);
  check(memberDetail.status === 200 && typeof memberDetail.data.data.updated_at === 'string', 'detail response uses normalized Booking DTO');
  check((await call('POST', '/bookings', accounts.memberB, { coachId: accounts.coachA.id, date: bookingDate, startTime: '10:00', sessionMode: 'ONLINE' })).status === 409, 'exact duplicate/Coach overlap is rejected');
  check((await call('POST', '/bookings', accounts.memberA, { coachId: accounts.suspended.id, date: bookingDate, startTime: '10:00', sessionMode: 'IN_PERSON' })).status === 404, 'suspended Coach cannot be booked');
  check((await call('POST', '/bookings', accounts.memberA, { coachId: accounts.disabled.id, date: bookingDate, startTime: '10:00', sessionMode: 'ONLINE' })).status === 404, 'booking-disabled Coach cannot be booked');
  check((await call('POST', '/bookings', accounts.memberB, { coachId: accounts.coachB.id, date: bookingDate, startTime: '10:00', sessionMode: 'ONLINE' })).status === 201, 'Member can book a different active Coach');
  check((await call('POST', '/bookings', accounts.memberB, { coachId: accounts.coachB.id, date: bookingDate, startTime: '10:00', sessionMode: 'ONLINE' })).status === 409, 'Member overlap is rejected');
  check((await call('POST', '/bookings', accounts.memberA, { coachId: accounts.coachB.id, date: bookingDate, startTime: '13:00', sessionMode: 'ONLINE', note: 'x'.repeat(501) })).status === 400, 'oversized note is rejected');
  check((await call('POST', '/bookings', accounts.memberA, { coachId: accounts.coachA.id, date: '2026-02-31', startTime: '10:00', sessionMode: 'ONLINE' })).status === 400, 'invalid booking date is rejected');
  check((await call('POST', '/bookings', accounts.memberA, { coachId: accounts.coachA.id, date: bookingDate, startTime: '10:30', sessionMode: 'ONLINE' })).status === 409, 'booking outside a database availability window is rejected');

  const concurrent = await Promise.all([
    call('POST', '/bookings', accounts.memberA, { coachId: accounts.coachB.id, date: secondDate, startTime: '10:00', sessionMode: 'ONLINE' }),
    call('POST', '/bookings', accounts.memberB, { coachId: accounts.coachB.id, date: secondDate, startTime: '10:00', sessionMode: 'ONLINE' }),
  ]);
  check(concurrent.map(item => item.status).sort((a, b) => a - b).join(',') === '201,409', 'concurrent same-slot requests are serialized');

  check((await call('GET', `/bookings/${bookingId}`, accounts.memberB)).status === 404, 'Member IDOR read is blocked');
  check((await call('PUT', `/bookings/${bookingId}/status`, accounts.memberB, { status: 'cancelled' })).status === 404, 'Member IDOR mutation is blocked');
  check((await call('GET', `/bookings/${bookingId}`, accounts.coachB)).status === 404, 'Coach IDOR read is blocked');
  check((await call('PUT', `/bookings/${bookingId}/status`, accounts.coachB, { status: 'confirmed' })).status === 404, 'Coach IDOR mutation is blocked');
  check((await call('PUT', `/bookings/${bookingId}/status`, accounts.coachA, { status: 'completed' })).status === 409, 'future booking cannot be completed');
  const confirmed = await call('PUT', `/bookings/${bookingId}/status`, accounts.coachA, { status: 'confirmed' });
  check(confirmed.status === 200 && confirmed.data.data.status === 'confirmed', 'owner Coach confirms pending booking');
  check(typeof confirmed.data.data.booking_date === 'string' && typeof confirmed.data.data.start_time === 'string' && typeof confirmed.data.data.updated_at === 'string', 'status update response uses normalized Booking DTO');
  check((await call('PUT', `/bookings/${bookingId}/status`, accounts.coachA, { status: 'confirmed' })).status === 409, 'duplicate state transition is rejected');
  const coachFiltered = await call('GET', `/bookings?status=confirmed&fromDate=${bookingDate}&toDate=${bookingDate}&page=1&limit=1`, accounts.coachA);
  check(coachFiltered.status === 200 && coachFiltered.data.pagination?.page === 1 && coachFiltered.data.pagination?.limit === 1 && coachFiltered.data.data.length === 1 && coachFiltered.data.data[0].id === bookingId, 'Coach booking list filters status/date on the server');
  check((await call('GET', `/bookings?fromDate=${secondDate}&toDate=${bookingDate}`, accounts.coachA)).status === 400, 'booking date range rejects fromDate after toDate');
  const coachSummary = await call('GET', '/bookings/summary', accounts.coachA);
  check(coachSummary.status === 200 && coachSummary.data.data.confirmed >= 1 && coachSummary.data.data.upcoming >= 1 && coachSummary.data.data.timezone === COACH_BOOKING_TIME_ZONE, 'Coach booking summary returns scoped upcoming metrics and timezone');

  const legacy = await call('POST', '/bookings', accounts.memberB, { coach_id: accounts.coachA.id, booking_date: secondDate, start_time: '13:00', end_time: '14:00', session_mode: 'IN_PERSON' });
  check(legacy.status === 201 && legacy.data.data.status === 'pending', 'legacy snake_case create payload remains compatible');
  const cancelled = await call('PUT', `/bookings/${Number(legacy.data.data.id)}/status`, accounts.memberB, { status: 'cancelled' });
  check(cancelled.status === 200 && cancelled.data.data.status === 'cancelled', 'Member cancels own booking');
  check((await call('PUT', `/bookings/${Number(legacy.data.data.id)}/status`, accounts.coachA, { status: 'confirmed' })).status === 409, 'terminal cancelled booking cannot be confirmed');

  const profileRead = await call('GET', '/coach/profile', accounts.coachA);
  check(profileRead.status === 200 && profileRead.data.data.coachId === accounts.coachA.id && profileRead.data.data.bookingEnabled === true, 'Coach can read own self-profile');
  const profileUpdate = await call('PATCH', '/coach/profile', accounts.coachA, { specialty: '  Strength updated  ', bio: '  Profile acceptance  ', experienceYears: 8, sessionMode: 'ONLINE', location: '  Online  ', bookingEnabled: false });
  check(profileUpdate.status === 200 && profileUpdate.data.data.specialty === 'Strength updated' && profileUpdate.data.data.bio === 'Profile acceptance' && profileUpdate.data.data.location === 'Online' && profileUpdate.data.data.bookingEnabled === false, 'Coach self-profile trims fields and toggles booking atomically');
  check((await call('POST', '/bookings', accounts.memberA, { coachId: accounts.coachA.id, date: datePlus(4), startTime: '10:00' })).status === 404, 'self-profile booking toggle blocks new booking');
  const profileClear = await call('PATCH', '/coach/profile', accounts.coachA, { specialty: '', bio: '', experienceYears: null, sessionMode: null, location: '', bookingEnabled: true });
  check(profileClear.status === 200 && profileClear.data.data.specialty === null && profileClear.data.data.bio === null && profileClear.data.data.location === null && profileClear.data.data.bookingEnabled === true, 'Coach self-profile empty strings normalize to null');
  check((await call('GET', '/coach/profile', accounts.memberA)).status === 403, 'Member cannot read Coach self-profile');
  check((await call('PATCH', '/coach/profile', accounts.coachA, { coachId: accounts.coachB.id })).status === 400, 'Coach self-profile rejects client identity fields');

  await query(
    `INSERT dbo.Bookings(coach_id,member_id,booking_date,start_time,end_time,status,notes)
     VALUES(@coach,@member,@pastDate,N'09:00',N'10:00',N'confirmed',N'acceptance past completion')`,
    { coach: accounts.coachA.id, member: accounts.memberB.id, pastDate: datePlus(-2) },
  );
  const past = await query<{ id: number }>('SELECT TOP 1 id FROM dbo.Bookings WHERE coach_id=@coach AND member_id=@member AND booking_date=@pastDate ORDER BY id DESC', { coach: accounts.coachA.id, member: accounts.memberB.id, pastDate: datePlus(-2) });
  check((await call('PUT', `/bookings/${Number(past.recordset[0].id)}/status`, accounts.coachA, { status: 'completed' })).status === 200, 'confirmed past booking can be completed');

  console.log(JSON.stringify({ verdict: 'PASS', database: process.env.DB_NAME, bookingId, seededEmails: emails }));
}

if (process.argv.includes('--cleanup')) {
  cleanup().then(() => console.log(`COACH_BOOKING_CLEANUP PASS ${process.env.DB_NAME}`)).catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
} else {
  run().catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
}
