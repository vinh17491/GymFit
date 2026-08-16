import { getPool, query, sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { assertIanaTimeZone, todayInTimeZone } from '../../utils/timezone';

type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

interface SessionRow {
  id: number;
  member_id: number;
  assignment_id: number;
  schedule_id: number;
  started_at: Date;
  ended_at: Date | null;
  status: SessionStatus;
  total_duration_seconds: number | null;
  note: string | null;
  schedule_timezone: string;
  program_id: number;
  program_name: string;
  day_title: string;
  scheduled_date: Date | string;
  schedule_status: string;
}

interface SetLogInput {
  set_number?: number;
  reps?: number | null;
  weight_kg?: number | null;
  duration_seconds?: number | null;
  distance_meters?: number | null;
  completed?: boolean;
  note?: string | null;
}

const datePart = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value ?? '');
  return text.length >= 10 ? text.slice(0, 10) : text;
};

const assertPage = (page: number, limit: number): void => {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new AppError(400, 'Invalid pagination');
};

const pagination = (page: number, limit: number, total: number) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });

async function sessionRow(memberId: number, sessionId: number): Promise<SessionRow> {
  const result = await query<SessionRow>(
    `SELECT s.id,s.member_id,s.assignment_id,s.schedule_id,s.started_at,s.ended_at,s.status,s.total_duration_seconds,s.note,
            a.schedule_timezone,p.id AS program_id,p.name AS program_name,d.title AS day_title,
            cs.scheduled_date,cs.status AS schedule_status
     FROM dbo.MemberWorkoutSessions s
     JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id AND a.member_id=@memberId
     JOIN dbo.WorkoutPrograms p ON p.id=a.program_id
     JOIN dbo.CoachProgramSchedules cs ON cs.id=s.schedule_id AND cs.assignment_id=a.id
     JOIN dbo.WorkoutProgramDays d ON d.id=cs.program_day_id AND d.program_id=p.id
     WHERE s.id=@sessionId AND s.member_id=@memberId`,
    { memberId, sessionId },
  );
  const row = result.recordset[0];
  if (!row) throw new AppError(404, 'Session not found');
  return row;
}

async function sessionPayload(memberId: number, sessionId: number) {
  const row = await sessionRow(memberId, sessionId);
  const exercises = await query(
    `SELECT se.id AS session_exercise_id,se.program_exercise_id,se.exercise_id,se.exercise_name,se.sort_order,
            se.target_sets,se.target_reps_min,se.target_reps_max,se.target_weight,se.target_duration_seconds,se.rest_seconds,se.coach_note,
            sl.id AS set_id,sl.set_number,sl.reps,sl.weight_kg,sl.duration_seconds,sl.distance_meters,sl.completed,sl.note AS set_note,
            sl.created_at AS set_created_at,sl.updated_at AS set_updated_at
     FROM dbo.MemberWorkoutSessionExercises se
     LEFT JOIN dbo.MemberWorkoutSetLogs sl ON sl.session_exercise_id=se.id
     WHERE se.session_id=@sessionId
     ORDER BY se.sort_order,se.id,sl.set_number,sl.id`,
    { sessionId },
  );
  const byExercise = new Map<number, { session_exercise_id: number; program_exercise_id: number | null; exercise_id: number; exercise_name: string; sort_order: number; target_sets: number | null; target_reps_min: number | null; target_reps_max: number | null; target_weight: number | null; target_duration_seconds: number | null; rest_seconds: number | null; coach_note: string | null; sets: unknown[] }>();
  for (const raw of exercises.recordset) {
    const exerciseId = Number(raw.session_exercise_id);
    let item = byExercise.get(exerciseId);
    if (!item) {
      item = {
        session_exercise_id: exerciseId,
        program_exercise_id: raw.program_exercise_id == null ? null : Number(raw.program_exercise_id),
        exercise_id: Number(raw.exercise_id),
        exercise_name: String(raw.exercise_name),
        sort_order: Number(raw.sort_order),
        target_sets: raw.target_sets == null ? null : Number(raw.target_sets),
        target_reps_min: raw.target_reps_min == null ? null : Number(raw.target_reps_min),
        target_reps_max: raw.target_reps_max == null ? null : Number(raw.target_reps_max),
        target_weight: raw.target_weight == null ? null : Number(raw.target_weight),
        target_duration_seconds: raw.target_duration_seconds == null ? null : Number(raw.target_duration_seconds),
        rest_seconds: raw.rest_seconds == null ? null : Number(raw.rest_seconds),
        coach_note: raw.coach_note ?? null,
        sets: [],
      };
      byExercise.set(exerciseId, item);
    }
    if (raw.set_id != null) item.sets.push({
      id: Number(raw.set_id),
      set_number: Number(raw.set_number),
      reps: raw.reps == null ? null : Number(raw.reps),
      weight_kg: raw.weight_kg == null ? null : Number(raw.weight_kg),
      duration_seconds: raw.duration_seconds == null ? null : Number(raw.duration_seconds),
      distance_meters: raw.distance_meters == null ? null : Number(raw.distance_meters),
      completed: Boolean(raw.completed),
      note: raw.set_note ?? null,
      created_at: raw.set_created_at,
      updated_at: raw.set_updated_at,
    });
  }
  return {
    id: row.id,
    member_id: row.member_id,
    assignment_id: row.assignment_id,
    schedule_id: row.schedule_id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: row.status,
    total_duration_seconds: row.total_duration_seconds,
    note: row.note,
    program: { id: row.program_id, name: row.program_name },
    schedule: { id: row.schedule_id, scheduled_date: datePart(row.scheduled_date), status: row.schedule_status, timezone: row.schedule_timezone, day_title: row.day_title },
    exercises: [...byExercise.values()],
  };
}

