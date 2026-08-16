import * as bcrypt from 'bcryptjs';
import { closePool, query } from '../config/database';

if (process.env.ADMIN_COACH_ACCEPTANCE !== '1' || !process.env.DB_NAME?.startsWith('GYMFIT_DB_ADMIN_COACH_ACCEPTANCE_')) {
  throw new Error('Admin Coach acceptance requires ADMIN_COACH_ACCEPTANCE=1 and an isolated GYMFIT_DB_ADMIN_COACH_ACCEPTANCE_* database');
}

const base = process.env.COACH_API_BASE || 'http://localhost:5000/api';
const suffix = 'task008admin20260803';
const password = 'AdminCoach#20260803';
const emails = {
  admin: `admin-${suffix}@example.test`,
  coachA: `coach-a-${suffix}@example.test`,
  coachB: `coach-b-${suffix}@example.test`,
  memberA: `member-a-${suffix}@example.test`,
  memberB: `member-b-${suffix}@example.test`,
};
type Key = keyof typeof emails;
type Account = { id: number; email: string; password: string; token?: string };
type Json = Record<string, any>;
type Result = { status: number; body: any };
const accounts = Object.fromEntries(Object.entries(emails).map(([key, email]) => [key, { id: 0, email, password }])) as Record<Key, Account>;
const check = (ok: boolean, label: string) => { if (!ok) throw new Error(`ASSERTION_FAILED ${label}`); console.log(`PASS ${label}`); };
const data = <T,>(result: Result): T => result.body.data as T;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dayNumber = (() => { const day = new Date(`${today}T00:00:00Z`).getUTCDay(); return day === 0 ? 7 : day; })();

