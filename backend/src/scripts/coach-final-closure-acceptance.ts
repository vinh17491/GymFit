import * as bcrypt from 'bcryptjs';
import { Server } from 'node:http';
import * as mssql from 'mssql';
import app from '../app';
import { config } from '../config/config';
import { closePool, query } from '../config/database';
import { COACH_BOOKING_TIME_ZONE } from '../utils/coachBooking';
import { todayInTimeZone } from '../utils/timezone';

const database = process.env.DB_NAME || '';
const databasePrefix = 'GYMFIT_DB_COACH_FINAL_CLOSURE_';
if (process.env.COACH_FINAL_CLOSURE_ACCEPTANCE !== '1' || !database.startsWith(databasePrefix) || !/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error(`Coach final closure acceptance requires COACH_FINAL_CLOSURE_ACCEPTANCE=1 and an isolated ${databasePrefix}* database`);
}

const suffix = process.env.COACH_FINAL_CLOSURE_FIXTURE_SUFFIX || `${Date.now()}`;
const password = process.env.COACH_FINAL_CLOSURE_PASSWORD || `Closure#${suffix.slice(-8)}`;
const port = Number(process.env.COACH_FINAL_CLOSURE_PORT || 5107);
const base = process.env.COACH_API_BASE || `http://127.0.0.1:${port}/api`;

const emails = {
  coach: `closure-coach-${suffix}@example.test`,
  admin: `closure-admin-${suffix}@example.test`,
  membership: `closure-membership-${suffix}@example.test`,
  starter: `closure-starter-${suffix}@example.test`,
  pro: `closure-pro-${suffix}@example.test`,
  elite: `closure-elite-${suffix}@example.test`,
  inPerson: `closure-in-person-${suffix}@example.test`,
  raceA: `closure-race-a-${suffix}@example.test`,
  raceB: `closure-race-b-${suffix}@example.test`,
  scheduleA: `closure-schedule-a-${suffix}@example.test`,
  scheduleB: `closure-schedule-b-${suffix}@example.test`,
};

type AccountKey = keyof typeof emails;
type Account = { id: number; email: string; password: string; token?: string };
type Json = Record<string, unknown>;
type ApiResult = { status: number; body: Json };

const accounts = Object.fromEntries(
  Object.entries(emails).map(([key, email]) => [key, { id: 0, email, password }]),
) as Record<AccountKey, Account>;

let server: Server | undefined;
let assertions = 0;

