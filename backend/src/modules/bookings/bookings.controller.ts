import { Request, Response, NextFunction } from 'express';
import { getPool, query, sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import {
  addMinutesToTime,
  assertBookingDate,
  assertBookingStartTime,
  assertFutureBooking,
  BookingStatus,
  COACH_BOOKING_TIME_ZONE,
  isFutureLocalDateTime,
  isDateString,
  isValidBookingTransition,
  normalizeSqlDate,
  normalizeSqlDateTime,
  normalizeSqlTime,
} from '../../utils/coachBooking';
import { getCoaches as getPublicCoaches, getCoachAvailability as getPublicCoachAvailability } from '../coaches/coach.controller';
import { assertBookableSlot, type AvailabilitySlot, type BookableAvailabilityMode } from '../coaches/coach-availability.service';
import { getActiveMembershipPlan, getActiveMembershipPlanForTransaction } from '../plans/entitlements.service';
import { todayInTimeZone } from '../../utils/timezone';
import { createNotification } from '../notifications/notifications.service';

export const getCoaches = getPublicCoaches;
export const getCoachAvailability = getPublicCoachAvailability;

interface NormalizedCreateBooking {
  coach_id: number;
  booking_date: string;
  start_time: string;
  end_time?: string;
  session_mode?: BookableAvailabilityMode;
  notes?: string;
}

export interface BookingRow {
  id: number;
  coach_id: number;
  member_id: number;
  booking_date: string | Date;
  start_time: unknown;
  end_time: unknown;
  session_mode: AvailabilitySlot['mode'] | null;
  location: string | null;
  status: BookingStatus;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  member_name?: string;
  coach_name?: string;
  coach_avatar_url?: string | null;
}

export interface BookingDto {
  id: number;
  coach_id: number;
  member_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  session_mode: AvailabilitySlot['mode'] | null;
  location: string | null;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  member_name?: string | null;
  coach_name?: string | null;
  coach_avatar_url?: string | null;
}

interface CoachRow { id: number }

function sqlConflict(error: unknown): boolean {
  const diagnostic = error as { number?: number };
  return diagnostic.number === 2601 || diagnostic.number === 2627;
}

export function mapBooking(row: BookingRow): BookingDto {
  const status = row.status;
  if (!['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) {
    throw new AppError(500, 'Invalid booking status');
  }
  return {
    id: Number(row.id),
    coach_id: Number(row.coach_id),
    member_id: Number(row.member_id),
    booking_date: normalizeSqlDate(row.booking_date),
    start_time: normalizeSqlTime(row.start_time),
    end_time: normalizeSqlTime(row.end_time),
    session_mode: row.session_mode ?? null,
    location: row.location ?? null,
    status,
    notes: row.notes ?? null,
    created_at: normalizeSqlDateTime(row.created_at),
    updated_at: normalizeSqlDateTime(row.updated_at),
    ...(row.member_name !== undefined ? { member_name: row.member_name ?? null } : {}),
    ...(row.coach_name !== undefined ? { coach_name: row.coach_name ?? null } : {}),
    ...(row.coach_avatar_url !== undefined ? { coach_avatar_url: row.coach_avatar_url ?? null } : {}),
  };
}

function bookingSelect(scope: string): string {
  return `SELECT b.id,b.coach_id,b.member_id,b.booking_date,b.start_time,b.end_time,b.session_mode,b.location,b.status,b.notes,b.created_at,b.updated_at,
                 m.name AS member_name,c.name AS coach_name,c.avatar_url AS coach_avatar_url
          FROM dbo.Bookings b
          JOIN dbo.Users m ON m.id=b.member_id
          JOIN dbo.Users c ON c.id=b.coach_id
          WHERE ${scope}`;
}

function scopeForRole(role: string, userId: number): { clause: string; params: Record<string, unknown> } {
  if (role === 'coach') return { clause: 'b.coach_id=@userId', params: { userId } };
  if (role === 'member') return { clause: 'b.member_id=@userId', params: { userId } };
  if (role === 'admin') return { clause: '1=1', params: {} };
  throw new AppError(403, 'Forbidden');
}

function parseBookingFilters(req: Request): { statusFilter: string; dateFilter: string; params: Record<string, unknown> } {
  const statusText = typeof req.query.status === 'string' ? req.query.status : '';
  const statuses = statusText ? statusText.split(',').filter(Boolean) : [];
  const validStatuses = new Set<BookingStatus>(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']);
  if (statuses.some(status => !validStatuses.has(status as BookingStatus))) throw new AppError(400, 'Invalid booking status filter');
  const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : '';
  const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : '';
  if (fromDate && !isDateString(fromDate)) throw new AppError(400, 'fromDate must be a valid YYYY-MM-DD date');
  if (toDate && !isDateString(toDate)) throw new AppError(400, 'toDate must be a valid YYYY-MM-DD date');
  if (fromDate && toDate && fromDate > toDate) throw new AppError(400, 'fromDate must not be after toDate');
  const statusParams = Object.fromEntries(statuses.map((status, index) => [`status${index}`, status]));
  const statusFilter = statuses.length ? ` AND b.status IN (${statuses.map((_, index) => `@status${index}`).join(',')})` : '';
  const dateFilter = `${fromDate ? ' AND b.booking_date>=@fromDate' : ''}${toDate ? ' AND b.booking_date<=@toDate' : ''}`;
  return { statusFilter, dateFilter, params: { ...statusParams, ...(fromDate ? { fromDate } : {}), ...(toDate ? { toDate } : {}) } };
}

function localTimeInTimeZone(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

export interface CoachBookingQuota {
  included: boolean;
  monthlyLimit: number | null;
  used: number;
  remaining: number | null;
  bookingMonth: string;
  timezone: string;
  reason?: 'COACH_BOOKING_NOT_INCLUDED';
}

interface MonthBounds { start: string; next: string; label: string }

function monthBounds(bookingDate: string): MonthBounds {
  const [year, month] = bookingDate.split('-').map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    start: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`,
    next: `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-01`,
    label: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`,
  };
}

function executorRequest(executor: sql.ConnectionPool | sql.Transaction): sql.Request {
  return executor instanceof sql.Transaction ? new sql.Request(executor) : executor.request();
}

async function readCoachBookingQuota(
  executor: sql.ConnectionPool | sql.Transaction,
  memberId: number,
  bookingDate: string,
): Promise<CoachBookingQuota> {
  const membershipPlan = executor instanceof sql.Transaction
    ? await getActiveMembershipPlanForTransaction(executor, memberId)
    : await getActiveMembershipPlan(memberId);
  const bounds = monthBounds(bookingDate);
  const notIncluded = (used = 0): CoachBookingQuota => ({
    included: false,
    monthlyLimit: 0,
    used,
    remaining: 0,
    bookingMonth: bounds.label,
    timezone: COACH_BOOKING_TIME_ZONE,
    reason: 'COACH_BOOKING_NOT_INCLUDED',
  });
  if (!membershipPlan) return notIncluded();

  const enabled = membershipPlan.entitlements.find(item => item.entitlement_key === 'COACH_BOOKING_ENABLED');
  const limit = membershipPlan.entitlements.find(item => item.entitlement_key === 'COACH_BOOKING_MONTHLY_LIMIT');
  const unlimited = limit?.value_type === 'UNLIMITED' && limit.entitlement_value === '-1';
  const monthlyLimit = limit && limit.value_type === 'INTEGER' ? Number(limit.entitlement_value) : unlimited ? null : Number.NaN;
  const finiteLimitValid = monthlyLimit !== null && Number.isInteger(monthlyLimit) && monthlyLimit >= 0;
  if (enabled?.entitlement_value !== 'true' || (!unlimited && !finiteLimitValid)) return notIncluded();

  const usedResult = await executorRequest(executor)
    .input('quotaMemberId', sql.Int, memberId)
    .input('quotaMonthStart', sql.Date, bounds.start)
    .input('quotaNextMonth', sql.Date, bounds.next)
    .query<{ used: number }>(`SELECT COUNT_BIG(*) AS used
      FROM dbo.Bookings WITH (UPDLOCK,HOLDLOCK)
      WHERE member_id=@quotaMemberId AND booking_date>=@quotaMonthStart AND booking_date<@quotaNextMonth`);
  const used = Number(usedResult.recordset[0]?.used ?? 0);
  return {
    included: true,
    monthlyLimit: unlimited ? null : Number(monthlyLimit),
    used,
    remaining: unlimited ? null : Math.max(Number(monthlyLimit) - used, 0),
    bookingMonth: bounds.label,
    timezone: COACH_BOOKING_TIME_ZONE,
  };
}

export async function getBookingQuota(req: Request, res: Response, next: NextFunction) {
  try {
    const date = typeof req.query.date === 'string' && req.query.date ? req.query.date : todayInTimeZone(COACH_BOOKING_TIME_ZONE);
    assertBookingDate(date);
    sendSuccess(res, await readCoachBookingQuota(await getPool(), req.user!.userId, date), 'Coach booking quota fetched');
  } catch (error) {
    next(error);
  }
}

/** Create a real pending appointment. Identity is always derived from the authenticated Member. */
export async function createBooking(req: Request, res: Response, next: NextFunction) {
  const body = req.body as NormalizedCreateBooking;
  const coachId = Number(body.coach_id);
  const memberId = req.user!.userId;
  try {
    assertBookingDate(body.booking_date);
    assertBookingStartTime(body.start_time);
    assertFutureBooking(body.booking_date, body.start_time);
    const endTime = addMinutesToTime(body.start_time, 60);
    if (body.end_time && body.end_time !== endTime) throw new AppError(400, 'Appointments have a fixed 60-minute duration');
    const note = body.notes?.trim() || null;
    const tx = (await getPool()).transaction();
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const quota = await readCoachBookingQuota(tx, memberId, body.booking_date);
      if (!quota.included) throw new AppError(403, 'Coach booking is not included in the active Membership', 'COACH_BOOKING_NOT_INCLUDED');
      if (quota.remaining !== null && quota.remaining <= 0) throw new AppError(409, 'Monthly Coach booking quota has been reached', 'COACH_BOOKING_QUOTA_EXCEEDED');

      const coach = await new sql.Request(tx)
        .input('coachId', sql.Int, coachId)
        .query<CoachRow>(
          `SELECT u.id
           FROM dbo.Users u WITH (UPDLOCK,HOLDLOCK)
           LEFT JOIN dbo.CoachProfiles cp ON cp.coach_id=u.id
           WHERE u.id=@coachId AND u.role=N'coach' AND u.is_active=1
             AND COALESCE(u.coach_status,N'ACTIVE')=N'ACTIVE'
             AND COALESCE(cp.booking_enabled,1)=1`,
      );
      if (!coach.recordset[0]) throw new AppError(404, 'Coach not found or booking is disabled');
      const authoritativeSlot = await assertBookableSlot(tx, coachId, body.booking_date, body.start_time, endTime, body.session_mode);

      // Range locks protect the overlap checks while the filtered unique index protects exact duplicates.
      const coachConflict = await new sql.Request(tx)
        .input('coachId', sql.Int, coachId)
        .input('bookingDate', sql.Date, body.booking_date)
        .input('startTime', sql.VarChar(5), body.start_time)
        .input('endTime', sql.VarChar(5), endTime)
        .query<{ id: number }>(
          `SELECT TOP 1 id FROM dbo.Bookings WITH (UPDLOCK,HOLDLOCK)
           WHERE coach_id=@coachId AND booking_date=@bookingDate
             AND status IN (N'pending',N'confirmed')
             AND start_time < @endTime AND end_time > @startTime`,
        );
      if (coachConflict.recordset[0]) throw new AppError(409, 'Coach has an overlapping appointment');

      const memberConflict = await new sql.Request(tx)
        .input('memberId', sql.Int, memberId)
        .input('bookingDate', sql.Date, body.booking_date)
        .input('startTime', sql.VarChar(5), body.start_time)
        .input('endTime', sql.VarChar(5), endTime)
        .query<{ id: number }>(
          `SELECT TOP 1 id FROM dbo.Bookings WITH (UPDLOCK,HOLDLOCK)
           WHERE member_id=@memberId AND booking_date=@bookingDate
             AND status IN (N'pending',N'confirmed')
             AND start_time < @endTime AND end_time > @startTime`,
        );
      if (memberConflict.recordset[0]) throw new AppError(409, 'Member has an overlapping appointment');

      const inserted = await new sql.Request(tx)
        .input('coachId', sql.Int, coachId)
        .input('memberId', sql.Int, memberId)
        .input('bookingDate', sql.Date, body.booking_date)
        .input('startTime', sql.VarChar(5), body.start_time)
        .input('endTime', sql.VarChar(5), endTime)
        .input('sessionMode', sql.NVarChar(20), authoritativeSlot.mode)
        .input('location', sql.NVarChar(255), authoritativeSlot.location)
        .input('notes', sql.NVarChar(500), note)
        .query<BookingRow>(
          `INSERT dbo.Bookings(coach_id,member_id,booking_date,start_time,end_time,session_mode,location,status,notes,created_at,updated_at)
           OUTPUT INSERTED.*
           VALUES(@coachId,@memberId,@bookingDate,@startTime,@endTime,@sessionMode,@location,N'pending',@notes,SYSUTCDATETIME(),SYSUTCDATETIME())`,
        );
      await createNotification(tx, {
        recipientUserId: coachId,
        type: 'BOOKING_CREATED',
        title: 'New Coach booking request',
        message: `A Member requested a Coach appointment on ${body.booking_date} at ${body.start_time}.`,
        actionUrl: '/coach/appointments',
        deduplicationKey: `booking:${Number(inserted.recordset[0].id)}:created`,
      });
      await tx.commit();
      sendSuccess(res, mapBooking(inserted.recordset[0]), 'Booking created', 201);
    } catch (error) {
      try { await tx.rollback(); } catch { /* preserve the original error */ }
      if (sqlConflict(error)) throw new AppError(409, 'The selected appointment slot is no longer available');
      throw error;
    }
  } catch (error) {
    next(error);
  }
}

export async function getMyBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.user!.role;
    const { clause, params } = scopeForRole(role, req.user!.userId);
    const filters = parseBookingFilters(req);
    const pageValue = Number(req.query.page);
    const limitValue = Number(req.query.limit);
    const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isSafeInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : 50;
    const offset = (page - 1) * limit;
    const list = await query<BookingRow>(
      `${bookingSelect(`${clause}${filters.statusFilter}${filters.dateFilter}`)} ORDER BY b.booking_date ASC,b.start_time ASC,b.id ASC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, ...filters.params, offset, limit },
    );
    const total = await query<{ total: number }>(`SELECT COUNT(*) AS total FROM dbo.Bookings b WHERE ${clause}${filters.statusFilter}${filters.dateFilter}`, { ...params, ...filters.params });
    sendSuccess(res, list.recordset.map(mapBooking), 'Bookings fetched', 200, { pagination: { page, limit, total: Number(total.recordset[0]?.total ?? 0), totalPages: Math.ceil(Number(total.recordset[0]?.total ?? 0) / limit) } });
  } catch (error) {
    next(error);
  }
}

export async function getBookingSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { clause, params } = scopeForRole(req.user!.role, req.user!.userId);
    const filters = parseBookingFilters(req);
    const today = todayInTimeZone('Asia/Ho_Chi_Minh');
    const localTime = localTimeInTimeZone('Asia/Ho_Chi_Minh');
    const result = await query<{
      total: number; pending: number; confirmed: number; completed: number; cancelled: number; no_show: number; upcoming: number; today: number;
    }>(
      `SELECT COUNT_BIG(*) AS total,
              SUM(CASE WHEN b.status=N'pending' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN b.status=N'confirmed' THEN 1 ELSE 0 END) AS confirmed,
              SUM(CASE WHEN b.status=N'completed' THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN b.status=N'cancelled' THEN 1 ELSE 0 END) AS cancelled,
              SUM(CASE WHEN b.status=N'no_show' THEN 1 ELSE 0 END) AS no_show,
              SUM(CASE WHEN b.status IN (N'pending',N'confirmed') AND (b.booking_date>@today OR (b.booking_date=@today AND CONVERT(char(5),b.start_time,108)>=@localTime)) THEN 1 ELSE 0 END) AS upcoming,
              SUM(CASE WHEN b.status IN (N'pending',N'confirmed') AND b.booking_date=@today THEN 1 ELSE 0 END) AS today
       FROM dbo.Bookings b
       WHERE ${clause}${filters.statusFilter}${filters.dateFilter}`,
      { ...params, ...filters.params, today, localTime },
    );
    const row = result.recordset[0];
    sendSuccess(res, {
      total: Number(row?.total ?? 0),
      pending: Number(row?.pending ?? 0),
      confirmed: Number(row?.confirmed ?? 0),
      completed: Number(row?.completed ?? 0),
      cancelled: Number(row?.cancelled ?? 0),
      no_show: Number(row?.no_show ?? 0),
      upcoming: Number(row?.upcoming ?? 0),
      today: Number(row?.today ?? 0),
      asOfDate: today,
      timezone: 'Asia/Ho_Chi_Minh',
    }, 'Booking summary fetched');
  } catch (error) {
    next(error);
  }
}

export async function getBookingById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new AppError(400, 'Booking ID must be a positive integer');
    const { clause, params } = scopeForRole(req.user!.role, req.user!.userId);
    const result = await query<BookingRow>(`${bookingSelect(`b.id=@id AND ${clause}`)}`, { id, ...params });
    if (!result.recordset[0]) throw new AppError(404, 'Booking not found');
    sendSuccess(res, mapBooking(result.recordset[0]));
  } catch (error) {
    next(error);
  }
}

export async function updateBookingStatus(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  const requestedStatus = (req.body as { status: BookingStatus }).status;
  try {
    if (!Number.isSafeInteger(id) || id <= 0) throw new AppError(400, 'Booking ID must be a positive integer');
    const role = req.user!.role;
    const tx = (await getPool()).transaction();
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const ownership = role === 'coach' ? ' AND coach_id=@userId' : role === 'member' ? ' AND member_id=@userId' : role === 'admin' ? '' : ' AND 1=0';
      const current = await new sql.Request(tx)
        .input('id', sql.Int, id)
        .input('userId', sql.Int, req.user!.userId)
        .query<BookingRow>(`SELECT TOP 1 b.* FROM dbo.Bookings b WITH (UPDLOCK,HOLDLOCK) WHERE b.id=@id${ownership}`);
      if (!current.recordset[0]) throw new AppError(404, 'Booking not found');
      const booking = current.recordset[0];
      const currentStatus = booking.status;
      if (role === 'member' && requestedStatus !== 'cancelled') throw new AppError(403, 'Members may only cancel their own bookings');
      if (!isValidBookingTransition(currentStatus, requestedStatus)) throw new AppError(409, 'Invalid booking status transition');

      const date = normalizeSqlDate(booking.booking_date);
      const startTime = normalizeSqlTime(booking.start_time);
      const endTime = normalizeSqlTime(booking.end_time);
      if (requestedStatus === 'confirmed' && !isFutureLocalDateTime(date, startTime)) throw new AppError(409, 'Past bookings cannot be confirmed');
      if (requestedStatus === 'completed' && isFutureLocalDateTime(date, startTime)) throw new AppError(409, 'Booking cannot be completed before its start time');
      if (requestedStatus === 'no_show' && isFutureLocalDateTime(date, endTime)) throw new AppError(409, 'No-show can only be marked after the appointment');

      const update = await new sql.Request(tx)
        .input('id', sql.Int, id)
        .input('status', sql.VarChar(20), requestedStatus)
        .input('currentStatus', sql.VarChar(20), currentStatus)
        .input('userId', sql.Int, req.user!.userId)
        .query<BookingRow>(
          `UPDATE dbo.Bookings
           SET status=@status,updated_at=SYSUTCDATETIME()
           OUTPUT INSERTED.*
           WHERE id=@id AND status=@currentStatus${ownership}`,
        );
      if (!update.recordset[0]) throw new AppError(409, 'Booking was changed by another request');
      const recipientUserId = role === 'member' ? Number(booking.coach_id) : Number(booking.member_id);
      await createNotification(tx, {
        recipientUserId,
        type: 'BOOKING_STATUS',
        title: 'Coach booking updated',
        message: `Your Coach appointment #${id} is now ${requestedStatus}.`,
        actionUrl: role === 'member' ? '/coach/appointments' : '/appointments',
        deduplicationKey: `booking:${id}:status:${requestedStatus}`,
      });
      await tx.commit();
      sendSuccess(res, mapBooking(update.recordset[0]), 'Booking updated');
    } catch (error) {
      try { await tx.rollback(); } catch { /* preserve the original error */ }
      if (sqlConflict(error)) throw new AppError(409, 'Booking was changed by another request');
      throw error;
    }
  } catch (error) {
    next(error);
  }
}