async function assignmentForMember(memberId: number) {
  const result = await query(
    `SELECT TOP 20 a.id,a.member_id,a.program_id,a.coach_id,a.start_date,a.end_date,a.status,a.schedule_timezone,a.note,
            p.name AS program_name,p.description AS program_description,p.goal,p.difficulty,p.duration_weeks,p.days_per_week,
            u.name AS coach_name
      FROM dbo.CoachProgramAssignments a
      JOIN dbo.CRMCustomers c ON c.user_id=a.member_id AND c.assigned_coach_id=a.coach_id
      JOIN dbo.WorkoutPrograms p ON p.id=a.program_id
      JOIN dbo.Users u ON u.id=a.coach_id
      WHERE a.member_id=@memberId AND a.status=N'ACTIVE'
      ORDER BY a.updated_at DESC,a.id DESC`,
    { memberId },
  );
  return result.recordset.find(item => {
    assertIanaTimeZone(String(item.schedule_timezone));
    const today = todayInTimeZone(String(item.schedule_timezone));
    return datePart(item.start_date) <= today && (item.end_date == null || datePart(item.end_date) >= today);
  }) ?? null;
}

async function programForMember(memberId: number, programId: number, assignmentId: number) {
  const [days, exercises] = await Promise.all([
    query(`SELECT d.id,d.program_id,d.week_number,d.day_number,d.title,d.description,d.sort_order FROM dbo.WorkoutProgramDays d JOIN dbo.CoachProgramAssignments a ON a.program_id=d.program_id AND a.id=@assignmentId AND a.member_id=@memberId AND a.status=N'ACTIVE' WHERE d.program_id=@programId ORDER BY d.sort_order,d.id`, { memberId, programId, assignmentId }),
    query(`SELECT pe.id AS program_exercise_id,pe.program_day_id,pe.exercise_id,pe.sort_order,pe.target_sets,pe.target_reps_min,pe.target_reps_max,pe.target_weight,pe.target_duration_seconds,pe.rest_seconds,pe.tempo,pe.coach_note,e.name AS exercise_name,e.slug AS exercise_slug FROM dbo.WorkoutProgramExercises pe JOIN dbo.WorkoutProgramDays d ON d.id=pe.program_day_id JOIN dbo.CoachProgramAssignments a ON a.program_id=d.program_id AND a.id=@assignmentId AND a.member_id=@memberId AND a.status=N'ACTIVE' JOIN dbo.Exercises e ON e.id=pe.exercise_id WHERE d.program_id=@programId ORDER BY pe.program_day_id,pe.sort_order,pe.id`, { memberId, programId, assignmentId }),
  ]);
  const byDay = new Map<number, unknown[]>();
  for (const exercise of exercises.recordset) {
    const list = byDay.get(Number(exercise.program_day_id)) ?? [];
    list.push(exercise);
    byDay.set(Number(exercise.program_day_id), list);
  }
  return { days: days.recordset.map(day => ({ ...day, exercises: byDay.get(Number(day.id)) ?? [] })) };
}

export async function getCurrent(memberId: number) {
  const assignment = await assignmentForMember(memberId);
  if (!assignment) return { assignment: null, program: null, upcomingSchedules: [], activeSession: null };
  const today = todayInTimeZone(String(assignment.schedule_timezone));
  const [program, schedules, active] = await Promise.all([
    programForMember(memberId, Number(assignment.program_id), Number(assignment.id)),
    query(`SELECT s.id,s.assignment_id,s.program_day_id,s.scheduled_date,s.status,s.created_at,s.updated_at,d.week_number,d.day_number,d.title AS day_title
           FROM dbo.CoachProgramSchedules s
           JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id AND a.member_id=@memberId AND a.status=N'ACTIVE'
             AND a.start_date<=@today AND (a.end_date IS NULL OR a.end_date>=@today)
           JOIN dbo.CRMCustomers c ON c.user_id=a.member_id AND c.assigned_coach_id=a.coach_id
           JOIN dbo.WorkoutProgramDays d ON d.id=s.program_day_id
           WHERE s.assignment_id=@assignmentId AND s.status IN (N'SCHEDULED',N'IN_PROGRESS') AND s.scheduled_date>=@today
           ORDER BY s.scheduled_date,s.id`, { memberId, assignmentId: assignment.id, today }),
    query<{ id: number }>(`SELECT TOP 1 id FROM dbo.MemberWorkoutSessions WHERE member_id=@memberId AND status=N'IN_PROGRESS' ORDER BY started_at DESC,id DESC`, { memberId }),
  ]);
  const activeSession = active.recordset[0] ? await sessionPayload(memberId, active.recordset[0].id) : null;
  const upcomingSchedules = schedules.recordset.map(item => {
    const scheduledDate = datePart(item.scheduled_date);
    const canStart = item.status === 'SCHEDULED' && scheduledDate === today && !activeSession;
    return { ...item, scheduled_date: scheduledDate, can_start: canStart, blocked_reason: canStart ? null : item.status === 'IN_PROGRESS' || activeSession ? 'SESSION_IN_PROGRESS' : 'NOT_DUE_YET' };
  });
  return { assignment, program, upcomingSchedules, activeSession };
}

