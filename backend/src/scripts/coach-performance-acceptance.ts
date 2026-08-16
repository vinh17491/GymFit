import * as bcrypt from 'bcryptjs';
import * as sql from 'mssql';
import { closePool, getPool, query } from '../config/database';

const database = process.env.DB_NAME || '';
if (process.env.COACH_PERFORMANCE_ACCEPTANCE !== '1' || !database.startsWith('GYMFIT_DB_COACH_ACCEPTANCE_PHASE28_')) {
  throw new Error('COACH_PERFORMANCE_ACCEPTANCE=1 and a Phase 28 disposable database are required');
}

const base = process.env.COACH_API_BASE || 'http://localhost:51228/api';
const suffix = process.env.COACH_PERFORMANCE_FIXTURE_SUFFIX || '20260806';
const password = process.env.COACH_PERFORMANCE_PASSWORD || `CoachPerf#${suffix.slice(-8)}`;
const memberCount = 60;
const bookingCount = 120;
const notificationCount = 250;

interface Account { id: number; email: string; password: string; }
interface PerfResponse { status: number; body: unknown; elapsedMs: number; }

let coach: Account;
let members: Account[] = [];
let programId = 0;
let dayId = 0;

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`PERF_FAIL ${message}`);
  console.log(`PERF_PASS ${message}`);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function parseBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const value = body as { data?: unknown };
  return value.data ?? body;
}

async function call(method: string, path: string, token?: string, body?: unknown): Promise<PerfResponse> {
  const started = Date.now();
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: unknown = text;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* retain text for diagnostics */ }
  return { status: response.status, body: parsed, elapsedMs: Date.now() - started };
}

async function login(account: Account): Promise<string> {
  const result = await call('POST', '/auth/login', undefined, { email: account.email, password: account.password });
  const data = parseBody(result.body) as { accessToken?: unknown };
  check(result.status === 200 && typeof data.accessToken === 'string', `${account.email} login`);
  return data.accessToken;
}

async function seedUsers(): Promise<void> {
  const hash = await bcrypt.hash(password, 10);
  const coachResult = await query<{ id: number }>(`INSERT dbo.Users(email,password,name,role,is_active,coach_status,email_verified,token_version)
    OUTPUT INSERTED.id VALUES(@email,@password,@name,N'coach',1,N'ACTIVE',1,0)`, {
    email: `perf-coach-${suffix}@example.test`, password: hash, name: 'Phase 28 Performance Coach',
  });
  coach = { id: Number(coachResult.recordset[0].id), email: `perf-coach-${suffix}@example.test`, password };
  await query(`INSERT dbo.CoachProfiles(coach_id,specialty,bio,session_mode,location,booking_enabled)
    VALUES(@coachId,N'Performance',N'Phase 28 disposable fixture',N'BOTH',N'Fixture',1)`, { coachId: coach.id });

  for (let index = 1; index <= memberCount; index += 1) {
    const email = `perf-member-${String(index).padStart(3, '0')}-${suffix}@example.test`;
    const result = await query<{ id: number }>(`INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version)
      OUTPUT INSERTED.id VALUES(@email,@password,@name,N'member',1,1,0)`, {
      email, password: hash, name: `Phase 28 Member ${index}`,
    });
    members.push({ id: Number(result.recordset[0].id), email, password });
  }
  await query(`INSERT dbo.CRMCustomers(user_id,assigned_coach_id,last_contact_at)
    SELECT id,@coachId,SYSUTCDATETIME() FROM dbo.Users WHERE email LIKE @pattern`, {
    coachId: coach.id, pattern: `perf-member-%-${suffix}@example.test`,
  });
  check(members.length > 50, `fixture has ${members.length} Members`);
}

