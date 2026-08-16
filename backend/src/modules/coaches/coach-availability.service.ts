import { getPool, sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import {
  addMinutesToTime,
  COACH_BOOKING_DURATION_MINUTES,
  COACH_BOOKING_TIME_ZONE,
  isDateString,
  isFutureLocalDateTime,
  isTimeString,
  normalizeSqlDate,
  normalizeSqlTime,
  timeToMinutes,
} from '../../utils/coachBooking';
import { todayInTimeZone } from '../../utils/timezone';

export const AVAILABILITY_MODES = ['ONLINE', 'IN_PERSON', 'BOTH'] as const;
export type AvailabilityMode = (typeof AVAILABILITY_MODES)[number];
export type BookableAvailabilityMode = Exclude<AvailabilityMode, 'BOTH'>;
export const AVAILABILITY_EXCEPTION_TYPES = ['BLOCK', 'OPEN'] as const;
export type AvailabilityExceptionType = (typeof AVAILABILITY_EXCEPTION_TYPES)[number];

export interface AvailabilityRuleInput {
  weekday: number;
  startTime: string;
  endTime: string;
  mode: AvailabilityMode;
  location?: string | null;
  isActive?: boolean;
}

export interface AvailabilityExceptionInput {
  exceptionDate: string;
  exceptionType: AvailabilityExceptionType;
  startTime?: string | null;
  endTime?: string | null;
  mode?: AvailabilityMode | null;
  location?: string | null;
  note?: string | null;
  isActive?: boolean;
}

export interface AvailabilityRule {
  id: number;
  coach_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  mode: AvailabilityMode;
  location: string | null;
  is_active: boolean;
}

export interface AvailabilityException {
  id: number;
  coach_id: number;
  exception_date: string;
  exception_type: AvailabilityExceptionType;
  start_time: string | null;
  end_time: string | null;
  mode: AvailabilityMode | null;
  location: string | null;
  note: string | null;
  is_active: boolean;
}

export interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  mode: BookableAvailabilityMode;
  location: string | null;
  source: 'WEEKLY_RULE' | 'OPEN_EXCEPTION';
  booked: boolean;
  past: boolean;
}

export interface AvailabilitySnapshot {
  active: boolean;
  booking_enabled: boolean;
  date: string;
  coach_id: number;
  timezone: string;
  duration_minutes: number;
  bookingEnabled: boolean;
  mode: AvailabilityMode | null;
  location: string | null;
  session_mode: AvailabilityMode | null;
  profile_location: string | null;
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  slots: AvailabilitySlot[];
  available_slots: string[];
  booked_slots: string[];
}

interface AvailabilityCoachRow {
  id: number;
  active: boolean;
  booking_enabled: boolean;
  session_mode: AvailabilityMode | null;
  profile_location: string | null;
}

interface RuleRow {
  id: number;
  coach_id: number;
  weekday: number;
  start_time: unknown;
  end_time: unknown;
  mode: AvailabilityMode;
  location: string | null;
  is_active: boolean;
}

interface ExceptionRow {
  id: number;
  coach_id: number;
  exception_date: unknown;
  exception_type: AvailabilityExceptionType;
  start_time: unknown;
  end_time: unknown;
  mode: AvailabilityMode | null;
  location: string | null;
  note: string | null;
  is_active: boolean;
}

interface BookingIntervalRow {
  start_time: unknown;
  end_time: unknown;
}

type DbExecutor = sql.ConnectionPool | sql.Transaction;

function requestFor(executor: DbExecutor): sql.Request {
  return new sql.Request(executor as sql.Transaction);
}

async function execute<T>(executor: DbExecutor, statement: string, params: Record<string, unknown> = {}): Promise<sql.IResult<T>> {
  const request = requestFor(executor);
  for (const [name, value] of Object.entries(params)) request.input(name, value);
  return request.query<T>(statement);
}

function mapRule(row: RuleRow): AvailabilityRule {
  return {
    id: Number(row.id),
    coach_id: Number(row.coach_id),
    weekday: Number(row.weekday),
    start_time: normalizeSqlTime(row.start_time),
    end_time: normalizeSqlTime(row.end_time),
    mode: row.mode,
    location: row.location ?? null,
    is_active: Boolean(row.is_active),
  };
}

