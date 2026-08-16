import { getPool, sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { assertIanaTimeZone } from '../../utils/timezone';
import { createNotification } from '../notifications/notifications.service';

interface ReassignmentInput {
  memberId: number;
  newCoachId: number;
  programId: number;
  startDate: string;
  endDate?: string | null;
  scheduleTimezone: string;
  note?: string | null;
  assignedBy?: number;
  expectedCurrentCoachId?: number;
}

/**
 * Transactional Coach reassignment domain operation.
 * Used by the bounded Admin Coach Management route.
 * Historical sessions remain attached to the previous assignment.
 */
export async function reassignMemberCoach(input: ReassignmentInput) {
  if (input.endDate && input.endDate < input.startDate) throw new AppError(400, 'endDate must be on or after startDate');
  assertIanaTimeZone(input.scheduleTimezone);
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const crm = await new sql.Request(tx).input('memberId', sql.Int, input.memberId).query(`SELECT c.user_id,c.assigned_coach_id FROM dbo.CRMCustomers c WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Users u ON u.id=c.user_id AND u.role=N'member' AND u.is_active=1 WHERE c.user_id=@memberId`);
    if (!crm.recordset[0]) throw new AppError(404, 'Member not found');
    const currentCoachId = crm.recordset[0].assigned_coach_id == null ? null : Number(crm.recordset[0].assigned_coach_id);
    if (currentCoachId == null) throw new AppError(409, 'Member has no current Coach assignment');
    if (input.expectedCurrentCoachId !== undefined && currentCoachId !== input.expectedCurrentCoachId) throw new AppError(409, 'Member is no longer assigned to this Coach');
    if (currentCoachId === input.newCoachId) throw new AppError(409, 'Member is already assigned to this Coach');
    const coach = await new sql.Request(tx).input('newCoachId', sql.Int, input.newCoachId).query(`SELECT id FROM dbo.Users WHERE id=@newCoachId AND role=N'coach' AND is_active=1 AND COALESCE(coach_status,N'ACTIVE')=N'ACTIVE'`);
    if (!coach.recordset[0]) throw new AppError(404, 'New Coach not found');
    const current = await new sql.Request(tx).input('memberId', sql.Int, input.memberId).input('currentCoachId', sql.Int, currentCoachId).query(`SELECT TOP 1 id FROM dbo.CoachProgramAssignments WITH (UPDLOCK,HOLDLOCK) WHERE member_id=@memberId AND coach_id=@currentCoachId AND status=N'ACTIVE' ORDER BY updated_at DESC,id DESC`);
    if (current.recordset[0]) await new sql.Request(tx).input('assignmentId', sql.Int, Number(current.recordset[0].id)).query(`UPDATE dbo.CoachProgramAssignments SET status=N'PAUSED',updated_at=SYSUTCDATETIME() WHERE id=@assignmentId AND status=N'ACTIVE'`);
    const program = await new sql.Request(tx).input('programId', sql.Int, input.programId).input('newCoachId', sql.Int, input.newCoachId).query(`SELECT id FROM dbo.WorkoutPrograms WITH (UPDLOCK,HOLDLOCK) WHERE id=@programId AND owner_coach_id=@newCoachId AND is_active=1 AND lifecycle_status=N'PUBLISHED'`);
    if (!program.recordset[0]) throw new AppError(409, 'Program must be an active Published version owned by the new Coach', 'PROGRAM_ASSIGNMENT_REQUIRES_PUBLISHED');
    await new sql.Request(tx).input('memberId', sql.Int, input.memberId).input('newCoachId', sql.Int, input.newCoachId).query(`UPDATE dbo.CRMCustomers SET assigned_coach_id=@newCoachId WHERE user_id=@memberId`);
    const assignedBy = input.assignedBy ?? input.newCoachId;
    const created = await new sql.Request(tx).input('memberId', sql.Int, input.memberId).input('programId', sql.Int, input.programId).input('newCoachId', sql.Int, input.newCoachId).input('assignedBy', sql.Int, assignedBy).input('startDate', sql.Date, input.startDate).input('endDate', sql.Date, input.endDate ?? null).input('timezone', sql.NVarChar(64), input.scheduleTimezone).input('note', sql.NVarChar(2000), input.note ?? null).query(`INSERT dbo.CoachProgramAssignments(member_id,program_id,coach_id,assigned_by,start_date,end_date,status,schedule_timezone,note) OUTPUT INSERTED.* VALUES(@memberId,@programId,@newCoachId,@assignedBy,@startDate,@endDate,N'ACTIVE',@timezone,@note)`);
    const assignmentId = Number(created.recordset[0].id);
    await createNotification(tx, {
      recipientUserId: input.memberId,
      type: 'ASSIGNMENT_REASSIGNED',
      title: 'Coach assignment updated',
      message: 'Your Coach assignment has been updated.',
      actionUrl: '/workouts',
      deduplicationKey: `assignment:${assignmentId}:reassigned:member`,
    });
    await createNotification(tx, {
      recipientUserId: input.newCoachId,
      type: 'ASSIGNMENT_REASSIGNED',
      title: 'New Member assigned',
      message: 'A Member was assigned to your Coach workspace.',
      actionUrl: `/coach/members/${input.memberId}`,
      deduplicationKey: `assignment:${assignmentId}:reassigned:new-coach`,
    });
    await createNotification(tx, {
      recipientUserId: currentCoachId,
      type: 'ASSIGNMENT_REASSIGNED',
      title: 'Member reassigned',
      message: 'A Member was reassigned to another Coach; historical context remains read-only.',
      actionUrl: `/coach/members/${input.memberId}`,
      deduplicationKey: `assignment:${assignmentId}:reassigned:previous-coach`,
    });
    await tx.commit();
    return { previous_assignment_id: current.recordset[0] ? Number(current.recordset[0].id) : null, assignment: created.recordset[0], sessions_preserved: true };
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original failure */ }
    throw error;
  }
}