async function seedProgramAndAssignments(): Promise<void> {
  const exercise = await query<{ id: number }>(`INSERT dbo.Exercises(name,slug,muscle_group,equipment,difficulty,is_active)
    OUTPUT INSERTED.id VALUES(@name,@slug,N'FULL_BODY',N'BODYWEIGHT',N'BEGINNER',1)`, {
    name: `Phase 28 Exercise ${suffix}`, slug: `phase-28-exercise-${suffix}`,
  });
  const program = await query<{ id: number }>(`INSERT dbo.WorkoutPrograms(name,description,goal,difficulty,duration_weeks,days_per_week,owner_coach_id,created_by,is_active,root_program_id,version_number,lifecycle_status,published_at)
    OUTPUT INSERTED.id VALUES(@name,N'Phase 28 performance program',N'GENERAL_FITNESS',N'BEGINNER',4,1,@coachId,@coachId,1,NULL,1,N'PUBLISHED',SYSUTCDATETIME())`, {
    name: `Phase 28 Program ${suffix}`, coachId: coach.id,
  });
  programId = Number(program.recordset[0].id);
  await query(`UPDATE dbo.WorkoutPrograms SET root_program_id=@programId WHERE id=@programId`, { programId });
  const day = await query<{ id: number }>(`INSERT dbo.WorkoutProgramDays(program_id,week_number,day_number,title,description,sort_order)
    OUTPUT INSERTED.id VALUES(@programId,1,1,N'Performance Day',N'Fixture day',0)`, { programId });
  dayId = Number(day.recordset[0].id);
  await query(`INSERT dbo.WorkoutProgramExercises(program_day_id,exercise_id,sort_order,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,coach_note)
    VALUES(@dayId,@exerciseId,0,3,8,12,10,60,N'Fixture target')`, { dayId, exerciseId: Number(exercise.recordset[0].id) });

  const startDate = addDays(todayUtc(), -30);
  const endDate = addDays(todayUtc(), 120);
  await query(`INSERT dbo.CoachProgramAssignments(member_id,program_id,coach_id,assigned_by,start_date,end_date,status,schedule_timezone,note)
    SELECT id,@programId,@coachId,@coachId,@startDate,@endDate,N'ACTIVE',N'Asia/Ho_Chi_Minh',N'Phase 28 fixture'
    FROM dbo.Users WHERE email LIKE @pattern`, {
    programId, coachId: coach.id, startDate, endDate, pattern: `perf-member-%-${suffix}@example.test`,
  });
  await query(`WITH n_offsets AS (SELECT slot_offset FROM (VALUES(0),(1),(2),(3)) v(slot_offset)
    ) INSERT dbo.CoachProgramSchedules(assignment_id,program_day_id,scheduled_date,status)
    SELECT a.id,@dayId,DATEADD(day,CASE n_offsets.slot_offset WHEN 0 THEN -7 WHEN 1 THEN 1 WHEN 2 THEN 8 ELSE 15 END,CONVERT(date,SYSUTCDATETIME())),
      CASE n_offsets.slot_offset WHEN 0 THEN N'COMPLETED' ELSE N'SCHEDULED' END
    FROM dbo.CoachProgramAssignments a CROSS JOIN n_offsets WHERE a.coach_id=@coachId AND a.program_id=@programId`, { dayId, coachId: coach.id, programId });
  await query(`WITH ranked AS (
      SELECT s.id AS schedule_id,a.id AS assignment_id,a.member_id,
        ROW_NUMBER() OVER(PARTITION BY a.id ORDER BY s.scheduled_date,s.id) AS row_number
      FROM dbo.CoachProgramSchedules s
      JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id
      WHERE a.coach_id=@coachId AND a.program_id=@programId
    )
    INSERT dbo.MemberWorkoutSessions(member_id,assignment_id,schedule_id,started_at,ended_at,status,total_duration_seconds)
    SELECT member_id,assignment_id,schedule_id,DATEADD(day,-7,SYSUTCDATETIME()),SYSUTCDATETIME(),N'COMPLETED',1800
    FROM ranked WHERE row_number=1`, { coachId: coach.id, programId });

  const legacyWorkout = await query<{ id: number }>(`INSERT dbo.Workouts(name,description,coach_id,plan_type,difficulty,duration_minutes,is_active)
    OUTPUT INSERTED.id VALUES(N'Phase 28 Legacy Workout',N'Fixture',@coachId,N'COACH',N'beginner',30,1)`, { coachId: coach.id });
  await query(`INSERT dbo.WorkoutSessions(user_id,workout_id,started_at,completed_at,status)
    SELECT id,@workoutId,DATEADD(day,-14,SYSUTCDATETIME()),SYSUTCDATETIME(),N'completed'
    FROM dbo.Users WHERE email LIKE @pattern`, { workoutId: Number(legacyWorkout.recordset[0].id), pattern: `perf-member-%-${suffix}@example.test` });
  check((await query<{ count: number }>('SELECT COUNT(*) AS count FROM dbo.CoachProgramAssignments WHERE coach_id=@coachId', { coachId: coach.id })).recordset[0].count >= memberCount, 'fixture has 60 Assignments');
  check((await query<{ count: number }>('SELECT COUNT(*) AS count FROM dbo.CoachProgramSchedules WHERE assignment_id IN (SELECT id FROM dbo.CoachProgramAssignments WHERE coach_id=@coachId)', { coachId: coach.id })).recordset[0].count >= memberCount * 4, 'fixture has 240 Schedules');
}

