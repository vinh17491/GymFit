import * as bcrypt from 'bcryptjs';
import { closePool, getPool, query } from '../config/database';
import { createNotification } from '../modules/notifications/notifications.service';
import { COACH_BOOKING_TIME_ZONE } from '../utils/coachBooking';
import { todayInTimeZone } from '../utils/timezone';

if (process.env.COACH_COMPLETION_SECURITY_ACCEPTANCE !== '1'
  || !process.env.DB_NAME?.startsWith('GYMFIT_DB_COACH_ACCEPTANCE_')) {
  throw new Error('Coach completion security acceptance requires COACH_COMPLETION_SECURITY_ACCEPTANCE=1 and an isolated Coach acceptance database');
}

const base = process.env.COACH_API_BASE || 'http://localhost:5000/api';
const suffix = process.env.COACH_SECURITY_FIXTURE_SUFFIX || `${Date.now()}`;
const password = process.env.COACH_SECURITY_PASSWORD || `CoachSecurity#${suffix.slice(-8)}`;
const today = todayInTimeZone(COACH_BOOKING_TIME_ZONE);

const emails = {
  coachA: `security-coach-a-${suffix}@example.test`,
  coachB: `security-coach-b-${suffix}@example.test`,
  memberA: `security-member-a-${suffix}@example.test`,
  memberB: `security-member-b-${suffix}@example.test`,
  memberC: `security-member-c-${suffix}@example.test`,
  admin: `security-admin-${suffix}@example.test`,
};

type AccountKey = keyof typeof emails;
type Account = { id: number; email: string; password: string; token?: string };
type Json = Record<string, unknown>;
type ApiResult = { status: number; body: Json };
const accounts = Object.fromEntries(
  Object.entries(emails).map(([key, email]) => [key, { id: 0, email, password }]),
) as Record<AccountKey, Account>;

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

function datePlus(days: number): string {
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
  await query(`DELETE FROM dbo.MemberWorkoutSetLogs WHERE session_exercise_id IN (
    SELECT se.id FROM dbo.MemberWorkoutSessionExercises se
    JOIN dbo.MemberWorkoutSessions s ON s.id=se.session_id WHERE s.member_id IN (${csv}))`);
  await query(`DELETE FROM dbo.MemberWorkoutSessionExercises WHERE session_id IN (
    SELECT id FROM dbo.MemberWorkoutSessions WHERE member_id IN (${csv}))`);
  await query(`DELETE FROM dbo.MemberWorkoutSessions WHERE member_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachProgramSchedules WHERE assignment_id IN (
    SELECT id FROM dbo.CoachProgramAssignments WHERE member_id IN (${csv}) OR coach_id IN (${csv}))`);
  await query(`DELETE FROM dbo.CoachProgramAssignments WHERE member_id IN (${csv}) OR coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.WorkoutProgramExercises WHERE program_day_id IN (
    SELECT d.id FROM dbo.WorkoutProgramDays d JOIN dbo.WorkoutPrograms p ON p.id=d.program_id WHERE p.owner_coach_id IN (${csv}))`);
  await query(`DELETE FROM dbo.WorkoutProgramDays WHERE program_id IN (
    SELECT id FROM dbo.WorkoutPrograms WHERE owner_coach_id IN (${csv}))`);
  await query(`DELETE FROM dbo.WorkoutPrograms WHERE owner_coach_id IN (${csv})`);
  await query('DELETE FROM dbo.Exercises WHERE slug=@slug', { slug: `coach-completion-security-exercise-${suffix}` });
  await query(`DELETE FROM dbo.Bookings WHERE coach_id IN (${csv}) OR member_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachAvailabilityExceptions WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachAvailabilityRules WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachMemberContexts WHERE coach_id IN (${csv}) OR member_id IN (${csv})`);
  await query(`DELETE FROM dbo.CoachProfiles WHERE coach_id IN (${csv})`);
  await query(`DELETE FROM dbo.CRMCustomers WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Memberships WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Payments WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuditLogs WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuthSessions WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Users WHERE id IN (${csv})`);
}

