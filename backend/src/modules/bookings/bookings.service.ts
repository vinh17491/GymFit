import { getPool, sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import {
  type BookingStatus,
  normalizeSqlDate,
  normalizeSqlDateTime,
  normalizeSqlTime,
} from '../../utils/coachBooking';
import { assertBookableSlot, type AvailabilitySlot, type BookableAvailabilityMode } from '../coaches/coach-availability.service';
import { getActiveMembershipPlan, getActiveMembershipPlanForTransaction } from '../plans/entitlements.service';
import { createNotification } from '../notifications/notifications.service';
import {
  assertCreateBookingQuota,
  assertStatusChangeAllowed,
  assertStatusTransition,
  bookingNotificationTarget,
  bookingStatusOwnership,
} from './bookings.policy';
import {
  assertBookingDateWithinWindow,
  assertCreateBookingTime,
  assertStatusTime,
  bookingLocalTime,
  bookingToday,
  BOOKING_DURATION_MINUTES,
  BOOKING_TIME_ZONE,
  calculateBookingEndTime,
} from './bookings.time-policy';
import {
  coachHasOverlap,
  coachIsBookable,
  countMemberBookingsInMonth,
  findBookingById,
  findBookingForStatusUpdate,
  getBookingSummary as listBookingSummary,
  insertBooking,
  listBookings as listBookingRows,
  memberHasOverlap,
  updateBookingStatus as updateBookingRow,
} from './bookings.repository';

export interface BookingActorInput {
  userId: number;
  role: string;
}

export interface BookingFilters {
  statusFilter: string;
  dateFilter: string;
  params: Record<string, unknown>;
}

export interface CreateBookingInput {
  coachId: number;
  memberId: number;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  sessionMode?: BookableAvailabilityMode;
  notes?: string;
}

export interface BookingListInput {
  actor: BookingActorInput;
  filters: BookingFilters;
  page: number;
  limit: number;
}

export interface BookingSummaryInput {
  actor: BookingActorInput;
  filters: BookingFilters;
}

export interface BookingByIdInput {
  actor: BookingActorInput;
  id: number;
}

export interface UpdateBookingStatusInput extends BookingByIdInput {
  requestedStatus: BookingStatus;
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

export interface BookingListResult {
  items: BookingDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BookingSummary {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
  upcoming: number;
  today: number;
  asOfDate: string;
  timezone: string;
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

function scopeForRole(role: string, userId: number): { clause: string; params: Record<string, unknown> } {
  if (role === 'coach') return { clause: 'b.coach_id=@userId', params: { userId } };
  if (role === 'member') return { clause: 'b.member_id=@userId', params: { userId } };
  if (role === 'admin') return { clause: '1=1', params: {} };
  throw new AppError(403, 'Forbidden');
}

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
    timezone: BOOKING_TIME_ZONE,
    reason: 'COACH_BOOKING_NOT_INCLUDED',
  });
  if (!membershipPlan) return notIncluded();

  const enabled = membershipPlan.entitlements.find(item => item.entitlement_key === 'COACH_BOOKING_ENABLED');
  const limit = membershipPlan.entitlements.find(item => item.entitlement_key === 'COACH_BOOKING_MONTHLY_LIMIT');
  const unlimited = limit?.value_type === 'UNLIMITED' && limit.entitlement_value === '-1';
  const monthlyLimit = limit && limit.value_type === 'INTEGER' ? Number(limit.entitlement_value) : unlimited ? null : Number.NaN;
  const finiteLimitValid = monthlyLimit !== null && Number.isInteger(monthlyLimit) && monthlyLimit >= 0;
  if (enabled?.entitlement_value !== 'true' || (!unlimited && !finiteLimitValid)) return notIncluded();

  const used = await countMemberBookingsInMonth(executor, memberId, bounds.start, bounds.next);
  return {
    included: true,
    monthlyLimit: unlimited ? null : Number(monthlyLimit),
    used,
    remaining: unlimited ? null : Math.max(Number(monthlyLimit) - used, 0),
    bookingMonth: bounds.label,
    timezone: BOOKING_TIME_ZONE,
  };
}

export async function getBookingQuota(memberId: number, date: string): Promise<CoachBookingQuota> {
  assertBookingDateWithinWindow(date);
  return readCoachBookingQuota(await getPool(), memberId, date);
}

/** Orchestrates validation, locking, availability, persistence and notification for one booking. */
export async function createBooking(input: CreateBookingInput): Promise<BookingDto> {
  assertCreateBookingTime(input.bookingDate, input.startTime);
  const endTime = calculateBookingEndTime(input.startTime);
  if (input.endTime && input.endTime !== endTime) throw new AppError(400, `Appointments have a fixed ${BOOKING_DURATION_MINUTES}-minute duration`);
  const note = input.notes?.trim() || null;
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const quota = await readCoachBookingQuota(tx, input.memberId, input.bookingDate);
    assertCreateBookingQuota(quota);

    const coachIsAvailable = await coachIsBookable(tx, input.coachId);
    if (!coachIsAvailable) throw new AppError(404, 'Coach not found or booking is disabled');
    const authoritativeSlot = await assertBookableSlot(tx, input.coachId, input.bookingDate, input.startTime, endTime, input.sessionMode);

    // Range locks protect the overlap checks while the filtered unique index protects exact duplicates.
    const overlapInput = {
      coachId: input.coachId,
      memberId: input.memberId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime,
    };
    if (await coachHasOverlap(tx, overlapInput)) throw new AppError(409, 'Coach has an overlapping appointment');
    if (await memberHasOverlap(tx, overlapInput)) throw new AppError(409, 'Member has an overlapping appointment');

    const inserted = await insertBooking(tx, {
      ...overlapInput,
      sessionMode: authoritativeSlot.mode,
      location: authoritativeSlot.location,
      notes: note,
    });
    await createNotification(tx, {
      recipientUserId: input.coachId,
      type: 'BOOKING_CREATED',
      title: 'New Coach booking request',
      message: `A Member requested a Coach appointment on ${input.bookingDate} at ${input.startTime}.`,
      actionUrl: '/coach/appointments',
      deduplicationKey: `booking:${Number(inserted.id)}:created`,
    });
    await tx.commit();
    return mapBooking(inserted);
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve the original error */ }
    if (sqlConflict(error)) throw new AppError(409, 'The selected appointment slot is no longer available');
    throw error;
  }
}

