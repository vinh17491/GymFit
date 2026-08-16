import { query } from '../../config/database';

function pageOf(page: number, limit: number) {
  return { page: Math.max(1, page), limit: Math.min(50, Math.max(1, limit)) };
}

export async function programs(input: { page: number; limit: number; coachId?: number; q?: string }) {
  const { page, limit } = pageOf(input.page, input.limit); const params: Record<string, unknown> = { offset: (page - 1) * limit, limit }; let where = '';
  if (input.coachId) { where += ' AND p.owner_coach_id=@coachId'; params.coachId = input.coachId; }
  if (input.q) { where += ' AND (p.name LIKE @q OR p.description LIKE @q OR coach.name LIKE @q)'; params.q = `%${input.q}%`; }
  const from = `FROM dbo.WorkoutPrograms p JOIN dbo.Users coach ON coach.id=p.owner_coach_id AND coach.role=N'coach'`;
  const [rows, count] = await Promise.all([
    query(`SELECT p.id,p.name,p.description,p.goal,p.difficulty,p.duration_weeks,p.days_per_week,p.owner_coach_id,
                  coach.name AS coach_name,p.is_active,p.created_at,p.updated_at,
                  (SELECT COUNT(*) FROM dbo.CoachProgramAssignments a WHERE a.program_id=p.id) AS assignment_count
           ${from} WHERE 1=1${where} ORDER BY p.updated_at DESC,p.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total ${from} WHERE 1=1${where}`, params),
  ]);
  const total = Number(count.recordset[0]?.total ?? 0); return { items: rows.recordset, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function assignments(input: { page: number; limit: number; coachId?: number; memberId?: number; status?: string }) {
  const { page, limit } = pageOf(input.page, input.limit); const params: Record<string, unknown> = { offset: (page - 1) * limit, limit }; let where = '';
  if (input.coachId) { where += ' AND a.coach_id=@coachId'; params.coachId = input.coachId; }
  if (input.memberId) { where += ' AND a.member_id=@memberId'; params.memberId = input.memberId; }
  if (input.status) { where += ' AND a.status=@status'; params.status = input.status; }
  const from = `FROM dbo.CoachProgramAssignments a JOIN dbo.Users member ON member.id=a.member_id
                JOIN dbo.Users coach ON coach.id=a.coach_id JOIN dbo.WorkoutPrograms p ON p.id=a.program_id`;
  const [rows, count] = await Promise.all([
    query(`SELECT a.id,a.member_id,member.name AS member_name,a.coach_id,coach.name AS coach_name,a.program_id,p.name AS program_name,
                  a.assigned_by,a.start_date,a.end_date,a.status,a.schedule_timezone,a.note,a.created_at,a.updated_at
           ${from} WHERE 1=1${where} ORDER BY a.updated_at DESC,a.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total ${from} WHERE 1=1${where}`, params),
  ]);
  const total = Number(count.recordset[0]?.total ?? 0); return { items: rows.recordset, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function schedules(input: { page: number; limit: number; coachId?: number; memberId?: number; status?: string; fromDate?: string; toDate?: string }) {
  const { page, limit } = pageOf(input.page, input.limit); const params: Record<string, unknown> = { offset: (page - 1) * limit, limit }; let where = '';
  if (input.coachId) { where += ' AND a.coach_id=@coachId'; params.coachId = input.coachId; }
  if (input.memberId) { where += ' AND a.member_id=@memberId'; params.memberId = input.memberId; }
  if (input.status) { where += ' AND s.status=@status'; params.status = input.status; }
  if (input.fromDate) { where += ' AND s.scheduled_date>=@fromDate'; params.fromDate = input.fromDate; }
  if (input.toDate) { where += ' AND s.scheduled_date<=@toDate'; params.toDate = input.toDate; }
  const from = `FROM dbo.CoachProgramSchedules s JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id
                JOIN dbo.Users member ON member.id=a.member_id JOIN dbo.Users coach ON coach.id=a.coach_id
                JOIN dbo.WorkoutPrograms p ON p.id=a.program_id JOIN dbo.WorkoutProgramDays d ON d.id=s.program_day_id`;
  const [rows, count] = await Promise.all([
    query(`SELECT s.id,s.assignment_id,a.member_id,member.name AS member_name,a.coach_id,coach.name AS coach_name,a.program_id,p.name AS program_name,
                  s.program_day_id,d.title AS day_title,s.scheduled_date,s.status,a.schedule_timezone,s.created_at,s.updated_at
           ${from} WHERE 1=1${where} ORDER BY s.scheduled_date DESC,s.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total ${from} WHERE 1=1${where}`, params),
  ]);
  const total = Number(count.recordset[0]?.total ?? 0); return { items: rows.recordset, page, limit, total, totalPages: Math.ceil(total / limit) };
}

function sessionCte() {
  return `WITH session_rows AS (
    SELECT ws.id,ws.user_id AS member_id,w.coach_id,CAST(NULL AS INT) AS program_id,CAST(NULL AS INT) AS assignment_id,
           UPPER(ws.status) AS status,ws.started_at,ws.completed_at,CAST(NULL AS INT) AS set_count,CAST(NULL AS INT) AS completed_set_count,
           w.name AS workout_name,N'LEGACY' AS source
    FROM dbo.WorkoutSessions ws JOIN dbo.Workouts w ON w.id=ws.workout_id
    UNION ALL
    SELECT ms.id,ms.member_id,a.coach_id,a.program_id,ms.assignment_id,ms.status,ms.started_at,ms.ended_at,
           (SELECT COUNT(*) FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id WHERE se.session_id=ms.id),
           (SELECT COUNT(*) FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id WHERE se.session_id=ms.id AND sl.completed=1),
           p.name,N'MEMBER'
    FROM dbo.MemberWorkoutSessions ms JOIN dbo.CoachProgramAssignments a ON a.id=ms.assignment_id
    JOIN dbo.WorkoutPrograms p ON p.id=a.program_id
  )`;
}

export async function sessions(input: { page: number; limit: number; coachId?: number; memberId?: number; status?: string; fromDate?: string; toDate?: string }) {
  const { page, limit } = pageOf(input.page, input.limit); const params: Record<string, unknown> = { offset: (page - 1) * limit, limit }; let where = '';
  if (input.coachId) { where += ' AND s.coach_id=@coachId'; params.coachId = input.coachId; }
  if (input.memberId) { where += ' AND s.member_id=@memberId'; params.memberId = input.memberId; }
  if (input.status) { where += ' AND s.status=@status'; params.status = input.status; }
  if (input.fromDate) { where += ' AND CONVERT(date,s.started_at)>=@fromDate'; params.fromDate = input.fromDate; }
  if (input.toDate) { where += ' AND CONVERT(date,s.started_at)<=@toDate'; params.toDate = input.toDate; }
  const joins = `JOIN dbo.Users member ON member.id=s.member_id JOIN dbo.Users coach ON coach.id=s.coach_id`;
  const [rows, count] = await Promise.all([
    query(`${sessionCte()} SELECT s.id,s.member_id,member.name AS member_name,s.coach_id,coach.name AS coach_name,s.program_id,s.assignment_id,
                  s.status,s.started_at,s.completed_at,CASE WHEN s.completed_at IS NULL THEN NULL ELSE DATEDIFF(SECOND,s.started_at,s.completed_at) END AS duration_seconds,
                  s.set_count,s.completed_set_count,s.workout_name,s.source
           FROM session_rows s ${joins} WHERE 1=1${where} ORDER BY s.started_at DESC,s.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`${sessionCte()} SELECT COUNT(*) AS total FROM session_rows s ${joins} WHERE 1=1${where}`, params),
  ]);
  const total = Number(count.recordset[0]?.total ?? 0); return { items: rows.recordset, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function progress(input: { page: number; limit: number; coachId?: number; memberId?: number; status?: string; fromDate?: string; toDate?: string }) {
  const { page, limit } = pageOf(input.page, input.limit); const params: Record<string, unknown> = { offset: (page - 1) * limit, limit }; let where = '';
  if (input.coachId) { where += ' AND s.coach_id=@coachId'; params.coachId = input.coachId; }
  if (input.memberId) { where += ' AND s.member_id=@memberId'; params.memberId = input.memberId; }
  if (input.status) { where += ' AND s.status=@status'; params.status = input.status; }
  if (input.fromDate) { where += ' AND CONVERT(date,s.started_at)>=@fromDate'; params.fromDate = input.fromDate; }
  if (input.toDate) { where += ' AND CONVERT(date,s.started_at)<=@toDate'; params.toDate = input.toDate; }
  const cte = sessionCte();
  const [rows, count] = await Promise.all([
    query(`${cte} SELECT s.coach_id,coach.name AS coach_name,s.member_id,member.name AS member_name,
                  COUNT(*) AS total_sessions,SUM(CASE WHEN s.status=N'COMPLETED' THEN 1 ELSE 0 END) AS completed_sessions,
                  COALESCE(SUM(CASE WHEN s.status=N'COMPLETED' AND s.completed_at IS NOT NULL THEN DATEDIFF(SECOND,s.started_at,s.completed_at) ELSE 0 END),0) AS total_duration,
                  COALESCE((SELECT SUM(CASE WHEN sl.completed=1 AND sl.reps IS NOT NULL AND sl.weight_kg IS NOT NULL THEN CAST(sl.reps AS DECIMAL(18,2))*sl.weight_kg ELSE 0 END)
                            FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id
                            JOIN dbo.MemberWorkoutSessions ms ON ms.id=se.session_id AND ms.member_id=s.member_id AND ms.status=N'COMPLETED'
                            JOIN dbo.CoachProgramAssignments ma ON ma.id=ms.assignment_id AND ma.coach_id=s.coach_id),0) AS training_volume,
                  CAST(100.0*SUM(CASE WHEN s.status=N'COMPLETED' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0) AS DECIMAL(6,2)) AS completion_rate
           FROM session_rows s JOIN dbo.Users member ON member.id=s.member_id JOIN dbo.Users coach ON coach.id=s.coach_id
           WHERE 1=1${where} GROUP BY s.coach_id,coach.name,s.member_id,member.name
           ORDER BY member.name,coach.name OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`${cte} SELECT COUNT(*) AS total FROM (SELECT s.coach_id,s.member_id FROM session_rows s WHERE 1=1${where} GROUP BY s.coach_id,s.member_id) grouped`, params),
  ]);
  const total = Number(count.recordset[0]?.total ?? 0); return { items: rows.recordset, page, limit, total, totalPages: Math.ceil(total / limit) };
}
