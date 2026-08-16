import * as bcrypt from 'bcryptjs';
import { closePool, getPool, query } from '../config/database';
import { createNotification } from '../modules/notifications/notifications.service';
import { reconcileOverdueSchedules } from '../modules/coach-workspace/coach-overdue.service';
import { todayInTimeZone } from '../utils/timezone';

if (process.env.COACH_BOOKING_ACCEPTANCE !== '1' || !process.env.DB_NAME?.startsWith('GYMFIT_DB_COACH_ACCEPTANCE_')) {
  throw new Error('Coach notification acceptance requires COACH_BOOKING_ACCEPTANCE=1 and an isolated Coach acceptance database');
}

const base = process.env.COACH_API_BASE || 'http://localhost:5000/api';
const suffix = process.env.COACH_NOTIFICATION_FIXTURE_SUFFIX || `${Date.now()}`;
const password = process.env.COACH_NOTIFICATION_PASSWORD || `CoachNotice#${suffix.slice(-8)}`;
const emails = {
  coachA: `coach-notice-a-${suffix}@example.test`,
  coachB: `coach-notice-b-${suffix}@example.test`,
  member: `member-notice-${suffix}@example.test`,
  admin: `admin-notice-${suffix}@example.test`,
};

type AccountKey = keyof typeof emails;
type Account = { id: number; email: string; password: string; token?: string };
type Json = Record<string, any>;
type ApiResult = { status: number; body: Json };
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
  let bodyData: Json;
  try { bodyData = JSON.parse(text) as Json; } catch { bodyData = { message: text }; }
  return { status: response.status, body: bodyData };
}

async function login(account: Account): Promise<void> {
  const result = await call('POST', '/auth/login', undefined, { email: account.email, password: account.password });
  check(result.status === 200 && typeof dataOf<{ accessToken?: unknown }>(result).accessToken === 'string', `${account.email} login`);
  account.token = String(dataOf<{ accessToken: string }>(result).accessToken);
}

function datePlus(days: number): string {
  const today = todayInTimeZone('Asia/Ho_Chi_Minh');
  const [year, month, day] = today.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day) + days * 86400000);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

function weekday(date: string): number {
  const sundayBased = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return sundayBased === 0 ? 7 : sundayBased;
}

async function cleanup(): Promise<void> {
  const users = await query<{ id: number }>('SELECT id FROM dbo.Users WHERE email LIKE @pattern', { pattern: `%${suffix}@example.test` });
  const ids = users.recordset.map(row => Number(row.id));
  if (!ids.length) return;
  const csv = ids.join(',');
  await query(`DELETE FROM dbo.Notifications WHERE recipient_user_id IN (${csv}) OR user_id IN (${csv})`);
  await query(`DELETE FROM dbo.MemberWorkoutSetLogs WHERE session_exercise_id IN (SELECT se.id FROM dbo.MemberWorkoutSessionExercises se JOIN dbo.MemberWorkoutSessions s ON s.id=se.session_id WHERE s.member_id IN (${csv}))`);
  await query(`DELETE FROM dbo.MemberWorkoutSessionExercises WHERE session_id IN (SELECT id FROM dbo.MemberWorkoutSessions WHERE member_id IN (${csv}))`);
  await query(`DELETE FROM dbo.MemberWorkoutSessions WHERE member_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachProgramSchedules WHERE assignment_id IN (SELECT id FROM dbo.CoachProgramAssignments WHERE member_id IN (${csv}) OR coach_id IN (${csv}))`);
  await query(`DELETE FROM dbo.CoachProgramAssignments WHERE member_id IN (${csv}) OR coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.WorkoutProgramExercises WHERE program_day_id IN (SELECT d.id FROM dbo.WorkoutProgramDays d JOIN dbo.WorkoutPrograms p ON p.id=d.program_id WHERE p.owner_coach_id IN (${csv}))`);
  await query(`DELETE FROM dbo.WorkoutProgramDays WHERE program_id IN (SELECT id FROM dbo.WorkoutPrograms WHERE owner_coach_id IN (${csv}))`);
  await query(`DELETE FROM dbo.WorkoutPrograms WHERE owner_coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.Bookings WHERE coach_id IN (${csv}) OR member_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachAvailabilityExceptions WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachAvailabilityRules WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachProfiles WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachMemberContexts WHERE coach_id IN (${csv}) OR member_id IN (${csv})`);
  await query(`DELETE FROM dbo.CRMCustomers WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Memberships WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Payments WHERE user_id IN (${csv})`);
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
      { email: emails[key], password: hash, name: `Notification ${key}`, role: roles[key], coachStatus: roles[key] === 'coach' ? 'ACTIVE' : null },
    );
    accounts[key].id = Number(result.recordset[0].id);
  }

  await query(
    `INSERT dbo.CoachProfiles(coach_id,specialty,bio,experience_years,session_mode,location,booking_enabled)
     VALUES(@coachA,N'Strength',N'Notification Coach A',5,N'BOTH',N'GYMFIT',1),
           (@coachB,N'Mobility',N'Notification Coach B',4,N'ONLINE',N'Online',1)`,
    { coachA: accounts.coachA.id, coachB: accounts.coachB.id },
  );
  const availabilityValues = Array.from({ length: 7 }, (_, index) => `(@coachA,${index + 1},N'09:00',N'12:00',N'BOTH',N'GYMFIT',1)`).join(',');
  await query(
    `INSERT dbo.CoachAvailabilityRules(coach_id,weekday,start_time,end_time,mode,location,is_active) VALUES ${availabilityValues}`,
    { coachA: accounts.coachA.id },
  );
  await query('INSERT dbo.CRMCustomers(user_id,assigned_coach_id) VALUES(@member,@coachA)', { member: accounts.member.id, coachA: accounts.coachA.id });
  const elite = await query<{ id: number }>('SELECT TOP (1) id FROM dbo.Plans WHERE is_active=1 AND sort_order=3 ORDER BY id');
  if (!elite.recordset[0]) throw new Error('Notification acceptance requires 0012 entitlement seed');
  await query(
    `INSERT dbo.Memberships(user_id,plan_id,start_date,end_date,status,auto_renew,created_at)
     VALUES(@member,@planId,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME())`,
    { member: accounts.member.id, planId: Number(elite.recordset[0].id) },
  );
}

