import { AppError } from '../middleware/errorHandler';

export function assertIanaTimeZone(timeZone: string): void {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format();
  } catch {
    throw new AppError(422, 'schedule_timezone must be a valid IANA timezone');
  }
}

export function todayInTimeZone(timeZone: string, now = new Date()): string {
  assertIanaTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