async function seedBookings(): Promise<void> {
  const current = todayUtc();
  const times = [['08:00:00', '09:00:00'], ['10:00:00', '11:00:00'], ['13:00:00', '14:00:00'], ['16:00:00', '17:00:00']];
  for (let index = 0; index < bookingCount; index += 1) {
    const time = times[index % times.length];
    await query(`INSERT dbo.Bookings(coach_id,member_id,booking_date,start_time,end_time,status,notes)
      VALUES(@coachId,@memberId,@bookingDate,@startTime,@endTime,@status,N'Phase 28 performance fixture')`, {
      coachId: coach.id, memberId: members[index % members.length].id, bookingDate: addDays(current, 1 + Math.floor(index / times.length)), startTime: time[0], endTime: time[1],
      status: index % 7 === 0 ? 'completed' : index % 11 === 0 ? 'cancelled' : index % 5 === 0 ? 'confirmed' : 'pending',
    });
  }
  const count = await query<{ count: number }>('SELECT COUNT(*) AS count FROM dbo.Bookings WHERE coach_id=@coachId', { coachId: coach.id });
  check(Number(count.recordset[0].count) >= bookingCount, `fixture has ${count.recordset[0].count} Bookings`);
}

async function seedAvailabilityAndNotifications(): Promise<void> {
  for (let weekday = 1; weekday <= 7; weekday += 1) {
    await query(`INSERT dbo.CoachAvailabilityRules(coach_id,weekday,start_time,end_time,mode,location,is_active)
      VALUES(@coachId,@weekday,'08:00:00','18:00:00',N'BOTH',N'Fixture',1)`, { coachId: coach.id, weekday });
  }
  for (let index = 0; index < 24; index += 1) {
    await query(`INSERT dbo.CoachAvailabilityExceptions(coach_id,exception_date,exception_type,start_time,end_time,mode,location,note,is_active)
      VALUES(@coachId,@exceptionDate,N'OPEN','09:00:00','10:00:00',N'ONLINE',N'Fixture',N'Phase 28 fixture',1)`, {
      coachId: coach.id, exceptionDate: addDays(todayUtc(), index + 1),
    });
  }
  await query(`WITH numbers AS (
      SELECT TOP (@notificationCount) ROW_NUMBER() OVER(ORDER BY (SELECT NULL)) - 1 AS number
      FROM sys.all_objects a CROSS JOIN sys.all_objects b
    )
    INSERT dbo.Notifications(user_id,recipient_user_id,title,message,type,is_read,read_at,created_at)
    SELECT @coachId,@coachId,N'Phase 28 notification',CONCAT(N'Fixture notification ',number),N'PHASE28',CASE WHEN number % 3 = 0 THEN 1 ELSE 0 END,
      CASE WHEN number % 3 = 0 THEN DATEADD(minute,-number,SYSUTCDATETIME()) ELSE NULL END,
      DATEADD(minute,-number,SYSUTCDATETIME()) FROM numbers`, { coachId: coach.id, notificationCount });
  const count = await query<{ count: number }>('SELECT COUNT(*) AS count FROM dbo.Notifications WHERE recipient_user_id=@coachId', { coachId: coach.id });
  check(Number(count.recordset[0].count) >= notificationCount, `fixture has ${count.recordset[0].count} Notifications`);
}