export async function listSchedules(memberId: number, page: number, limit: number, fromDate?: string, toDate?: string, status?: string) {
  assertPage(page, limit);
  const assignment = await assignmentForMember(memberId);
  if (!assignment) return { items: [], pagination: pagination(page, limit, 0) };
  const today = todayInTimeZone(String(assignment.schedule_timezone));
  const conditions = ['a.id=@assignmentId', 'a.member_id=@memberId', 'a.status=N\'ACTIVE\'', 'a.start_date<=@today', '(a.end_date IS NULL OR a.end_date>=@today)', 'c.assigned_coach_id=a.coach_id', 's.status<>N\'CANCELLED\''];
  const params: Record<string, unknown> = { memberId, offset: (page - 1) * limit, limit };
  params.today = today; params.assignmentId = Number(assignment.id);
  if (fromDate) { conditions.push('s.scheduled_date>=@fromDate'); params.fromDate = fromDate; }
  if (toDate) { conditions.push('s.scheduled_date<=@toDate'); params.toDate = toDate; }
  if (status) { conditions.push('s.status=@status'); params.status = status; }
  const where = conditions.join(' AND ');
  const [rows, count] = await Promise.all([
    query(`SELECT s.id,s.assignment_id,s.program_day_id,s.scheduled_date,s.status,s.created_at,s.updated_at,a.member_id,a.program_id,a.schedule_timezone,p.name AS program_name,d.week_number,d.day_number,d.title AS day_title FROM dbo.CoachProgramSchedules s JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id JOIN dbo.CRMCustomers c ON c.user_id=a.member_id JOIN dbo.WorkoutPrograms p ON p.id=a.program_id JOIN dbo.WorkoutProgramDays d ON d.id=s.program_day_id WHERE ${where} ORDER BY s.scheduled_date,s.id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total FROM dbo.CoachProgramSchedules s JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id JOIN dbo.CRMCustomers c ON c.user_id=a.member_id WHERE ${where}`, params),
  ]);
  const total = Number(count.recordset[0].total);
  const active = await query<{ id: number }>(`SELECT TOP 1 id FROM dbo.MemberWorkoutSessions WHERE member_id=@memberId AND status=N'IN_PROGRESS' ORDER BY started_at DESC,id DESC`, { memberId });
  const activeSession = Boolean(active.recordset[0]);
  return { items: rows.recordset.map(item => { const scheduledDate = datePart(item.scheduled_date); const canStart = item.status === 'SCHEDULED' && scheduledDate === today && !activeSession; return { ...item, scheduled_date: scheduledDate, can_start: canStart, blocked_reason: canStart ? null : item.status === 'IN_PROGRESS' || activeSession ? 'SESSION_IN_PROGRESS' : scheduledDate > today ? 'NOT_DUE_YET' : 'PAST_DUE' }; }), pagination: pagination(page, limit, total) };
}

export async function getSchedule(memberId: number, scheduleId: number) {
  const result = await query(`SELECT s.id,s.assignment_id,s.program_day_id,s.scheduled_date,s.status,s.created_at,s.updated_at,a.member_id,a.program_id,a.schedule_timezone,a.status AS assignment_status,p.name AS program_name,d.week_number,d.day_number,d.title AS day_title,d.description AS day_description FROM dbo.CoachProgramSchedules s JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id AND a.member_id=@memberId JOIN dbo.WorkoutPrograms p ON p.id=a.program_id JOIN dbo.WorkoutProgramDays d ON d.id=s.program_day_id AND d.program_id=p.id WHERE s.id=@scheduleId`, { memberId, scheduleId });
  const schedule = result.recordset[0];
  if (!schedule) throw new AppError(404, 'Schedule not found');
  const assignment = await assignmentForMember(memberId);
  if (!assignment || Number(schedule.assignment_id) !== Number(assignment.id)) throw new AppError(404, 'Schedule not found');
  const active = await query<{ id: number }>(`SELECT TOP 1 id FROM dbo.MemberWorkoutSessions WHERE member_id=@memberId AND status=N'IN_PROGRESS' ORDER BY started_at DESC,id DESC`, { memberId });
  const scheduledDate = datePart(schedule.scheduled_date); const today = todayInTimeZone(String(assignment.schedule_timezone)); const canStart = schedule.status === 'SCHEDULED' && scheduledDate === today && !active.recordset[0];
  const exercises = await query(`SELECT pe.id AS program_exercise_id,pe.program_day_id,pe.exercise_id,pe.sort_order,pe.target_sets,pe.target_reps_min,pe.target_reps_max,pe.target_weight,pe.target_duration_seconds,pe.rest_seconds,pe.tempo,pe.coach_note,e.name AS exercise_name,e.slug AS exercise_slug FROM dbo.WorkoutProgramExercises pe JOIN dbo.Exercises e ON e.id=pe.exercise_id WHERE pe.program_day_id=@programDayId ORDER BY pe.sort_order,pe.id`, { programDayId: schedule.program_day_id });
  return { ...schedule, scheduled_date: scheduledDate, can_start: canStart, blocked_reason: canStart ? null : schedule.status === 'IN_PROGRESS' || active.recordset[0] ? 'SESSION_IN_PROGRESS' : scheduledDate > today ? 'NOT_DUE_YET' : 'PAST_DUE', exercises: exercises.recordset };
}