async function seed(): Promise<number> {
  await cleanup();
  const hash = await bcrypt.hash(password, 10);
  const roles: Record<AccountKey, string> = {
    coachA: 'coach', coachB: 'coach', memberA: 'member', memberB: 'member', memberC: 'member', admin: 'admin',
  };
  for (const key of Object.keys(emails) as AccountKey[]) {
    const result = await query<{ id: number }>(
      `INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version,coach_status)
       OUTPUT INSERTED.id VALUES(@email,@password,@name,@role,1,1,0,@coachStatus)`,
      { email: emails[key], password: hash, name: `Security ${key}`, role: roles[key], coachStatus: roles[key] === 'coach' ? 'ACTIVE' : null },
    );
    accounts[key].id = Number(result.recordset[0].id);
  }

  await query(
    `INSERT dbo.CoachProfiles(coach_id,specialty,bio,experience_years,session_mode,location,booking_enabled)
     VALUES(@coachA,N'Strength',N'Security Coach A',5,N'BOTH',N'GYMFIT',1),
           (@coachB,N'Mobility',N'Security Coach B',4,N'ONLINE',N'Online',1)`,
    { coachA: accounts.coachA.id, coachB: accounts.coachB.id },
  );
  for (const coachId of [accounts.coachA.id, accounts.coachB.id]) {
    const values = Array.from({ length: 7 }, (_, index) => `(@coachId,${index + 1},N'08:00',N'18:00',N'BOTH',N'GYMFIT',1)`).join(',');
    await query(`INSERT dbo.CoachAvailabilityRules(coach_id,weekday,start_time,end_time,mode,location,is_active) VALUES ${values}`, { coachId });
  }
  await query(
    `INSERT dbo.CRMCustomers(user_id,assigned_coach_id)
     VALUES(@memberA,@coachA),(@memberB,@coachB),(@memberC,@coachA)`,
    { memberA: accounts.memberA.id, memberB: accounts.memberB.id, memberC: accounts.memberC.id, coachA: accounts.coachA.id, coachB: accounts.coachB.id },
  );
  const elite = await query<{ id: number }>('SELECT TOP (1) id FROM dbo.Plans WHERE is_active=1 AND sort_order=3 ORDER BY id');
  check(Boolean(elite.recordset[0]), 'security fixture has Elite entitlement seed');
  await query(
    `INSERT dbo.Memberships(user_id,plan_id,start_date,end_date,status,auto_renew,created_at)
     VALUES(@memberA,@planId,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME()),
           (@memberB,@planId,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME()),
           (@memberC,@planId,SYSUTCDATETIME(),DATEADD(day,365,SYSUTCDATETIME()),N'active',0,SYSUTCDATETIME())`,
    { memberA: accounts.memberA.id, memberB: accounts.memberB.id, memberC: accounts.memberC.id, planId: Number(elite.recordset[0].id) },
  );
  const exerciseSlug = `coach-completion-security-exercise-${suffix}`;
  let exercise = await query<{ id: number; is_active: boolean }>('SELECT TOP (1) id,is_active FROM dbo.Exercises WHERE slug=@slug', { slug: exerciseSlug });
  if (!exercise.recordset[0]) {
    exercise = await query<{ id: number; is_active: boolean }>(
      `INSERT dbo.Exercises(name,slug,description,instructions,muscle_group,equipment,difficulty,is_active)
       OUTPUT INSERTED.id,INSERTED.is_active
       VALUES(N'Coach Completion Security Exercise',@slug,N'Acceptance-only active Exercise',N'Use controlled form.',N'full_body',N'bodyweight',N'BEGINNER',1)`,
      { slug: exerciseSlug },
    );
  } else if (!exercise.recordset[0].is_active) {
    await query('UPDATE dbo.Exercises SET is_active=1 WHERE id=@exerciseId', { exerciseId: Number(exercise.recordset[0].id) });
  }
  check(Boolean(exercise.recordset[0]), 'security fixture has an active Exercise');
  return Number(exercise.recordset[0].id);
}