async function notificationCount(recipientUserId: number, deduplicationKey: string): Promise<number> {
  const result = await query<{ total: number }>('SELECT COUNT(*) AS total FROM dbo.Notifications WHERE recipient_user_id=@recipientUserId AND deduplication_key=@deduplicationKey', { recipientUserId, deduplicationKey });
  return Number(result.recordset[0]?.total ?? 0);
}

async function run(): Promise<void> {
  await seed();
  await Promise.all(Object.values(accounts).map(login));

  check((await call('GET', '/notifications')).status === 401, 'Guest cannot list notifications');
  const pool = await getPool();
  const fixtureKey = `fixture:${suffix}:self-scope`;
  const fixtureNotice = await createNotification(pool, {
    recipientUserId: accounts.coachA.id,
    type: 'FIXTURE',
    title: 'Fixture notification',
    message: 'Self-scope fixture',
    actionUrl: '/coach/dashboard',
    deduplicationKey: fixtureKey,
  });
  check(fixtureNotice.created && await notificationCount(accounts.coachA.id, fixtureKey) === 1, 'Notification insert persists recipient and dedup key');
  const coachList = await call('GET', '/notifications?unreadOnly=true', accounts.coachA);
  check(coachList.status === 200 && dataOf<{ items: Array<{ id: number; action_url: string }> }>(coachList).items.some(item => item.id === fixtureNotice.id && item.action_url === '/coach/dashboard'), 'Recipient can list its own notification');
  const crossList = await call('GET', '/notifications', accounts.coachB);
  check(crossList.status === 200 && !dataOf<{ items: Array<{ id: number }> }>(crossList).items.some(item => item.id === fixtureNotice.id), 'Another Coach cannot read notification by ID');
  const unread = await call('GET', '/notifications/unread-count', accounts.coachA);
  check(unread.status === 200 && Number(dataOf<{ unread: number }>(unread).unread) >= 1, 'Unread count is recipient-scoped');
  const marked = await call('PATCH', `/notifications/${fixtureNotice.id}/read`, accounts.coachA);
  check(marked.status === 200 && Boolean(dataOf<{ is_read: boolean }>(marked).is_read), 'Recipient can mark its own notification read');
  check((await call('PATCH', `/notifications/${fixtureNotice.id}/read`, accounts.coachB)).status === 404, 'Cross-recipient mark-read is hidden as not found');
  await createNotification(pool, { recipientUserId: accounts.coachA.id, type: 'FIXTURE', title: 'Read all one', message: 'Read all', deduplicationKey: `fixture:${suffix}:read-all:1` });
  await createNotification(pool, { recipientUserId: accounts.coachA.id, type: 'FIXTURE', title: 'Read all two', message: 'Read all', deduplicationKey: `fixture:${suffix}:read-all:2` });
  const readAll = await call('POST', '/notifications/read-all', accounts.coachA);
  check(readAll.status === 200 && Number(dataOf<{ updated: number }>(readAll).updated) >= 2, 'Mark-all-read is idempotent and scoped');
  const dedupKey = `fixture:${suffix}:concurrent`;
  const dedupResults = await Promise.all(Array.from({ length: 2 }, () => createNotification(pool, { recipientUserId: accounts.coachA.id, type: 'FIXTURE', title: 'Concurrent', message: 'Dedup', deduplicationKey: dedupKey })));
  check(dedupResults.filter(result => result.created).length === 1 && await notificationCount(accounts.coachA.id, dedupKey) === 1, 'Concurrent notification retries create one row');

  const bookingDate = datePlus(2);
  const booking = await call('POST', '/bookings', accounts.member, { coachId: accounts.coachA.id, date: bookingDate, startTime: '10:00', sessionMode: 'ONLINE' });
  check(booking.status === 201, 'Booking trigger fixture creates pending booking');
  const bookingId = Number(dataOf<{ id: number }>(booking).id);
  check(await notificationCount(accounts.coachA.id, `booking:${bookingId}:created`) === 1, 'Booking creation trigger notifies Coach');
  const confirmed = await call('PUT', `/bookings/${bookingId}/status`, accounts.coachA, { status: 'confirmed' });
  check(confirmed.status === 200 && await notificationCount(accounts.member.id, `booking:${bookingId}:status:confirmed`) === 1, 'Booking status trigger notifies Member');

  const today = todayInTimeZone('Asia/Ho_Chi_Minh');
  const currentDay = weekday(today);
  const program = await call('POST', '/coach/workout-programs', accounts.coachA, { name: 'Notification Program', description: 'Acceptance', goal: 'STRENGTH', difficulty: 'BEGINNER', durationWeeks: 1, daysPerWeek: 1 });
  check(program.status === 201, 'Coach creates notification program');
  const programId = Number(dataOf<{ id: number }>(program).id);
  const day = await call('POST', `/coach/workout-programs/${programId}/days`, accounts.coachA, { weekNumber: 1, dayNumber: currentDay, title: 'Notification Day' });
  check(day.status === 201, 'Coach creates notification program day');
  const exercise = await query<{ id: number }>('SELECT TOP (1) id FROM dbo.Exercises WHERE is_active=1 ORDER BY id');
  check(Boolean(exercise.recordset[0]), 'Notification publish fixture has an active Exercise');
  const programExercise = await call('POST', `/coach/workout-program-days/${Number(dataOf<{ id: number }>(day).id)}/exercises`, accounts.coachA, { exerciseId: Number(exercise.recordset[0].id), targetSets: 2, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 60 });
  check(programExercise.status === 201, 'Notification publish fixture adds an Exercise');
  check((await call('POST', `/coach/workout-programs/${programId}/publish`, accounts.coachA, {})).status === 200, 'Coach publishes notification Program before Assignment');
  const assignment = await call('POST', '/coach/assignments', accounts.coachA, { memberId: accounts.member.id, programId, startDate: today, scheduleTimezone: 'Asia/Ho_Chi_Minh' });
  check(assignment.status === 201, 'Assignment trigger fixture creates active assignment');
  const assignmentId = Number(dataOf<{ id: number }>(assignment).id);
  check(await notificationCount(accounts.member.id, `assignment:${assignmentId}:created`) === 1, 'Assignment creation trigger notifies Member');
  const paused = await call('POST', `/coach/assignments/${assignmentId}/pause`, accounts.coachA, {});
  check(paused.status === 200 && await notificationCount(accounts.member.id, `assignment:${assignmentId}:status:PAUSED`) === 1, 'Assignment transition trigger notifies Member');
  check((await call('POST', `/coach/assignments/${assignmentId}/resume`, accounts.coachA, {})).status === 200, 'Assignment resumes for schedule trigger');
  const generated = await call('POST', `/coach/assignments/${assignmentId}/schedules/generate`, accounts.coachA, { fromDate: today, horizonDays: 7 });
  check(generated.status === 200 && Number(dataOf<{ inserted: number }>(generated).inserted) > 0, 'Schedule generation fixture creates schedule');
  const generatedRange = dataOf<{ fromDate: string; toDate: string }>(generated);
  check(await notificationCount(accounts.member.id, `assignment:${assignmentId}:schedules:${generatedRange.fromDate}:${generatedRange.toDate}`) === 1, 'Schedule generation trigger notifies Member');

  const programB = await call('POST', '/coach/workout-programs', accounts.coachB, { name: 'Reassignment Program', description: 'Acceptance', goal: 'GENERAL_FITNESS', difficulty: 'BEGINNER', durationWeeks: 1, daysPerWeek: 1 });
  check(programB.status === 201, 'New Coach creates reassignment program');
  const programBId = Number(dataOf<{ id: number }>(programB).id);
  const programBDay = await call('POST', `/coach/workout-programs/${programBId}/days`, accounts.coachB, { weekNumber: 1, dayNumber: currentDay, title: 'Reassignment Day' });
  check(programBDay.status === 201, 'New Coach creates reassignment Program Day');
  const programBExercise = await call('POST', `/coach/workout-program-days/${Number(dataOf<{ id: number }>(programBDay).id)}/exercises`, accounts.coachB, { exerciseId: Number(exercise.recordset[0].id), targetSets: 2, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 60 });
  check(programBExercise.status === 201, 'New Coach adds reassignment Program Exercise');
  check((await call('POST', `/coach/workout-programs/${programBId}/publish`, accounts.coachB, {})).status === 200, 'New Coach publishes reassignment Program');
  const reassigned = await call('POST', `/admin/coaches/${accounts.coachA.id}/members/${accounts.member.id}/reassign`, accounts.admin, { newCoachId: accounts.coachB.id, programId: programBId, startDate: today, scheduleTimezone: 'Asia/Ho_Chi_Minh' });
  check(reassigned.status === 200, 'Admin reassignment trigger completes');
  const newAssignmentId = Number(dataOf<{ assignment: { id: number } }>(reassigned).assignment.id);
  check(await notificationCount(accounts.member.id, `assignment:${newAssignmentId}:reassigned:member`) === 1
    && await notificationCount(accounts.coachA.id, `assignment:${newAssignmentId}:reassigned:previous-coach`) === 1
    && await notificationCount(accounts.coachB.id, `assignment:${newAssignmentId}:reassigned:new-coach`) === 1, 'Reassignment trigger notifies Member, previous Coach and new Coach');

  const pastSchedule = await query<{ id: number }>(
    `INSERT dbo.CoachProgramSchedules(assignment_id,program_day_id,scheduled_date,status)
     OUTPUT INSERTED.id VALUES(@assignmentId,@dayId,@scheduledDate,N'SCHEDULED')`,
    { assignmentId: newAssignmentId, dayId: Number(dataOf<{ id: number }>(day).id), scheduledDate: datePlus(-2) },
  );
  const overdue = await reconcileOverdueSchedules(100);
  check(overdue.skipped >= 1 && await notificationCount(accounts.coachB.id, `schedule:${Number(pastSchedule.recordset[0].id)}:skipped`) === 1, 'Overdue batch trigger notifies Coach with deduplication');
  const secondOverdue = await reconcileOverdueSchedules(100);
  check(secondOverdue.skipped === 0 && await notificationCount(accounts.coachB.id, `schedule:${Number(pastSchedule.recordset[0].id)}:skipped`) === 1, 'Overdue retry is idempotent');

  console.log(JSON.stringify({ verdict: 'PASS', database: process.env.DB_NAME, migration: '0014', notificationApi: 'self-scoped', triggers: ['booking', 'assignment', 'schedule', 'reassignment', 'overdue'] }));
}

if (process.argv.includes('--cleanup')) {
  cleanup().then(() => console.log(`COACH_NOTIFICATION_CLEANUP PASS ${process.env.DB_NAME}`)).catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
} else {
  run().catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
}
