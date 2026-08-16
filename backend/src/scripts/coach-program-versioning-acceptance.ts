import * as bcrypt from 'bcryptjs';
import { closePool, query } from '../config/database';

if (process.env.COACH_ACCEPTANCE !== '1' || !process.env.DB_NAME?.startsWith('GYMFIT_DB_COACH_ACCEPTANCE_')) {
  throw new Error('Coach Program Versioning acceptance requires COACH_ACCEPTANCE=1 and an isolated Coach acceptance database');
}

const base = process.env.COACH_API_BASE || 'http://localhost:5000/api';
const suffix = process.env.COACH_VERSIONING_FIXTURE_SUFFIX || `${Date.now()}`;
const password = process.env.COACH_VERSIONING_PASSWORD || `CoachVersion#${suffix.slice(-8)}`;
const emails = {
  coachA: `coach-version-a-${suffix}@example.test`,
  coachB: `coach-version-b-${suffix}@example.test`,
  memberA: `member-version-a-${suffix}@example.test`,
  memberB: `member-version-b-${suffix}@example.test`,
  admin: `admin-version-${suffix}@example.test`,
};

type AccountKey = keyof typeof emails;
type Account = { id: number; email: string; password: string; token?: string };
type Json = Record<string, unknown>;
type Result = { status: number; body: Json };
const accounts = Object.fromEntries(Object.entries(emails).map(([key, email]) => [key, { id: 0, email, password }])) as Record<AccountKey, Account>;

const check = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`ASSERTION_FAILED ${message}`);
  console.log(`PASS ${message}`);
};

const dataOf = <T,>(result: Result): T => result.body.data as T;

