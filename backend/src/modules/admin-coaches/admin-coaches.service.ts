import { getPool, query, sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { reassignMemberCoach } from '../coach-workspace/coach-reassignment.service';
import { createNotification } from '../notifications/notifications.service';

export type AdminCoachStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

const statusSql = `COALESCE(u.coach_status, CASE WHEN u.is_active=1 THEN N'ACTIVE' ELSE N'INACTIVE' END)`;

function pagination(page: number, limit: number) {
  return { page: Math.max(1, page), limit: Math.min(50, Math.max(1, limit)) };
}

function coachListQuery(where: string) {
  return `
    SELECT u.id,u.name,u.email,u.phone,u.avatar_url,u.is_active,u.created_at,u.updated_at,
           ${statusSql} AS status,u.coach_status_reason AS status_reason,u.coach_status_updated_at AS status_updated_at,
           (SELECT COUNT(*) FROM dbo.CRMCustomers c JOIN dbo.Users m ON m.id=c.user_id
            WHERE c.assigned_coach_id=u.id AND m.role=N'member' AND m.is_active=1) AS member_count,
           (SELECT COUNT(*) FROM dbo.WorkoutPrograms p WHERE p.owner_coach_id=u.id) AS program_count,
           ((SELECT COUNT(*) FROM dbo.WorkoutSessions ws JOIN dbo.Workouts w ON w.id=ws.workout_id
             WHERE w.coach_id=u.id AND ws.started_at>=DATEADD(day,-30,SYSUTCDATETIME()))+
            (SELECT COUNT(*) FROM dbo.MemberWorkoutSessions ms JOIN dbo.CoachProgramAssignments a ON a.id=ms.assignment_id
             WHERE a.coach_id=u.id AND ms.started_at>=DATEADD(day,-30,SYSUTCDATETIME()))) AS recent_session_count
    FROM dbo.Users u
    WHERE u.role=N'coach' ${where}`;
}

export async function listCoaches(input: { search?: string; status?: AdminCoachStatus; page: number; limit: number }) {
  const { page, limit } = pagination(input.page, input.limit);
  const params: Record<string, unknown> = { offset: (page - 1) * limit, limit };
  let where = '';
  if (input.search) { where += ' AND (u.name LIKE @search OR u.email LIKE @search)'; params.search = `%${input.search}%`; }
  if (input.status) { where += ` AND ${statusSql}=@status`; params.status = input.status; }
  const base = coachListQuery(where);
  const [rows, count] = await Promise.all([
    query(`${base} ORDER BY u.created_at DESC,u.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total FROM dbo.Users u WHERE u.role=N'coach' ${where}`, params),
  ]);
  const total = Number(count.recordset[0]?.total ?? 0);
  return { items: rows.recordset, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function getSummary() {
  const [totals, unassigned, expiring, sessions] = await Promise.all([
    query(`SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN ${statusSql}=N'ACTIVE' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN ${statusSql}=N'SUSPENDED' THEN 1 ELSE 0 END) AS suspended
      FROM dbo.Users u WHERE u.role=N'coach'`),
    query(`SELECT COUNT(*) AS count FROM dbo.Users m LEFT JOIN dbo.CRMCustomers c ON c.user_id=m.id
           WHERE m.role=N'member' AND m.is_active=1 AND c.assigned_coach_id IS NULL`),
    query(`SELECT COUNT(*) AS count FROM dbo.CoachProgramAssignments
           WHERE status=N'ACTIVE' AND end_date>=CONVERT(date,SYSUTCDATETIME())
             AND end_date<DATEADD(day,31,CONVERT(date,SYSUTCDATETIME()))`),
    query(`SELECT COUNT(*) AS count FROM (
             SELECT ws.id FROM dbo.WorkoutSessions ws JOIN dbo.Workouts w ON w.id=ws.workout_id
             WHERE UPPER(ws.status)=N'COMPLETED' AND ws.completed_at>=DATEADD(day,-7,SYSUTCDATETIME())
             UNION ALL
             SELECT ms.id FROM dbo.MemberWorkoutSessions ms
             WHERE ms.status=N'COMPLETED' AND ms.ended_at>=DATEADD(day,-7,SYSUTCDATETIME())
           ) recent`),
  ]);
  const row = totals.recordset[0] ?? {};
  return {
    totalCoaches: Number(row.total ?? 0),
    activeCoaches: Number(row.active ?? 0),
    suspendedCoaches: Number(row.suspended ?? 0),
    unassignedMembers: Number(unassigned.recordset[0]?.count ?? 0),
    expiringAssignments: Number(expiring.recordset[0]?.count ?? 0),
    completedSessionsThisWeek: Number(sessions.recordset[0]?.count ?? 0),
  };
}

export async function getCoach(coachId: number) {
  const result = await query(`${coachListQuery(' AND u.id=@coachId')}
    `, { coachId });
  const row = result.recordset[0];
  if (!row) throw new AppError(404, 'Coach not found');
  return { ...row, specialization: null, experience: null };
}

export async function setCoachStatus(coachId: number, status: AdminCoachStatus, reason?: string | null) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const current = await new sql.Request(tx).input('coachId', sql.Int, coachId)
      .query(`SELECT id,role,coach_status,is_active FROM dbo.Users WITH (UPDLOCK,HOLDLOCK)
              WHERE id=@coachId AND role=N'coach'`);
    if (!current.recordset[0]) throw new AppError(404, 'Coach not found');
    const active = status === 'INACTIVE' ? 0 : 1;
    const updated = await new sql.Request(tx)
      .input('coachId', sql.Int, coachId)
      .input('status', sql.NVarChar(20), status)
      .input('active', sql.Bit, active)
      .input('reason', sql.NVarChar(500), reason ?? null)
      .query(`UPDATE dbo.Users
              SET is_active=@active,coach_status=@status,coach_status_reason=@reason,
                  coach_status_updated_at=SYSUTCDATETIME(),token_version=token_version+1,updated_at=SYSUTCDATETIME()
              OUTPUT INSERTED.id,INSERTED.name,INSERTED.email,INSERTED.is_active,
                     INSERTED.coach_status AS status,INSERTED.coach_status_reason AS status_reason,
                     INSERTED.coach_status_updated_at AS status_updated_at
              WHERE id=@coachId AND role=N'coach'`);
    await tx.commit();
    return updated.recordset[0];
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    throw error;
  }
}

export async function listCoachMembers(coachId: number, input: { search?: string; page: number; limit: number }) {
  const { page, limit } = pagination(input.page, input.limit);
  const params: Record<string, unknown> = { coachId, offset: (page - 1) * limit, limit };
  const search = input.search ? ' AND (m.name LIKE @search OR m.email LIKE @search)' : '';
  if (input.search) params.search = `%${input.search}%`;
  const scope = `c.assigned_coach_id=@coachId AND m.role=N'member' AND m.is_active=1${search}`;
  const [rows, count] = await Promise.all([
    query(`SELECT c.user_id AS id,m.name,m.email,m.phone,m.avatar_url,c.created_at AS assigned_at,
                  a.id AS active_assignment_id,a.status AS assignment_status,p.name AS program_name
           FROM dbo.CRMCustomers c JOIN dbo.Users m ON m.id=c.user_id
           OUTER APPLY (SELECT TOP 1 a.id,a.status,a.program_id FROM dbo.CoachProgramAssignments a
                        WHERE a.member_id=c.user_id AND a.coach_id=@coachId AND a.status=N'ACTIVE'
                        ORDER BY a.updated_at DESC,a.id DESC) a
           LEFT JOIN dbo.WorkoutPrograms p ON p.id=a.program_id
           WHERE ${scope} ORDER BY m.name,m.id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total FROM dbo.CRMCustomers c JOIN dbo.Users m ON m.id=c.user_id WHERE ${scope}`, params),
  ]);
  const total = Number(count.recordset[0]?.total ?? 0);
  return { items: rows.recordset, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function listUnassignedMembers(input: { search?: string; page: number; limit: number }) {
  const { page, limit } = pagination(input.page, input.limit);
  const params: Record<string, unknown> = { offset: (page - 1) * limit, limit };
  const search = input.search ? ' AND (m.name LIKE @search OR m.email LIKE @search)' : '';
  if (input.search) params.search = `%${input.search}%`;
  const where = `m.role=N'member' AND m.is_active=1 AND c.assigned_coach_id IS NULL${search}`;
  const [rows, count] = await Promise.all([
    query(`SELECT m.id,m.name,m.email,m.phone,m.avatar_url,m.created_at
           FROM dbo.Users m LEFT JOIN dbo.CRMCustomers c ON c.user_id=m.id
           WHERE ${where} ORDER BY m.name,m.id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total FROM dbo.Users m LEFT JOIN dbo.CRMCustomers c ON c.user_id=m.id WHERE ${where}`, params),
  ]);
  const total = Number(count.recordset[0]?.total ?? 0);
  return { items: rows.recordset, page, limit, total, totalPages: Math.ceil(total / limit) };
}

async function assertActiveCoach(tx: sql.Transaction, coachId: number) {
  const result = await new sql.Request(tx).input('coachId', sql.Int, coachId).query(
    `SELECT id FROM dbo.Users WITH (UPDLOCK,HOLDLOCK) WHERE id=@coachId AND role=N'coach' AND is_active=1
     AND COALESCE(coach_status,N'ACTIVE')=N'ACTIVE'`,
  );
  if (!result.recordset[0]) throw new AppError(409, 'Coach is not active');
}

async function memberResult(memberId: number) {
  const result = await query(`SELECT c.user_id AS id,m.name,m.email,m.phone,m.avatar_url,c.assigned_coach_id,
                                     c.created_at AS assigned_at
                              FROM dbo.CRMCustomers c JOIN dbo.Users m ON m.id=c.user_id
                              WHERE c.user_id=@memberId`, { memberId });
  return result.recordset[0];
}

export async function assignMember(coachId: number, memberId: number) {
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    await assertActiveCoach(tx, coachId);
    const member = await new sql.Request(tx).input('memberId', sql.Int, memberId).query(
      `SELECT id FROM dbo.Users WITH (UPDLOCK,HOLDLOCK) WHERE id=@memberId AND role=N'member' AND is_active=1`,
    );
    if (!member.recordset[0]) throw new AppError(404, 'Member not found');
    const existing = await new sql.Request(tx).input('memberId', sql.Int, memberId).query(
      `SELECT id,assigned_coach_id FROM dbo.CRMCustomers WITH (UPDLOCK,HOLDLOCK) WHERE user_id=@memberId`,
    );
    if (existing.recordset[0]?.assigned_coach_id != null) throw new AppError(409, 'Member already has an active Coach');
    if (existing.recordset[0]) {
      await new sql.Request(tx).input('crmId', sql.Int, Number(existing.recordset[0].id)).input('coachId', sql.Int, coachId)
        .query('UPDATE dbo.CRMCustomers SET assigned_coach_id=@coachId WHERE id=@crmId');
    } else {
      await new sql.Request(tx).input('memberId', sql.Int, memberId).input('coachId', sql.Int, coachId)
        .query('INSERT dbo.CRMCustomers(user_id,assigned_coach_id) VALUES(@memberId,@coachId)');
    }
    await createNotification(tx, {
      recipientUserId: memberId,
      type: 'ASSIGNMENT_ASSIGNED',
      title: 'Coach assigned',
      message: 'A Coach is now assigned to your account.',
      actionUrl: '/workouts',
      deduplicationKey: `member:${memberId}:coach-assigned:${coachId}`,
    });
    await createNotification(tx, {
      recipientUserId: coachId,
      type: 'ASSIGNMENT_ASSIGNED',
      title: 'Member assigned',
      message: 'A Member was assigned to your Coach workspace.',
      actionUrl: `/coach/members/${memberId}`,
      deduplicationKey: `member:${memberId}:coach-assigned:${coachId}:coach`,
    });
    await tx.commit();
    return memberResult(memberId);
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    throw error;
  }
}

export async function reassignMember(input: {
  currentCoachId: number;
  memberId: number;
  newCoachId: number;
  programId: number;
  startDate: string;
  endDate?: string | null;
  scheduleTimezone: string;
  note?: string | null;
  assignedBy: number;
}) {
  return reassignMemberCoach({ ...input, expectedCurrentCoachId: input.currentCoachId });
}
