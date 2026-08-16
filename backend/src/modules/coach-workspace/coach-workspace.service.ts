import { getPool, query, sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getProgress as getMemberProgress, getSession as getMemberSession } from '../member-workout/member-workout.service';
import { assertIanaTimeZone, todayInTimeZone } from '../../utils/timezone';
import { createNotification } from '../notifications/notifications.service';

export const MAX_PAGE_SIZE = 50;

export type CoachSessionMode = 'ONLINE' | 'IN_PERSON' | 'BOTH';
export type CoachSessionSource = 'legacy' | 'member';

export interface CoachSelfProfile {
  coachId: number;
  name: string;
  specialty: string | null;
  bio: string | null;
  experienceYears: number | null;
  sessionMode: CoachSessionMode | null;
  location: string | null;
  bookingEnabled: boolean;
}

export interface CoachMemberContext {
  id: number;
  coach_id: number;
  member_id: number;
  goal: string | null;
  limitations: string | null;
  private_note: string | null;
  next_review_date: string | null;
  created_at: string;
  updated_at: string;
}

interface CoachMemberContextRow extends Omit<CoachMemberContext, 'id' | 'coach_id' | 'member_id'> {
  id: number;
  coach_id: number;
  member_id: number;
}

interface CoachSelfProfileRow {
  coachId: number;
  name: string;
  specialty: string | null;
  bio: string | null;
  experienceYears: number | null;
  sessionMode: CoachSessionMode | null;
  location: string | null;
  bookingEnabled: boolean;
}

const requestFor = (executor: sql.ConnectionPool | sql.Transaction) => executor instanceof sql.Transaction ? new sql.Request(executor) : executor.request();

const nullableText = (value: unknown, maxLength: number): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text.length > maxLength) throw new AppError(400, `Value must be at most ${maxLength} characters`);
  return text || null;
};

function mapCoachSelfProfile(row: CoachSelfProfileRow): CoachSelfProfile {
  return {
    coachId: Number(row.coachId),
    name: row.name,
    specialty: row.specialty ?? null,
    bio: row.bio ?? null,
    experienceYears: row.experienceYears === null ? null : Number(row.experienceYears),
    sessionMode: row.sessionMode ?? null,
    location: row.location ?? null,
    bookingEnabled: Boolean(row.bookingEnabled),
  };
}

async function readCoachSelfProfile(coachId: number, executor: sql.ConnectionPool | sql.Transaction): Promise<CoachSelfProfile> {
  const result = await requestFor(executor)
    .input('coachId', sql.Int, coachId)
    .query<CoachSelfProfileRow>(
      `SELECT u.id AS coachId,u.name,
              cp.specialty,cp.bio,cp.experience_years AS experienceYears,
              cp.session_mode AS sessionMode,cp.location,
              CAST(COALESCE(cp.booking_enabled,1) AS bit) AS bookingEnabled
       FROM dbo.Users u
       LEFT JOIN dbo.CoachProfiles cp ON cp.coach_id=u.id
       WHERE u.id=@coachId AND u.role=N'coach'`,
    );
  if (!result.recordset[0]) throw new AppError(404, 'Coach profile not found');
  return mapCoachSelfProfile(result.recordset[0]);
}

export async function getSelfProfile(coachId: number): Promise<CoachSelfProfile> {
  return readCoachSelfProfile(coachId, await getPool());
}