async function createPublishedProgram(owner: Account, exerciseId: number, name: string) {
  const program = await call('POST', '/coach/workout-programs', owner, {
    name, description: 'Completion security fixture', goal: 'STRENGTH', difficulty: 'BEGINNER', durationWeeks: 4, daysPerWeek: 1,
  });
  check(program.status === 201, `${name} Draft created`);
  const programId = Number(dataOf<{ id: number }>(program).id);
  const day = await call('POST', `/coach/workout-programs/${programId}/days`, owner, { weekNumber: 1, dayNumber: weekday(today), title: `${name} Day` });
  check(day.status === 201, `${name} Day created`);
  const dayId = Number(dataOf<{ id: number }>(day).id);
  const raceDay = await call('POST', `/coach/workout-programs/${programId}/days`, owner, { weekNumber: 4, dayNumber: weekday(today), title: `${name} Race Day` });
  check(raceDay.status === 201, `${name} Race Day created`);
  const programExercise = await call('POST', `/coach/workout-program-days/${dayId}/exercises`, owner, {
    exerciseId, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetWeight: 20, restSeconds: 60,
  });
  check(programExercise.status === 201, `${name} Exercise created`);
  const raceExercise = await call('POST', `/coach/workout-program-days/${Number(dataOf<{ id: number }>(raceDay).id)}/exercises`, owner, {
    exerciseId, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetWeight: 20, restSeconds: 60,
  });
  check(raceExercise.status === 201, `${name} Race Day Exercise created`);
  const published = await call('POST', `/coach/workout-programs/${programId}/publish`, owner, {});
  check(published.status === 200, `${name} published`);
  return { id: programId, dayId, programExerciseId: Number(dataOf<{ id: number }>(programExercise).id) };
}

async function createAssignment(owner: Account, memberId: number, programId: number) {
  const result = await call('POST', '/coach/assignments', owner, {
    memberId, programId, startDate: today, scheduleTimezone: COACH_BOOKING_TIME_ZONE,
  });
  check(result.status === 201, `Assignment created for member ${memberId}`);
  return Number(dataOf<{ id: number }>(result).id);
}

