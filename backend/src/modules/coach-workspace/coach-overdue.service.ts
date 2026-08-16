import { getPool, query, sql } from '../../config/database';
import { assertIanaTimeZone, todayInTimeZone } from '../../utils/timezone';
import { createNotification } from '../notifications/notifications.service';

export interface CoachOverdueBatchResult {
  selected: number;
  skipped: number;
}

const MAX_BATCH_SIZE = 1000;

const datePart = (value: unknown): string => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10);

export async function reconcileOverdueSchedules(limit = 100): Promise<CoachOverdueBatchResult> {
  const safeLimit = Math.min(Math.max(1, Math.trunc(limit)), MAX_BATCH_SIZE);
  const candidates = await query<{ id: number; scheduled_date: string | Date; schedule_timezone: string; coach_id: number; member_id: number }>(
    `SELECT TOP (@limit) s.id,s.scheduled_date,a.schedule_timezone,a.coach_id,a.member_id
     FROM dbo.CoachProgramSchedules s
     JOIN dbo.CoachProgramAssignments a ON a.id=s.assignment_id
     WHERE s.status=N'SCHEDULED'
       AND s.scheduled_date<=DATEADD(day,1,CONVERT(date,SYSUTCDATETIME()))
       AND NOT EXISTS (SELECT 1 FROM dbo.MemberWorkoutSessions ms WHERE ms.schedule_id=s.id)
     ORDER BY s.scheduled_date,s.id`,
    { limit: safeLimit },
  );

  let skipped = 0;
  for (const row of candidates.recordset) {
    assertIanaTimeZone(row.schedule_timezone);
    const scheduledDate = datePart(row.scheduled_date);
    if (scheduledDate >= todayInTimeZone(row.schedule_timezone)) continue;
    const tx = (await getPool()).transaction();
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const result = await new sql.Request(tx)
        .input('scheduleId', sql.Int, row.id)
        .input('scheduledDate', sql.Date, scheduledDate)
        .query(
          `UPDATE dbo.CoachProgramSchedules
           SET status=N'SKIPPED',updated_at=SYSUTCDATETIME()
           WHERE id=@scheduleId AND status=N'SCHEDULED' AND scheduled_date=@scheduledDate
             AND NOT EXISTS (SELECT 1 FROM dbo.MemberWorkoutSessions ms WHERE ms.schedule_id=@scheduleId)`,
        );
      const changed = Number(result.rowsAffected[0] ?? 0);
      if (changed > 0) {
        await createNotification(tx, {
          recipientUserId: Number(row.coach_id),
          type: 'SCHEDULE_SKIPPED',
          title: 'Overdue schedule skipped',
          message: `Schedule #${row.id} was marked skipped because it had no started session.`,
          actionUrl: '/coach/schedules',
          deduplicationKey: `schedule:${row.id}:skipped`,
        });
        await createNotification(tx, {
          recipientUserId: Number(row.member_id),
          type: 'SCHEDULE_SKIPPED',
          title: 'Workout schedule skipped',
          message: 'An overdue workout schedule was marked skipped because no session was started.',
          actionUrl: '/workouts',
          deduplicationKey: `schedule:${row.id}:skipped:member`,
        });
      }
      await tx.commit();
      skipped += changed;
    } catch (error) {
      try { await tx.rollback(); } catch { /* preserve original failure */ }
      throw error;
    }
  }

  return { selected: candidates.recordset.length, skipped };
}