export async function updateSelfProfile(coachId: number, input: {
  specialty?: unknown;
  bio?: unknown;
  experienceYears?: unknown;
  sessionMode?: unknown;
  location?: unknown;
  bookingEnabled?: unknown;
}): Promise<CoachSelfProfile> {
  const pool = await getPool();
  const tx = pool.transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const owner = await new sql.Request(tx)
      .input('coachId', sql.Int, coachId)
      .query<{ id: number }>(`SELECT id FROM dbo.Users WITH (UPDLOCK,HOLDLOCK) WHERE id=@coachId AND role=N'coach'`);
    if (!owner.recordset[0]) throw new AppError(404, 'Coach profile not found');

    const current = await new sql.Request(tx)
      .input('coachId', sql.Int, coachId)
      .query<CoachSelfProfileRow>(
        `SELECT u.id AS coachId,u.name,cp.specialty,cp.bio,cp.experience_years AS experienceYears,
                cp.session_mode AS sessionMode,cp.location,
                CAST(COALESCE(cp.booking_enabled,1) AS bit) AS bookingEnabled
         FROM dbo.Users u LEFT JOIN dbo.CoachProfiles cp ON cp.coach_id=u.id
         WHERE u.id=@coachId`,
      );
    const before = current.recordset[0];
    const experienceYears = input.experienceYears === undefined
      ? (before.experienceYears === null ? null : Number(before.experienceYears))
      : input.experienceYears === null || input.experienceYears === ''
        ? null
        : Number(input.experienceYears);
    if (experienceYears !== null && (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 80)) {
      throw new AppError(400, 'experienceYears must be an integer between 0 and 80');
    }
    const sessionMode = input.sessionMode === undefined ? before.sessionMode : input.sessionMode === null || input.sessionMode === '' ? null : String(input.sessionMode);
    if (sessionMode !== null && !['ONLINE', 'IN_PERSON', 'BOTH'].includes(sessionMode)) throw new AppError(400, 'sessionMode is invalid');
    const bookingEnabled = input.bookingEnabled === undefined ? Boolean(before.bookingEnabled) : input.bookingEnabled === true;
    const specialty = input.specialty === undefined ? before.specialty : nullableText(input.specialty, 200);
    const bio = input.bio === undefined ? before.bio : nullableText(input.bio, 2000);
    const location = input.location === undefined ? before.location : nullableText(input.location, 255);

    const existing = await new sql.Request(tx).input('coachId', sql.Int, coachId).query<{ coach_id: number }>('SELECT coach_id FROM dbo.CoachProfiles WITH (UPDLOCK,HOLDLOCK) WHERE coach_id=@coachId');
    if (existing.recordset[0]) {
      await new sql.Request(tx)
        .input('coachId', sql.Int, coachId)
        .input('specialty', sql.NVarChar(200), specialty)
        .input('bio', sql.NVarChar(2000), bio)
        .input('experienceYears', sql.Int, experienceYears)
        .input('sessionMode', sql.NVarChar(20), sessionMode)
        .input('location', sql.NVarChar(255), location)
        .input('bookingEnabled', sql.Bit, bookingEnabled)
        .query(`UPDATE dbo.CoachProfiles SET specialty=@specialty,bio=@bio,experience_years=@experienceYears,session_mode=@sessionMode,location=@location,booking_enabled=@bookingEnabled,updated_at=SYSUTCDATETIME() WHERE coach_id=@coachId`);
    } else {
      await new sql.Request(tx)
        .input('coachId', sql.Int, coachId)
        .input('specialty', sql.NVarChar(200), specialty)
        .input('bio', sql.NVarChar(2000), bio)
        .input('experienceYears', sql.Int, experienceYears)
        .input('sessionMode', sql.NVarChar(20), sessionMode)
        .input('location', sql.NVarChar(255), location)
        .input('bookingEnabled', sql.Bit, bookingEnabled)
        .query(`INSERT dbo.CoachProfiles(coach_id,specialty,bio,experience_years,session_mode,location,booking_enabled) VALUES(@coachId,@specialty,@bio,@experienceYears,@sessionMode,@location,@bookingEnabled)`);
    }
    const profile = await readCoachSelfProfile(coachId, tx);
    await tx.commit();
    return profile;
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    throw error;
  }
}
const dateOnly = (value: unknown): string => {
  const text = String(value ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new AppError(400, 'Date must use YYYY-MM-DD');
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) throw new AppError(400, 'Invalid date');
  return text;
};
const datePart = (value: unknown): string => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10);
const isUniqueConstraintError = (error: unknown): boolean => [2601, 2627].includes(Number((error as { number?: number })?.number));
const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const mondayDay = (value: string) => {
  const day = new Date(`${value}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
};

export function assertTimeZone(timeZone: string) {
  assertIanaTimeZone(timeZone);
}

export async function assertMemberScope(coachId: number, memberId: number) {
  const result = await query<{ id: number; user_id: number; name: string; email: string; phone: string | null; avatar_url: string | null }>(
    `SELECT c.id,u.id AS user_id,u.name,u.email,u.phone,u.avatar_url
     FROM dbo.CRMCustomers c JOIN dbo.Users u ON u.id=c.user_id
     WHERE c.user_id=@memberId AND c.assigned_coach_id=@coachId AND u.role=N'member' AND u.is_active=1`,
    { coachId, memberId },
  );
  if (!result.recordset[0]) throw new AppError(404, 'Member not found');
  return result.recordset[0];
}

export async function assertProgramOwner(coachId: number, programId: number) {
  const result = await query<{
    id: number;
    root_program_id: number;
    version_number: number;
    lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    published_at: string | Date | null;
    cloned_from_program_id: number | null;
    is_active: boolean;
  }>(`SELECT id,root_program_id,version_number,lifecycle_status,published_at,cloned_from_program_id,is_active
      FROM dbo.WorkoutPrograms WHERE id=@programId AND owner_coach_id=@coachId`, { coachId, programId });
  if (!result.recordset[0]) throw new AppError(404, 'Program not found');
  return result.recordset[0];
}

export async function assertAssignment(coachId: number, assignmentId: number) {
  const result = await query<{
    id: number;
    member_id: number;
    program_id: number;
    schedule_timezone: string;
    status: string;
    start_date: string | Date;
    end_date: string | Date | null;
    duration_weeks: number;
  }>(
    `SELECT a.id,a.member_id,a.program_id,a.schedule_timezone,a.status,a.start_date,a.end_date,
            p.duration_weeks
     FROM dbo.CoachProgramAssignments a
     JOIN dbo.CRMCustomers c ON c.user_id=a.member_id AND c.assigned_coach_id=@coachId
     JOIN dbo.Users u ON u.id=a.member_id AND u.role=N'member' AND u.is_active=1
     JOIN dbo.WorkoutPrograms p ON p.id=a.program_id
     WHERE a.id=@assignmentId AND a.coach_id=@coachId`,
    { coachId, assignmentId },
  );
  if (!result.recordset[0]) throw new AppError(404, 'Assignment not found');
  return result.recordset[0];
}

type LockedSchedule = {
  id: number;
  assignment_id: number;
  program_day_id: number;
  scheduled_date: string;
  status: string;
  schedule_timezone: string;
  assignment_status: string;
  assignment_start_date: string;
  assignment_end_date: string | null;
  program_duration_weeks: number;
};

async function lockScheduleForMutation(tx: sql.Transaction, coachId: number, scheduleId: number): Promise<LockedSchedule> {
  const result = await new sql.Request(tx)
    .input('scheduleId', sql.Int, scheduleId)
    .input('coachId', sql.Int, coachId)
    .query<LockedSchedule>(
      `SELECT s.id,s.assignment_id,s.program_day_id,s.scheduled_date,s.status,a.schedule_timezone,
              a.status AS assignment_status,a.start_date AS assignment_start_date,a.end_date AS assignment_end_date,
              p.duration_weeks AS program_duration_weeks
       FROM dbo.CoachProgramSchedules s WITH (UPDLOCK,HOLDLOCK)
       JOIN dbo.CoachProgramAssignments a WITH (UPDLOCK,HOLDLOCK) ON a.id=s.assignment_id AND a.coach_id=@coachId
       JOIN dbo.WorkoutPrograms p WITH (UPDLOCK,HOLDLOCK) ON p.id=a.program_id
       JOIN dbo.CRMCustomers c ON c.user_id=a.member_id AND c.assigned_coach_id=@coachId
       JOIN dbo.Users u ON u.id=a.member_id AND u.role=N'member' AND u.is_active=1
       WHERE s.id=@scheduleId`,
    );
  const schedule = result.recordset[0];
  if (!schedule) throw new AppError(404, 'Schedule not found');
  return schedule;
}

export type CoachAttentionSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export interface CoachAttentionItem {
  type: 'PENDING_BOOKING' | 'SKIPPED_SCHEDULES' | 'NO_WORKOUT_7D' | 'ASSIGNMENT_EXPIRING' | 'MISSING_FUTURE_SCHEDULE' | 'EMPTY_PROGRAM_DAY' | 'LOW_COMPLETION';
  severity: CoachAttentionSeverity;
  memberId: number;
  memberName: string;
  title: string;
  description: string;
  actionUrl: string;
  createdFrom: string;
}

const attentionSeverityRank: Record<CoachAttentionSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function attentionItem(input: Omit<CoachAttentionItem, 'memberId' | 'memberName' | 'createdFrom'> & { member_id: number; member_name: string; created_from: unknown }): CoachAttentionItem {
  return {
    type: input.type,
    severity: input.severity,
    memberId: Number(input.member_id),
    memberName: String(input.member_name),
    title: input.title,
    description: input.description,
    actionUrl: input.actionUrl,
    createdFrom: datePart(input.created_from),
  };
}

async function getAttentionQueue(coachId: number, timezones: Array<{ schedule_timezone: string }>): Promise<CoachAttentionItem[]> {
  const params: Record<string, unknown> = { coachId };
  const dateClauses = timezones.map((row, index) => {
    const timeZone = String(row.schedule_timezone);
    assertTimeZone(timeZone);
    const today = todayInTimeZone(timeZone);
    params[`attentionTimezone${index}`] = timeZone;
    params[`attentionToday${index}`] = today;
    params[`attentionExpiry${index}`] = addDays(today, 7);
    params[`attentionFutureEnd${index}`] = addDays(today, 14);
    params[`attentionPast${index}`] = addDays(today, -14);
    params[`attentionSkippedStart${index}`] = addDays(today, -30);
    return `(a.schedule_timezone=@attentionTimezone${index} AND s.scheduled_date>=@attentionToday${index} AND s.scheduled_date<=@attentionFutureEnd${index})`;
  });
  const activeDateClauses = timezones.map((row, index) => `(a.schedule_timezone=@attentionTimezone${index} AND a.end_date>=@attentionToday${index} AND a.end_date<=@attentionExpiry${index})`);
  const historyDateClauses = timezones.map((row, index) => `(a.schedule_timezone=@attentionTimezone${index} AND s.scheduled_date>=@attentionPast${index} AND s.scheduled_date<@attentionToday${index})`);
  const skippedDateClauses = timezones.map((row, index) => `(a.schedule_timezone=@attentionTimezone${index} AND s.scheduled_date>=@attentionSkippedStart${index} AND s.scheduled_date<@attentionToday${index})`);
  const futureWindow = dateClauses.length ? `AND (${dateClauses.join(' OR ')})` : 'AND 1=0';
  const activeWindow = activeDateClauses.length ? `AND (${activeDateClauses.join(' OR ')})` : 'AND 1=0';
  const historyWindow = historyDateClauses.length ? `AND (${historyDateClauses.join(' OR ')})` : 'AND 1=0';
  const skippedWindow = skippedDateClauses.length ? `AND (${skippedDateClauses.join(' OR ')})` : 'AND 1=0';
  const scope = `JOIN dbo.CRMCustomers c ON c.user_id=a.member_id AND c.assigned_coach_id=@coachId
                 JOIN dbo.Users u ON u.id=a.member_id AND u.role=N'member' AND u.is_active=1`;
  const [pending, skipped, noWorkout, expiring, missingFuture, emptyDay, lowCompletion] = await Promise.all([
    query(`SELECT TOP 20 b.id AS booking_id,b.member_id,u.name AS member_name,b.created_at AS created_from
           FROM dbo.Bookings b JOIN dbo.Users u ON u.id=b.member_id
           JOIN dbo.CRMCustomers c ON c.user_id=b.member_id AND c.assigned_coach_id=@coachId
           WHERE b.coach_id=@coachId AND b.status=N'pending' AND b.created_at<=DATEADD(hour,-24,SYSUTCDATETIME())
           ORDER BY b.created_at,b.id`, params),
     query(`SELECT TOP 20 a.id AS assignment_id,a.member_id,u.name AS member_name,COUNT(*) AS skipped_count,MAX(s.scheduled_date) AS created_from
            FROM dbo.CoachProgramSchedules s JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id AND a.coach_id=@coachId
            ${scope}
            WHERE s.status=N'SKIPPED' AND a.status=N'ACTIVE' ${skippedWindow}
            GROUP BY a.id,a.member_id,u.name
           HAVING COUNT(*)>=2
           ORDER BY skipped_count DESC,created_from,a.id`, params),
    query(`SELECT TOP 20 a.id AS assignment_id,a.member_id,u.name AS member_name,a.updated_at AS created_from
            FROM dbo.CoachProgramAssignments a ${scope}
            WHERE a.coach_id=@coachId AND a.status=N'ACTIVE'
              AND NOT EXISTS (
                SELECT 1 FROM dbo.MemberWorkoutSessions ms
                JOIN dbo.CoachProgramAssignments current_a ON current_a.id=ms.assignment_id
                WHERE ms.member_id=a.member_id AND current_a.id=a.id AND current_a.coach_id=@coachId
                  AND current_a.status=N'ACTIVE' AND ms.started_at>=DATEADD(day,-7,SYSUTCDATETIME())
              )
              AND NOT EXISTS (
                SELECT 1 FROM dbo.WorkoutSessions ws
                JOIN dbo.Workouts current_w ON current_w.id=ws.workout_id AND current_w.coach_id=@coachId
                WHERE ws.user_id=a.member_id AND ws.started_at>=DATEADD(day,-7,SYSUTCDATETIME())
              )
           ORDER BY a.updated_at,a.id`, params),
    query(`SELECT TOP 20 a.id AS assignment_id,a.member_id,u.name AS member_name,a.end_date AS created_from
           FROM dbo.CoachProgramAssignments a ${scope}
           WHERE a.coach_id=@coachId AND a.status=N'ACTIVE' AND a.end_date IS NOT NULL ${activeWindow}
           ORDER BY a.end_date,a.id`, params),
    query(`SELECT TOP 20 a.id AS assignment_id,a.member_id,u.name AS member_name,a.updated_at AS created_from
           FROM dbo.CoachProgramAssignments a ${scope}
           WHERE a.coach_id=@coachId AND a.status=N'ACTIVE'
             AND NOT EXISTS (
               SELECT 1 FROM dbo.CoachProgramSchedules s
               WHERE s.assignment_id=a.id AND s.status=N'SCHEDULED' ${futureWindow}
             )
           ORDER BY a.updated_at,a.id`, params),
    query(`SELECT TOP 20 a.id AS assignment_id,a.member_id,u.name AS member_name,p.id AS program_id,d.id AS day_id,d.title AS day_title,d.created_at AS created_from
           FROM dbo.CoachProgramAssignments a ${scope}
           JOIN dbo.WorkoutPrograms p ON p.id=a.program_id
           JOIN dbo.WorkoutProgramDays d ON d.program_id=p.id
           WHERE a.coach_id=@coachId AND a.status=N'ACTIVE'
             AND NOT EXISTS (SELECT 1 FROM dbo.WorkoutProgramExercises pe WHERE pe.program_day_id=d.id)
           ORDER BY d.created_at,d.id`, params),
    query(`SELECT TOP 20 a.id AS assignment_id,a.member_id,u.name AS member_name,MAX(s.scheduled_date) AS created_from,
                  COUNT(*) AS due_count,SUM(CASE WHEN s.status=N'COMPLETED' THEN 1 ELSE 0 END) AS completed_count
           FROM dbo.CoachProgramSchedules s JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id AND a.coach_id=@coachId
           ${scope}
           WHERE a.coach_id=@coachId AND a.status=N'ACTIVE' AND s.status IN (N'COMPLETED',N'SKIPPED') ${historyWindow}
           GROUP BY a.id,a.member_id,u.name
           HAVING COUNT(*)>=2 AND SUM(CASE WHEN s.status=N'COMPLETED' THEN 1 ELSE 0 END)*2<COUNT(*)
           ORDER BY completed_count,created_from,a.id`, params),
  ]);
  const items: CoachAttentionItem[] = [
    ...pending.recordset.map(row => attentionItem({ ...row, type: 'PENDING_BOOKING', severity: 'HIGH', title: 'Pending booking cần xử lý', description: 'Booking đã pending quá 24 giờ.', actionUrl: `/coach/appointments/${row.booking_id}` })),
    ...skipped.recordset.map(row => attentionItem({ ...row, type: 'SKIPPED_SCHEDULES', severity: 'MEDIUM', title: 'Nhiều schedule bị bỏ qua', description: `${Number(row.skipped_count)} schedule gần đây ở trạng thái SKIPPED.`, actionUrl: `/coach/assignments/${row.assignment_id}` })),
    ...noWorkout.recordset.map(row => attentionItem({ ...row, type: 'NO_WORKOUT_7D', severity: 'LOW', title: 'Chưa có workout trong 7 ngày', description: 'Member chưa có session workout mới trong 7 ngày gần nhất.', actionUrl: `/coach/members/${row.member_id}/sessions` })),
    ...expiring.recordset.map(row => attentionItem({ ...row, type: 'ASSIGNMENT_EXPIRING', severity: 'HIGH', title: 'Assignment sắp hết hạn', description: `Assignment kết thúc vào ${datePart(row.created_from)}.`, actionUrl: `/coach/assignments/${row.assignment_id}` })),
    ...missingFuture.recordset.map(row => attentionItem({ ...row, type: 'MISSING_FUTURE_SCHEDULE', severity: 'MEDIUM', title: 'Thiếu schedule sắp tới', description: 'Assignment active chưa có schedule SCHEDULED trong 14 ngày tới.', actionUrl: `/coach/members/${row.member_id}/schedule` })),
    ...emptyDay.recordset.map(row => attentionItem({ ...row, type: 'EMPTY_PROGRAM_DAY', severity: 'HIGH', title: 'Program Day đang trống', description: `Day “${String(row.day_title)}” chưa có Exercise.`, actionUrl: `/coach/workout-programs/${row.program_id}` })),
    ...lowCompletion.recordset.map(row => attentionItem({ ...row, type: 'LOW_COMPLETION', severity: 'MEDIUM', title: 'Completion thấp trong 14 ngày', description: `${Number(row.completed_count)}/${Number(row.due_count)} schedule gần đây đã hoàn thành.`, actionUrl: `/coach/members/${row.member_id}/progress` })),
  ];
  return items.sort((a, b) => attentionSeverityRank[a.severity] - attentionSeverityRank[b.severity] || a.createdFrom.localeCompare(b.createdFrom) || a.memberId - b.memberId || a.type.localeCompare(b.type)).slice(0, 10);
}

export async function dashboard(coachId: number) {
  const timezoneRows = await query<{ schedule_timezone: string }>(
    `SELECT DISTINCT a.schedule_timezone
     FROM dbo.CoachProgramAssignments a
     JOIN dbo.CRMCustomers c ON c.user_id=a.member_id AND c.assigned_coach_id=@coachId
     JOIN dbo.Users u ON u.id=a.member_id AND u.role=N'member' AND u.is_active=1
     WHERE a.coach_id=@coachId AND a.status IN (N'ACTIVE',N'PAUSED')`,
    { coachId },
  );
  const scheduleParams: Record<string, unknown> = { coachId };
  const futureScheduleClauses = timezoneRows.recordset.map((row, index) => {
    const timeZone = String(row.schedule_timezone);
    assertTimeZone(timeZone);
    scheduleParams[`scheduleTimezone${index}`] = timeZone;
    scheduleParams[`scheduleToday${index}`] = todayInTimeZone(timeZone);
    return `(a.schedule_timezone=@scheduleTimezone${index} AND s.scheduled_date>=@scheduleToday${index})`;
  });
  const futureScheduleFilter = futureScheduleClauses.length ? `AND (${futureScheduleClauses.join(' OR ')})` : 'AND 1=0';
  const [members, activeMembers, programs, assignments, schedules, sessions, attentionQueue] = await Promise.all([
    query(`SELECT COUNT(*) AS count FROM dbo.CRMCustomers c JOIN dbo.Users u ON u.id=c.user_id WHERE c.assigned_coach_id=@coachId AND u.role=N'member' AND u.is_active=1`, { coachId }),
    query(`SELECT COUNT(DISTINCT a.member_id) AS count
           FROM dbo.CoachProgramAssignments a
           JOIN dbo.CRMCustomers c ON c.user_id=a.member_id AND c.assigned_coach_id=@coachId
           JOIN dbo.Users u ON u.id=a.member_id AND u.role=N'member' AND u.is_active=1
           WHERE a.coach_id=@coachId AND a.status=N'ACTIVE'`, { coachId }),
    query(`SELECT COUNT(*) AS count FROM dbo.WorkoutPrograms WHERE owner_coach_id=@coachId AND is_active=1`, { coachId }),
    query(`SELECT COUNT(*) AS count FROM dbo.CoachProgramAssignments a JOIN dbo.CRMCustomers c ON c.user_id=a.member_id AND c.assigned_coach_id=@coachId JOIN dbo.Users u ON u.id=a.member_id AND u.is_active=1 WHERE a.coach_id=@coachId AND a.status=N'ACTIVE'`, { coachId }),
    query(`SELECT TOP 5 s.id,s.scheduled_date,s.status,a.schedule_timezone,p.name AS program_name,u.id AS member_id,u.name AS member_name,d.title AS day_title
           FROM dbo.CoachProgramSchedules s JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id AND a.coach_id=@coachId
           JOIN dbo.CRMCustomers c ON c.user_id=a.member_id AND c.assigned_coach_id=@coachId
           JOIN dbo.Users u ON u.id=a.member_id AND u.role=N'member' AND u.is_active=1
           JOIN dbo.WorkoutPrograms p ON p.id=a.program_id JOIN dbo.WorkoutProgramDays d ON d.id=s.program_day_id
           WHERE s.status=N'SCHEDULED' ${futureScheduleFilter}
           ORDER BY s.scheduled_date,s.id`, scheduleParams),
    query(`SELECT TOP 5 id,member_id,member_name,started_at,completed_at,status,workout_name,source,set_count,completed_set_count FROM (
            SELECT ws.id,ws.user_id AS member_id,u.name AS member_name,ws.started_at,ws.completed_at,ws.status,w.name AS workout_name,CAST(N'legacy' AS NVARCHAR(10)) AS source,
                   CAST(NULL AS INT) AS set_count,CAST(NULL AS INT) AS completed_set_count
            FROM dbo.WorkoutSessions ws JOIN dbo.Workouts w ON w.id=ws.workout_id AND w.coach_id=@coachId
            JOIN dbo.CRMCustomers c ON c.user_id=ws.user_id AND c.assigned_coach_id=@coachId
            JOIN dbo.Users u ON u.id=ws.user_id AND u.role=N'member' AND u.is_active=1
            UNION ALL
            SELECT ms.id,ms.member_id,u.name AS member_name,ms.started_at,ms.ended_at AS completed_at,ms.status,p.name AS workout_name,CAST(N'member' AS NVARCHAR(10)) AS source,
                   (SELECT COUNT(*) FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id WHERE se.session_id=ms.id) AS set_count,
                   (SELECT COUNT(*) FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id WHERE se.session_id=ms.id AND sl.completed=1) AS completed_set_count
            FROM dbo.MemberWorkoutSessions ms JOIN dbo.CoachProgramAssignments a ON a.id=ms.assignment_id AND a.coach_id=@coachId
            JOIN dbo.CoachProgramSchedules cs ON cs.id=ms.schedule_id AND cs.assignment_id=a.id
            JOIN dbo.WorkoutPrograms p ON p.id=a.program_id
            JOIN dbo.CRMCustomers c ON c.user_id=ms.member_id AND c.assigned_coach_id=@coachId
            JOIN dbo.Users u ON u.id=ms.member_id AND u.role=N'member' AND u.is_active=1
          ) sessions ORDER BY started_at DESC,id DESC`, { coachId }),
    getAttentionQueue(coachId, timezoneRows.recordset),
  ]);
  const upcomingSchedules = schedules.recordset;
  return {
    counts: { assignedMembers: Number(members.recordset[0].count), activeMembers: Number(activeMembers.recordset[0].count), ownedPrograms: Number(programs.recordset[0].count), activeAssignments: Number(assignments.recordset[0].count) },
    upcomingSchedules,
    recentSessions: sessions.recordset,
    attentionQueue,
    attentionQueueAvailable: true,
  };
}

export async function listExercises(input: { q?: string; muscleGroup?: string; difficulty?: string; equipment?: string; page: number; limit: number; sort: string }) {
  const conditions = ['e.is_active=1'];
  const params: Record<string, unknown> = { offset: (input.page - 1) * input.limit, limit: input.limit };
  if (input.q) { conditions.push('(e.name LIKE @q OR e.description LIKE @q OR e.instructions LIKE @q)'); params.q = `%${input.q}%`; }
  if (input.muscleGroup) { conditions.push('e.muscle_group=@muscleGroup'); params.muscleGroup = input.muscleGroup; }
  if (input.difficulty) { conditions.push('e.difficulty=@difficulty'); params.difficulty = input.difficulty; }
  if (input.equipment) { conditions.push('e.equipment=@equipment'); params.equipment = input.equipment; }
  const sort: Record<string, string> = { name_asc: 'e.name ASC,e.id ASC', name_desc: 'e.name DESC,e.id DESC', newest: 'e.created_at DESC,e.id DESC' };
  const where = conditions.join(' AND ');
  const [rows, count] = await Promise.all([
    query(`SELECT e.id,e.name,e.slug,e.description,e.instructions,e.muscle_group,e.equipment,e.difficulty,e.thumbnail_url,e.is_active,e.created_at,e.updated_at FROM dbo.Exercises e WHERE ${where} ORDER BY ${sort[input.sort] ?? sort.name_asc} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total FROM dbo.Exercises e WHERE ${where}`, params),
  ]);
  return { items: rows.recordset, page: input.page, limit: input.limit, total: Number(count.recordset[0].total), totalPages: Math.ceil(Number(count.recordset[0].total) / input.limit) };
}

export async function getExercise(exerciseId: number) {
  const result = await query(`SELECT e.id,e.name,e.slug,e.description,e.instructions,e.muscle_group,e.equipment,e.difficulty,e.thumbnail_url,e.is_active,e.created_at,e.updated_at FROM dbo.Exercises e WHERE e.id=@exerciseId AND e.is_active=1`, { exerciseId });
  if (!result.recordset[0]) throw new AppError(404, 'Exercise not found');
  return result.recordset[0];
}

export async function listPrograms(coachId: number, page: number, limit: number, q?: string) {
  const params: Record<string, unknown> = { coachId, offset: (page - 1) * limit, limit };
  const search = q ? ' AND (p.name LIKE @q OR p.description LIKE @q OR p.goal LIKE @q)' : '';
  if (q) params.q = `%${q}%`;
  const [rows, count] = await Promise.all([
    query(`SELECT p.id,p.name,p.description,p.goal,p.difficulty,p.duration_weeks,p.days_per_week,p.owner_coach_id,p.is_active,
                  p.root_program_id,p.version_number,p.lifecycle_status,p.published_at,p.cloned_from_program_id,p.created_at,p.updated_at,
                  (SELECT COUNT(*) FROM dbo.WorkoutProgramDays d WHERE d.program_id=p.id) AS day_count,
                  (SELECT COUNT(*) FROM dbo.WorkoutProgramExercises pe JOIN dbo.WorkoutProgramDays d ON d.id=pe.program_day_id WHERE d.program_id=p.id) AS exercise_count
           FROM dbo.WorkoutPrograms p WHERE p.owner_coach_id=@coachId${search} ORDER BY p.updated_at DESC,p.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total FROM dbo.WorkoutPrograms p WHERE p.owner_coach_id=@coachId${search}`, params),
  ]);
  return { items: rows.recordset, page, limit, total: Number(count.recordset[0].total), totalPages: Math.ceil(Number(count.recordset[0].total) / limit) };
}

export async function getProgram(coachId: number, programId: number) {
  await assertProgramOwner(coachId, programId);
  const [program, days, exercises] = await Promise.all([
    query(`SELECT p.id,p.name,p.description,p.goal,p.difficulty,p.duration_weeks,p.days_per_week,p.owner_coach_id,p.is_active,
                   p.root_program_id,p.version_number,p.lifecycle_status,p.published_at,p.cloned_from_program_id,p.created_at,p.updated_at
            FROM dbo.WorkoutPrograms p WHERE p.id=@programId`, { programId }),
    query(`SELECT d.id,d.program_id,d.week_number,d.day_number,d.title,d.description,d.sort_order,d.created_at,d.updated_at FROM dbo.WorkoutProgramDays d WHERE d.program_id=@programId ORDER BY d.sort_order,d.id`, { programId }),
    query(`SELECT pe.id,pe.program_day_id,pe.exercise_id,pe.sort_order,pe.target_sets,pe.target_reps_min,pe.target_reps_max,pe.target_weight,pe.target_duration_seconds,pe.rest_seconds,pe.tempo,pe.coach_note,e.name AS exercise_name,e.slug AS exercise_slug,e.muscle_group,e.equipment,e.difficulty,e.thumbnail_url FROM dbo.WorkoutProgramExercises pe JOIN dbo.WorkoutProgramDays d ON d.id=pe.program_day_id JOIN dbo.Exercises e ON e.id=pe.exercise_id WHERE d.program_id=@programId ORDER BY pe.program_day_id,pe.sort_order,pe.id`, { programId }),
  ]);
  const byDay = new Map<number, unknown[]>();
  for (const row of exercises.recordset) { const list = byDay.get(Number(row.program_day_id)) ?? []; list.push(row); byDay.set(Number(row.program_day_id), list); }
  return { ...program.recordset[0], days: days.recordset.map(day => ({ ...day, exercises: byDay.get(Number(day.id)) ?? [] })) };
}

export async function createProgram(coachId: number, data: Record<string, unknown>) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const created = await new sql.Request(tx)
      .input('name', sql.NVarChar(200), data.name)
      .input('description', sql.NVarChar(sql.MAX), data.description ?? null)
      .input('goal', sql.NVarChar(40), data.goal)
      .input('difficulty', sql.NVarChar(20), data.difficulty)
      .input('durationWeeks', sql.TinyInt, data.durationWeeks)
      .input('daysPerWeek', sql.TinyInt, data.daysPerWeek)
      .input('coachId', sql.Int, coachId)
      .query<{ id: number }>(`INSERT dbo.WorkoutPrograms(name,description,goal,difficulty,duration_weeks,days_per_week,owner_coach_id,created_by,root_program_id,version_number,lifecycle_status,is_active)
        OUTPUT INSERTED.id
        VALUES(@name,@description,@goal,@difficulty,@durationWeeks,@daysPerWeek,@coachId,@coachId,NULL,1,N'DRAFT',1)`);
    const programId = Number(created.recordset[0].id);
    await new sql.Request(tx)
      .input('programId', sql.Int, programId)
      .query('UPDATE dbo.WorkoutPrograms SET root_program_id=@programId WHERE id=@programId');
    const row = await new sql.Request(tx)
      .input('programId', sql.Int, programId)
      .query(`SELECT id,name,description,goal,difficulty,duration_weeks,days_per_week,owner_coach_id,is_active,
                     root_program_id,version_number,lifecycle_status,published_at,cloned_from_program_id,created_at,updated_at
              FROM dbo.WorkoutPrograms WHERE id=@programId`);
    await tx.commit();
    return row.recordset[0];
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    throw error;
  }
}

export async function updateProgram(coachId: number, programId: number, data: Record<string, unknown>) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    await lockProgramDraft(tx, coachId, programId);
    const durationWeeks = Number(data.durationWeeks);
    const maxDay = await new sql.Request(tx)
      .input('programIdForDuration', sql.Int, programId)
      .query<{ maxWeek: number | null }>('SELECT MAX(week_number) AS maxWeek FROM dbo.WorkoutProgramDays WHERE program_id=@programIdForDuration');
    const maxWeek = maxDay.recordset[0]?.maxWeek == null ? 0 : Number(maxDay.recordset[0].maxWeek);
    if (durationWeeks < maxWeek) {
      throw new AppError(409, `Program duration cannot be shorter than existing Day week ${maxWeek}`, 'PROGRAM_DURATION_TOO_SHORT');
    }
    const result = await new sql.Request(tx)
      .input('name', sql.NVarChar(200), data.name)
      .input('description', sql.NVarChar(sql.MAX), data.description ?? null)
      .input('goal', sql.NVarChar(40), data.goal)
      .input('difficulty', sql.NVarChar(20), data.difficulty)
      .input('durationWeeks', sql.TinyInt, durationWeeks)
      .input('daysPerWeek', sql.TinyInt, data.daysPerWeek)
      .input('programId', sql.Int, programId)
      .input('coachId', sql.Int, coachId)
      .query(`UPDATE dbo.WorkoutPrograms SET name=@name,description=@description,goal=@goal,difficulty=@difficulty,duration_weeks=@durationWeeks,days_per_week=@daysPerWeek,updated_at=SYSUTCDATETIME()
        OUTPUT INSERTED.id,INSERTED.name,INSERTED.description,INSERTED.goal,INSERTED.difficulty,INSERTED.duration_weeks,INSERTED.days_per_week,INSERTED.owner_coach_id,INSERTED.is_active,
               INSERTED.root_program_id,INSERTED.version_number,INSERTED.lifecycle_status,INSERTED.published_at,INSERTED.cloned_from_program_id,INSERTED.created_at,INSERTED.updated_at
        WHERE id=@programId AND owner_coach_id=@coachId AND lifecycle_status=N'DRAFT'`);
    if (!result.recordset[0]) throw new AppError(409, 'Program was changed before update completed', 'PROGRAM_VERSION_CONFLICT');
    await tx.commit();
    return result.recordset[0];
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    throw error;
  }
}

export async function setProgramActive(coachId: number, programId: number, active: boolean) {
  const current = await assertProgramOwner(coachId, programId);
  const result = await query(`UPDATE dbo.WorkoutPrograms
    SET lifecycle_status=CASE WHEN @active=1 AND lifecycle_status=N'ARCHIVED' THEN N'DRAFT' WHEN @active=1 THEN lifecycle_status ELSE N'ARCHIVED' END,
        published_at=CASE WHEN @active=1 AND lifecycle_status=N'PUBLISHED' THEN published_at ELSE NULL END,
        is_active=CASE WHEN @active=1 THEN 1 ELSE 0 END,updated_at=SYSUTCDATETIME()
    OUTPUT INSERTED.id,INSERTED.name,INSERTED.description,INSERTED.goal,INSERTED.difficulty,INSERTED.duration_weeks,INSERTED.days_per_week,INSERTED.owner_coach_id,INSERTED.is_active,
           INSERTED.root_program_id,INSERTED.version_number,INSERTED.lifecycle_status,INSERTED.published_at,INSERTED.cloned_from_program_id,INSERTED.created_at,INSERTED.updated_at
    WHERE id=@programId AND owner_coach_id=@coachId AND lifecycle_status=@expectedLifecycle`, { active: active ? 1 : 0, programId, coachId, expectedLifecycle: current.lifecycle_status });
  if (!result.recordset[0]) throw new AppError(409, 'Program lifecycle changed before activation update completed', 'PROGRAM_VERSION_CONFLICT');
  return result.recordset[0];
}

const programVersionSelect = `id,name,description,goal,difficulty,duration_weeks,days_per_week,owner_coach_id,is_active,
  root_program_id,version_number,lifecycle_status,published_at,cloned_from_program_id,created_at,updated_at`;

type LockedProgram = { id: number; duration_weeks: number };

async function lockProgramDraft(tx: sql.Transaction, coachId: number, programId: number): Promise<LockedProgram> {
  const result = await new sql.Request(tx)
    .input('programId', sql.Int, programId)
    .input('coachId', sql.Int, coachId)
    .query<{ id: number; duration_weeks: number; lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }>(
      `SELECT id,duration_weeks,lifecycle_status
       FROM dbo.WorkoutPrograms WITH (UPDLOCK,HOLDLOCK)
       WHERE id=@programId AND owner_coach_id=@coachId`,
    );
  const program = result.recordset[0];
  if (!program) throw new AppError(404, 'Program not found');
  if (program.lifecycle_status !== 'DRAFT') {
    throw new AppError(409, 'Published or archived Program versions are immutable; clone a new Draft version', 'PROGRAM_VERSION_IMMUTABLE');
  }
  return { id: Number(program.id), duration_weeks: Number(program.duration_weeks) };
}

async function lockDayDraft(tx: sql.Transaction, coachId: number, dayId: number) {
  const result = await new sql.Request(tx)
    .input('dayId', sql.Int, dayId)
    .input('coachId', sql.Int, coachId)
    .query<{ id: number; program_id: number; week_number: number; day_number: number; duration_weeks: number; lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }>(
      `SELECT d.id,d.program_id,d.week_number,d.day_number,p.duration_weeks,p.lifecycle_status
       FROM dbo.WorkoutProgramDays d
       JOIN dbo.WorkoutPrograms p WITH (UPDLOCK,HOLDLOCK) ON p.id=d.program_id AND p.owner_coach_id=@coachId
       WHERE d.id=@dayId`,
    );
  const day = result.recordset[0];
  if (!day) throw new AppError(404, 'Program day not found');
  if (day.lifecycle_status !== 'DRAFT') {
    throw new AppError(409, 'Published or archived Program versions are immutable; clone a new Draft version', 'PROGRAM_VERSION_IMMUTABLE');
  }
  return day;
}

async function lockProgramExerciseDraft(tx: sql.Transaction, coachId: number, programExerciseId: number) {
  const result = await new sql.Request(tx)
    .input('programExerciseId', sql.Int, programExerciseId)
    .input('coachId', sql.Int, coachId)
    .query<{
      id: number; program_day_id: number; program_id: number; duration_weeks: number; lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      target_sets: number | null; target_reps_min: number | null; target_reps_max: number | null; target_weight: number | null;
      target_duration_seconds: number | null; rest_seconds: number | null; tempo: string | null; coach_note: string | null;
    }>(
      `SELECT pe.id,pe.program_day_id,d.program_id,p.duration_weeks,p.lifecycle_status,
              pe.target_sets,pe.target_reps_min,pe.target_reps_max,pe.target_weight,
              pe.target_duration_seconds,pe.rest_seconds,pe.tempo,pe.coach_note
       FROM dbo.WorkoutProgramExercises pe
       JOIN dbo.WorkoutProgramDays d ON d.id=pe.program_day_id
       JOIN dbo.WorkoutPrograms p WITH (UPDLOCK,HOLDLOCK) ON p.id=d.program_id AND p.owner_coach_id=@coachId
       WHERE pe.id=@programExerciseId`,
    );
  const exercise = result.recordset[0];
  if (!exercise) throw new AppError(404, 'Program exercise not found');
  if (exercise.lifecycle_status !== 'DRAFT') {
    throw new AppError(409, 'Published or archived Program versions are immutable; clone a new Draft version', 'PROGRAM_VERSION_IMMUTABLE');
  }
  return exercise;
}

function assertMergedExerciseTargets(input: { targetRepsMin: number | null; targetRepsMax: number | null; targetDurationSeconds: number | null }): void {
  if (input.targetRepsMin == null && input.targetRepsMax == null && input.targetDurationSeconds == null) {
    throw new AppError(400, 'At least a reps or duration target is required', 'PROGRAM_EXERCISE_TARGET_REQUIRED');
  }
  if (input.targetRepsMin != null && input.targetRepsMax != null && input.targetRepsMin > input.targetRepsMax) {
    throw new AppError(400, 'targetRepsMin must not exceed targetRepsMax', 'PROGRAM_EXERCISE_REPS_INVALID');
  }
}

export async function publishProgram(coachId: number, programId: number) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const current = await lockProgramDraft(tx, coachId, programId);
    const days = await new sql.Request(tx)
      .input('programId', sql.Int, programId)
      .query<{ id: number; week_number: number; exercise_count: number; invalid_exercise_count: number }>(
        `SELECT d.id,d.week_number,COUNT(pe.id) AS exercise_count,
                SUM(CASE WHEN pe.id IS NOT NULL AND (e.id IS NULL OR e.is_active<>1
                  OR (pe.target_reps_min IS NULL AND pe.target_reps_max IS NULL AND pe.target_duration_seconds IS NULL)
                  OR (pe.target_reps_min IS NOT NULL AND pe.target_reps_max IS NOT NULL AND pe.target_reps_min>pe.target_reps_max)) THEN 1 ELSE 0 END) AS invalid_exercise_count
         FROM dbo.WorkoutProgramDays d
         LEFT JOIN dbo.WorkoutProgramExercises pe ON pe.program_day_id=d.id
         LEFT JOIN dbo.Exercises e ON e.id=pe.exercise_id
         WHERE d.program_id=@programId
         GROUP BY d.id,d.week_number`,
      );
    const notReady = days.recordset.length === 0 || days.recordset.some(day =>
      Number(day.week_number) > current.duration_weeks || Number(day.exercise_count) < 1 || Number(day.invalid_exercise_count ?? 0) > 0);
    if (notReady) throw new AppError(409, 'Program is not ready to publish', 'PROGRAM_NOT_READY_TO_PUBLISH');
    const updated = await new sql.Request(tx)
      .input('programId', sql.Int, programId)
      .input('coachId', sql.Int, coachId)
      .query(`UPDATE dbo.WorkoutPrograms SET lifecycle_status=N'PUBLISHED',published_at=SYSUTCDATETIME(),is_active=1,updated_at=SYSUTCDATETIME()
        OUTPUT INSERTED.id,INSERTED.name,INSERTED.description,INSERTED.goal,INSERTED.difficulty,INSERTED.duration_weeks,INSERTED.days_per_week,INSERTED.owner_coach_id,INSERTED.is_active,
               INSERTED.root_program_id,INSERTED.version_number,INSERTED.lifecycle_status,INSERTED.published_at,INSERTED.cloned_from_program_id,INSERTED.created_at,INSERTED.updated_at
        WHERE id=@programId AND owner_coach_id=@coachId AND lifecycle_status=N'DRAFT'`);
    if (!updated.recordset[0]) throw new AppError(409, 'Program lifecycle changed before publish completed', 'PROGRAM_VERSION_CONFLICT');
    await tx.commit();
    return updated.recordset[0];
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    throw error;
  }
}

export async function cloneProgramVersion(coachId: number, programId: number) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const sourceResult = await new sql.Request(tx)
      .input('programId', sql.Int, programId)
      .input('coachId', sql.Int, coachId)
      .query<{
        id: number;
        root_program_id: number;
        version_number: number;
        lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
        name: string;
        description: string | null;
        goal: string;
        difficulty: string;
        duration_weeks: number;
        days_per_week: number;
      }>(`SELECT id,root_program_id,version_number,lifecycle_status,name,description,goal,difficulty,duration_weeks,days_per_week
          FROM dbo.WorkoutPrograms WITH (UPDLOCK,HOLDLOCK) WHERE id=@programId AND owner_coach_id=@coachId`);
    const source = sourceResult.recordset[0];
    if (!source) throw new AppError(404, 'Program not found');
    if (source.lifecycle_status === 'ARCHIVED') throw new AppError(409, 'Archived Program versions cannot be cloned', 'PROGRAM_VERSION_TRANSITION_INVALID');

    const next = await new sql.Request(tx)
      .input('rootProgramId', sql.Int, Number(source.root_program_id))
      .query<{ next_version: number }>(`SELECT ISNULL(MAX(version_number),0)+1 AS next_version
        FROM dbo.WorkoutPrograms WITH (UPDLOCK,HOLDLOCK) WHERE root_program_id=@rootProgramId`);
    const versionNumber = Number(next.recordset[0].next_version);
    const created = await new sql.Request(tx)
      .input('name', sql.NVarChar(200), source.name)
      .input('description', sql.NVarChar(sql.MAX), source.description)
      .input('goal', sql.NVarChar(40), source.goal)
      .input('difficulty', sql.NVarChar(20), source.difficulty)
      .input('durationWeeks', sql.TinyInt, source.duration_weeks)
      .input('daysPerWeek', sql.TinyInt, source.days_per_week)
      .input('coachId', sql.Int, coachId)
      .input('rootProgramId', sql.Int, Number(source.root_program_id))
      .input('versionNumber', sql.Int, versionNumber)
      .input('clonedFromProgramId', sql.Int, programId)
      .query<{ id: number }>(`INSERT dbo.WorkoutPrograms(name,description,goal,difficulty,duration_weeks,days_per_week,owner_coach_id,created_by,is_active,root_program_id,version_number,lifecycle_status,cloned_from_program_id)
        OUTPUT INSERTED.id
        VALUES(@name,@description,@goal,@difficulty,@durationWeeks,@daysPerWeek,@coachId,@coachId,1,@rootProgramId,@versionNumber,N'DRAFT',@clonedFromProgramId)`);
    const cloneId = Number(created.recordset[0].id);
    const sourceDays = await new sql.Request(tx)
      .input('sourceProgramId', sql.Int, programId)
      .query<{ id: number; week_number: number; day_number: number; title: string; description: string | null; sort_order: number }>(`SELECT id,week_number,day_number,title,description,sort_order
        FROM dbo.WorkoutProgramDays WHERE program_id=@sourceProgramId ORDER BY sort_order,id`);
    const dayMap = new Map<number, number>();
    for (const day of sourceDays.recordset) {
      const createdDay = await new sql.Request(tx)
        .input('programId', sql.Int, cloneId)
        .input('weekNumber', sql.TinyInt, day.week_number)
        .input('dayNumber', sql.TinyInt, day.day_number)
        .input('title', sql.NVarChar(200), day.title)
        .input('description', sql.NVarChar(sql.MAX), day.description)
        .input('sortOrder', sql.SmallInt, day.sort_order)
        .query<{ id: number }>(`INSERT dbo.WorkoutProgramDays(program_id,week_number,day_number,title,description,sort_order)
          OUTPUT INSERTED.id VALUES(@programId,@weekNumber,@dayNumber,@title,@description,@sortOrder)`);
      dayMap.set(Number(day.id), Number(createdDay.recordset[0].id));
    }
    const sourceExercises = await new sql.Request(tx)
      .input('sourceProgramId', sql.Int, programId)
      .query<{ program_day_id: number; exercise_id: number; sort_order: number; target_sets: number | null; target_reps_min: number | null; target_reps_max: number | null; target_weight: number | null; target_duration_seconds: number | null; rest_seconds: number | null; tempo: string | null; coach_note: string | null }>(`SELECT pe.program_day_id,pe.exercise_id,pe.sort_order,pe.target_sets,pe.target_reps_min,pe.target_reps_max,pe.target_weight,pe.target_duration_seconds,pe.rest_seconds,pe.tempo,pe.coach_note
        FROM dbo.WorkoutProgramExercises pe JOIN dbo.WorkoutProgramDays d ON d.id=pe.program_day_id
        WHERE d.program_id=@sourceProgramId ORDER BY pe.program_day_id,pe.sort_order,pe.id`);
    for (const exercise of sourceExercises.recordset) {
      const newDayId = dayMap.get(Number(exercise.program_day_id));
      if (!newDayId) throw new AppError(500, 'Program version clone day mapping failed');
      await new sql.Request(tx)
        .input('dayId', sql.Int, newDayId)
        .input('exerciseId', sql.Int, exercise.exercise_id)
        .input('sortOrder', sql.SmallInt, exercise.sort_order)
        .input('targetSets', sql.TinyInt, exercise.target_sets)
        .input('targetRepsMin', sql.SmallInt, exercise.target_reps_min)
        .input('targetRepsMax', sql.SmallInt, exercise.target_reps_max)
        .input('targetWeight', sql.Decimal(8, 2), exercise.target_weight)
        .input('targetDurationSeconds', sql.Int, exercise.target_duration_seconds)
        .input('restSeconds', sql.Int, exercise.rest_seconds)
        .input('tempo', sql.NVarChar(40), exercise.tempo)
        .input('coachNote', sql.NVarChar(2000), exercise.coach_note)
        .query(`INSERT dbo.WorkoutProgramExercises(program_day_id,exercise_id,sort_order,target_sets,target_reps_min,target_reps_max,target_weight,target_duration_seconds,rest_seconds,tempo,coach_note)
          VALUES(@dayId,@exerciseId,@sortOrder,@targetSets,@targetRepsMin,@targetRepsMax,@targetWeight,@targetDurationSeconds,@restSeconds,@tempo,@coachNote)`);
    }
    const clone = await new sql.Request(tx).input('programId', sql.Int, cloneId).query(`SELECT ${programVersionSelect} FROM dbo.WorkoutPrograms WHERE id=@programId`);
    await tx.commit();
    return clone.recordset[0];
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    if (isUniqueConstraintError(error)) throw new AppError(409, 'Program version number already exists', 'PROGRAM_VERSION_CONFLICT');
    throw error;
  }
}

export async function archiveProgram(coachId: number, programId: number) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const current = await new sql.Request(tx)
      .input('programId', sql.Int, programId)
      .input('coachId', sql.Int, coachId)
      .query<{ lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }>(`SELECT lifecycle_status FROM dbo.WorkoutPrograms WITH (UPDLOCK,HOLDLOCK) WHERE id=@programId AND owner_coach_id=@coachId`);
    if (!current.recordset[0]) throw new AppError(404, 'Program not found');
    const updated = await new sql.Request(tx)
      .input('programId', sql.Int, programId)
      .input('coachId', sql.Int, coachId)
      .input('expectedLifecycle', sql.NVarChar(20), current.recordset[0].lifecycle_status)
      .query(`UPDATE dbo.WorkoutPrograms SET lifecycle_status=N'ARCHIVED',published_at=NULL,is_active=0,updated_at=SYSUTCDATETIME()
        OUTPUT INSERTED.id,INSERTED.name,INSERTED.description,INSERTED.goal,INSERTED.difficulty,INSERTED.duration_weeks,INSERTED.days_per_week,INSERTED.owner_coach_id,INSERTED.is_active,
               INSERTED.root_program_id,INSERTED.version_number,INSERTED.lifecycle_status,INSERTED.published_at,INSERTED.cloned_from_program_id,INSERTED.created_at,INSERTED.updated_at
        WHERE id=@programId AND owner_coach_id=@coachId AND lifecycle_status=@expectedLifecycle`);
    if (!updated.recordset[0]) throw new AppError(409, 'Program lifecycle changed before archive completed', 'PROGRAM_VERSION_CONFLICT');
    await tx.commit();
    return updated.recordset[0];
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    throw error;
  }
}

export async function createDay(coachId: number, programId: number, data: Record<string, unknown>) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  const weekNumber = Number(data.weekNumber); const dayNumber = Number(data.dayNumber);
  try {
    const program = await lockProgramDraft(tx, coachId, programId);
    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > program.duration_weeks || !Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) throw new AppError(400, 'Program Day week/day is out of range');
    const result = await new sql.Request(tx)
      .input('programId', sql.Int, programId)
      .input('weekNumber', sql.TinyInt, weekNumber)
      .input('dayNumber', sql.TinyInt, dayNumber)
      .input('title', sql.NVarChar(200), data.title)
      .input('description', sql.NVarChar(sql.MAX), data.description ?? null)
      .query(`INSERT dbo.WorkoutProgramDays(program_id,week_number,day_number,title,description,sort_order)
        OUTPUT INSERTED.*
        SELECT @programId,@weekNumber,@dayNumber,@title,@description,COALESCE(MAX(sort_order),-1)+1
        FROM dbo.WorkoutProgramDays WHERE program_id=@programId`);
    await tx.commit();
    return result.recordset[0];
  } catch (error) { try { await tx.rollback(); } catch {} if (isUniqueConstraintError(error)) throw new AppError(409, 'Program Day week/day already exists', 'PROGRAM_DAY_POSITION_CONFLICT'); throw error; }
}

export async function updateDay(coachId: number, dayId: number, data: Record<string, unknown>) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  const weekNumber = Number(data.weekNumber); const dayNumber = Number(data.dayNumber);
  try {
    const current = await lockDayDraft(tx, coachId, dayId);
    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > Number(current.duration_weeks) || !Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) throw new AppError(400, 'Program Day week/day is out of range');
    if (Number(current.week_number) !== weekNumber || Number(current.day_number) !== dayNumber) {
      const scheduled = await new sql.Request(tx).input('dayId', sql.Int, dayId).query<{ count: number }>('SELECT COUNT(*) AS count FROM dbo.CoachProgramSchedules WHERE program_day_id=@dayId');
      if (Number(scheduled.recordset[0].count) > 0) throw new AppError(409, 'Program Day position is locked after scheduling', 'PROGRAM_DAY_POSITION_LOCKED');
    }
    const result = await new sql.Request(tx)
      .input('weekNumber', sql.TinyInt, weekNumber)
      .input('dayNumber', sql.TinyInt, dayNumber)
      .input('title', sql.NVarChar(200), data.title)
      .input('description', sql.NVarChar(sql.MAX), data.description ?? null)
      .input('dayId', sql.Int, dayId)
      .query(`UPDATE dbo.WorkoutProgramDays SET week_number=@weekNumber,day_number=@dayNumber,title=@title,description=@description,updated_at=SYSUTCDATETIME()
        OUTPUT INSERTED.* WHERE id=@dayId`);
    if (!result.recordset[0]) throw new AppError(409, 'Program Day changed before update completed', 'PROGRAM_VERSION_CONFLICT');
    await tx.commit();
    return result.recordset[0];
  } catch (error) { try { await tx.rollback(); } catch {} if (isUniqueConstraintError(error)) throw new AppError(409, 'Program Day week/day already exists', 'PROGRAM_DAY_POSITION_CONFLICT'); throw error; }
}

export async function deleteDay(coachId: number, dayId: number) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    await lockDayDraft(tx, coachId, dayId);
    await new sql.Request(tx).input('dayId', sql.Int, dayId).query('DELETE FROM dbo.WorkoutProgramDays WHERE id=@dayId');
    await tx.commit();
  } catch (error) {
    try { await tx.rollback(); } catch {}
    if ((error as { number?: number }).number === 547) throw new AppError(409, 'Program day is referenced by a schedule');
    throw error;
  }
}

async function reorder(tx: sql.Transaction, table: string, parentColumn: string, parentId: number, ids: number[], ownerCoachId: number, joinTable: string, joinColumn: string) {
  const valid = await new sql.Request(tx).input('parentId', sql.Int, parentId).input('ownerCoachId', sql.Int, ownerCoachId).query(`SELECT child.id FROM dbo.${table} child JOIN dbo.${joinTable} parent ON parent.id=child.${joinColumn} AND parent.owner_coach_id=@ownerCoachId WHERE child.${parentColumn}=@parentId`);
  const allowed = valid.recordset.map((row: { id: number }) => Number(row.id));
  if (ids.length !== allowed.length || ids.some(id => !allowed.includes(id))) throw new AppError(400, 'Order must contain exactly the current items');
  const unique = new Set(ids); if (unique.size !== ids.length) throw new AppError(400, 'Order contains duplicate IDs');
  await new sql.Request(tx).input('parentId', sql.Int, parentId).query(`UPDATE dbo.${table} SET sort_order=sort_order+10000 WHERE ${parentColumn}=@parentId`);
  for (let index = 0; index < ids.length; index += 1) await new sql.Request(tx).input('id', sql.Int, ids[index]).input('sortOrder', sql.Int, index).query(`UPDATE dbo.${table} SET sort_order=@sortOrder,updated_at=SYSUTCDATETIME() WHERE id=@id`);
}

export async function reorderDays(coachId: number, programId: number, ids: number[]) {
  const tx = (await getPool()).transaction(); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try { await reorder(tx, 'WorkoutProgramDays', 'program_id', programId, ids, coachId, 'WorkoutPrograms', 'program_id'); await tx.commit(); }
  catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

export async function createProgramExercise(coachId: number, dayId: number, data: Record<string, unknown>) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    await lockDayDraft(tx, coachId, dayId);
    const active = await new sql.Request(tx).input('exerciseId', sql.Int, Number(data.exerciseId)).query('SELECT id FROM dbo.Exercises WHERE id=@exerciseId AND is_active=1');
    if (!active.recordset[0]) throw new AppError(400, 'Exercise must be active');
    const result = await new sql.Request(tx)
      .input('dayId', sql.Int, dayId)
      .input('exerciseId', sql.Int, Number(data.exerciseId))
      .input('targetSets', sql.TinyInt, data.targetSets ?? null)
      .input('targetRepsMin', sql.SmallInt, data.targetRepsMin ?? null)
      .input('targetRepsMax', sql.SmallInt, data.targetRepsMax ?? null)
      .input('targetWeight', sql.Decimal(8, 2), data.targetWeight ?? null)
      .input('targetDurationSeconds', sql.Int, data.targetDurationSeconds ?? null)
      .input('restSeconds', sql.Int, data.restSeconds ?? null)
      .input('tempo', sql.NVarChar(40), data.tempo ?? null)
      .input('coachNote', sql.NVarChar(2000), data.coachNote ?? null)
      .query(`INSERT dbo.WorkoutProgramExercises(program_day_id,exercise_id,sort_order,target_sets,target_reps_min,target_reps_max,target_weight,target_duration_seconds,rest_seconds,tempo,coach_note)
        OUTPUT INSERTED.*
        SELECT @dayId,@exerciseId,COALESCE(MAX(sort_order),-1)+1,@targetSets,@targetRepsMin,@targetRepsMax,@targetWeight,@targetDurationSeconds,@restSeconds,@tempo,@coachNote
        FROM dbo.WorkoutProgramExercises WHERE program_day_id=@dayId`);
    await tx.commit();
    return result.recordset[0];
  } catch (error) { try { await tx.rollback(); } catch {} if (isUniqueConstraintError(error)) throw new AppError(409, 'Exercise is already present in this Program Day', 'PROGRAM_EXERCISE_CONFLICT'); throw error; }
}

export async function updateProgramExercise(coachId: number, id: number, data: Record<string, unknown>) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const current = await lockProgramExerciseDraft(tx, coachId, id);
    const merged: {
      targetSets: number | null;
      targetRepsMin: number | null;
      targetRepsMax: number | null;
      targetWeight: number | null;
      targetDurationSeconds: number | null;
      restSeconds: number | null;
      tempo: string | null;
      coachNote: string | null;
    } = {
      targetSets: data.targetSets === undefined ? current.target_sets : data.targetSets as number | null,
      targetRepsMin: data.targetRepsMin === undefined ? current.target_reps_min : data.targetRepsMin as number | null,
      targetRepsMax: data.targetRepsMax === undefined ? current.target_reps_max : data.targetRepsMax as number | null,
      targetWeight: data.targetWeight === undefined ? current.target_weight : data.targetWeight as number | null,
      targetDurationSeconds: data.targetDurationSeconds === undefined ? current.target_duration_seconds : data.targetDurationSeconds as number | null,
      restSeconds: data.restSeconds === undefined ? current.rest_seconds : data.restSeconds as number | null,
      tempo: data.tempo === undefined ? current.tempo : data.tempo as string | null,
      coachNote: data.coachNote === undefined ? current.coach_note : data.coachNote as string | null,
    };
    assertMergedExerciseTargets(merged);
    const result = await new sql.Request(tx)
      .input('id', sql.Int, id)
      .input('targetSets', sql.TinyInt, merged.targetSets ?? null)
      .input('targetRepsMin', sql.SmallInt, merged.targetRepsMin ?? null)
      .input('targetRepsMax', sql.SmallInt, merged.targetRepsMax ?? null)
      .input('targetWeight', sql.Decimal(8, 2), merged.targetWeight ?? null)
      .input('targetDurationSeconds', sql.Int, merged.targetDurationSeconds ?? null)
      .input('restSeconds', sql.Int, merged.restSeconds ?? null)
      .input('tempo', sql.NVarChar(40), merged.tempo ?? null)
      .input('coachNote', sql.NVarChar(2000), merged.coachNote ?? null)
      .query(`UPDATE dbo.WorkoutProgramExercises SET target_sets=@targetSets,target_reps_min=@targetRepsMin,target_reps_max=@targetRepsMax,target_weight=@targetWeight,target_duration_seconds=@targetDurationSeconds,rest_seconds=@restSeconds,tempo=@tempo,coach_note=@coachNote,updated_at=SYSUTCDATETIME()
        OUTPUT INSERTED.* WHERE id=@id`);
    if (!result.recordset[0]) throw new AppError(409, 'Program exercise changed before update completed', 'PROGRAM_VERSION_CONFLICT');
    await tx.commit();
    return result.recordset[0];
  } catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

export async function deleteProgramExercise(coachId: number, id: number) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    await lockProgramExerciseDraft(tx, coachId, id);
    await new sql.Request(tx).input('id', sql.Int, id).query('DELETE FROM dbo.WorkoutProgramExercises WHERE id=@id');
    await tx.commit();
  } catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

export async function reorderProgramExercises(coachId: number, dayId: number, ids: number[]) {
  const tx = (await getPool()).transaction(); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    await lockDayDraft(tx, coachId, dayId);
    const valid = await new sql.Request(tx).input('dayId', sql.Int, dayId).input('coachId', sql.Int, coachId).query(`SELECT pe.id FROM dbo.WorkoutProgramExercises pe JOIN dbo.WorkoutProgramDays d ON d.id=pe.program_day_id JOIN dbo.WorkoutPrograms p ON p.id=d.program_id AND p.owner_coach_id=@coachId WHERE pe.program_day_id=@dayId`);
    const allowed = valid.recordset.map((row: { id: number }) => Number(row.id)); const unique = new Set(ids); if (ids.length !== allowed.length || unique.size !== ids.length || ids.some(item => !allowed.includes(item))) throw new AppError(400, 'Order must contain exactly the current items');
    await new sql.Request(tx).input('dayId', sql.Int, dayId).query('UPDATE dbo.WorkoutProgramExercises SET sort_order=sort_order+10000 WHERE program_day_id=@dayId');
    for (let index = 0; index < ids.length; index += 1) await new sql.Request(tx).input('id', sql.Int, ids[index]).input('sortOrder', sql.Int, index).query('UPDATE dbo.WorkoutProgramExercises SET sort_order=@sortOrder,updated_at=SYSUTCDATETIME() WHERE id=@id');
    await tx.commit();
  }
  catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

export async function listMembers(coachId: number, page: number, limit: number, q?: string) {
  const params: Record<string, unknown> = { coachId, offset: (page - 1) * limit, limit }; const search = q ? ' AND (u.name LIKE @q OR u.email LIKE @q)' : ''; if (q) params.q = `%${q}%`;
  const [rows, count] = await Promise.all([
    query(`SELECT c.user_id AS id,u.name,u.email,u.phone,u.avatar_url,c.last_contact_at,c.created_at AS assigned_at FROM dbo.CRMCustomers c JOIN dbo.Users u ON u.id=c.user_id WHERE c.assigned_coach_id=@coachId AND u.role=N'member' AND u.is_active=1${search} ORDER BY u.name,u.id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total FROM dbo.CRMCustomers c JOIN dbo.Users u ON u.id=c.user_id WHERE c.assigned_coach_id=@coachId AND u.role=N'member' AND u.is_active=1${search}`, params),
  ]);
  return { items: rows.recordset, page, limit, total: Number(count.recordset[0].total), totalPages: Math.ceil(Number(count.recordset[0].total) / limit) };
}

export async function getMember(coachId: number, memberId: number) {
  const member = await assertMemberScope(coachId, memberId);
  const [assignment, sessionCount] = await Promise.all([
    query(`SELECT TOP 1 a.id,a.program_id,a.coach_id,a.start_date,a.end_date,a.status,a.schedule_timezone,a.note,p.name AS program_name FROM dbo.CoachProgramAssignments a JOIN dbo.WorkoutPrograms p ON p.id=a.program_id WHERE a.member_id=@memberId AND a.coach_id=@coachId ORDER BY CASE WHEN a.status=N'ACTIVE' THEN 0 ELSE 1 END,a.updated_at DESC`, { memberId, coachId }),
    query(`SELECT (SELECT COUNT(*) FROM dbo.WorkoutSessions ws JOIN dbo.Workouts w ON w.id=ws.workout_id AND w.coach_id=@coachId WHERE ws.user_id=@memberId)+(SELECT COUNT(*) FROM dbo.MemberWorkoutSessions ms JOIN dbo.CoachProgramAssignments a ON a.id=ms.assignment_id AND a.coach_id=@coachId WHERE ms.member_id=@memberId) AS count`, { memberId, coachId }),
  ]);
  return { ...member, currentAssignment: assignment.recordset[0] ?? null, sessionCount: Number(sessionCount.recordset[0].count), sessionDataAvailable: true };
}

function mapCoachMemberContext(row: CoachMemberContextRow): CoachMemberContext {
  return {
    id: Number(row.id),
    coach_id: Number(row.coach_id),
    member_id: Number(row.member_id),
    goal: row.goal ?? null,
    limitations: row.limitations ?? null,
    private_note: row.private_note ?? null,
    next_review_date: row.next_review_date ? String(row.next_review_date).slice(0, 10) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function readContext(executor: sql.ConnectionPool | sql.Transaction, coachId: number, memberId: number): Promise<CoachMemberContextRow | null> {
  const result = await requestFor(executor)
    .input('contextCoachId', sql.Int, coachId)
    .input('contextMemberId', sql.Int, memberId)
    .query<CoachMemberContextRow>(`SELECT id,coach_id,member_id,goal,limitations,private_note,
        CONVERT(NVARCHAR(10),next_review_date,23) AS next_review_date,
        CONVERT(NVARCHAR(33),created_at,126) AS created_at,
        CONVERT(NVARCHAR(33),updated_at,126) AS updated_at
      FROM dbo.CoachMemberContexts
      WHERE coach_id=@contextCoachId AND member_id=@contextMemberId`);
  return result.recordset[0] ?? null;
}

async function currentMemberCoach(executor: sql.ConnectionPool | sql.Transaction, memberId: number): Promise<{ assigned_coach_id: number | null } | null> {
  const result = await requestFor(executor)
    .input('contextMemberId', sql.Int, memberId)
    .query<{ assigned_coach_id: number | null }>(`SELECT c.assigned_coach_id
      FROM dbo.CRMCustomers c WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Users u ON u.id=c.user_id
      WHERE c.user_id=@contextMemberId AND u.role=N'member' AND u.is_active=1`);
  return result.recordset[0] ? { assigned_coach_id: result.recordset[0].assigned_coach_id === null ? null : Number(result.recordset[0].assigned_coach_id) } : null;
}

export async function getMemberContext(coachId: number, memberId: number) {
  const pool = await getPool();
  const current = await currentMemberCoach(pool, memberId);
  const context = await readContext(pool, coachId, memberId);
  if (!current || (!context && current.assigned_coach_id !== coachId)) throw new AppError(404, 'Member context not found');
  return {
    context: context ? mapCoachMemberContext(context) : null,
    readOnly: current.assigned_coach_id !== coachId,
    currentCoachId: current.assigned_coach_id,
  };
}

export async function updateMemberContext(coachId: number, memberId: number, input: {
  goal?: unknown;
  limitations?: unknown;
  privateNote?: unknown;
  nextReviewDate?: unknown;
  expectedUpdatedAt?: unknown;
}) {
  const pool = await getPool();
  const tx = pool.transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const current = await currentMemberCoach(tx, memberId);
    if (!current) throw new AppError(404, 'Member not found');
    if (current.assigned_coach_id !== coachId) {
      const oldContext = await readContext(tx, coachId, memberId);
      if (oldContext) throw new AppError(403, 'Previous Coach context is read-only after reassignment', 'COACH_CONTEXT_READ_ONLY');
      throw new AppError(404, 'Member not found');
    }

    const existing = await readContext(tx, coachId, memberId);
    const goal = input.goal === undefined ? existing?.goal ?? null : nullableText(input.goal, 2000);
    const limitations = input.limitations === undefined ? existing?.limitations ?? null : nullableText(input.limitations, 2000);
    const privateNote = input.privateNote === undefined ? existing?.private_note ?? null : nullableText(input.privateNote, 4000);
    const nextReviewDate = input.nextReviewDate === undefined
      ? existing?.next_review_date ?? null
      : input.nextReviewDate === null || input.nextReviewDate === '' ? null : dateOnly(input.nextReviewDate);
    const expectedUpdatedAt = input.expectedUpdatedAt === undefined || input.expectedUpdatedAt === null
      ? null
      : String(input.expectedUpdatedAt).trim();

    if (existing) {
      if (!expectedUpdatedAt) throw new AppError(409, 'Context version is required for update', 'COACH_CONTEXT_VERSION_REQUIRED');
      const updated = await new sql.Request(tx)
        .input('contextId', sql.Int, existing.id)
        .input('expectedUpdatedAt', sql.NVarChar(33), expectedUpdatedAt)
        .input('goal', sql.NVarChar(2000), goal)
        .input('limitations', sql.NVarChar(2000), limitations)
        .input('privateNote', sql.NVarChar(4000), privateNote)
        .input('nextReviewDate', sql.Date, nextReviewDate)
        .query(`UPDATE dbo.CoachMemberContexts
          SET goal=@goal,limitations=@limitations,private_note=@privateNote,next_review_date=@nextReviewDate,updated_at=SYSUTCDATETIME()
          WHERE id=@contextId AND CONVERT(NVARCHAR(33),updated_at,126)=@expectedUpdatedAt`);
      if (updated.rowsAffected[0] !== 1) throw new AppError(409, 'Member context was changed by another request', 'COACH_CONTEXT_CONFLICT');
    } else {
      if (expectedUpdatedAt) throw new AppError(409, 'Member context was created by another request', 'COACH_CONTEXT_CONFLICT');
      try {
        await new sql.Request(tx)
          .input('contextCoachId', sql.Int, coachId)
          .input('contextMemberId', sql.Int, memberId)
          .input('goal', sql.NVarChar(2000), goal)
          .input('limitations', sql.NVarChar(2000), limitations)
          .input('privateNote', sql.NVarChar(4000), privateNote)
          .input('nextReviewDate', sql.Date, nextReviewDate)
          .query(`INSERT dbo.CoachMemberContexts(coach_id,member_id,goal,limitations,private_note,next_review_date)
            VALUES(@contextCoachId,@contextMemberId,@goal,@limitations,@privateNote,@nextReviewDate)`);
      } catch (error) {
        if (isUniqueConstraintError(error)) throw new AppError(409, 'Member context was created by another request', 'COACH_CONTEXT_CONFLICT');
        throw error;
      }
    }
    const saved = await readContext(tx, coachId, memberId);
    await tx.commit();
    if (!saved) throw new AppError(500, 'Member context could not be read after save');
    return { context: mapCoachMemberContext(saved), readOnly: false, currentCoachId: coachId };
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    throw error;
  }
}

export async function listAssignments(coachId: number, page: number, limit: number, memberId?: number) {
  const params: Record<string, unknown> = { coachId, offset: (page - 1) * limit, limit }; const member = memberId ? ' AND a.member_id=@memberId' : ''; if (memberId) { await assertMemberScope(coachId, memberId); params.memberId = memberId; }
  const scope = `a.coach_id=@coachId AND c.assigned_coach_id=@coachId AND u.role=N'member' AND u.is_active=1`;
  const [rows, count] = await Promise.all([
    query(`SELECT a.id,a.member_id,a.program_id,a.coach_id,a.assigned_by,a.start_date,a.end_date,a.status,a.schedule_timezone,a.note,a.created_at,a.updated_at,
                   p.name AS program_name,p.root_program_id,p.version_number,p.lifecycle_status,u.name AS member_name
            FROM dbo.CoachProgramAssignments a JOIN dbo.CRMCustomers c ON c.user_id=a.member_id JOIN dbo.Users u ON u.id=a.member_id JOIN dbo.WorkoutPrograms p ON p.id=a.program_id
            WHERE ${scope}${member} ORDER BY a.updated_at DESC,a.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total FROM dbo.CoachProgramAssignments a JOIN dbo.CRMCustomers c ON c.user_id=a.member_id JOIN dbo.Users u ON u.id=a.member_id WHERE ${scope}${member}`, params),
  ]);
  return { items: rows.recordset, page, limit, total: Number(count.recordset[0].total), totalPages: Math.ceil(Number(count.recordset[0].total) / limit) };
}

export async function createAssignment(coachId: number, data: Record<string, unknown>) {
  await assertMemberScope(coachId, Number(data.memberId));
  const ownedProgram = await assertProgramOwner(coachId, Number(data.programId));
  if (ownedProgram.lifecycle_status !== 'PUBLISHED' || !ownedProgram.is_active) throw new AppError(409, 'Only an active Published Program version can be assigned', 'PROGRAM_ASSIGNMENT_REQUIRES_PUBLISHED');
  const startDate = dateOnly(data.startDate); const endDate = data.endDate ? dateOnly(data.endDate) : null; if (endDate && endDate < startDate) throw new AppError(400, 'endDate must be on or after startDate');
  assertTimeZone(String(data.scheduleTimezone));
  const tx = (await getPool()).transaction(); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const active = await new sql.Request(tx).input('memberId', sql.Int, Number(data.memberId)).query(`SELECT id FROM dbo.CoachProgramAssignments WITH (UPDLOCK,HOLDLOCK) WHERE member_id=@memberId AND status=N'ACTIVE'`);
    if (active.recordset[0]) throw new AppError(409, 'Member already has an active assignment');
    const program = await new sql.Request(tx).input('programId', sql.Int, Number(data.programId)).input('coachId', sql.Int, coachId).query(`SELECT id FROM dbo.WorkoutPrograms WITH (UPDLOCK,HOLDLOCK) WHERE id=@programId AND owner_coach_id=@coachId AND is_active=1 AND lifecycle_status=N'PUBLISHED'`);
    if (!program.recordset[0]) throw new AppError(409, 'Only an active Published Program version can be assigned', 'PROGRAM_ASSIGNMENT_REQUIRES_PUBLISHED');
    const result = await new sql.Request(tx).input('memberId', sql.Int, Number(data.memberId)).input('programId', sql.Int, Number(data.programId)).input('coachId', sql.Int, coachId).input('startDate', sql.Date, startDate).input('endDate', sql.Date, endDate).input('status', sql.NVarChar(20), 'ACTIVE').input('timezone', sql.NVarChar(64), String(data.scheduleTimezone)).input('note', sql.NVarChar(2000), data.note ?? null).query(`INSERT dbo.CoachProgramAssignments(member_id,program_id,coach_id,assigned_by,start_date,end_date,status,schedule_timezone,note) OUTPUT INSERTED.* VALUES(@memberId,@programId,@coachId,@coachId,@startDate,@endDate,@status,@timezone,@note)`);
    const assignment = result.recordset[0];
    await createNotification(tx, {
      recipientUserId: Number(assignment.member_id),
      type: 'ASSIGNMENT_CREATED',
      title: 'New workout assignment',
      message: 'Your Coach assigned a new workout program.',
      actionUrl: '/workouts',
      deduplicationKey: `assignment:${Number(assignment.id)}:created`,
    });
    await tx.commit(); return assignment;
  } catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

const transitions: Record<string, string[]> = { PAUSED: ['ACTIVE', 'COMPLETED', 'CANCELLED'], ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'] };
export async function transitionAssignment(coachId: number, assignmentId: number, nextStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED') {
  const tx = (await getPool()).transaction(); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const current = await new sql.Request(tx)
      .input('assignmentId', sql.Int, assignmentId)
      .input('coachId', sql.Int, coachId)
      .query<{ id: number; member_id: number; status: string; schedule_timezone: string }>(`SELECT a.id,a.member_id,a.status,a.schedule_timezone
        FROM dbo.CoachProgramAssignments a WITH (UPDLOCK,HOLDLOCK)
        JOIN dbo.CRMCustomers c ON c.user_id=a.member_id AND c.assigned_coach_id=@coachId
        JOIN dbo.Users u ON u.id=a.member_id AND u.role=N'member' AND u.is_active=1
        WHERE a.id=@assignmentId AND a.coach_id=@coachId`);
    const assignment = current.recordset[0];
    if (!assignment) throw new AppError(404, 'Assignment not found');
    if (!transitions[assignment.status]?.includes(nextStatus)) throw new AppError(409, `Cannot transition ${assignment.status} to ${nextStatus}`);
    if (nextStatus === 'ACTIVE') {
      const other = await new sql.Request(tx)
        .input('memberId', sql.Int, Number(assignment.member_id))
        .input('assignmentId', sql.Int, assignmentId)
        .query(`SELECT TOP 1 id FROM dbo.CoachProgramAssignments WITH (UPDLOCK,HOLDLOCK) WHERE member_id=@memberId AND status=N'ACTIVE' AND id<>@assignmentId`);
      if (other.recordset[0]) throw new AppError(409, 'Member already has another active assignment');
    }
    const result = await new sql.Request(tx)
      .input('status', sql.NVarChar(20), nextStatus)
      .input('assignmentId', sql.Int, assignmentId)
      .input('coachId', sql.Int, coachId)
      .input('expectedStatus', sql.NVarChar(20), assignment.status)
      .query(`UPDATE dbo.CoachProgramAssignments SET status=@status,updated_at=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE id=@assignmentId AND coach_id=@coachId AND status=@expectedStatus`);
    if (!result.recordset[0]) throw new AppError(409, 'Assignment changed before transition completed');
    if (nextStatus === 'COMPLETED' || nextStatus === 'CANCELLED') {
      await new sql.Request(tx)
        .input('assignmentId', sql.Int, assignmentId)
        .query(`UPDATE dbo.CoachProgramSchedules SET status=N'CANCELLED',updated_at=SYSUTCDATETIME() WHERE assignment_id=@assignmentId AND status=N'SCHEDULED'`);
    }
    await createNotification(tx, {
      recipientUserId: Number(assignment.member_id),
      type: 'ASSIGNMENT_STATUS',
      title: 'Workout assignment updated',
      message: `Your workout assignment is now ${nextStatus}.`,
      actionUrl: '/workouts',
      deduplicationKey: `assignment:${assignmentId}:status:${nextStatus}`,
    });
    await tx.commit(); return result.recordset[0];
  } catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

export async function listSchedules(coachId: number, page: number, limit: number, memberId?: number, fromDate?: string, toDate?: string) {
  const params: Record<string, unknown> = { coachId, offset: (page - 1) * limit, limit }; let extra = ''; if (memberId) { await assertMemberScope(coachId, memberId); extra += ' AND a.member_id=@memberId'; params.memberId = memberId; } if (fromDate) { params.fromDate = dateOnly(fromDate); extra += ' AND s.scheduled_date>=@fromDate'; } if (toDate) { params.toDate = dateOnly(toDate); extra += ' AND s.scheduled_date<=@toDate'; }
  const scope = `a.coach_id=@coachId AND c.assigned_coach_id=@coachId AND u.role=N'member' AND u.is_active=1`;
  const [rows, count] = await Promise.all([
    query(`SELECT s.id,s.assignment_id,s.program_day_id,s.scheduled_date,s.status,s.created_at,s.updated_at,a.member_id,a.program_id,a.status AS assignment_status,a.schedule_timezone,p.name AS program_name,u.name AS member_name,d.week_number,d.day_number,d.title AS day_title FROM dbo.CoachProgramSchedules s JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id JOIN dbo.CRMCustomers c ON c.user_id=a.member_id JOIN dbo.Users u ON u.id=a.member_id JOIN dbo.WorkoutPrograms p ON p.id=a.program_id JOIN dbo.WorkoutProgramDays d ON d.id=s.program_day_id WHERE ${scope}${extra} ORDER BY s.scheduled_date,s.id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total FROM dbo.CoachProgramSchedules s JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id JOIN dbo.CRMCustomers c ON c.user_id=a.member_id JOIN dbo.Users u ON u.id=a.member_id WHERE ${scope}${extra}`, params),
  ]); return { items: rows.recordset, page, limit, total: Number(count.recordset[0].total), totalPages: Math.ceil(Number(count.recordset[0].total) / limit) };
}

const daysBetween = (from: string, to: string): number => {
  const fromMs = new Date(`${from}T00:00:00Z`).getTime();
  const toMs = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((toMs - fromMs) / 86400000);
};

export async function generateSchedules(coachId: number, assignmentId: number, input: { fromDate?: string; horizonDays: number }) {
  const assignment = await assertAssignment(coachId, assignmentId);
  if (assignment.status !== 'ACTIVE') throw new AppError(409, 'Only active assignments can generate schedules');
  assertTimeZone(assignment.schedule_timezone);

  const assignmentStart = datePart(assignment.start_date);
  const assignmentEnd = assignment.end_date ? datePart(assignment.end_date) : null;
  const programEnd = Number(assignment.duration_weeks) > 0
    ? addDays(assignmentStart, Number(assignment.duration_weeks) * 7 - 1)
    : null;
  const requestedFrom = input.fromDate ? dateOnly(input.fromDate) : todayInTimeZone(assignment.schedule_timezone);
  const today = todayInTimeZone(assignment.schedule_timezone);
  const from = [requestedFrom, assignmentStart, today].sort().at(-1)!;
  const horizonEnd = addDays(from, input.horizonDays - 1);
  const boundedEnd = [horizonEnd, assignmentEnd, programEnd].filter((value): value is string => Boolean(value)).sort()[0] ?? horizonEnd;
  if (boundedEnd < from) throw new AppError(409, 'No schedule dates remain within assignment and program bounds');
  const effectiveHorizonDays = daysBetween(from, boundedEnd) + 1;
  const days = await query(`SELECT id,week_number,day_number FROM dbo.WorkoutProgramDays WHERE program_id=@programId ORDER BY week_number,day_number,sort_order`, { programId: assignment.program_id });
  const tx = (await getPool()).transaction(); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  let inserted = 0;
  let skipped = 0;
  let skippedExisting = 0;
  let skippedOutsideAssignment = 0;
  let skippedOutsideProgram = 0;
  try {
    for (let offset = 0; offset < input.horizonDays; offset += 1) {
      const scheduledDate = addDays(from, offset);
      if (assignmentEnd && scheduledDate > assignmentEnd) {
        skipped += 1;
        skippedOutsideAssignment += 1;
        continue;
      }
      if (programEnd && scheduledDate > programEnd) {
        skipped += 1;
        skippedOutsideProgram += 1;
        continue;
      }
      const week = Math.floor(daysBetween(assignmentStart, scheduledDate) / 7) + 1;
      const dayNumber = mondayDay(scheduledDate);
      const day = days.recordset.find(row => Number(row.week_number) === week && Number(row.day_number) === dayNumber);
      if (!day) { skipped += 1; continue; }
      const result = await new sql.Request(tx)
        .input('assignmentId', sql.Int, assignmentId)
        .input('dayId', sql.Int, Number(day.id))
        .input('scheduledDate', sql.Date, scheduledDate)
        .query(`IF NOT EXISTS (SELECT 1 FROM dbo.CoachProgramSchedules WITH (UPDLOCK,HOLDLOCK) WHERE assignment_id=@assignmentId AND program_day_id=@dayId AND scheduled_date=@scheduledDate)
                BEGIN INSERT dbo.CoachProgramSchedules(assignment_id,program_day_id,scheduled_date) VALUES(@assignmentId,@dayId,@scheduledDate); SELECT 1 AS inserted; END
                ELSE SELECT 0 AS inserted`);
      const wasInserted = Number(result.recordset[0].inserted);
      inserted += wasInserted;
      if (!wasInserted) {
        skipped += 1;
        skippedExisting += 1;
      }
    }
    if (inserted > 0) {
      await createNotification(tx, {
        recipientUserId: Number(assignment.member_id),
        type: 'SCHEDULE_GENERATED',
        title: 'Workout schedule updated',
        message: `${inserted} new workout schedule item${inserted === 1 ? '' : 's'} is ready.`,
        actionUrl: '/workouts',
        deduplicationKey: `assignment:${assignmentId}:schedules:${from}:${boundedEnd}`,
      });
    }
    await tx.commit();
    return {
      inserted,
      skipped,
      skippedExisting,
      skippedOutsideAssignment,
      skippedOutsideProgram,
      requestedFromDate: requestedFrom,
      fromDate: from,
      toDate: boundedEnd,
      effectiveFromDate: from,
      effectiveToDate: boundedEnd,
      horizonDays: effectiveHorizonDays,
    };
  } catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

export async function reschedule(coachId: number, scheduleId: number, scheduledDate: string) {
  const date = dateOnly(scheduledDate);
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const schedule = await lockScheduleForMutation(tx, coachId, scheduleId);
    assertTimeZone(schedule.schedule_timezone);
    const today = todayInTimeZone(schedule.schedule_timezone);
    const assignmentStart = datePart(schedule.assignment_start_date);
    const assignmentEnd = schedule.assignment_end_date ? datePart(schedule.assignment_end_date) : null;
    const programEnd = Number(schedule.program_duration_weeks) > 0
      ? addDays(assignmentStart, Number(schedule.program_duration_weeks) * 7 - 1)
      : null;
    if (schedule.status !== 'SCHEDULED' || schedule.assignment_status !== 'ACTIVE' || date < today) {
      throw new AppError(409, 'Only future scheduled items on active assignments can be rescheduled');
    }
    if (date < assignmentStart || (assignmentEnd && date > assignmentEnd) || (programEnd && date > programEnd)) {
      throw new AppError(409, 'Rescheduled date is outside assignment or program bounds', 'SCHEDULE_DATE_OUT_OF_BOUNDS');
    }

    const exactConflict = await new sql.Request(tx)
      .input('conflictAssignmentId', sql.Int, schedule.assignment_id)
      .input('conflictProgramDayId', sql.Int, schedule.program_day_id)
      .input('conflictDate', sql.Date, date)
      .input('conflictScheduleId', sql.Int, scheduleId)
      .query<{ id: number }>(
        `SELECT TOP 1 id FROM dbo.CoachProgramSchedules WITH (UPDLOCK,HOLDLOCK)
         WHERE assignment_id=@conflictAssignmentId AND program_day_id=@conflictProgramDayId
           AND scheduled_date=@conflictDate AND id<>@conflictScheduleId`,
      );
    if (exactConflict.recordset[0]) throw new AppError(409, 'A schedule already exists for the selected date', 'SCHEDULE_DATE_CONFLICT');

    const dayConflict = await new sql.Request(tx)
      .input('dayConflictAssignmentId', sql.Int, schedule.assignment_id)
      .input('dayConflictDate', sql.Date, date)
      .input('dayConflictScheduleId', sql.Int, scheduleId)
      .query<{ id: number }>(
        `SELECT TOP 1 id FROM dbo.CoachProgramSchedules WITH (UPDLOCK,HOLDLOCK)
         WHERE assignment_id=@dayConflictAssignmentId AND scheduled_date=@dayConflictDate
           AND id<>@dayConflictScheduleId AND status<>N'CANCELLED'`,
      );
    if (dayConflict.recordset[0]) throw new AppError(409, 'The assignment already has a schedule on the selected date', 'SCHEDULE_DATE_CONFLICT');

    const result = await new sql.Request(tx)
      .input('scheduledDate', sql.Date, date)
      .input('scheduleId', sql.Int, scheduleId)
      .query<LockedSchedule>(
        `UPDATE dbo.CoachProgramSchedules
         SET scheduled_date=@scheduledDate,updated_at=SYSUTCDATETIME()
         OUTPUT INSERTED.*
         WHERE id=@scheduleId AND status=N'SCHEDULED'`,
      );
    if (!result.recordset[0]) throw new AppError(409, 'Schedule changed before reschedule completed', 'SCHEDULE_VERSION_CONFLICT');
    await tx.commit();
    return result.recordset[0];
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    if ((error as { number?: number }).number === 2601 || (error as { number?: number }).number === 2627) {
      throw new AppError(409, 'A schedule already exists for the selected date', 'SCHEDULE_DATE_CONFLICT');
    }
    throw error;
  }
}

export async function cancelSchedule(coachId: number, scheduleId: number) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const schedule = await lockScheduleForMutation(tx, coachId, scheduleId);
    assertTimeZone(schedule.schedule_timezone);
    if (schedule.status !== 'SCHEDULED' || schedule.assignment_status !== 'ACTIVE' || datePart(schedule.scheduled_date) < todayInTimeZone(schedule.schedule_timezone)) {
      throw new AppError(409, 'Only future scheduled items on active assignments can be cancelled');
    }
    const result = await new sql.Request(tx)
      .input('scheduleId', sql.Int, scheduleId)
      .query<LockedSchedule>(
        `UPDATE dbo.CoachProgramSchedules SET status=N'CANCELLED',updated_at=SYSUTCDATETIME()
         OUTPUT INSERTED.* WHERE id=@scheduleId AND status=N'SCHEDULED'`,
      );
    if (!result.recordset[0]) throw new AppError(409, 'Schedule changed before cancellation completed', 'SCHEDULE_VERSION_CONFLICT');
    await tx.commit();
    return result.recordset[0];
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    throw error;
  }
}

export async function listSessions(coachId: number, memberId: number, page: number, limit: number) {
  await assertMemberScope(coachId, memberId);
  const params = { coachId, memberId, offset: (page - 1) * limit, limit };
  const sessionRows = `
    WITH session_rows AS (
      SELECT ws.id,ws.user_id AS member_id,ws.workout_id,
             CAST(NULL AS INT) AS assignment_id,CAST(NULL AS INT) AS schedule_id,
             ws.started_at,ws.completed_at,ws.status,ws.notes,
             w.name AS workout_name,w.description AS workout_description,
             CAST(NULL AS INT) AS set_count,CAST(NULL AS INT) AS completed_set_count,
             CAST(N'legacy' AS NVARCHAR(10)) AS source
      FROM dbo.WorkoutSessions ws
      JOIN dbo.Workouts w ON w.id=ws.workout_id AND w.coach_id=@coachId
      WHERE ws.user_id=@memberId
      UNION ALL
      SELECT ms.id,ms.member_id,CAST(NULL AS INT) AS workout_id,
             ms.assignment_id,ms.schedule_id,ms.started_at,ms.ended_at AS completed_at,
             ms.status,ms.note AS notes,p.name AS workout_name,p.description AS workout_description,
             (SELECT COUNT(*) FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id WHERE se.session_id=ms.id) AS set_count,
             (SELECT COUNT(*) FROM dbo.MemberWorkoutSetLogs sl JOIN dbo.MemberWorkoutSessionExercises se ON se.id=sl.session_exercise_id WHERE se.session_id=ms.id AND sl.completed=1) AS completed_set_count,
             CAST(N'member' AS NVARCHAR(10)) AS source
      FROM dbo.MemberWorkoutSessions ms
      JOIN dbo.CoachProgramAssignments a ON a.id=ms.assignment_id AND a.coach_id=@coachId
      JOIN dbo.WorkoutPrograms p ON p.id=a.program_id
      WHERE ms.member_id=@memberId
    )`;
  const [rows, count] = await Promise.all([
    query(`${sessionRows}
      SELECT * FROM session_rows
      ORDER BY started_at DESC,id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`${sessionRows} SELECT COUNT(*) AS total FROM session_rows`, { coachId, memberId }),
  ]);
  const items = rows.recordset.map(row => ({
    ...row,
    source: row.source === 'legacy' ? 'legacy' as const : 'member' as const,
    setSummary: row.source === 'member' ? { total: Number(row.set_count), completed: Number(row.completed_set_count) } : null,
    blockedReason: row.source === 'legacy' ? 'LEGACY_SESSION_NO_MEMBER_SET_LOGS' : null,
  }));
  const total = Number(count.recordset[0]?.total ?? 0);
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function getSession(coachId: number, memberId: number, sessionId: number, source?: CoachSessionSource) {
  await assertMemberScope(coachId, memberId);
  const memberResult = source === 'legacy' ? null : await query(`SELECT ms.id FROM dbo.MemberWorkoutSessions ms JOIN dbo.CoachProgramAssignments a ON a.id=ms.assignment_id AND a.coach_id=@coachId WHERE ms.id=@sessionId AND ms.member_id=@memberId`, { coachId, memberId, sessionId });
  const legacyResult = source === 'member' ? null : await query(`SELECT ws.id,ws.user_id AS member_id,ws.workout_id,ws.started_at,ws.completed_at,ws.status,ws.notes,w.name AS workout_name,w.description AS workout_description FROM dbo.WorkoutSessions ws JOIN dbo.Workouts w ON w.id=ws.workout_id AND w.coach_id=@coachId WHERE ws.id=@sessionId AND ws.user_id=@memberId`, { coachId, memberId, sessionId });
  const hasMemberSession = Boolean(memberResult?.recordset[0]);
  const hasLegacySession = Boolean(legacyResult?.recordset[0]);
  if (!source && hasMemberSession && hasLegacySession) throw new AppError(409, 'Session source is required', 'SESSION_SOURCE_REQUIRED');
  if (source === 'member' || (!source && hasMemberSession)) {
    if (!hasMemberSession) throw new AppError(404, 'Session not found');
    const memberSession = await getMemberSession(memberId, sessionId);
    return { id: memberSession.id, member_id: memberSession.member_id, workout_id: null, assignment_id: memberSession.assignment_id, schedule_id: memberSession.schedule_id, started_at: memberSession.started_at, completed_at: memberSession.ended_at, status: memberSession.status, notes: memberSession.note, workout_name: memberSession.program.name, workout_description: null, exerciseSnapshot: memberSession.exercises, setSummary: { total: memberSession.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0), completed: memberSession.exercises.reduce((sum, exercise) => sum + exercise.sets.filter(set => Boolean((set as { completed?: unknown }).completed)).length, 0) }, blockedReason: null, source: 'member' as const };
  }
  if (!hasLegacySession || !legacyResult) throw new AppError(404, 'Session not found');
  const exercises = await query(`SELECT id,workout_id,name,sets,reps,weight,duration_seconds,rest_seconds,sort_order FROM dbo.WorkoutExercises WHERE workout_id=@workoutId ORDER BY sort_order,id`, { workoutId: legacyResult.recordset[0].workout_id });
  return { ...legacyResult.recordset[0], exerciseSnapshot: exercises.recordset, setSummary: null, blockedReason: 'LEGACY_SESSION_NO_MEMBER_SET_LOGS', source: 'legacy' as const };
}

export async function getProgress(coachId: number, memberId: number) {
  await assertMemberScope(coachId, memberId);
  const memberProgress = await getMemberProgress(memberId);
  const legacy = await query(`SELECT COUNT(*) AS completed_sessions,COALESCE(SUM(CASE WHEN ws.status=N'completed' AND ws.completed_at IS NOT NULL THEN DATEDIFF(SECOND,ws.started_at,ws.completed_at) ELSE 0 END),0) AS total_duration FROM dbo.WorkoutSessions ws JOIN dbo.Workouts w ON w.id=ws.workout_id AND w.coach_id=@coachId WHERE ws.user_id=@memberId`, { coachId, memberId });
  return { ...memberProgress, recent_sessions: memberProgress.recent_sessions.map(session => ({ ...session, source: 'member' as const })), completed_sessions: memberProgress.completed_sessions + Number(legacy.recordset[0].completed_sessions), total_duration: memberProgress.total_duration + Number(legacy.recordset[0].total_duration), dataSources: { ...memberProgress.dataSources, legacySessions: true } };
}