async function run(): Promise<void> {
  const exerciseId = await seed();
  await Promise.all(Object.values(accounts).map(login));

  check((await call('GET', '/coaches')).status === 200, 'Guest can list public Coaches');
  check((await call('GET', `/coaches/${accounts.coachA.id}`)).status === 200, 'Guest can read public Coach detail');
  check((await call('GET', `/coaches/${accounts.coachA.id}/availability?date=${datePlus(2)}`)).status === 200, 'Guest can read public Coach availability');
  for (const path of ['/coach/dashboard', '/notifications', '/bookings', '/member/workouts/current', '/plans/my-membership', '/admin/coaches']) {
    check((await call('GET', path)).status === 401, `Guest is denied private route ${path}`);
  }

  check((await call('GET', '/coach/dashboard', accounts.memberA)).status === 403, 'Member cannot enter Coach Workspace');
  check((await call('GET', '/coach/availability', accounts.memberA)).status === 403, 'Member cannot use Coach Availability API');
  check((await call('GET', '/coach/workout-programs', accounts.memberA)).status === 403, 'Member cannot read Coach Programs');
  check((await call('GET', '/admin/coaches', accounts.coachA)).status === 403, 'Coach cannot use Admin Coach routes');
  check((await call('GET', '/coach/dashboard', accounts.admin)).status === 403, 'Admin cannot impersonate Coach Workspace');
  check((await call('GET', '/member/workouts/current', accounts.admin)).status === 403, 'Admin cannot mutate/read Member Workout surface');
  check((await call('GET', '/admin/coaches', accounts.admin)).status === 200, 'Admin can use the intended Admin Coach route');

  const programA = await createPublishedProgram(accounts.coachA, exerciseId, 'Security Program A');
  const programB = await createPublishedProgram(accounts.coachB, exerciseId, 'Security Program B');
  check((await call('GET', `/coach/workout-programs/${programA.id}`, accounts.coachB)).status === 404, 'Coach B cannot read Coach A Program');
  check((await call('PATCH', `/coach/workout-programs/${programA.id}`, accounts.coachB, { name: 'IDOR', goal: 'STRENGTH', difficulty: 'BEGINNER', durationWeeks: 1, daysPerWeek: 1 })).status === 404, 'Coach B cannot edit Coach A Program');
  check((await call('POST', `/coach/workout-programs/${programA.id}/clone-version`, accounts.coachB, {})).status === 404, 'Coach B cannot clone Coach A Program');
  check((await call('POST', `/coach/workout-programs/${programA.id}/archive`, accounts.coachB, {})).status === 404, 'Coach B cannot archive Coach A Program');
  check((await call('PATCH', '/coach/profile', accounts.coachA, { coachId: accounts.coachB.id })).status === 400, 'Coach self-profile rejects identity spoofing');
  check((await call('POST', '/coach/workout-programs', accounts.coachA, { name: 'Spoof', goal: 'STRENGTH', difficulty: 'BEGINNER', durationWeeks: 1, daysPerWeek: 1, owner_coach_id: accounts.coachB.id })).status === 400, 'Program creation rejects owner spoofing');

  const ruleB = await query<{ id: number }>('SELECT TOP (1) id FROM dbo.CoachAvailabilityRules WHERE coach_id=@coachId ORDER BY id', { coachId: accounts.coachB.id });
  check((await call('PATCH', `/coach/availability/rules/${Number(ruleB.recordset[0].id)}`, accounts.coachA, { startTime: '09:00' })).status === 404, 'Coach A cannot edit Coach B Availability');
  check((await call('DELETE', `/coach/availability/rules/${Number(ruleB.recordset[0].id)}`, accounts.coachA)).status === 404, 'Coach A cannot delete Coach B Availability');

  const assignmentA = await createAssignment(accounts.coachA, accounts.memberA.id, programA.id);
  const assignmentB = await createAssignment(accounts.coachB, accounts.memberB.id, programB.id);
  const generatedA = await call('POST', `/coach/assignments/${assignmentA}/schedules/generate`, accounts.coachA, { fromDate: today, horizonDays: 14 });
  const generatedB = await call('POST', `/coach/assignments/${assignmentB}/schedules/generate`, accounts.coachB, { fromDate: today, horizonDays: 14 });
  check(generatedA.status === 200 && generatedB.status === 200, 'Both Coach schedule generations succeed in own scope');
  check((await call('GET', `/coach/assignments/${assignmentB}`, accounts.coachA)).status === 404, 'Coach A cannot read Coach B Assignment');
  check((await call('POST', `/coach/assignments/${assignmentB}/pause`, accounts.coachA, {})).status === 404, 'Coach A cannot transition Coach B Assignment');
  check((await call('POST', `/coach/assignments/${assignmentB}/schedules/generate`, accounts.coachA, { fromDate: today, horizonDays: 7 })).status === 404, 'Coach A cannot generate Coach B Schedules');
  const memberListA = await call('GET', '/coach/members?page=1&limit=50', accounts.coachA);
  check(memberListA.status === 200 && (dataOf<{ items: Array<{ id: number }> }>(memberListA).items || []).every(item => Number(item.id) !== accounts.memberB.id), 'Coach A Member list excludes Coach B Member');
  check((await call('GET', `/coach/members/${accounts.memberB.id}`, accounts.coachA)).status === 404, 'Coach A cannot read Coach B Member');

  const contextA = await call('PATCH', `/coach/members/${accounts.memberA.id}/context`, accounts.coachA, { privateNote: 'Security private note' });
  check(contextA.status === 200, 'Coach A can write own Member context');
  check((await call('GET', `/coach/members/${accounts.memberA.id}/context`, accounts.coachB)).status === 404, 'Coach B cannot read Coach A private context');
  check((await call('PATCH', `/coach/members/${accounts.memberA.id}/context`, accounts.coachB, { privateNote: 'IDOR' })).status === 404, 'Coach B cannot edit Coach A private context');
  check((await call('GET', `/coach/members/${accounts.memberA.id}/context`, accounts.memberA)).status === 403, 'Member cannot read Coach private context');

  const bookingDate = datePlus(2);
  const ownBooking = await call('POST', '/bookings', accounts.memberA, { coachId: accounts.coachA.id, date: bookingDate, startTime: '08:00', sessionMode: 'ONLINE' });
  check(ownBooking.status === 201, 'Member can create an entitled Coach Booking');
  const ownBookingId = Number(dataOf<{ id: number }>(ownBooking).id);
  const crossBooking = await call('POST', '/bookings', accounts.memberB, { coachId: accounts.coachB.id, date: bookingDate, startTime: '09:00', sessionMode: 'ONLINE' });
  check(crossBooking.status === 201, 'Second Member creates a different Coach Booking');
  const crossBookingId = Number(dataOf<{ id: number }>(crossBooking).id);
  check((await call('GET', `/bookings/${ownBookingId}`, accounts.memberB)).status === 404, 'Member B cannot read Member A Booking');
  check((await call('PUT', `/bookings/${ownBookingId}/status`, accounts.memberB, { status: 'cancelled' })).status === 404, 'Member B cannot mutate Member A Booking');
  check((await call('GET', `/bookings/${crossBookingId}`, accounts.coachA)).status === 404, 'Coach A cannot read Coach B Booking');
  check((await call('PUT', `/bookings/${crossBookingId}/status`, accounts.coachA, { status: 'confirmed' })).status === 404, 'Coach A cannot mutate Coach B Booking');
  check((await call('GET', '/bookings/quota', accounts.coachA)).status === 403, 'Coach cannot use Member quota endpoint');
  check((await call('GET', '/bookings/quota', accounts.admin)).status === 403, 'Admin cannot bypass Member quota endpoint');
  check((await call('GET', `/bookings/quota?date=${bookingDate}`, accounts.memberA)).status === 200, 'Member quota is self-scoped');
  const slotRace = await Promise.all([
    call('POST', '/bookings', accounts.memberA, { coachId: accounts.coachB.id, date: datePlus(3), startTime: '12:00', sessionMode: 'ONLINE' }),
    call('POST', '/bookings', accounts.memberC, { coachId: accounts.coachB.id, date: datePlus(3), startTime: '12:00', sessionMode: 'ONLINE' }),
  ]);
  check(slotRace.map(item => item.status).sort((a, b) => a - b).join(',') === '201,409', 'Concurrent same-slot booking has one winner');
  check((await call('POST', '/bookings', accounts.memberA, { coachId: accounts.coachA.id, date: datePlus(4), startTime: '08:00', sessionMode: 'ONLINE', memberId: accounts.memberB.id })).status === 400, 'Booking rejects client member identity spoofing');

  const notificationId = Number((await query<{ id: number }>(`SELECT TOP (1) id FROM dbo.Notifications WHERE recipient_user_id=@recipient AND deduplication_key LIKE @pattern ORDER BY id DESC`, { recipient: accounts.coachA.id, pattern: `booking:${ownBookingId}:%` })).recordset[0]?.id);
  check(Number.isInteger(notificationId) && notificationId > 0, 'Booking trigger created a Coach notification');
  check((await call('GET', '/notifications', accounts.coachB)).status === 200 && !(dataOf<{ items: Array<{ id: number }> }>(await call('GET', '/notifications', accounts.coachB)).items || []).some(item => item.id === notificationId), 'Coach B cannot read Coach A notification');
  check((await call('PATCH', `/notifications/${notificationId}/read`, accounts.coachB)).status === 404, 'Coach B cannot mark Coach A notification read');
  const dedupKey = `security:${suffix}:concurrent-dedup`;
  const pool = await getPool();
  const dedupResults = await Promise.all(Array.from({ length: 2 }, () => createNotification(pool, { recipientUserId: accounts.coachA.id, type: 'SECURITY_FIXTURE', title: 'Dedup', message: 'Dedup', deduplicationKey: dedupKey })));
  const dedupCount = await query<{ total: number }>('SELECT COUNT(*) AS total FROM dbo.Notifications WHERE deduplication_key=@dedupKey', { dedupKey });
  check(dedupResults.filter(result => result.created).length === 1 && Number(dedupCount.recordset[0].total) === 1, 'Concurrent notification deduplication has one row');

  const scheduleA = await query<{ id: number }>('SELECT TOP (1) id FROM dbo.CoachProgramSchedules WHERE assignment_id=@assignmentId AND scheduled_date=@scheduledDate ORDER BY id', { assignmentId: assignmentA, scheduledDate: today });
  check(Boolean(scheduleA.recordset[0]), 'Own schedule is available for session security checks');
  const scheduleId = Number(scheduleA.recordset[0].id);
  const sessionStart = await call('POST', `/member/workouts/schedules/${scheduleId}/start`, accounts.memberA);
  check(sessionStart.status === 201 || sessionStart.status === 200, 'Member A starts own Workout Session');
  const sessionData = dataOf<{ id: number; exercises: Array<{ session_exercise_id: number }> }>(sessionStart);
  const sessionId = Number(sessionData.id);
  const sessionExerciseId = Number(sessionData.exercises[0]?.session_exercise_id);
  check((await call('GET', `/member/workouts/sessions/${sessionId}`, accounts.memberB)).status === 404, 'Member B cannot read Member A Session');
  check((await call('GET', `/coach/members/${accounts.memberA.id}/sessions/member/${sessionId}`, accounts.coachA)).status === 200, 'Coach A can read own scoped member Session');
  check((await call('GET', `/coach/members/${accounts.memberA.id}/sessions/member/${sessionId}`, accounts.coachB)).status === 404, 'Coach B cannot read Coach A member Session');
  check((await call('GET', `/coach/members/${accounts.memberA.id}/sessions/legacy/${sessionId}`, accounts.coachA)).status === 404, 'Wrong Session source cannot cross source identity');
  check((await call('GET', `/member/workouts/sessions/${sessionId}`, accounts.admin)).status === 403, 'Admin cannot mutate/read Member Session route');
  const set = await call('POST', `/member/workouts/sessions/${sessionId}/exercises/${sessionExerciseId}/sets`, accounts.memberA, { set_number: 1, reps: 10, weight_kg: 20, completed: true });
  check(set.status === 201, 'Member A creates a completed measurement');
  const completionRace = await Promise.all([
    call('POST', `/member/workouts/sessions/${sessionId}/complete`, accounts.memberA),
    call('POST', `/member/workouts/sessions/${sessionId}/complete`, accounts.memberA),
  ]);
  check(completionRace.map(item => item.status).sort((a, b) => a - b).join(',') === '200,409', 'Concurrent Session completion has one winner');
  check((await call('PATCH', `/member/workouts/sessions/${sessionId}/exercises/${sessionExerciseId}/sets/${Number(dataOf<{ id: number }>(set).id)}`, accounts.memberA, { reps: 11 })).status === 409, 'Terminal Session blocks Set mutation');

  const scheduleRace = await Promise.all([
    call('POST', `/coach/assignments/${assignmentA}/schedules/generate`, accounts.coachA, { fromDate: datePlus(21), horizonDays: 7 }),
    call('POST', `/coach/assignments/${assignmentA}/schedules/generate`, accounts.coachA, { fromDate: datePlus(21), horizonDays: 7 }),
  ]);
  check(scheduleRace.every(item => item.status === 200) && scheduleRace.reduce((sum, item) => sum + Number((dataOf<{ inserted?: number }>(item).inserted || 0)), 0) === 1, 'Concurrent Schedule generation is idempotent');
  const assignmentPauseRace = await Promise.all([
    call('POST', `/coach/assignments/${assignmentA}/pause`, accounts.coachA, {}),
    call('POST', `/coach/assignments/${assignmentA}/pause`, accounts.coachA, {}),
  ]);
  check(assignmentPauseRace.map(item => item.status).sort((a, b) => a - b).join(',') === '200,409', 'Concurrent Assignment transition has one winner');

  const publishRaceProgram = await call('POST', '/coach/workout-programs', accounts.coachA, { name: 'Security Publish Race', goal: 'MOBILITY', difficulty: 'BEGINNER', durationWeeks: 1, daysPerWeek: 1 });
  const publishRaceId = Number(dataOf<{ id: number }>(publishRaceProgram).id);
  const publishRaceDay = await call('POST', `/coach/workout-programs/${publishRaceId}/days`, accounts.coachA, { weekNumber: 1, dayNumber: weekday(today), title: 'Publish Race Day' });
  check(publishRaceDay.status === 201, 'Publish race Program Day created');
  const publishRaceExercise = await call('POST', `/coach/workout-program-days/${Number(dataOf<{ id: number }>(publishRaceDay).id)}/exercises`, accounts.coachA, { exerciseId, targetSets: 2, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 60 });
  check(publishRaceExercise.status === 201, 'Publish race Program Exercise created');
  const publishRace = await Promise.all([1, 2].map(() => call('POST', `/coach/workout-programs/${publishRaceId}/publish`, accounts.coachA, {})));
  check(publishRace.map(item => item.status).sort((a, b) => a - b).join(',') === '200,409', 'Concurrent Program publish has one winner');
  const cloneRace = await Promise.all([1, 2].map(() => call('POST', `/coach/workout-programs/${programA.id}/clone-version`, accounts.coachA, {})));
  check(cloneRace.every(item => item.status === 201) && new Set(cloneRace.map(item => Number(dataOf<{ version_number: number }>(item).version_number))).size === 2, 'Concurrent Program clone allocates unique versions');

  const reassignmentRace = await Promise.all([1, 2].map(() => call('POST', `/admin/coaches/${accounts.coachA.id}/members/${accounts.memberC.id}/reassign`, accounts.admin, {
    newCoachId: accounts.coachB.id, programId: programB.id, startDate: today, scheduleTimezone: COACH_BOOKING_TIME_ZONE,
  })));
  check(reassignmentRace.map(item => item.status).sort((a, b) => a - b).join(',') === '200,409', 'Concurrent Admin reassignment has one winner');
  const ownerAfterReassign = await query<{ assigned_coach_id: number }>('SELECT assigned_coach_id FROM dbo.CRMCustomers WHERE user_id=@memberId', { memberId: accounts.memberC.id });
  check(Number(ownerAfterReassign.recordset[0]?.assigned_coach_id) === accounts.coachB.id, 'Reassignment leaves one authoritative Coach owner');

  console.log(JSON.stringify({
    verdict: 'PASS', database: process.env.DB_NAME, scope: 'Coach RBAC/IDOR/concurrency',
    actors: Object.keys(accounts).length, programA: programA.id, programB: programB.id, ownBookingId, sessionId,
  }));
}

if (process.argv.includes('--cleanup')) {
  cleanup().then(() => console.log(`CLEANUP_PASS ${process.env.DB_NAME}`)).catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
} else {
  run().catch(error => { console.error('[COACH COMPLETION SECURITY FAIL]', error instanceof Error ? error.message : String(error)); process.exitCode = 1; }).finally(closePool);
}