export async function startSession(memberId: number, scheduleId: number) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const scheduleResult = await new sql.Request(tx).input('memberId', sql.Int, memberId).input('scheduleId', sql.Int, scheduleId).query(`SELECT s.id,s.assignment_id,s.program_day_id,s.scheduled_date,s.status,a.status AS assignment_status,a.start_date,a.end_date,a.schedule_timezone,p.id AS program_id
      FROM dbo.CoachProgramSchedules s WITH (UPDLOCK,HOLDLOCK)
      JOIN dbo.CoachProgramAssignments a WITH (UPDLOCK,HOLDLOCK) ON a.id=s.assignment_id AND a.member_id=@memberId
      JOIN dbo.CRMCustomers c ON c.user_id=a.member_id AND c.assigned_coach_id=a.coach_id
      JOIN dbo.WorkoutPrograms p ON p.id=a.program_id WHERE s.id=@scheduleId`);
    const schedule = scheduleResult.recordset[0];
    if (!schedule) throw new AppError(404, 'Schedule not found');
    assertIanaTimeZone(String(schedule.schedule_timezone));
    const today = todayInTimeZone(String(schedule.schedule_timezone));
    if (schedule.assignment_status !== 'ACTIVE' || datePart(schedule.start_date) > today || (schedule.end_date && datePart(schedule.end_date) < today)) throw new AppError(409, 'Assignment is not current');
    if (schedule.status !== 'SCHEDULED') throw new AppError(409, 'Schedule is not available to start');
    if (datePart(schedule.scheduled_date) !== today) throw new AppError(409, 'Only today\'s scheduled workout can be started');
    const active = await new sql.Request(tx).input('memberId', sql.Int, memberId).query(`SELECT TOP 1 id FROM dbo.MemberWorkoutSessions WITH (UPDLOCK,HOLDLOCK) WHERE member_id=@memberId AND status=N'IN_PROGRESS'`);
    if (active.recordset[0]) throw new AppError(409, 'Member already has an in-progress session');
    const exercises = await new sql.Request(tx).input('programDayId', sql.Int, Number(schedule.program_day_id)).query(`SELECT pe.id AS program_exercise_id,pe.exercise_id,pe.sort_order,pe.target_sets,pe.target_reps_min,pe.target_reps_max,pe.target_weight,pe.target_duration_seconds,pe.rest_seconds,pe.coach_note,e.name AS exercise_name FROM dbo.WorkoutProgramExercises pe JOIN dbo.Exercises e ON e.id=pe.exercise_id WHERE pe.program_day_id=@programDayId ORDER BY pe.sort_order,pe.id`);
    if (exercises.recordset.length === 0) throw new AppError(409, 'Schedule has no exercises');
    const session = await new sql.Request(tx).input('memberId', sql.Int, memberId).input('assignmentId', sql.Int, Number(schedule.assignment_id)).input('scheduleId', sql.Int, scheduleId).query(`INSERT dbo.MemberWorkoutSessions(member_id,assignment_id,schedule_id) OUTPUT INSERTED.id VALUES(@memberId,@assignmentId,@scheduleId)`);
    const sessionId = Number(session.recordset[0].id);
    for (const exercise of exercises.recordset) {
      await new sql.Request(tx)
        .input('sessionId', sql.Int, sessionId).input('programExerciseId', sql.Int, Number(exercise.program_exercise_id)).input('exerciseId', sql.Int, Number(exercise.exercise_id)).input('exerciseName', sql.NVarChar(200), exercise.exercise_name).input('sortOrder', sql.SmallInt, Number(exercise.sort_order)).input('targetSets', sql.TinyInt, exercise.target_sets ?? null).input('targetRepsMin', sql.SmallInt, exercise.target_reps_min ?? null).input('targetRepsMax', sql.SmallInt, exercise.target_reps_max ?? null).input('targetWeight', sql.Decimal(8, 2), exercise.target_weight ?? null).input('targetDurationSeconds', sql.Int, exercise.target_duration_seconds ?? null).input('restSeconds', sql.Int, exercise.rest_seconds ?? null).input('coachNote', sql.NVarChar(2000), exercise.coach_note ?? null)
        .query(`INSERT dbo.MemberWorkoutSessionExercises(session_id,program_exercise_id,exercise_id,exercise_name,sort_order,target_sets,target_reps_min,target_reps_max,target_weight,target_duration_seconds,rest_seconds,coach_note) VALUES(@sessionId,@programExerciseId,@exerciseId,@exerciseName,@sortOrder,@targetSets,@targetRepsMin,@targetRepsMax,@targetWeight,@targetDurationSeconds,@restSeconds,@coachNote)`);
    }
    await new sql.Request(tx).input('scheduleId', sql.Int, scheduleId).query(`UPDATE dbo.CoachProgramSchedules SET status=N'IN_PROGRESS',updated_at=SYSUTCDATETIME() WHERE id=@scheduleId AND status=N'SCHEDULED'`);
    await tx.commit();
    return sessionPayload(memberId, sessionId);
  } catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