async function captureQueryPlan(name: string, statement: string, params: Record<string, { type: any; value: unknown }>): Promise<void> {
  const pool = await getPool();
  const stats: string[] = [];
  const request = pool.request();
  Object.entries(params).forEach(([key, parameter]) => request.input(key, parameter.type, parameter.value));
  request.on('info', info => stats.push(String((info as { message?: unknown }).message ?? info)));
  const result = await request.batch(`SET STATISTICS XML ON; SET STATISTICS IO ON; SET STATISTICS TIME ON; ${statement}; SET STATISTICS TIME OFF; SET STATISTICS IO OFF; SET STATISTICS XML OFF;`);
  const planValues: unknown[] = [];
  for (const recordset of result.recordsets as Array<Array<Record<string, unknown>>>) {
    for (const row of recordset) planValues.push(...Object.values(row));
  }
  const planXml = planValues.find(value => typeof value === 'string' && value.includes('ShowPlanXML'));
  check(typeof planXml === 'string' && planXml.length > 1000, `${name} returned a STATISTICS_XML plan`);
  const operators = typeof planXml === 'string'
    ? [...planXml.matchAll(/PhysicalOp="([^"]+)"/g)].map(match => match[1]).filter((value, index, values) => values.indexOf(value) === index)
    : [];
  console.log(`[PERF_PLAN] ${name} ${JSON.stringify({ xmlLength: typeof planXml === 'string' ? planXml.length : 0, operators })}`);
  const ioTime = stats.filter(line => /Table|logical reads|CPU time|elapsed time/i.test(line));
  console.log(`[PERF_STATS] ${name} ${JSON.stringify({ messages: ioTime.slice(0, 12), messageCount: ioTime.length })}`);
  check(ioTime.length > 0, `${name} emitted STATISTICS IO/TIME evidence`);
}

async function runQueryPlanEvidence(): Promise<void> {
  const int = sql.Int;
  const nvarchar = sql.NVarChar(50);
  const date = sql.Date;
  const coachId = { type: int, value: coach.id };
  const fromDate = { type: date, value: addDays(todayUtc(), -30) };
  const toDate = { type: date, value: addDays(todayUtc(), 60) };
  await captureQueryPlan('coach-members-page', `SELECT u.id,u.name,u.email,c.assigned_coach_id
    FROM dbo.CRMCustomers c JOIN dbo.Users u ON u.id=c.user_id
    WHERE c.assigned_coach_id=@coachId AND u.role=N'member' AND u.is_active=1
    ORDER BY u.name,u.id OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`, { coachId });
  await captureQueryPlan('coach-bookings-filtered-page', `SELECT b.id,b.member_id,b.booking_date,b.start_time,b.end_time,b.status
    FROM dbo.Bookings b WHERE b.coach_id=@coachId AND b.status=@status AND b.booking_date BETWEEN @fromDate AND @toDate
    ORDER BY b.booking_date,b.start_time,b.id OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`, { coachId, status: { type: nvarchar, value: 'pending' }, fromDate, toDate });
  await captureQueryPlan('coach-schedules-filtered-page', `SELECT s.id,s.assignment_id,s.scheduled_date,s.status,a.member_id,p.name
    FROM dbo.CoachProgramSchedules s JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id
    JOIN dbo.WorkoutPrograms p ON p.id=a.program_id
    WHERE a.coach_id=@coachId AND s.scheduled_date BETWEEN @fromDate AND @toDate AND s.status=N'SCHEDULED'
    ORDER BY s.scheduled_date,s.id OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`, { coachId, fromDate, toDate });
  await captureQueryPlan('coach-notification-page', `SELECT id,recipient_user_id,title,is_read,created_at
    FROM dbo.Notifications WHERE recipient_user_id=@coachId ORDER BY created_at DESC,id DESC OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`, { coachId });
  await captureQueryPlan('coach-entitlement-lookup', `SELECT id,plan_id,entitlement_key,entitlement_value,value_type
    FROM dbo.PlanEntitlements WHERE plan_id=(SELECT TOP 1 plan_id FROM dbo.Memberships ORDER BY id DESC) ORDER BY entitlement_key`, {});
}