function mapException(row: ExceptionRow): AvailabilityException {
  return {
    id: Number(row.id),
    coach_id: Number(row.coach_id),
    exception_date: normalizeSqlDate(row.exception_date),
    exception_type: row.exception_type,
    start_time: row.start_time === null ? null : normalizeSqlTime(row.start_time),
    end_time: row.end_time === null ? null : normalizeSqlTime(row.end_time),
    mode: row.mode ?? null,
    location: row.location ?? null,
    note: row.note ?? null,
    is_active: Boolean(row.is_active),
  };
}

function weekdayFor(date: string): number {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function minutesToTime(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function assertTimeRange(startTime: string | null | undefined, endTime: string | null | undefined, required: boolean): void {
  if (!required && startTime == null && endTime == null) return;
  if (!startTime || !endTime || !isTimeString(startTime) || !isTimeString(endTime) || timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new AppError(400, 'Availability startTime must be before endTime');
  }
}

function assertRuleInput(input: AvailabilityRuleInput): void {
  if (!Number.isInteger(input.weekday) || input.weekday < 1 || input.weekday > 7) throw new AppError(400, 'weekday must be between 1 and 7');
  if (!isTimeString(input.startTime) || !isTimeString(input.endTime)) throw new AppError(400, 'Availability times must use HH:mm');
  assertTimeRange(input.startTime, input.endTime, true);
  if (!AVAILABILITY_MODES.includes(input.mode)) throw new AppError(400, 'Unsupported availability mode');
}

function assertExceptionInput(input: AvailabilityExceptionInput): void {
  if (!isDateString(input.exceptionDate)) throw new AppError(400, 'exceptionDate must be a valid YYYY-MM-DD date');
  if (!AVAILABILITY_EXCEPTION_TYPES.includes(input.exceptionType)) throw new AppError(400, 'Unsupported availability exception type');
  if (input.exceptionType === 'BLOCK') {
    if (input.startTime != null || input.endTime != null) throw new AppError(400, 'BLOCK exceptions must cover the full date');
  } else {
    assertTimeRange(input.startTime, input.endTime, true);
  }
  if (input.mode != null && !AVAILABILITY_MODES.includes(input.mode)) throw new AppError(400, 'Unsupported availability mode');
}

function concreteModes(profileMode: AvailabilityMode | null, sourceMode: AvailabilityMode): BookableAvailabilityMode[] {
  if (profileMode && profileMode !== 'BOTH' && sourceMode !== 'BOTH' && profileMode !== sourceMode) return [];
  if (profileMode && profileMode !== 'BOTH') return [profileMode];
  if (sourceMode === 'BOTH') return ['ONLINE', 'IN_PERSON'];
  return [sourceMode];
}

function loadWindowSlots(
  windows: Array<{ start_time: string; end_time: string; mode: AvailabilityMode; location: string | null; source: AvailabilitySlot['source'] }>,
  profileMode: AvailabilityMode | null,
  profileLocation: string | null,
): Array<Omit<AvailabilitySlot, 'booked' | 'past'>> {
  const slots: Array<Omit<AvailabilitySlot, 'booked' | 'past'>> = [];
  for (const window of windows) {
    for (const mode of concreteModes(profileMode, window.mode)) {
      const location = mode === 'ONLINE' ? window.location ?? null : window.location ?? profileLocation ?? null;
      if (mode === 'IN_PERSON' && !location) continue;
      const start = timeToMinutes(window.start_time);
      const end = timeToMinutes(window.end_time);
      for (let cursor = start; cursor + COACH_BOOKING_DURATION_MINUTES <= end; cursor += COACH_BOOKING_DURATION_MINUTES) {
        slots.push({
          start_time: minutesToTime(cursor),
          end_time: addMinutesToTime(minutesToTime(cursor), COACH_BOOKING_DURATION_MINUTES),
          mode,
          location,
          source: window.source,
        });
      }
    }
  }
  return slots;
}

function uniqueSlots(slots: Array<Omit<AvailabilitySlot, 'booked' | 'past'>>): Array<Omit<AvailabilitySlot, 'booked' | 'past'>> {
  const byKey = new Map<string, Omit<AvailabilitySlot, 'booked' | 'past'>>();
  for (const slot of slots) {
    const key = `${slot.start_time}|${slot.end_time}|${slot.mode}|${slot.location ?? ''}`;
    const previous = byKey.get(key);
    if (!previous || (previous.source === 'WEEKLY_RULE' && slot.source === 'OPEN_EXCEPTION')) byKey.set(key, slot);
  }
  return [...byKey.values()].sort((a, b) => a.start_time.localeCompare(b.start_time) || a.mode.localeCompare(b.mode));
}

async function loadCoach(executor: DbExecutor, coachId: number, lock = false): Promise<AvailabilityCoachRow | null> {
  const lockHint = lock ? ' WITH (UPDLOCK,HOLDLOCK)' : '';
  const result = await execute<AvailabilityCoachRow>(executor,
    `SELECT u.id,
            CAST(CASE WHEN u.is_active=1 AND COALESCE(u.coach_status,CASE WHEN u.is_active=1 THEN N'ACTIVE' ELSE N'INACTIVE' END)=N'ACTIVE' THEN 1 ELSE 0 END AS bit) AS active,
            CAST(COALESCE(cp.booking_enabled,1) AS bit) AS booking_enabled,
            cp.session_mode,
            cp.location AS profile_location
     FROM dbo.Users u${lockHint}
     LEFT JOIN dbo.CoachProfiles cp ON cp.coach_id=u.id
     WHERE u.id=@coachId AND u.role=N'coach'`,
    { coachId },
  );
  return result.recordset[0] ? {
    id: Number(result.recordset[0].id),
    active: Boolean(result.recordset[0].active),
    booking_enabled: Boolean(result.recordset[0].booking_enabled),
    session_mode: result.recordset[0].session_mode ?? null,
    profile_location: result.recordset[0].profile_location ?? null,
  } : null;
}

async function loadRules(executor: DbExecutor, coachId: number, includeInactive: boolean): Promise<AvailabilityRule[]> {
  const result = await execute<RuleRow>(executor,
    `SELECT id,coach_id,weekday,start_time,end_time,mode,location,is_active
     FROM dbo.CoachAvailabilityRules
     WHERE coach_id=@coachId${includeInactive ? '' : ' AND is_active=1'}
     ORDER BY weekday,start_time,id`,
    { coachId },
  );
  return result.recordset.map(mapRule);
}

async function loadExceptions(executor: DbExecutor, coachId: number, date: string, includeInactive: boolean): Promise<AvailabilityException[]> {
  const result = await execute<ExceptionRow>(executor,
    `SELECT id,coach_id,exception_date,exception_type,start_time,end_time,mode,location,note,is_active
     FROM dbo.CoachAvailabilityExceptions
     WHERE coach_id=@coachId AND exception_date=@exceptionDate${includeInactive ? '' : ' AND is_active=1'}
     ORDER BY exception_type,start_time,id`,
    { coachId, exceptionDate: date },
  );
  return result.recordset.map(mapException);
}

async function loadBookedIntervals(executor: DbExecutor, coachId: number, date: string, lock = false): Promise<Array<{ start: string; end: string }>> {
  const lockHint = lock ? ' WITH (UPDLOCK,HOLDLOCK)' : '';
  const result = await execute<BookingIntervalRow>(executor,
    `SELECT b.start_time,b.end_time
     FROM dbo.Bookings b${lockHint}
     WHERE b.coach_id=@coachId AND b.booking_date=@bookingDate
       AND b.status IN (N'pending',N'confirmed')`,
    { coachId, bookingDate: date },
  );
  return result.recordset.map(row => ({ start: normalizeSqlTime(row.start_time), end: normalizeSqlTime(row.end_time) }));
}

export async function getAvailabilitySnapshot(
  coachId: number,
  date = todayInTimeZone(COACH_BOOKING_TIME_ZONE),
  options: { includeInactive?: boolean; includePrivateNotes?: boolean; lock?: boolean; executor?: DbExecutor } = {},
): Promise<AvailabilitySnapshot> {
  if (!Number.isSafeInteger(coachId) || coachId <= 0) throw new AppError(400, 'Coach ID must be a positive integer');
  if (!isDateString(date)) throw new AppError(400, 'date must be a valid YYYY-MM-DD date');
  const executor = options.executor ?? await getPool();
  const coach = await loadCoach(executor, coachId, Boolean(options.lock));
  if (!coach || !coach.active) throw new AppError(404, 'Coach not found');
  const includeInactive = Boolean(options.includeInactive);
  const rules = await loadRules(executor, coachId, includeInactive);
  const exceptions = await loadExceptions(executor, coachId, date, includeInactive);
  const activeRules = rules.filter(rule => rule.is_active && rule.weekday === weekdayFor(date));
  const activeExceptions = exceptions.filter(exception => exception.is_active);
  const hasBlock = activeExceptions.some(exception => exception.exception_type === 'BLOCK');
  const windows: Array<{ start_time: string; end_time: string; mode: AvailabilityMode; location: string | null; source: AvailabilitySlot['source'] }> = [];
  if (!hasBlock) {
    windows.push(...activeRules.map(rule => ({
      start_time: rule.start_time,
      end_time: rule.end_time,
      mode: rule.mode,
      location: rule.location,
      source: 'WEEKLY_RULE' as const,
    })));
  }
  windows.push(...activeExceptions.filter(exception => exception.exception_type === 'OPEN').map(exception => ({
    start_time: exception.start_time as string,
    end_time: exception.end_time as string,
    mode: exception.mode ?? coach.session_mode ?? 'BOTH',
    location: exception.location,
    source: 'OPEN_EXCEPTION' as const,
  })));
  const rawSlots = uniqueSlots(loadWindowSlots(windows, coach.session_mode, coach.profile_location));
  const bookedIntervals = coach.booking_enabled ? await loadBookedIntervals(executor, coachId, date, Boolean(options.lock)) : [];
  const today = todayInTimeZone(COACH_BOOKING_TIME_ZONE);
  const slots: AvailabilitySlot[] = coach.booking_enabled ? rawSlots.map(slot => ({
    ...slot,
    booked: bookedIntervals.some(interval => interval.start < slot.end_time && interval.end > slot.start_time),
    past: date === today && !isFutureLocalDateTime(date, slot.start_time),
  })) : [];
  const availableSlots = [...new Set(slots.filter(slot => !slot.booked && !slot.past).map(slot => slot.start_time))].sort();
  const bookedSlots = [...new Set(bookedIntervals.map(interval => interval.start))].sort();
  const snapshot: AvailabilitySnapshot = {
    active: coach.active,
    booking_enabled: coach.booking_enabled,
    date,
    coach_id: coachId,
    timezone: COACH_BOOKING_TIME_ZONE,
    duration_minutes: COACH_BOOKING_DURATION_MINUTES,
    bookingEnabled: coach.booking_enabled,
    mode: coach.session_mode,
    location: coach.profile_location,
    session_mode: coach.session_mode,
    profile_location: coach.profile_location,
    rules,
    exceptions: options.includePrivateNotes === true ? exceptions : exceptions.map(exception => ({ ...exception, note: null })),
    slots,
    available_slots: availableSlots,
    booked_slots: bookedSlots,
  };
  return snapshot;
}

export async function assertBookableSlot(
  transaction: sql.Transaction,
  coachId: number,
  date: string,
  startTime: string,
  endTime: string,
  requestedMode?: BookableAvailabilityMode,
): Promise<AvailabilitySlot> {
  if (!isTimeString(startTime) || !isTimeString(endTime)) throw new AppError(400, 'Booking time must use HH:mm');
  const snapshot = await getAvailabilitySnapshot(coachId, date, { executor: transaction, lock: true, includePrivateNotes: false });
  const candidates = snapshot.slots.filter(slot => slot.start_time === startTime && slot.end_time === endTime && !slot.booked && !slot.past);
  const authoritativeSlot = requestedMode ? candidates.find(slot => slot.mode === requestedMode) : candidates.length === 1 ? candidates[0] : undefined;
  if (!snapshot.booking_enabled || !authoritativeSlot) {
    if (snapshot.booking_enabled && candidates.length > 1 && !requestedMode) {
      throw new AppError(409, 'A concrete booking mode is required for this availability slot', 'COACH_AVAILABILITY_MODE_REQUIRED');
    }
    throw new AppError(409, 'The selected appointment slot is not available', 'COACH_AVAILABILITY_SLOT_UNAVAILABLE');
  }
  return authoritativeSlot;
}

async function assertRuleDoesNotOverlap(executor: DbExecutor, coachId: number, input: AvailabilityRuleInput, excludedId?: number): Promise<void> {
  const result = await execute<{ id: number }>(executor,
    `SELECT TOP 1 id
     FROM dbo.CoachAvailabilityRules WITH (UPDLOCK,HOLDLOCK)
     WHERE coach_id=@coachId AND weekday=@weekday AND is_active=1
       AND start_time < @endTime AND end_time > @startTime
       AND (@excludedId IS NULL OR id<>@excludedId)`,
    { coachId, weekday: input.weekday, startTime: input.startTime, endTime: input.endTime, excludedId: excludedId ?? null },
  );
  if (result.recordset[0]) throw new AppError(409, 'Availability rule overlaps an existing rule', 'AVAILABILITY_OVERLAP');
}

async function assertOpenExceptionDoesNotOverlap(executor: DbExecutor, coachId: number, input: AvailabilityExceptionInput, excludedId?: number): Promise<void> {
  if (input.exceptionType !== 'OPEN' || !input.startTime || !input.endTime) return;
  const result = await execute<{ id: number }>(executor,
    `SELECT TOP 1 id
     FROM dbo.CoachAvailabilityExceptions WITH (UPDLOCK,HOLDLOCK)
     WHERE coach_id=@coachId AND exception_date=@exceptionDate AND exception_type=N'OPEN' AND is_active=1
       AND start_time < @endTime AND end_time > @startTime
       AND (@excludedId IS NULL OR id<>@excludedId)`,
    { coachId, exceptionDate: input.exceptionDate, startTime: input.startTime, endTime: input.endTime, excludedId: excludedId ?? null },
  );
  if (result.recordset[0]) throw new AppError(409, 'Availability exception overlaps an existing exception', 'AVAILABILITY_OVERLAP');
}

async function assertCoachExists(executor: DbExecutor, coachId: number): Promise<void> {
  const coach = await loadCoach(executor, coachId, true);
  if (!coach) throw new AppError(404, 'Coach not found');
}

export async function listRules(coachId: number, includeInactive = false): Promise<AvailabilityRule[]> {
  const pool = await getPool();
  await assertCoachExists(pool, coachId);
  return loadRules(pool, coachId, includeInactive);
}

export async function listExceptions(coachId: number, includeInactive = false): Promise<AvailabilityException[]> {
  const pool = await getPool();
  await assertCoachExists(pool, coachId);
  const result = await execute<ExceptionRow>(pool,
    `SELECT id,coach_id,exception_date,exception_type,start_time,end_time,mode,location,note,is_active
     FROM dbo.CoachAvailabilityExceptions
     WHERE coach_id=@coachId${includeInactive ? '' : ' AND is_active=1'}
     ORDER BY exception_date,exception_type,start_time,id`,
    { coachId },
  );
  return result.recordset.map(mapException);
}

export async function createRule(coachId: number, input: AvailabilityRuleInput): Promise<AvailabilityRule> {
  assertRuleInput(input);
  const pool = await getPool();
  const tx = pool.transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    await assertCoachExists(tx, coachId);
    if (input.isActive !== false) await assertRuleDoesNotOverlap(tx, coachId, input);
    const result = await execute<RuleRow>(tx,
      `INSERT dbo.CoachAvailabilityRules(coach_id,weekday,start_time,end_time,mode,location,is_active)
       OUTPUT INSERTED.id,INSERTED.coach_id,INSERTED.weekday,INSERTED.start_time,INSERTED.end_time,INSERTED.mode,INSERTED.location,INSERTED.is_active
       VALUES(@coachId,@weekday,@startTime,@endTime,@mode,@location,@isActive)`,
      { coachId, weekday: input.weekday, startTime: input.startTime, endTime: input.endTime, mode: input.mode, location: input.location ?? null, isActive: input.isActive !== false },
    );
    await tx.commit();
    return mapRule(result.recordset[0]);
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    if (error instanceof AppError) throw error;
    if ((error as { number?: number }).number === 2601 || (error as { number?: number }).number === 2627) throw new AppError(409, 'Availability rule already exists', 'AVAILABILITY_RULE_CONFLICT');
    throw error;
  }
}

export async function updateRule(coachId: number, ruleId: number, input: Partial<AvailabilityRuleInput>): Promise<AvailabilityRule> {
  if (!Number.isSafeInteger(ruleId) || ruleId <= 0) throw new AppError(400, 'Rule ID must be a positive integer');
  const pool = await getPool();
  const tx = pool.transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const current = await execute<RuleRow>(tx,
      `SELECT TOP 1 id,coach_id,weekday,start_time,end_time,mode,location,is_active
       FROM dbo.CoachAvailabilityRules WITH (UPDLOCK,HOLDLOCK)
       WHERE id=@ruleId AND coach_id=@coachId`,
      { ruleId, coachId },
    );
    if (!current.recordset[0]) throw new AppError(404, 'Availability rule not found');
    const existing = mapRule(current.recordset[0]);
    const merged: AvailabilityRuleInput = {
      weekday: input.weekday ?? existing.weekday,
      startTime: input.startTime ?? existing.start_time,
      endTime: input.endTime ?? existing.end_time,
      mode: input.mode ?? existing.mode,
      location: input.location === undefined ? existing.location : input.location,
      isActive: input.isActive === undefined ? existing.is_active : input.isActive,
    };
    assertRuleInput(merged);
    if (merged.isActive !== false) await assertRuleDoesNotOverlap(tx, coachId, merged, ruleId);
    const updated = await execute<RuleRow>(tx,
      `UPDATE dbo.CoachAvailabilityRules
       SET weekday=@weekday,start_time=@startTime,end_time=@endTime,mode=@mode,location=@location,is_active=@isActive,updated_at=SYSUTCDATETIME()
       OUTPUT INSERTED.id,INSERTED.coach_id,INSERTED.weekday,INSERTED.start_time,INSERTED.end_time,INSERTED.mode,INSERTED.location,INSERTED.is_active
       WHERE id=@ruleId AND coach_id=@coachId`,
      { ruleId, coachId, weekday: merged.weekday, startTime: merged.startTime, endTime: merged.endTime, mode: merged.mode, location: merged.location ?? null, isActive: merged.isActive !== false },
    );
    await tx.commit();
    return mapRule(updated.recordset[0]);
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    if (error instanceof AppError) throw error;
    if ((error as { number?: number }).number === 2601 || (error as { number?: number }).number === 2627) throw new AppError(409, 'Availability rule already exists', 'AVAILABILITY_RULE_CONFLICT');
    throw error;
  }
}