export async function listSessions(memberId: number, page: number, limit: number) {
  assertPage(page, limit);
  const params = { memberId, offset: (page - 1) * limit, limit };
  const [rows, count] = await Promise.all([
    query(`SELECT s.id,s.member_id,s.assignment_id,s.schedule_id,s.started_at,s.ended_at AS completed_at,s.status,s.total_duration_seconds,s.note,cs.scheduled_date,cs.status AS schedule_status,p.id AS program_id,p.name AS program_name,d.title AS day_title,(SELECT COUNT(*) FROM dbo.MemberWorkoutSessionExercises se WHERE se.session_id=s.id) AS exercise_count,(SELECT COUNT(*) FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id WHERE se.session_id=s.id) AS set_count,(SELECT COUNT(*) FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id WHERE se.session_id=s.id AND sl.completed=1) AS completed_set_count FROM dbo.MemberWorkoutSessions s JOIN dbo.CoachProgramSchedules cs ON cs.id=s.schedule_id JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id AND a.member_id=@memberId JOIN dbo.WorkoutPrograms p ON p.id=a.program_id JOIN dbo.WorkoutProgramDays d ON d.id=cs.program_day_id WHERE s.member_id=@memberId ORDER BY s.started_at DESC,s.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total FROM dbo.MemberWorkoutSessions WHERE member_id=@memberId`, { memberId }),
  ]);
  const total = Number(count.recordset[0].total);
  return { items: rows.recordset.map(item => ({ ...item, scheduled_date: datePart(item.scheduled_date) })), pagination: pagination(page, limit, total) };
}

export async function getSession(memberId: number, sessionId: number) { return sessionPayload(memberId, sessionId); }

export async function listProgressSessions(memberId: number, page: number, limit: number, status?: string, fromDate?: string, toDate?: string, programId?: number, dayTitle?: string) {
  assertPage(page, limit);
  const conditions = ['s.member_id=@memberId', "s.status IN (N'COMPLETED',N'ABANDONED')"];
  const params: Record<string, unknown> = { memberId, offset: (page - 1) * limit, limit };
  if (status) { conditions.push('s.status=@status'); params.status = status; }
  if (fromDate) { conditions.push('cs.scheduled_date>=@fromDate'); params.fromDate = fromDate; }
  if (toDate) { conditions.push('cs.scheduled_date<=@toDate'); params.toDate = toDate; }
  if (programId) { conditions.push('a.program_id=@programId'); params.programId = programId; }
  if (dayTitle) { conditions.push('d.title LIKE @dayTitle'); params.dayTitle = `%${dayTitle}%`; }
  const where = conditions.join(' AND ');
  const [rows, count] = await Promise.all([
    query(`SELECT s.id,s.member_id,s.assignment_id,s.schedule_id,s.started_at,s.ended_at AS completed_at,s.status,s.total_duration_seconds,s.note,cs.scheduled_date,cs.status AS schedule_status,p.id AS program_id,p.name AS program_name,d.title AS day_title,
           (SELECT COUNT(*) FROM dbo.MemberWorkoutSessionExercises se WHERE se.session_id=s.id) AS exercise_count,
           (SELECT COUNT(*) FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id WHERE se.session_id=s.id) AS set_count,
           (SELECT COUNT(*) FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id WHERE se.session_id=s.id AND sl.completed=1) AS completed_set_count
           FROM dbo.MemberWorkoutSessions s JOIN dbo.CoachProgramSchedules cs ON cs.id=s.schedule_id JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id AND a.member_id=@memberId JOIN dbo.WorkoutPrograms p ON p.id=a.program_id JOIN dbo.WorkoutProgramDays d ON d.id=cs.program_day_id
           WHERE ${where} ORDER BY COALESCE(s.ended_at,s.started_at) DESC,s.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total FROM dbo.MemberWorkoutSessions s JOIN dbo.CoachProgramSchedules cs ON cs.id=s.schedule_id JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id AND a.member_id=@memberId JOIN dbo.WorkoutProgramDays d ON d.id=cs.program_day_id WHERE ${where}`, params),
  ]);
  const total = Number(count.recordset[0].total);
  return { items: rows.recordset.map(item => ({ ...item, scheduled_date: datePart(item.scheduled_date) })), pagination: pagination(page, limit, total) };
}