async function call(method: string, path: string, account?: Account, body?: unknown): Promise<Result> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(account?.token ? { Authorization: `Bearer ${account.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { parsed = { message: raw }; }
  return { status: response.status, body: parsed };
}

async function login(account: Account) {
  const result = await call('POST', '/auth/login', undefined, { email: account.email, password: account.password });
  check(result.status === 200, `${account.email} login`);
  account.token = String(data<{ accessToken: string }>(result).accessToken);
}

async function cleanup() {
  const users = await query<{ id: number }>('SELECT id FROM dbo.Users WHERE email IN (@admin,@coachA,@coachB,@memberA,@memberB)', emails);
  const ids = users.recordset.map(row => Number(row.id));
  if (!ids.length) return;
  const list = ids.join(',');
  await query(`DELETE FROM dbo.MemberWorkoutSetLogs WHERE session_exercise_id IN (SELECT se.id FROM dbo.MemberWorkoutSessionExercises se JOIN dbo.MemberWorkoutSessions s ON s.id=se.session_id WHERE s.member_id IN (${list}))`);
  await query(`DELETE FROM dbo.MemberWorkoutSessionExercises WHERE session_id IN (SELECT id FROM dbo.MemberWorkoutSessions WHERE member_id IN (${list}))`);
  await query(`DELETE FROM dbo.MemberWorkoutSessions WHERE member_id IN (${list})`);
  await query(`DELETE FROM dbo.CoachProgramSchedules WHERE assignment_id IN (SELECT id FROM dbo.CoachProgramAssignments WHERE member_id IN (${list}) OR coach_id IN (${list}))`);
  await query(`DELETE FROM dbo.CoachProgramAssignments WHERE member_id IN (${list}) OR coach_id IN (${list})`);
  await query(`DELETE FROM dbo.WorkoutProgramExercises WHERE program_day_id IN (SELECT d.id FROM dbo.WorkoutProgramDays d JOIN dbo.WorkoutPrograms p ON p.id=d.program_id WHERE p.owner_coach_id IN (${list}))`);
  await query(`DELETE FROM dbo.WorkoutProgramDays WHERE program_id IN (SELECT id FROM dbo.WorkoutPrograms WHERE owner_coach_id IN (${list}))`);
  await query(`DELETE FROM dbo.WorkoutPrograms WHERE owner_coach_id IN (${list})`);
  await query(`DELETE FROM dbo.CRMCustomers WHERE user_id IN (${list})`);
  await query(`DELETE FROM dbo.AuthSessions WHERE user_id IN (${list})`);
  await query(`DELETE FROM dbo.Exercises WHERE slug=@slug`, { slug: `admin-coach-${suffix}` });
  await query(`DELETE FROM dbo.Users WHERE id IN (${list})`);
}

async function seed() {
  await cleanup();
  const hash = await bcrypt.hash(password, 10);
  const roles: Record<Key, string> = { admin: 'admin', coachA: 'coach', coachB: 'coach', memberA: 'member', memberB: 'member' };
  for (const key of Object.keys(emails) as Key[]) {
    const result = await query<{ id: number }>(
      `INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version,coach_status)
       OUTPUT INSERTED.id VALUES(@email,@password,@name,@role,1,1,0,CASE WHEN @role=N'coach' THEN N'ACTIVE' ELSE NULL END)`,
      { email: emails[key], password: hash, name: `Admin Coach ${key}`, role: roles[key] },
    );
    accounts[key].id = Number(result.recordset[0].id);
  }
  await query(`INSERT dbo.CRMCustomers(user_id,assigned_coach_id) VALUES(@memberA,NULL),(@memberB,NULL)`, { memberA: accounts.memberA.id, memberB: accounts.memberB.id });
}

async function run() {
  await seed();
  for (const key of Object.keys(accounts) as Key[]) await login(accounts[key]);

  check((await call('GET', '/admin/coaches')).status === 401, 'Guest denied Admin Coach API');
  check((await call('GET', '/admin/coaches', accounts.coachA)).status === 403, 'Coach denied Admin Coach API');
  check((await call('GET', '/admin/coaches', accounts.memberA)).status === 403, 'Member denied Admin Coach API');

  const coachList = await call('GET', '/admin/coaches', accounts.admin);
  check(coachList.status === 200 && data<{ items: Json[] }>(coachList).items.some(item => Number(item.id) === accounts.coachA.id), 'Admin reads Coach list');
  const coachDetail = await call('GET', `/admin/coaches/${accounts.coachA.id}`, accounts.admin);
  check(coachDetail.status === 200 && !Object.prototype.hasOwnProperty.call(data<Json>(coachDetail), 'password') && !Object.prototype.hasOwnProperty.call(data<Json>(coachDetail), 'token_version'), 'Admin reads safe Coach detail');

  const createdExercise = await call('POST', '/admin/exercises', accounts.admin, { name: 'Admin Acceptance Squat', slug: `admin-coach-${suffix}`, description: 'Acceptance Exercise', instructions: 'Controlled form.', muscle_group: 'full_body', equipment: 'bodyweight', difficulty: 'BEGINNER' });
  check(createdExercise.status === 201, 'Admin creates Exercise');
  const exerciseId = Number(data<Json>(createdExercise).id);
  const updatedExercise = await call('PATCH', `/admin/exercises/${exerciseId}`, accounts.admin, { description: 'Updated Acceptance Exercise' });
  check(updatedExercise.status === 200 && data<Json>(updatedExercise).description === 'Updated Acceptance Exercise', 'Admin updates Exercise');
  const deactivatedExercise = await call('POST', `/admin/exercises/${exerciseId}/deactivate`, accounts.admin, {});
  check(deactivatedExercise.status === 200 && data<Json>(deactivatedExercise).is_active === false, 'Admin deactivates Exercise');
  const activatedExercise = await call('POST', `/admin/exercises/${exerciseId}/activate`, accounts.admin, {});
  check(activatedExercise.status === 200 && data<Json>(activatedExercise).is_active === true, 'Admin activates Exercise');

  const programA = await call('POST', '/coach/workout-programs', accounts.coachA, { name: 'Admin Acceptance Program A', goal: 'STRENGTH', difficulty: 'BEGINNER', durationWeeks: 1, daysPerWeek: 1 });
  check(programA.status === 201, 'Coach A creates Program');
  const programAId = Number(data<Json>(programA).id);
  const day = await call('POST', `/coach/workout-programs/${programAId}/days`, accounts.coachA, { weekNumber: 1, dayNumber, title: 'Acceptance Day' });
  check(day.status === 201, 'Coach A creates Program Day');
  const dayId = Number(data<Json>(day).id);
  const programExercise = await call('POST', `/coach/workout-program-days/${dayId}/exercises`, accounts.coachA, { exerciseId, targetSets: 1, targetRepsMin: 8, targetRepsMax: 12, targetWeight: 20 });
  check(programExercise.status === 201, 'Coach A adds Exercise to Program');
  check((await call('POST', `/coach/workout-programs/${programAId}/publish`, accounts.coachA, {})).status === 200, 'Coach A publishes Program before Assignment');

  const assigned = await call('POST', `/admin/coaches/${accounts.coachA.id}/members/${accounts.memberA.id}/assign`, accounts.admin, {});
  check(assigned.status === 201, 'Admin assigns unassigned Member');
  check((await call('POST', `/admin/coaches/${accounts.coachA.id}/members/${accounts.memberA.id}/assign`, accounts.admin, {})).status === 409, 'Duplicate assign rejected');

  const assignment = await call('POST', '/coach/assignments', accounts.coachA, { memberId: accounts.memberA.id, programId: programAId, startDate: today, scheduleTimezone: 'Asia/Ho_Chi_Minh' });
  check(assignment.status === 201, 'Coach A creates Assignment');
  const assignmentId = Number(data<Json>(assignment).id);
  const generated = await call('POST', `/coach/assignments/${assignmentId}/schedules/generate`, accounts.coachA, { fromDate: today, horizonDays: 1 });
  check(generated.status === 200 && Number(data<Json>(generated).inserted) === 1, 'Coach A creates Schedule');

  const schedules = await call('GET', '/member/workouts/schedules?limit=50', accounts.memberA);
  check(schedules.status === 200 && data<{ items: Array<{ id: number }> }>(schedules).items.length === 1, 'Member A reads own Schedule');
  const scheduleId = data<{ items: Array<{ id: number }> }>(schedules).items[0].id;
  const started = await call('POST', `/member/workouts/schedules/${scheduleId}/start`, accounts.memberA);
  check(started.status === 201, 'Member A starts Session');
  const sessionId = Number(data<Json>(started).id);
  const session = await call('GET', `/member/workouts/sessions/${sessionId}`, accounts.memberA);
  const sessionExerciseId = Number(data<{ exercises: Array<{ session_exercise_id: number }> }>(session).exercises[0].session_exercise_id);
  const set = await call('POST', `/member/workouts/sessions/${sessionId}/exercises/${sessionExerciseId}/sets`, accounts.memberA, { set_number: 1, reps: 10, weight_kg: 20, completed: true });
  check(set.status === 201, 'Member A writes Set Log');
  check((await call('POST', `/member/workouts/sessions/${sessionId}/complete`, accounts.memberA)).status === 200, 'Member A completes Session');

  const governance = await call('GET', '/admin/workouts/sessions?limit=50', accounts.admin);
  check(governance.status === 200 && data<{ items: Json[] }>(governance).items.some(item => Number(item.id) === sessionId), 'Admin reads Session governance');
  for (const [label, path] of [['Programs', `/admin/workouts/programs?coachId=${accounts.coachA.id}`], ['Assignments', `/admin/workouts/assignments?coachId=${accounts.coachA.id}`], ['Schedules', `/admin/workouts/schedules?coachId=${accounts.coachA.id}`], ['Progress', `/admin/workouts/progress?coachId=${accounts.coachA.id}`]] as const) check((await call('GET', path, accounts.admin)).status === 200, `Admin reads ${label} governance`);
  check((await call('GET', `/coach/members/${accounts.memberA.id}/progress`, accounts.coachA)).status === 200, 'Coach A reads scoped Progress');
  check((await call('GET', `/coach/members/${accounts.memberB.id}`, accounts.coachA)).status === 404, 'Coach A cannot view Member B');
  check((await call('PATCH', `/member/workouts/sessions/${sessionId}/exercises/${sessionExerciseId}/sets/1`, accounts.admin, { reps: 11 })).status === 403, 'Admin cannot mutate Member Set Log route');
  check((await call('PATCH', `/admin/workouts/programs/${programAId}`, accounts.admin, {})).status === 404, 'Admin Program mutation route absent');
  check((await call('PATCH', `/admin/workouts/sessions/${sessionId}`, accounts.admin, {})).status === 404, 'Admin Session mutation route absent');

  const programB = await call('POST', '/coach/workout-programs', accounts.coachB, { name: 'Admin Acceptance Program B', goal: 'GENERAL_FITNESS', difficulty: 'BEGINNER', durationWeeks: 1, daysPerWeek: 1 });
  check(programB.status === 201, 'Coach B creates Program');
  const programBId = Number(data<Json>(programB).id);
  const dayB = await call('POST', `/coach/workout-programs/${programBId}/days`, accounts.coachB, { weekNumber: 1, dayNumber, title: 'Acceptance Reassign Day' });
  check(dayB.status === 201, 'Coach B creates Reassign Program Day');
  const dayBId = Number(data<Json>(dayB).id);
  const programExerciseB = await call('POST', `/coach/workout-program-days/${dayBId}/exercises`, accounts.coachB, { exerciseId, targetSets: 1, targetRepsMin: 8, targetRepsMax: 12, targetWeight: 20 });
  check(programExerciseB.status === 201, 'Coach B adds Exercise to Reassign Program');
  check((await call('POST', `/coach/workout-programs/${programBId}/publish`, accounts.coachB, {})).status === 200, 'Coach B publishes Program before reassignment');
  const reassignmentPayload = { newCoachId: accounts.coachB.id, programId: programBId, startDate: today, scheduleTimezone: 'Asia/Ho_Chi_Minh' };
  const reassignmentAttempts = await Promise.all([1, 2].map(() => call('POST', `/admin/coaches/${accounts.coachA.id}/members/${accounts.memberA.id}/reassign`, accounts.admin, reassignmentPayload)));
  const reassignmentStatuses = reassignmentAttempts.map(result => result.status).sort((a, b) => a - b);
  check(reassignmentStatuses[0] === 200 && reassignmentStatuses[1] === 409, 'Concurrent reassign has one winner');
  const reassigned = reassignmentAttempts.find(result => result.status === 200)!;
  check(data<Json>(reassigned).sessions_preserved === true, 'Admin reassigns through existing service');
  const state = await query<{ old_status: string; active_count: number }>(`SELECT (SELECT TOP 1 status FROM dbo.CoachProgramAssignments WHERE id=@assignmentId) old_status,(SELECT COUNT(*) FROM dbo.CoachProgramAssignments WHERE member_id=@memberId AND status=N'ACTIVE') active_count`, { assignmentId, memberId: accounts.memberA.id });
  check(state.recordset[0].old_status === 'PAUSED' && Number(state.recordset[0].active_count) === 1, 'Reassign leaves one active scope and pauses old Assignment');
  const preserved = await query<{ session_count: number; set_count: number }>(`SELECT (SELECT COUNT(*) FROM dbo.MemberWorkoutSessions WHERE id=@sessionId) session_count,(SELECT COUNT(*) FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id WHERE se.session_id=@sessionId) set_count`, { sessionId });
  check(Number(preserved.recordset[0].session_count) === 1 && Number(preserved.recordset[0].set_count) === 1, 'Reassign preserves session and progress history');
  check((await call('GET', `/coach/members/${accounts.memberA.id}/progress`, accounts.coachA)).status === 404, 'Coach A loses Member scope');
  check((await call('GET', `/coach/members/${accounts.memberA.id}`, accounts.coachB)).status === 200, 'Coach B receives Member scope');

  const tokenBeforeSuspend = await query<{ token_version: number }>('SELECT token_version FROM dbo.Users WHERE id=@coachId', { coachId: accounts.coachB.id });
  const suspended = await call('PATCH', `/admin/coaches/${accounts.coachB.id}/status`, accounts.admin, { status: 'SUSPENDED', reason: 'Acceptance suspension' });
  const tokenAfterSuspend = await query<{ token_version: number }>('SELECT token_version FROM dbo.Users WHERE id=@coachId', { coachId: accounts.coachB.id });
  check(suspended.status === 200 && Number(tokenAfterSuspend.recordset[0].token_version) > Number(tokenBeforeSuspend.recordset[0].token_version), 'Admin suspends Coach B and increments token version');
  check((await call('GET', '/coach/dashboard', accounts.coachB)).status === 401, 'Suspended Coach cannot access Workspace');
  const reactivated = await call('PATCH', `/admin/coaches/${accounts.coachB.id}/status`, accounts.admin, { status: 'ACTIVE', reason: 'Acceptance reactivation' });
  check(reactivated.status === 200, 'Admin reactivates Coach B');
  check((await call('GET', '/coach/dashboard', accounts.coachB)).status === 401, 'Old suspended token remains invalid');
  await login(accounts.coachB);
  check((await call('GET', '/coach/dashboard', accounts.coachB)).status === 200, 'Reactivated Coach can access Workspace');
  check((await call('GET', `/admin/coaches/${accounts.coachB.id}`, accounts.admin)).status === 200, 'Admin can still inspect Coach detail');

  console.log(JSON.stringify({ verdict: 'PASS', database: process.env.DB_NAME, exerciseId, programAId, programBId, assignmentId, sessionId }));
}

if (process.argv.includes('--cleanup')) cleanup().then(() => console.log(`CLEANUP_PASS ${process.env.DB_NAME}`)).catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
else run().catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