export async function deleteRule(coachId: number, ruleId: number): Promise<void> {
  if (!Number.isSafeInteger(ruleId) || ruleId <= 0) throw new AppError(400, 'Rule ID must be a positive integer');
  const pool = await getPool();
  const result = await execute<{ id: number }>(pool, 'DELETE FROM dbo.CoachAvailabilityRules OUTPUT DELETED.id WHERE id=@ruleId AND coach_id=@coachId', { ruleId, coachId });
  if (!result.recordset[0]) throw new AppError(404, 'Availability rule not found');
}

export async function createException(coachId: number, input: AvailabilityExceptionInput): Promise<AvailabilityException> {
  assertExceptionInput(input);
  const pool = await getPool();
  const tx = pool.transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    await assertCoachExists(tx, coachId);
    if (input.isActive !== false) await assertOpenExceptionDoesNotOverlap(tx, coachId, input);
    const result = await execute<ExceptionRow>(tx,
      `INSERT dbo.CoachAvailabilityExceptions(coach_id,exception_date,exception_type,start_time,end_time,mode,location,note,is_active)
       OUTPUT INSERTED.id,INSERTED.coach_id,INSERTED.exception_date,INSERTED.exception_type,INSERTED.start_time,INSERTED.end_time,INSERTED.mode,INSERTED.location,INSERTED.note,INSERTED.is_active
       VALUES(@coachId,@exceptionDate,@exceptionType,@startTime,@endTime,@mode,@location,@note,@isActive)`,
      { coachId, exceptionDate: input.exceptionDate, exceptionType: input.exceptionType, startTime: input.startTime ?? null, endTime: input.endTime ?? null, mode: input.mode ?? null, location: input.location ?? null, note: input.note ?? null, isActive: input.isActive !== false },
    );
    await tx.commit();
    return mapException(result.recordset[0]);
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    if (error instanceof AppError) throw error;
    if ((error as { number?: number }).number === 2601 || (error as { number?: number }).number === 2627) throw new AppError(409, 'Availability exception already exists', 'AVAILABILITY_EXCEPTION_CONFLICT');
    throw error;
  }
}