export async function getExerciseProgress(memberId: number, exerciseId: number) {
  const result = await query(`SELECT se.exercise_id,se.exercise_name,s.id AS session_id,cs.scheduled_date,s.ended_at AS completed_at,
           SUM(CASE WHEN sl.completed=1 THEN 1 ELSE 0 END) AS total_sets,
           COALESCE(SUM(CASE WHEN sl.completed=1 THEN sl.reps ELSE 0 END),0) AS total_reps,
           MAX(CASE WHEN sl.completed=1 THEN sl.weight_kg ELSE NULL END) AS max_weight_kg,
           COALESCE(SUM(CASE WHEN sl.completed=1 AND sl.reps IS NOT NULL AND sl.weight_kg IS NOT NULL THEN CAST(sl.reps AS DECIMAL(18,2))*sl.weight_kg ELSE 0 END),0) AS total_volume
      FROM dbo.MemberWorkoutSessionExercises se
      JOIN dbo.MemberWorkoutSessions s ON s.id=se.session_id AND s.member_id=@memberId AND s.status=N'COMPLETED'
      JOIN dbo.CoachProgramSchedules cs ON cs.id=s.schedule_id
      LEFT JOIN dbo.MemberWorkoutSetLogs sl ON sl.session_exercise_id=se.id
      WHERE se.exercise_id=@exerciseId
      GROUP BY se.exercise_id,se.exercise_name,s.id,cs.scheduled_date,s.ended_at
      ORDER BY s.ended_at DESC,s.id DESC`, { memberId, exerciseId });
  if (result.recordset.length === 0) throw new AppError(404, 'Exercise progress not found');
  const rows = result.recordset;
  const first = rows[0];
  const maxWeight = rows.reduce<number | null>((max, row) => row.max_weight_kg == null ? max : Math.max(max ?? Number(row.max_weight_kg), Number(row.max_weight_kg)), null);
  return {
    exercise: { id: Number(first.exercise_id), name: String(first.exercise_name) },
    last_performed_at: first.completed_at ?? null,
    session_count: rows.length,
    total_sets: rows.reduce((sum, row) => sum + Number(row.total_sets), 0),
    total_reps: rows.reduce((sum, row) => sum + Number(row.total_reps), 0),
    max_weight_kg: maxWeight,
    total_volume: rows.reduce((sum, row) => sum + Number(row.total_volume), 0),
    history: rows.map(row => ({ session_id: Number(row.session_id), scheduled_date: datePart(row.scheduled_date), completed_at: row.completed_at ?? null, set_count: Number(row.total_sets), total_reps: Number(row.total_reps), max_weight_kg: row.max_weight_kg == null ? null : Number(row.max_weight_kg), total_volume: Number(row.total_volume) })),
  };
}

async function ownedSessionExercise(memberId: number, sessionId: number, sessionExerciseId: number) {
  const result = await query(`SELECT se.id,se.session_id,s.status,s.member_id FROM dbo.MemberWorkoutSessionExercises se JOIN dbo.MemberWorkoutSessions s ON s.id=se.session_id WHERE se.id=@sessionExerciseId AND se.session_id=@sessionId AND s.member_id=@memberId`, { memberId, sessionId, sessionExerciseId });
  const row = result.recordset[0];
  if (!row) throw new AppError(404, 'Session exercise not found');
  if (row.status !== 'IN_PROGRESS') throw new AppError(409, 'Set logs can only be changed while the session is in progress');
  return row;
}

function assertSetMetrics(input: SetLogInput): void {
  if (input.completed && input.reps == null && input.weight_kg == null && input.duration_seconds == null && input.distance_meters == null) throw new AppError(400, 'A completed set must include at least one measurement');
}

export async function createSet(memberId: number, sessionId: number, sessionExerciseId: number, input: SetLogInput) {
  await ownedSessionExercise(memberId, sessionId, sessionExerciseId);
  assertSetMetrics(input);
  const existing = await query(`SELECT id FROM dbo.MemberWorkoutSetLogs WHERE session_exercise_id=@sessionExerciseId AND set_number=@setNumber`, { sessionExerciseId, setNumber: input.set_number });
  if (existing.recordset[0]) throw new AppError(409, 'Set number already exists for this exercise');
  const result = await query(`INSERT dbo.MemberWorkoutSetLogs(session_exercise_id,set_number,reps,weight_kg,duration_seconds,distance_meters,completed,note) OUTPUT INSERTED.* VALUES(@sessionExerciseId,@setNumber,@reps,@weightKg,@durationSeconds,@distanceMeters,@completed,@note)`, { sessionExerciseId, setNumber: input.set_number, reps: input.reps ?? null, weightKg: input.weight_kg ?? null, durationSeconds: input.duration_seconds ?? null, distanceMeters: input.distance_meters ?? null, completed: input.completed ? 1 : 0, note: input.note ?? null });
  return result.recordset[0];
}

