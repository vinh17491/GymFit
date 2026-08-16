import { AppError } from '../middleware/errorHandler';
import { todayInTimeZone } from './timezone';

export const COACH_BOOKING_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const COACH_BOOKING_DURATION_MINUTES = 60;
export const COACH_BOOKING_MAX_DAYS = 90;

export const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const BUSINESS_TIME_ZONE_OFFSET_MINUTES = 7 * 60;

export function isDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isTimeString(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function timeToMinutes(value: string): number {
  if (!isTimeString(value)) return Number.NaN;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function addMinutesToTime(value: string, minutes: number): string {
  const total = timeToMinutes(value) + minutes;
  if (!Number.isFinite(total) || total < 0 || total >= 24 * 60) throw new AppError(400, 'Booking time is outside the valid day');
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function localDateTimeMs(date: string, time: string): number {
  if (!isDateString(date) || !isTimeString(time)) return Number.NaN;
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes) - BUSINESS_TIME_ZONE_OFFSET_MINUTES * 60 * 1000;
}

export function isFutureLocalDateTime(date: string, time: string, now = new Date()): boolean {
  const timestamp = localDateTimeMs(date, time);
  return Number.isFinite(timestamp) && timestamp > now.getTime();
}

export function isDateWithinBookingWindow(date: string, now = new Date()): boolean {
  if (!isDateString(date)) return false;
  const today = todayInTimeZone(COACH_BOOKING_TIME_ZONE, now);
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  const [year, month, day] = date.split('-').map(Number);
  const todayUtc = Date.UTC(todayYear, todayMonth - 1, todayDay);
  const targetUtc = Date.UTC(year, month - 1, day);
  const difference = Math.round((targetUtc - todayUtc) / 86400000);
  return difference >= 0 && difference <= COACH_BOOKING_MAX_DAYS;
}

export function assertBookingDate(date: string, now = new Date()): void {
  if (!isDateString(date)) throw new AppError(400, 'date must be a valid YYYY-MM-DD date');
  if (!isDateWithinBookingWindow(date, now)) {
    throw new AppError(400, `date must be between today and ${COACH_BOOKING_MAX_DAYS} days from today`);
  }
}

export function assertBookingStartTime(startTime: string): void {
  if (!isTimeString(startTime) || timeToMinutes(startTime) + COACH_BOOKING_DURATION_MINUTES >= 24 * 60) {
    throw new AppError(400, 'startTime must be a valid 60-minute Coach slot');
  }
}

export function assertFutureBooking(date: string, startTime: string, now = new Date()): void {
  if (!isFutureLocalDateTime(date, startTime, now)) throw new AppError(400, 'Booking must be in the future');
}

export function intervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return Number.isFinite(aStart) && Number.isFinite(aEnd) && Number.isFinite(bStart) && Number.isFinite(bEnd)
    && aStart < bEnd && aEnd > bStart;
}

export function isValidBookingTransition(current: BookingStatus, next: BookingStatus): boolean {
  const transitions: Record<BookingStatus, readonly BookingStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled', 'no_show'],
    completed: [],
    cancelled: [],
    no_show: [],
  };
  return transitions[current].includes(next);
}

export function normalizeSqlTime(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new AppError(500, 'Invalid SQL time value');
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  }
  if (typeof value === 'string') {
    const text = value.trim();
    const match = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(text);
    if (match && Number(match[1]) < 24 && Number(match[2]) < 60) return `${match[1]}:${match[2]}`;
    throw new AppError(500, 'Invalid SQL time value');
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    // SQL TIME values are normally strings, but drivers may expose milliseconds
    // (or, for small values, seconds) from midnight. Reject out-of-range values
    // instead of truncating a malformed value into a different appointment slot.
    const milliseconds = value >= 86_400 ? value : value * 1000;
    if (milliseconds < 0 || milliseconds >= 86_400_000) throw new AppError(500, 'Invalid SQL time value');
    const totalMinutes = Math.floor(milliseconds / 60_000);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  }
  throw new AppError(500, 'Invalid SQL time value');
}

export function normalizeSqlDate(value: unknown): string {
  let text: string;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new AppError(500, 'Invalid SQL date value');
    text = `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  } else if (typeof value === 'string') {
    text = value.trim().slice(0, 10);
  } else {
    throw new AppError(500, 'Invalid SQL date value');
  }
  if (!isDateString(text)) throw new AppError(500, 'Invalid SQL date value');
  return text;
}

export function normalizeSqlDateTime(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new AppError(500, 'Invalid SQL datetime value');
    return value.toISOString();
  }
  if (typeof value !== 'string' || !value.trim()) throw new AppError(500, 'Invalid SQL datetime value');
  const text = value.trim();
  const candidate = /(?:Z|[+-]\d{2}:?\d{2})$/.test(text)
    ? text
    : `${text.replace(' ', 'T')}Z`;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) throw new AppError(500, 'Invalid SQL datetime value');
  return date.toISOString();
}
