import { AppError } from '../../middleware/errorHandler';
import {
  addMinutesToTime,
  assertBookingDate,
  assertBookingStartTime,
  assertFutureBooking,
  COACH_BOOKING_DURATION_MINUTES,
  COACH_BOOKING_MAX_DAYS,
  COACH_BOOKING_TIME_ZONE,
  intervalsOverlap,
  isFutureLocalDateTime,
  type BookingStatus,
} from '../../utils/coachBooking';
import { todayInTimeZone } from '../../utils/timezone';

export const BOOKING_DURATION_MINUTES = COACH_BOOKING_DURATION_MINUTES;
export const BOOKING_MAX_DAYS = COACH_BOOKING_MAX_DAYS;
export const BOOKING_TIME_ZONE = COACH_BOOKING_TIME_ZONE;

export function assertBookingDateWithinWindow(date: string): void {
  assertBookingDate(date);
}

export function assertCreateBookingTime(date: string, startTime: string): void {
  assertBookingDate(date);
  assertBookingStartTime(startTime);
  assertFutureBooking(date, startTime);
}

export function calculateBookingEndTime(startTime: string): string {
  return addMinutesToTime(startTime, BOOKING_DURATION_MINUTES);
}

export function assertStatusTime(
  status: BookingStatus,
  date: string,
  startTime: string,
  endTime: string,
): void {
  if (status === 'confirmed' && !isFutureLocalDateTime(date, startTime)) {
    throw new AppError(409, 'Past bookings cannot be confirmed');
  }
  if (status === 'completed' && isFutureLocalDateTime(date, startTime)) {
    throw new AppError(409, 'Booking cannot be completed before its start time');
  }
  if (status === 'no_show' && isFutureLocalDateTime(date, endTime)) {
    throw new AppError(409, 'No-show can only be marked after the appointment');
  }
}

export function bookingToday(now = new Date()): string {
  return todayInTimeZone(BOOKING_TIME_ZONE, now);
}

export function bookingLocalTime(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BOOKING_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

/** Pure in-memory overlap calculation; DB overlap predicates remain authoritative under transaction locks. */
export function bookingIntervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return intervalsOverlap(startA, endA, startB, endB);
}