export async function updateSet(memberId: number, sessionId: number, sessionExerciseId: number, setId: number, input: SetLogInput) {
  await ownedSessionExercise(memberId, sessionId, sessionExerciseId);
  const current = await query(`SELECT id,set_number,reps,weight_kg,duration_seconds,distance_meters,completed,note FROM dbo.MemberWorkoutSetLogs WHERE id=@setId AND session_exercise_id=@sessionExerciseId`, { setId, sessionExerciseId });
  const row = current.recordset[0];
  if (!row) throw new AppError(404, 'Set log not found');
  const merged: SetLogInput = { set_number: input.set_number ?? Number(row.set_number), reps: input.reps === undefined ? row.reps : input.reps, weight_kg: input.weight_kg === undefined ? row.weight_kg : input.weight_kg, duration_seconds: input.duration_seconds === undefined ? row.duration_seconds : input.duration_seconds, distance_meters: input.distance_meters === undefined ? row.distance_meters : input.distance_meters, completed: input.completed === undefined ? Boolean(row.completed) : input.completed, note: input.note === undefined ? row.note : input.note };
  assertSetMetrics(merged);
  const conflict = await query(`SELECT id FROM dbo.MemberWorkoutSetLogs WHERE session_exercise_id=@sessionExerciseId AND set_number=@setNumber AND id<>@setId`, { sessionExerciseId, setNumber: merged.set_number, setId });
  if (conflict.recordset[0]) throw new AppError(409, 'Set number already exists for this exercise');
  const result = await query(`UPDATE dbo.MemberWorkoutSetLogs SET set_number=@setNumber,reps=@reps,weight_kg=@weightKg,duration_seconds=@durationSeconds,distance_meters=@distanceMeters,completed=@completed,note=@note,updated_at=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE id=@setId AND session_exercise_id=@sessionExerciseId`, { setId, sessionExerciseId, setNumber: merged.set_number, reps: merged.reps ?? null, weightKg: merged.weight_kg ?? null, durationSeconds: merged.duration_seconds ?? null, distanceMeters: merged.distance_meters ?? null, completed: merged.completed ? 1 : 0, note: merged.note ?? null });
  return result.recordset[0];
}

export async function deleteSet(memberId: number, sessionId: number, sessionExerciseId: number, setId: number) {
  await ownedSessionExercise(memberId, sessionId, sessionExerciseId);
  const result = await query(`DELETE FROM dbo.MemberWorkoutSetLogs WHERE id=@setId AND session_exercise_id=@sessionExerciseId`, { setId, sessionExerciseId });
  if (result.rowsAffected[0] !== 1) throw new AppError(404, 'Set log not found');
  return null;
}

async function transitionSession(memberId: number, sessionId: number, nextStatus: Exclude<SessionStatus, 'IN_PROGRESS'>) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const current = await new sql.Request(tx).input('memberId', sql.Int, memberId).input('sessionId', sql.Int, sessionId).query(`SELECT s.id,s.schedule_id,s.status FROM dbo.MemberWorkoutSessions s WITH (UPDLOCK,HOLDLOCK) WHERE s.id=@sessionId AND s.member_id=@memberId`);
    const row = current.recordset[0];
    if (!row) throw new AppError(404, 'Session not found');
    if (row.status !== 'IN_PROGRESS') throw new AppError(409, 'Session is already finished');
    if (nextStatus === 'COMPLETED') {
      const work = await new sql.Request(tx)
        .input('sessionId', sql.Int, sessionId)
        .query<{ exercise_count: number; completed_measurement_count: number }>(
          `SELECT COUNT(DISTINCT se.id) AS exercise_count,
                  COUNT(DISTINCT CASE WHEN sl.completed=1
                    AND (sl.reps IS NOT NULL OR sl.weight_kg IS NOT NULL OR sl.duration_seconds IS NOT NULL OR sl.distance_meters IS NOT NULL)
                    THEN sl.id END) AS completed_measurement_count
           FROM dbo.MemberWorkoutSessionExercises se
           LEFT JOIN dbo.MemberWorkoutSetLogs sl ON sl.session_exercise_id=se.id
           WHERE se.session_id=@sessionId`,
        );
      const summary = work.recordset[0];
      if (!summary || Number(summary.exercise_count) < 1 || Number(summary.completed_measurement_count) < 1) {
        throw new AppError(409, 'Session has no completed work', 'SESSION_HAS_NO_COMPLETED_WORK');
      }
    }
    const scheduleStatus = nextStatus === 'COMPLETED' ? 'COMPLETED' : 'SKIPPED';
    const sessionUpdate = await new sql.Request(tx).input('sessionId', sql.Int, sessionId).input('status', sql.NVarChar(20), nextStatus).query(`UPDATE dbo.MemberWorkoutSessions SET status=@status,ended_at=SYSUTCDATETIME(),total_duration_seconds=DATEDIFF(SECOND,started_at,SYSUTCDATETIME()),updated_at=SYSUTCDATETIME() WHERE id=@sessionId AND status=N'IN_PROGRESS'`);
    if (sessionUpdate.rowsAffected[0] !== 1) throw new AppError(409, 'Session state changed before transition');
    const scheduleUpdate = await new sql.Request(tx).input('scheduleId', sql.Int, Number(row.schedule_id)).input('scheduleStatus', sql.NVarChar(20), scheduleStatus).query(`UPDATE dbo.CoachProgramSchedules SET status=@scheduleStatus,updated_at=SYSUTCDATETIME() WHERE id=@scheduleId AND status=N'IN_PROGRESS'`);
    if (scheduleUpdate.rowsAffected[0] !== 1) throw new AppError(409, 'Schedule state changed before session transition');
    await tx.commit();
    return sessionPayload(memberId, sessionId);
  } catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