async function runApiEvidence(): Promise<void> {
  const token = await login(coach);
  const current = todayUtc();
  const checks: Array<[string, string]> = [
    ['coach members', `/coach/members?page=1&limit=50`],
    ['coach assignments', `/coach/assignments?page=1&limit=50`],
    ['coach schedules', `/coach/schedules?page=1&limit=50&fromDate=${addDays(current, -30)}&toDate=${addDays(current, 60)}`],
    ['coach dashboard', '/coach/dashboard'],
    ['notifications', '/notifications?page=1&limit=50'],
    ['coach bookings', `/bookings?status=pending&fromDate=${current}&toDate=${addDays(current, 60)}&page=1&limit=50`],
    ['booking summary', `/bookings/summary?fromDate=${current}&toDate=${addDays(current, 60)}`],
    ['coach availability', `/coaches/${coach.id}/availability?date=${addDays(current, 1)}`],
    ['plans and entitlements', '/plans'],
  ];
  for (const [name, path] of checks) {
    const result = await call('GET', path, token);
    check(result.status === 200, `${name} API returned 200 in ${result.elapsedMs}ms`);
    console.log(`[PERF_API] ${name} ${JSON.stringify({ status: result.status, elapsedMs: result.elapsedMs })}`);
  }
}

async function main(): Promise<void> {
  if (process.env.COACH_PERFORMANCE_SKIP_SEED === '1') {
    const coachRow = await query<{ id: number; email: string }>('SELECT TOP 1 id,email FROM dbo.Users WHERE email=@email', { email: `perf-coach-${suffix}@example.test` });
    check(Boolean(coachRow.recordset[0]), 'existing Phase 28 Coach fixture found');
    coach = { id: Number(coachRow.recordset[0].id), email: coachRow.recordset[0].email, password };
    const memberRows = await query<{ id: number; email: string }>('SELECT id,email FROM dbo.Users WHERE email LIKE @pattern ORDER BY id', { pattern: `perf-member-%-${suffix}@example.test` });
    members = memberRows.recordset.map(row => ({ id: Number(row.id), email: row.email, password }));
    const programRow = await query<{ id: number }>('SELECT TOP 1 id FROM dbo.WorkoutPrograms WHERE owner_coach_id=@coachId ORDER BY id DESC', { coachId: coach.id });
    const dayRow = await query<{ id: number }>('SELECT TOP 1 id FROM dbo.WorkoutProgramDays WHERE program_id=@programId ORDER BY id DESC', { programId: Number(programRow.recordset[0].id) });
    programId = Number(programRow.recordset[0].id);
    dayId = Number(dayRow.recordset[0].id);
    check(members.length >= memberCount, `existing fixture has ${members.length} Members`);
  } else {
    await seedUsers();
    await seedProgramAndAssignments();
    await seedBookings();
    await seedAvailabilityAndNotifications();
  }
  await runQueryPlanEvidence();
  await runApiEvidence();
  console.log(JSON.stringify({ verdict: 'PASS', database, memberCount, bookingCount, notificationCount, programId, dayId }));
}

main().catch(error => {
  console.error('[COACH PERFORMANCE ACCEPTANCE FAIL]', error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}).finally(closePool);