function check(condition: boolean, message: string): void {
  assertions += 1;
  if (!condition) throw new Error(`ASSERTION_FAILED ${message}`);
  console.log(`PASS ${message}`);
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayFor(value: string): number {
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function dataOf<T>(result: ApiResult): T {
  return result.body.data as T;
}

async function call(method: string, path: string, account?: Account, body?: unknown): Promise<ApiResult> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(account?.token ? { Authorization: `Bearer ${account.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { parsed = { message: raw }; }
  return { status: response.status, body: (parsed && typeof parsed === 'object' ? parsed : { message: String(parsed) }) as Json };
}

async function login(account: Account): Promise<void> {
  const result = await call('POST', '/auth/login', undefined, { email: account.email, password: account.password });
  check(result.status === 200 && typeof dataOf<{ accessToken?: unknown }>(result).accessToken === 'string', `${account.email} login`);
  account.token = String(dataOf<{ accessToken: string }>(result).accessToken);
}

async function cleanupFixtures(): Promise<void> {
  const users = await query<{ id: number }>('SELECT id FROM dbo.Users WHERE email LIKE @pattern', { pattern: `closure-%-${suffix}@example.test` });
  const ids = users.recordset.map(row => Number(row.id));
  if (ids.length === 0) return;
  const csv = ids.join(',');
  await query(`DELETE FROM dbo.Notifications WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Bookings WHERE coach_id IN (${csv}) OR member_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachProgramSchedules WHERE assignment_id IN (SELECT id FROM dbo.CoachProgramAssignments WHERE coach_id IN (${csv}) OR member_id IN (${csv}))`);
  await query(`DELETE FROM dbo.CoachProgramAssignments WHERE coach_id IN (${csv}) OR member_id IN (${csv})`);
  await query(`DELETE FROM dbo.WorkoutProgramExercises WHERE program_day_id IN (SELECT d.id FROM dbo.WorkoutProgramDays d JOIN dbo.WorkoutPrograms p ON p.id=d.program_id WHERE p.owner_coach_id IN (${csv}))`);
  await query(`DELETE FROM dbo.WorkoutProgramDays WHERE program_id IN (SELECT id FROM dbo.WorkoutPrograms WHERE owner_coach_id IN (${csv}))`);
  await query(`DELETE FROM dbo.WorkoutPrograms WHERE owner_coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachAvailabilityExceptions WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachAvailabilityRules WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachMemberContexts WHERE coach_id IN (${csv}) OR member_id IN (${csv})`);
  await query(`DELETE FROM dbo.CRMCustomers WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Memberships WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Invoices WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Payments WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuditLogs WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuthSessions WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachProfiles WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.Users WHERE id IN (${csv})`);
}

async function seedUsers(): Promise<void> {
  await cleanupFixtures();
  const hash = await bcrypt.hash(password, 10);
  const roles: Record<AccountKey, string> = {
    coach: 'coach',
    admin: 'admin',
    membership: 'member',
    starter: 'member',
    pro: 'member',
    elite: 'member',
    inPerson: 'member',
    raceA: 'member',
    raceB: 'member',
    scheduleA: 'member',
    scheduleB: 'member',
  };
  for (const key of Object.keys(emails) as AccountKey[]) {
    const inserted = await query<{ id: number }>(
      `INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version,coach_status)
       OUTPUT INSERTED.id VALUES(@email,@password,@name,@role,1,1,0,@coachStatus)`,
      { email: emails[key], password: hash, name: `Closure ${key}`, role: roles[key], coachStatus: roles[key] === 'coach' ? 'ACTIVE' : null },
    );
    accounts[key].id = Number(inserted.recordset[0].id);
  }

  await query(
    `INSERT dbo.CoachProfiles(coach_id,specialty,bio,experience_years,session_mode,location,booking_enabled)
     VALUES(@coach,N'Closure testing',N'Disposable Coach fixture',5,N'BOTH',N'Profile Location',1)`,
    { coach: accounts.coach.id },
  );

  for (let weekday = 1; weekday <= 7; weekday += 1) {
    await query(
      `INSERT dbo.CoachAvailabilityRules(coach_id,weekday,start_time,end_time,mode,location,is_active)
       VALUES(@coach,@weekday,N'09:00',N'10:00',N'ONLINE',N'Online Snapshot',1),
             (@coach,@weekday,N'10:00',N'11:00',N'IN_PERSON',N'In-Person Snapshot',1)`,
      { coach: accounts.coach.id, weekday },
    );
  }

  await query(
    `INSERT dbo.CRMCustomers(user_id,assigned_coach_id)
     VALUES(@scheduleA,@coach),(@scheduleB,@coach)`,
    { scheduleA: accounts.scheduleA.id, scheduleB: accounts.scheduleB.id, coach: accounts.coach.id },
  );

  const plans = await query<{ id: number; sort_order: number }>(
    'SELECT id,sort_order FROM dbo.Plans WHERE is_active=1 AND sort_order IN (1,2,3) ORDER BY sort_order,id',
  );
  const planByOrder = new Map(plans.recordset.map(row => [Number(row.sort_order), Number(row.id)]));
  check(planByOrder.size === 3, 'Starter/Pro/Elite plans exist for closure acceptance');
  await query(
    `INSERT dbo.Memberships(user_id,plan_id,start_date,end_date,status,auto_renew,created_at)
     VALUES(@starter,@starterPlan,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME()),
           (@pro,@proPlan,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME()),
           (@elite,@elitePlan,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME()),
           (@inPerson,@elitePlan,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME()),
           (@raceA,@elitePlan,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME()),
           (@raceB,@elitePlan,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME())`,
    {
      starter: accounts.starter.id,
      pro: accounts.pro.id,
      elite: accounts.elite.id,
      inPerson: accounts.inPerson.id,
      raceA: accounts.raceA.id,
      raceB: accounts.raceB.id,
      starterPlan: planByOrder.get(1),
      proPlan: planByOrder.get(2),
      elitePlan: planByOrder.get(3),
    },
  );
}

async function testMembershipLifecycle(): Promise<void> {
  const plans = await query<{ id: number; sort_order: number }>('SELECT id,sort_order FROM dbo.Plans WHERE is_active=1 AND sort_order IN (1,2,3) ORDER BY sort_order,id');
  const planByOrder = new Map(plans.recordset.map(row => [Number(row.sort_order), Number(row.id)]));
  const basic = Number(planByOrder.get(1));
  const premium = Number(planByOrder.get(2));
  const initial = await call('GET', '/plans/my-membership', accounts.membership);
  check(initial.status === 200 && dataOf<{ lifecycle: string | null; membership: unknown; pendingPayment: unknown }>(initial).lifecycle === null, 'new Member starts without active Membership or pending payment');

  const pending = await call('POST', '/plans/subscribe', accounts.membership, { plan_id: basic });
  const pendingState = dataOf<{ lifecycle: string; membership: unknown; pendingPayment?: { id: number; status: string } }>(pending);
  check(pending.status === 201 && pendingState.lifecycle === 'PENDING_PAYMENT' && pendingState.membership === null && pendingState.pendingPayment?.status === 'pending', 'pending subscription does not activate Membership');
  const paymentId = Number(pendingState.pendingPayment?.id);
  const beforeConfirm = await query<{ active_count: number; pending_count: number }>(
    `SELECT (SELECT COUNT(*) FROM dbo.Memberships WHERE user_id=@userId AND status=N'active') active_count,
            (SELECT COUNT(*) FROM dbo.Payments WHERE user_id=@userId AND status=N'pending') pending_count`,
    { userId: accounts.membership.id },
  );
  check(Number(beforeConfirm.recordset[0]?.active_count) === 0 && Number(beforeConfirm.recordset[0]?.pending_count) === 1, 'pending payment remains non-active in database');

  const confirmed = await call('POST', '/plans/subscribe/confirm', accounts.membership, { payment_id: paymentId });
  const active = dataOf<{ lifecycle: string; membership?: { status: string; plan_id: number }; pendingPayment: unknown }>(confirmed);
  check(confirmed.status === 200 && active.lifecycle === 'ACTIVE' && active.membership?.status === 'active' && active.pendingPayment === null, 'confirmation activates Membership');
  const upgradePending = await call('POST', '/plans/upgrade', accounts.membership, { plan_id: premium });
  const upgradePayment = Number(dataOf<{ pendingPayment?: { id: number } }>(upgradePending).pendingPayment?.id);
  check(upgradePending.status === 201 && dataOf<{ lifecycle: string }>(upgradePending).lifecycle === 'PENDING_PAYMENT', 'upgrade preserves current Membership while pending');
  const upgraded = await call('POST', '/plans/subscribe/confirm', accounts.membership, { payment_id: upgradePayment });
  check(upgraded.status === 200 && Number(dataOf<{ membership?: { plan_id: number } }>(upgraded).membership?.plan_id) === premium, 'upgrade confirmation replaces the active plan');
  const downgradePending = await call('POST', '/plans/downgrade', accounts.membership, { plan_id: basic });
  const downgradePayment = Number(dataOf<{ pendingPayment?: { id: number } }>(downgradePending).pendingPayment?.id);
  check(downgradePending.status === 201, 'downgrade creates a pending transition');
  const downgraded = await call('POST', '/plans/subscribe/confirm', accounts.membership, { payment_id: downgradePayment });
  check(downgraded.status === 200 && Number(dataOf<{ membership?: { plan_id: number } }>(downgraded).membership?.plan_id) === basic, 'downgrade confirmation activates the target plan');
  const counts = await query<{ active_count: number; cancelled_count: number }>(
    `SELECT SUM(CASE WHEN status=N'active' THEN 1 ELSE 0 END) active_count,
            SUM(CASE WHEN status=N'cancelled' THEN 1 ELSE 0 END) cancelled_count
     FROM dbo.Memberships WHERE user_id=@userId`,
    { userId: accounts.membership.id },
  );
  check(Number(counts.recordset[0]?.active_count) === 1 && Number(counts.recordset[0]?.cancelled_count) >= 2, 'upgrade/downgrade leave one active Membership and preserve history');
}

async function testEntitlements(): Promise<void> {
  const rows = await query<{ sort_order: number; entitlement_key: string; entitlement_value: string; value_type: string }>(
    `SELECT p.sort_order,e.entitlement_key,e.entitlement_value,e.value_type
     FROM dbo.Plans p JOIN dbo.PlanEntitlements e ON e.plan_id=p.id
     WHERE p.is_active=1 AND p.sort_order IN (1,2,3) ORDER BY p.sort_order,e.entitlement_key`,
  );
  const keySet = new Set(rows.recordset.map(row => row.entitlement_key));
  check(rows.recordset.length === 6 && !keySet.has('COACH_PRIORITY_BOOKING'), 'Starter/Pro/Elite keep only the consumed Coach entitlement contract');
  const expected = new Map([[1, ['false', '0']], [2, ['true', '2']], [3, ['true', '-1']]]);
  for (const row of rows.recordset) {
    const values = expected.get(Number(row.sort_order));
    if (!values) continue;
    if (row.entitlement_key === 'COACH_BOOKING_ENABLED') check(row.entitlement_value === values[0] && row.value_type === 'BOOLEAN', `Plan ${row.sort_order} booking-enabled entitlement is typed`);
    if (row.entitlement_key === 'COACH_BOOKING_MONTHLY_LIMIT') check(row.entitlement_value === values[1] && (row.sort_order === 3 ? row.value_type === 'UNLIMITED' : row.value_type === 'INTEGER'), `Plan ${row.sort_order} monthly limit entitlement is typed`);
  }
  const targetDate = addDays(todayInTimeZone(COACH_BOOKING_TIME_ZONE), 2);
  const starterQuota = await call('GET', `/bookings/quota?date=${targetDate}`, accounts.starter);
  const proQuota = await call('GET', `/bookings/quota?date=${targetDate}`, accounts.pro);
  const eliteQuota = await call('GET', `/bookings/quota?date=${targetDate}`, accounts.elite);
  check(starterQuota.status === 200 && dataOf<{ included: boolean; remaining: number }>(starterQuota).included === false && dataOf<{ remaining: number }>(starterQuota).remaining === 0, 'Starter Coach Booking entitlement remains disabled');
  check(proQuota.status === 200 && dataOf<{ included: boolean; monthlyLimit: number }>(proQuota).included && dataOf<{ monthlyLimit: number }>(proQuota).monthlyLimit === 2, 'Pro Coach Booking entitlement remains quota-limited');
  check(eliteQuota.status === 200 && dataOf<{ included: boolean; monthlyLimit: number | null }>(eliteQuota).included && dataOf<{ monthlyLimit: number | null }>(eliteQuota).monthlyLimit === null, 'Elite Coach Booking entitlement remains unlimited');
}

async function testBookingSnapshots(): Promise<void> {
  const bookingDate = addDays(todayInTimeZone(COACH_BOOKING_TIME_ZONE), 2);
  const raceDate = addDays(bookingDate, 1);
  const spoof = await call('POST', '/bookings', accounts.elite, {
    coachId: accounts.coach.id,
    date: bookingDate,
    startTime: '09:00',
    mode: 'IN_PERSON',
    location: 'Spoofed Location',
    member_id: accounts.raceB.id,
  });
  check(spoof.status === 400, 'Booking mode/location and identity spoof fields are rejected by strict input validation');

  const online = await call('POST', '/bookings', accounts.elite, { coachId: accounts.coach.id, date: bookingDate, startTime: '09:00' });
  check(online.status === 201 && dataOf<{ session_mode: string; location: string }>(online).session_mode === 'ONLINE' && dataOf<{ location: string }>(online).location === 'Online Snapshot', 'authoritative ONLINE mode and location are saved');
  const onlineId = Number(dataOf<{ id: number }>(online).id);
  const inPerson = await call('POST', '/bookings', accounts.inPerson, { coachId: accounts.coach.id, date: bookingDate, startTime: '10:00' });
  check(inPerson.status === 201 && dataOf<{ session_mode: string; location: string }>(inPerson).session_mode === 'IN_PERSON' && dataOf<{ location: string }>(inPerson).location === 'In-Person Snapshot', 'authoritative IN_PERSON mode and location are saved');

  await query(
    `UPDATE dbo.CoachAvailabilityRules SET location=N'Changed After Booking'
     WHERE coach_id=@coach AND weekday=@weekday AND start_time=N'09:00'`,
    { coach: accounts.coach.id, weekday: weekdayFor(bookingDate) },
  );
  const unchanged = await call('GET', `/bookings/${onlineId}`, accounts.elite);
  check(unchanged.status === 200 && dataOf<{ session_mode: string; location: string }>(unchanged).session_mode === 'ONLINE' && dataOf<{ location: string }>(unchanged).location === 'Online Snapshot', 'availability changes do not rewrite an existing Booking snapshot');
  const confirmed = await call('PUT', `/bookings/${onlineId}/status`, accounts.coach, { status: 'confirmed' });
  const afterStatus = await call('GET', `/bookings/${onlineId}`, accounts.elite);
  check(confirmed.status === 200 && afterStatus.status === 200 && dataOf<{ location: string }>(afterStatus).location === 'Online Snapshot', 'Booking status mutation keeps the snapshot immutable');

  const race = await Promise.all([
    call('POST', '/bookings', accounts.raceA, { coachId: accounts.coach.id, date: raceDate, startTime: '09:00' }),
    call('POST', '/bookings', accounts.raceB, { coachId: accounts.coach.id, date: raceDate, startTime: '09:00' }),
  ]);
  check(race.map(item => item.status).sort((a, b) => a - b).join(',') === '201,409', 'same-slot concurrent booking requests remain serialized');
}

async function testProgramAndSchedule(): Promise<void> {
  const today = todayInTimeZone(COACH_BOOKING_TIME_ZONE);
  let exercise = await query<{ id: number }>('SELECT TOP (1) id FROM dbo.Exercises WHERE is_active=1 ORDER BY id');
  if (!exercise.recordset[0]) {
    exercise = await query<{ id: number }>(
      `INSERT dbo.Exercises(name,slug,description,instructions,muscle_group,equipment,difficulty,is_active)
       OUTPUT INSERTED.id VALUES(N'Closure Exercise',@slug,N'Disposable closure Exercise',N'Use controlled form.',N'full_body',N'bodyweight',N'BEGINNER',1)`,
      { slug: `closure-exercise-${suffix}` },
    );
  }
  check(Boolean(exercise.recordset[0]), 'active Exercise exists for schedule closure fixture');
  const programResult = await call('POST', '/coach/workout-programs', accounts.coach, {
    name: `Closure Program ${suffix}`,
    description: 'Disposable closure acceptance program',
    goal: 'GENERAL_FITNESS',
    difficulty: 'BEGINNER',
    durationWeeks: 2,
    daysPerWeek: 1,
  });
  check(programResult.status === 201, 'Coach creates closure Program');
  const programId = Number(dataOf<{ id: number }>(programResult).id);
  const dayNumber = weekdayFor(today);
  const firstDay = await call('POST', `/coach/workout-programs/${programId}/days`, accounts.coach, { weekNumber: 1, dayNumber, title: 'Closure Week One' });
  const secondDay = await call('POST', `/coach/workout-programs/${programId}/days`, accounts.coach, { weekNumber: 2, dayNumber, title: 'Closure Week Two' });
  check(firstDay.status === 201 && secondDay.status === 201, 'Coach creates mid-program schedule days');
  const firstDayId = Number(dataOf<{ id: number }>(firstDay).id);
  const secondDayId = Number(dataOf<{ id: number }>(secondDay).id);
  const invalid = await call('POST', `/coach/workout-program-days/${firstDayId}/exercises`, accounts.coach, { exerciseId: Number(exercise.recordset[0].id), targetSets: 3, targetRepsMin: 12, targetRepsMax: 8 });
  check(invalid.status === 400, 'inverted reps range returns HTTP 400 in final closure');
  const validFirst = await call('POST', `/coach/workout-program-days/${firstDayId}/exercises`, accounts.coach, { exerciseId: Number(exercise.recordset[0].id), targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 });
  const validSecond = await call('POST', `/coach/workout-program-days/${secondDayId}/exercises`, accounts.coach, { exerciseId: Number(exercise.recordset[0].id), targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 });
  check(validFirst.status === 201 && validSecond.status === 201, 'valid Program Exercises remain writable in Draft');
  const published = await call('POST', `/coach/workout-programs/${programId}/publish`, accounts.coach, {});
  check(published.status === 200, 'closure Program publishes before assignment');
  const assignmentResult = await call('POST', '/coach/assignments', accounts.coach, { memberId: accounts.scheduleA.id, programId, startDate: today, scheduleTimezone: COACH_BOOKING_TIME_ZONE });
  check(assignmentResult.status === 201, 'Coach creates schedule assignment');
  const assignmentId = Number(dataOf<{ id: number }>(assignmentResult).id);

  const first = await call('POST', `/coach/assignments/${assignmentId}/schedules/generate`, accounts.coach, { fromDate: today, horizonDays: 7 });
  const firstOutcome = dataOf<{ inserted: number; skippedExisting: number; effectiveFromDate: string; effectiveToDate: string }>(first);
  check(first.status === 200 && firstOutcome.inserted === 1 && firstOutcome.skippedExisting === 0 && firstOutcome.effectiveFromDate === today && firstOutcome.effectiveToDate === addDays(today, 6), 'first schedule generation returns effective range and inserted count');
  const duplicate = await call('POST', `/coach/assignments/${assignmentId}/schedules/generate`, accounts.coach, { fromDate: today, horizonDays: 7 });
  const duplicateOutcome = dataOf<{ inserted: number; skippedExisting: number }>(duplicate);
  check(duplicate.status === 200 && duplicateOutcome.inserted === 0 && duplicateOutcome.skippedExisting >= 1, 'duplicate schedule generation is idempotent and reports existing skips');
  const midDate = addDays(today, 7);
  const mid = await call('POST', `/coach/assignments/${assignmentId}/schedules/generate`, accounts.coach, { fromDate: midDate, horizonDays: 7 });
  const midOutcome = dataOf<{ inserted: number; effectiveFromDate: string; effectiveToDate: string }>(mid);
  check(mid.status === 200 && midOutcome.inserted === 1 && midOutcome.effectiveFromDate === midDate && midOutcome.effectiveToDate === addDays(today, 13), 'mid-program generation preserves assignment-relative week and bounds');
  const outsideProgram = await call('POST', `/coach/assignments/${assignmentId}/schedules/generate`, accounts.coach, { fromDate: today, horizonDays: 21 });
  check(outsideProgram.status === 200 && dataOf<{ skippedOutsideProgram: number }>(outsideProgram).skippedOutsideProgram === 7, 'schedule response counts dates outside program duration');

  const boundedAssignment = await call('POST', '/coach/assignments', accounts.coach, { memberId: accounts.scheduleB.id, programId, startDate: today, endDate: addDays(today, 6), scheduleTimezone: COACH_BOOKING_TIME_ZONE });
  check(boundedAssignment.status === 201, 'bounded assignment creates for outside-assignment coverage');
  const boundedId = Number(dataOf<{ id: number }>(boundedAssignment).id);
  const outsideAssignment = await call('POST', `/coach/assignments/${boundedId}/schedules/generate`, accounts.coach, { fromDate: today, horizonDays: 14 });
  check(outsideAssignment.status === 200 && dataOf<{ skippedOutsideAssignment: number }>(outsideAssignment).skippedOutsideAssignment === 7, 'schedule response counts dates outside assignment end');
}

async function startServer(): Promise<void> {
  server = app.listen(port, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server?.once('listening', () => resolve());
    server?.once('error', reject);
  });
}

async function stopServer(): Promise<void> {
  if (!server) return;
  server.closeAllConnections();
  await new Promise<void>(resolve => server?.close(() => resolve()));
  server = undefined;
}

async function dropDatabase(): Promise<void> {
  await closePool();
  if (!/^GYMFIT_DB_COACH_FINAL_CLOSURE_[A-Za-z0-9_]+$/.test(database)) throw new Error('Unsafe final closure database drop target');
  const master = await new mssql.ConnectionPool({ ...config.db, database: 'master' }).connect();
  try {
    await master.request().batch(`IF DB_ID(N'${database}') IS NOT NULL BEGIN ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]; END`);
    console.log(`COACH_FINAL_CLOSURE_DATABASE_DROPPED ${database}`);
  } finally {
    await master.close();
  }
}

async function run(): Promise<void> {
  await startServer();
  await seedUsers();
  for (const account of Object.values(accounts)) await login(account);
  await testMembershipLifecycle();
  await testEntitlements();
  await testBookingSnapshots();
  await testProgramAndSchedule();
  console.log(JSON.stringify({ verdict: 'PASS', database, assertions, timezone: COACH_BOOKING_TIME_ZONE }));
}

run()
  .catch(error => {
    console.error('[COACH FINAL CLOSURE ACCEPTANCE FAIL]', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopServer();
    await closePool();
    if (process.env.COACH_FINAL_KEEP_DB !== '1') {
      try { await dropDatabase(); } catch (error) { console.error('[COACH FINAL CLOSURE CLEANUP FAIL]', error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
    }
  });