export async function completeSession(memberId: number, sessionId: number) { return transitionSession(memberId, sessionId, 'COMPLETED'); }
export async function abandonSession(memberId: number, sessionId: number) { return transitionSession(memberId, sessionId, 'ABANDONED'); }

export async function getProgress(memberId: number) {
  const [summary, volume, due, recent, history] = await Promise.all([
    query(`SELECT COUNT(*) AS completed_sessions,COALESCE(SUM(total_duration_seconds),0) AS total_duration FROM dbo.MemberWorkoutSessions WHERE member_id=@memberId AND status=N'COMPLETED'`, { memberId }),
    query(`SELECT COALESCE(SUM(CASE WHEN sl.completed=1 AND sl.reps IS NOT NULL AND sl.weight_kg IS NOT NULL THEN CAST(sl.reps AS DECIMAL(18,2))*sl.weight_kg ELSE 0 END),0) AS training_volume FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id JOIN dbo.MemberWorkoutSessions s ON s.id=se.session_id AND s.member_id=@memberId AND s.status=N'COMPLETED'`, { memberId }),
    query(`SELECT s.scheduled_date,s.status,a.schedule_timezone FROM dbo.CoachProgramSchedules s JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id AND a.member_id=@memberId`, { memberId }),
    query(`SELECT TOP 10 s.id,s.schedule_id,s.started_at,s.ended_at AS completed_at,s.status,s.total_duration_seconds,p.id AS program_id,p.name AS program_name,d.title AS day_title,cs.scheduled_date FROM dbo.MemberWorkoutSessions s JOIN dbo.CoachProgramSchedules cs ON cs.id=s.schedule_id JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id AND a.member_id=@memberId JOIN dbo.WorkoutPrograms p ON p.id=a.program_id JOIN dbo.WorkoutProgramDays d ON d.id=cs.program_day_id WHERE s.member_id=@memberId AND s.status=N'COMPLETED' ORDER BY s.ended_at DESC,s.id DESC`, { memberId }),
    query(`SELECT se.exercise_id,se.exercise_name,COUNT(DISTINCT s.id) AS session_count,SUM(CASE WHEN sl.completed=1 THEN 1 ELSE 0 END) AS completed_sets,COALESCE(SUM(CASE WHEN sl.completed=1 THEN sl.reps ELSE 0 END),0) AS total_reps,COALESCE(SUM(CASE WHEN sl.completed=1 AND sl.reps IS NOT NULL AND sl.weight_kg IS NOT NULL THEN CAST(sl.reps AS DECIMAL(18,2))*sl.weight_kg ELSE 0 END),0) AS training_volume FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id JOIN dbo.MemberWorkoutSessions s ON s.id=se.session_id AND s.member_id=@memberId AND s.status=N'COMPLETED' GROUP BY se.exercise_id,se.exercise_name ORDER BY training_volume DESC,se.exercise_name`, { memberId }),
  ]);
  let dueTotal = 0;
  let dueCompleted = 0;
  for (const item of due.recordset) {
    assertIanaTimeZone(String(item.schedule_timezone));
    if (datePart(item.scheduled_date) <= todayInTimeZone(String(item.schedule_timezone)) && item.status !== 'CANCELLED') {
      dueTotal += 1;
      if (item.status === 'COMPLETED') dueCompleted += 1;
    }
  }
  return {
    completed_sessions: Number(summary.recordset[0].completed_sessions),
    total_duration: Number(summary.recordset[0].total_duration),
    training_volume: Number(volume.recordset[0].training_volume),
    completion_rate: dueTotal ? (dueCompleted / dueTotal) * 100 : null,
    recent_sessions: recent.recordset.map(item => ({ ...item, scheduled_date: datePart(item.scheduled_date) })),
    exercise_history: history.recordset,
    due_schedules: dueTotal,
    completed_due_schedules: dueCompleted,
    blockedReason: null,
    dataSources: { legacySessions: false, setLogs: true, memberProgressFlow: true },
  };
}