export async function updateException(coachId: number, exceptionId: number, input: Partial<AvailabilityExceptionInput>): Promise<AvailabilityException> {
  if (!Number.isSafeInteger(exceptionId) || exceptionId <= 0) throw new AppError(400, 'Exception ID must be a positive integer');
  const pool = await getPool();
  const tx = pool.transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const current = await execute<ExceptionRow>(tx,
      `SELECT TOP 1 id,coach_id,exception_date,exception_type,start_time,end_time,mode,location,note,is_active
       FROM dbo.CoachAvailabilityExceptions WITH (UPDLOCK,HOLDLOCK)
       WHERE id=@exceptionId AND coach_id=@coachId`,
      { exceptionId, coachId },
    );
    if (!current.recordset[0]) throw new AppError(404, 'Availability exception not found');
    const existing = mapException(current.recordset[0]);
    const merged: AvailabilityExceptionInput = {
      exceptionDate: input.exceptionDate ?? existing.exception_date,
      exceptionType: input.exceptionType ?? existing.exception_type,
      startTime: input.startTime === undefined ? existing.start_time : input.startTime,
      endTime: input.endTime === undefined ? existing.end_time : input.endTime,
      mode: input.mode === undefined ? existing.mode : input.mode,
      location: input.location === undefined ? existing.location : input.location,
      note: input.note === undefined ? existing.note : input.note,
      isActive: input.isActive === undefined ? existing.is_active : input.isActive,
    };
    assertExceptionInput(merged);
    if (merged.isActive !== false) await assertOpenExceptionDoesNotOverlap(tx, coachId, merged, exceptionId);
    const updated = await execute<ExceptionRow>(tx,
      `UPDATE dbo.CoachAvailabilityExceptions
       SET exception_date=@exceptionDate,exception_type=@exceptionType,start_time=@startTime,end_time=@endTime,mode=@mode,location=@location,note=@note,is_active=@isActive,updated_at=SYSUTCDATETIME()
       OUTPUT INSERTED.id,INSERTED.coach_id,INSERTED.exception_date,INSERTED.exception_type,INSERTED.start_time,INSERTED.end_time,INSERTED.mode,INSERTED.location,INSERTED.note,INSERTED.is_active
       WHERE id=@exceptionId AND coach_id=@coachId`,
      { exceptionId, coachId, exceptionDate: merged.exceptionDate, exceptionType: merged.exceptionType, startTime: merged.startTime ?? null, endTime: merged.endTime ?? null, mode: merged.mode ?? null, location: merged.location ?? null, note: merged.note ?? null, isActive: merged.isActive !== false },
    );
    await tx.commit();
    return mapException(updated.recordset[0]);
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve original error */ }
    if (error instanceof AppError) throw error;
    if ((error as { number?: number }).number === 2601 || (error as { number?: number }).number === 2627) throw new AppError(409, 'Availability exception already exists', 'AVAILABILITY_EXCEPTION_CONFLICT');
    throw error;
  }
}

export async function deleteException(coachId: number, exceptionId: number): Promise<void> {
  if (!Number.isSafeInteger(exceptionId) || exceptionId <= 0) throw new AppError(400, 'Exception ID must be a positive integer');
  const pool = await getPool();
  const result = await execute<{ id: number }>(pool, 'DELETE FROM dbo.CoachAvailabilityExceptions OUTPUT DELETED.id WHERE id=@exceptionId AND coach_id=@coachId', { exceptionId, coachId });
  if (!result.recordset[0]) throw new AppError(404, 'Availability exception not found');
}