async function call(method: string, path: string, account?: Account, body?: unknown): Promise<Result> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(account?.token ? { Authorization: `Bearer ${account.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { parsed = { message: raw }; }
  return { status: response.status, body: parsed as Json };
}

async function login(account: Account): Promise<void> {
  const result = await call('POST', '/auth/login', undefined, { email: account.email, password: account.password });
  check(result.status === 200, `${account.email} login`);
  account.token = String(dataOf<{ accessToken: string }>(result).accessToken);
}

async function cleanup(): Promise<void> {
  const users = await query<{ id: number }>('SELECT id FROM dbo.Users WHERE email IN (@coachA,@coachB,@memberA,@memberB,@admin)', emails);
  const ids = users.recordset.map(row => Number(row.id));
  if (!ids.length) return;
  const csv = ids.join(',');
  const coaches = ids.slice(0, 2).join(',') || '-1';
  await query(`DELETE FROM dbo.CoachProgramSchedules WHERE assignment_id IN (SELECT id FROM dbo.CoachProgramAssignments WHERE member_id IN (${csv}) OR coach_id IN (${coaches}))`);
  await query(`DELETE FROM dbo.CoachProgramAssignments WHERE member_id IN (${csv}) OR coach_id IN (${coaches})`);
  await query(`DELETE FROM dbo.WorkoutProgramExercises WHERE program_day_id IN (SELECT d.id FROM dbo.WorkoutProgramDays d JOIN dbo.WorkoutPrograms p ON p.id=d.program_id WHERE p.owner_coach_id IN (${coaches}))`);
  await query(`DELETE FROM dbo.WorkoutProgramDays WHERE program_id IN (SELECT id FROM dbo.WorkoutPrograms WHERE owner_coach_id IN (${coaches}))`);
  await query(`DELETE FROM dbo.WorkoutPrograms WHERE owner_coach_id IN (${coaches}) AND id<>root_program_id`);
  await query(`DELETE FROM dbo.WorkoutPrograms WHERE owner_coach_id IN (${coaches})`);
  await query(`DELETE FROM dbo.CRMCustomers WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.AuthSessions WHERE user_id IN (${csv})`);
  await query(`DELETE FROM dbo.Users WHERE id IN (${csv})`);
}

async function seed(): Promise<number> {
  await cleanup();
  const hash = await bcrypt.hash(password, 10);
  for (const [key, email] of Object.entries(emails)) {
    const role = key === 'admin' ? 'admin' : key.startsWith('coach') ? 'coach' : 'member';
    const result = await query<{ id: number }>(`INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version)
      OUTPUT INSERTED.id VALUES(@email,@password,@name,@role,1,1,0)`, { email, password: hash, name: key, role });
    accounts[key as AccountKey].id = Number(result.recordset[0].id);
  }
  await query(`INSERT dbo.CRMCustomers(user_id,assigned_coach_id) VALUES(@memberA,@coachA),(@memberB,@coachA)`, { memberA: accounts.memberA.id, memberB: accounts.memberB.id, coachA: accounts.coachA.id });
  let exercise = await query<{ id: number }>('SELECT TOP 1 id FROM dbo.Exercises WHERE is_active=1 ORDER BY id');
  if (!exercise.recordset[0]) {
    exercise = await query<{ id: number }>(`INSERT dbo.Exercises(name,slug,description,instructions,muscle_group,equipment,difficulty,is_active)
      OUTPUT INSERTED.id VALUES(N'Coach Versioning Exercise',@slug,N'Acceptance-only Exercise',N'Use controlled form.',N'full_body',N'bodyweight',N'BEGINNER',1)`, { slug: `coach-versioning-exercise-${suffix}` });
  }
  if (!exercise.recordset[0]) throw new Error('Versioning fixture could not create an active Exercise');
  return Number(exercise.recordset[0].id);
}

async function run(): Promise<void> {
  const exerciseId = await seed();
  await Promise.all(Object.values(accounts).map(account => login(account)));

  check((await call('POST', '/coach/workout-programs/1/publish')).status === 401, 'Guest cannot publish a Program');
  check((await call('POST', '/coach/workout-programs/1/publish', accounts.memberA)).status === 403, 'Member cannot publish a Program');
  check((await call('POST', '/coach/workout-programs/1/publish', accounts.admin)).status === 403, 'Admin cannot use Coach Program version route');

  const created = await call('POST', '/coach/workout-programs', accounts.coachA, { name: 'Versioned Acceptance Program', description: 'Version source', goal: 'STRENGTH', difficulty: 'BEGINNER', durationWeeks: 2, daysPerWeek: 1 });
  check(created.status === 201, 'Coach creates a Draft Program');
  const draft = dataOf<{ id: number; lifecycle_status: string; version_number: number; root_program_id: number }>(created);
  check(draft.lifecycle_status === 'DRAFT' && draft.version_number === 1 && draft.root_program_id === draft.id, 'New Program has Draft lifecycle and root version metadata');
  const programId = draft.id;

  const day = await call('POST', `/coach/workout-programs/${programId}/days`, accounts.coachA, { weekNumber: 1, dayNumber: 1, title: 'Versioned Day' });
  check(day.status === 201, 'Coach adds a Draft Program Day');
  const dayId = dataOf<{ id: number }>(day).id;
  const exercise = await call('POST', `/coach/workout-program-days/${dayId}/exercises`, accounts.coachA, { exerciseId, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetWeight: 20 });
  check(exercise.status === 201, 'Coach adds a Draft Program Exercise');
  const programExerciseId = dataOf<{ id: number }>(exercise).id;
  const invalidExercise = await call('POST', `/coach/workout-program-days/${dayId}/exercises`, accounts.coachA, { exerciseId, targetSets: 3, targetRepsMin: 12, targetRepsMax: 8 });
  check(invalidExercise.status === 400, 'Program Exercise rejects an inverted reps range with HTTP 400');

  check((await call('GET', `/coach/workout-programs/${programId}`, accounts.coachB)).status === 404, 'Coach B cannot read Coach A Program');
  check((await call('PATCH', `/coach/workout-programs/${programId}`, accounts.coachB, { name: 'IDOR', goal: 'MOBILITY', difficulty: 'BEGINNER', durationWeeks: 1, daysPerWeek: 1 })).status === 404, 'Coach B cannot edit Coach A Program');
  check((await call('POST', `/coach/workout-programs/${programId}/clone-version`, accounts.coachB, {})).status === 404, 'Coach B cannot clone Coach A Program');

  check((await call('PATCH', `/coach/workout-programs/${programId}`, accounts.coachA, { name: 'Updated Draft', goal: 'STRENGTH', difficulty: 'BEGINNER', durationWeeks: 2, daysPerWeek: 1 })).status === 200, 'Draft Program remains editable');
  const published = await call('POST', `/coach/workout-programs/${programId}/publish`, accounts.coachA, {});
  check(published.status === 200 && dataOf<{ lifecycle_status: string }>(published).lifecycle_status === 'PUBLISHED', 'Coach publishes the Program');
  check((await call('POST', `/coach/workout-programs/${programId}/publish`, accounts.coachA, {})).status === 409, 'Publishing a Published Program is rejected');
  check((await call('PATCH', `/coach/workout-programs/${programId}`, accounts.coachA, { name: 'Illegal Published Edit', goal: 'STRENGTH', difficulty: 'BEGINNER', durationWeeks: 2, daysPerWeek: 1 })).status === 409, 'Published Program metadata is immutable');
  check((await call('PATCH', `/coach/workout-program-days/${dayId}`, accounts.coachA, { weekNumber: 1, dayNumber: 1, title: 'Illegal Published Day' })).status === 409, 'Published Program Day is immutable');
  check((await call('PATCH', `/coach/workout-program-exercises/${programExerciseId}`, accounts.coachA, { targetSets: 4, targetRepsMin: 8, targetRepsMax: 12 })).status === 409, 'Published Program Exercise is immutable');
  check((await call('DELETE', `/coach/workout-program-days/${dayId}`, accounts.coachA)).status === 409, 'Published Program Day cannot be deleted');

  const assignment = await call('POST', '/coach/assignments', accounts.coachA, { memberId: accounts.memberA.id, programId, startDate: '2026-08-05', scheduleTimezone: 'Asia/Ho_Chi_Minh' });
  check(assignment.status === 201, 'Published Program can be assigned');
  const assignmentId = dataOf<{ id: number; program_id: number }>(assignment).id;
  check(Number(dataOf<{ program_id: number }>(assignment).program_id) === programId, 'Assignment stores the exact Published version ID');

  const cloned = await call('POST', `/coach/workout-programs/${programId}/clone-version`, accounts.coachA, {});
  check(cloned.status === 201, 'Coach clones a Published Program version');
  const clone = dataOf<{ id: number; root_program_id: number; version_number: number; lifecycle_status: string; cloned_from_program_id: number }>(cloned);
  check(clone.lifecycle_status === 'DRAFT' && clone.root_program_id === programId && clone.version_number === 2 && clone.cloned_from_program_id === programId, 'Clone is a new Draft version in the same root');
  const cloneDetails = await call('GET', `/coach/workout-programs/${clone.id}`, accounts.coachA);
  const cloneData = dataOf<{ days: Array<{ exercises: unknown[] }> }>(cloneDetails);
  check(cloneDetails.status === 200 && cloneData.days.length === 1 && cloneData.days[0].exercises.length === 1, 'Clone deep-copies Days and Exercises');
  const clonePublished = await call('POST', `/coach/workout-programs/${clone.id}/publish`, accounts.coachA, {});
  check(clonePublished.status === 200, 'Cloned version can be published');
  const cloneAssignment = await call('POST', '/coach/assignments', accounts.coachA, { memberId: accounts.memberB.id, programId: clone.id, startDate: '2026-08-05', scheduleTimezone: 'Asia/Ho_Chi_Minh' });
  check(cloneAssignment.status === 201, 'New Assignment can select the Published clone');
  const cloneAssignmentId = dataOf<{ id: number }>(cloneAssignment).id;
  const assignments = await query<{ original_program_id: number; clone_program_id: number }>(`SELECT
      (SELECT program_id FROM dbo.CoachProgramAssignments WHERE id=@assignmentId) AS original_program_id,
      (SELECT program_id FROM dbo.CoachProgramAssignments WHERE id=@cloneAssignmentId) AS clone_program_id`, { assignmentId, cloneAssignmentId });
  check(Number(assignments.recordset[0].original_program_id) === programId && Number(assignments.recordset[0].clone_program_id) === clone.id, 'Old and new Assignments retain their selected versions');

  const raceClones = await Promise.all([1, 2].map(() => call('POST', `/coach/workout-programs/${clone.id}/clone-version`, accounts.coachA, {})));
  check(raceClones.every(result => result.status === 201), 'Concurrent version clones both complete transactionally');
  const versions = raceClones.map(result => dataOf<{ version_number: number }>(result).version_number).sort((a, b) => a - b);
  check(versions[0] === 3 && versions[1] === 4, 'Concurrent clones receive unique sequential version numbers');

  const legacy = await call('POST', '/coach/workout-programs', accounts.coachA, { name: 'Legacy Compatibility Program', goal: 'GENERAL_FITNESS', difficulty: 'BEGINNER', durationWeeks: 1, daysPerWeek: 1 });
  const legacyId = dataOf<{ id: number }>(legacy).id;
  check((await call('POST', `/coach/workout-programs/${legacyId}/deactivate`, accounts.coachA, {})).status === 200, 'Legacy Deactivate maps to Archived');
  const reactivated = await call('POST', `/coach/workout-programs/${legacyId}/activate`, accounts.coachA, {});
  check(reactivated.status === 200 && dataOf<{ lifecycle_status: string; is_active: boolean }>(reactivated).lifecycle_status === 'DRAFT' && dataOf<{ is_active: boolean }>(reactivated).is_active, 'Legacy Activate maps Archived back to Draft');

  const archived = await call('POST', `/coach/workout-programs/${programId}/archive`, accounts.coachA, {});
  check(archived.status === 200 && dataOf<{ lifecycle_status: string; is_active: boolean }>(archived).lifecycle_status === 'ARCHIVED' && !dataOf<{ is_active: boolean }>(archived).is_active, 'Archive marks the source version inactive without deletion');
  check((await call('POST', `/coach/workout-programs/${programId}/clone-version`, accounts.coachA, {})).status === 409, 'Archived Program cannot be cloned');
  const preserved = await query<{ assignment_program_id: number; day_count: number; exercise_count: number }>(`SELECT
      (SELECT program_id FROM dbo.CoachProgramAssignments WHERE id=@assignmentId) AS assignment_program_id,
      (SELECT COUNT(*) FROM dbo.WorkoutProgramDays WHERE program_id=@programId) AS day_count,
      (SELECT COUNT(*) FROM dbo.WorkoutProgramExercises pe JOIN dbo.WorkoutProgramDays d ON d.id=pe.program_day_id WHERE d.program_id=@programId) AS exercise_count`, { assignmentId, programId });
  check(Number(preserved.recordset[0].assignment_program_id) === programId && Number(preserved.recordset[0].day_count) === 1 && Number(preserved.recordset[0].exercise_count) === 1, 'Archive preserves Assignment and historical Program contents');

  console.log(JSON.stringify({ verdict: 'PASS', database: process.env.DB_NAME, programId, cloneId: clone.id, assignmentId, cloneAssignmentId, versionRace: versions }));
}

if (process.argv.includes('--cleanup')) cleanup().then(() => console.log(`CLEANUP_PASS ${process.env.DB_NAME}`)).catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
else run().catch(error => { console.error(error); process.exitCode = 1; }).finally(closePool);