export async function listBookings(input: BookingListInput): Promise<BookingListResult> {
  const scope = scopeForRole(input.actor.role, input.actor.userId);
  const offset = (input.page - 1) * input.limit;
  const result = await listBookingRows({
    scope,
    statusFilter: input.filters.statusFilter,
    dateFilter: input.filters.dateFilter,
    filterParams: input.filters.params,
    offset,
    limit: input.limit,
  });
  return {
    items: result.rows.map(mapBooking),
    pagination: {
      page: input.page,
      limit: input.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / input.limit),
    },
  };
}

export async function getBookingSummary(input: BookingSummaryInput): Promise<BookingSummary> {
  const scope = scopeForRole(input.actor.role, input.actor.userId);
  const today = bookingToday();
  const localTime = bookingLocalTime();
  const row = await listBookingSummary({
    scope,
    statusFilter: input.filters.statusFilter,
    dateFilter: input.filters.dateFilter,
    filterParams: input.filters.params,
    today,
    localTime,
  });
  return {
    total: Number(row?.total ?? 0),
    pending: Number(row?.pending ?? 0),
    confirmed: Number(row?.confirmed ?? 0),
    completed: Number(row?.completed ?? 0),
    cancelled: Number(row?.cancelled ?? 0),
    no_show: Number(row?.no_show ?? 0),
    upcoming: Number(row?.upcoming ?? 0),
    today: Number(row?.today ?? 0),
    asOfDate: today,
    timezone: BOOKING_TIME_ZONE,
  };
}

export async function getBookingById(input: BookingByIdInput): Promise<BookingDto> {
  const scope = scopeForRole(input.actor.role, input.actor.userId);
  const row = await findBookingById({ id: input.id, scope });
  if (!row) throw new AppError(404, 'Booking not found');
  return mapBooking(row);
}

export async function updateBookingStatus(input: UpdateBookingStatusInput): Promise<BookingDto> {
  const role = input.actor.role;
  const tx = (await getPool()).transaction();
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const ownership = bookingStatusOwnership(role);
    const booking = await findBookingForStatusUpdate(tx, { id: input.id, userId: input.actor.userId, ownership });
    if (!booking) throw new AppError(404, 'Booking not found');
    const currentStatus = booking.status;
    assertStatusChangeAllowed(role, input.requestedStatus);
    assertStatusTransition(currentStatus, input.requestedStatus);

    const date = normalizeSqlDate(booking.booking_date);
    const startTime = normalizeSqlTime(booking.start_time);
    const endTime = normalizeSqlTime(booking.end_time);
    assertStatusTime(input.requestedStatus, date, startTime, endTime);

    const updated = await updateBookingRow(tx, {
      id: input.id,
      userId: input.actor.userId,
      ownership,
      status: input.requestedStatus,
      currentStatus,
    });
    if (!updated) throw new AppError(409, 'Booking was changed by another request');
    const notificationTarget = bookingNotificationTarget(role, booking);
    await createNotification(tx, {
      recipientUserId: notificationTarget.recipientUserId,
      type: 'BOOKING_STATUS',
      title: 'Coach booking updated',
      message: `Your Coach appointment #${input.id} is now ${input.requestedStatus}.`,
      actionUrl: notificationTarget.actionUrl,
      deduplicationKey: `booking:${input.id}:status:${input.requestedStatus}`,
    });
    await tx.commit();
    return mapBooking(updated);
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve the original error */ }
    if (sqlConflict(error)) throw new AppError(409, 'Booking was changed by another request');
    throw error;
  }
}
