export const COACH_BOOKING_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export type CoachBookingAction = 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export const bookingStatusLabel: Record<'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show', string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy',
  no_show: 'Vắng mặt',
};

function partsForDate(value: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: COACH_BOOKING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

export function todayInCoachTimeZone(now = new Date()): string {
  const { year, month, day } = partsForDate(now);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function coachDateOptions(days = 14, now = new Date()): Array<{ value: string; label: string }> {
  const { year, month, day } = partsForDate(now);
  const base = Date.UTC(year, month - 1, day);
  return Array.from({ length: days }, (_, index) => {
    const valueDate = new Date(base + index * 86400000);
    const value = `${valueDate.getUTCFullYear()}-${String(valueDate.getUTCMonth() + 1).padStart(2, '0')}-${String(valueDate.getUTCDate()).padStart(2, '0')}`;
    const label = valueDate.toLocaleDateString('vi-VN', {
      timeZone: COACH_BOOKING_TIME_ZONE,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
    return { value, label };
  });
}

export function localCoachDateTimeMs(date: string, time: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d/.test(time)) return Number.NaN;
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes) - 7 * 60 * 60 * 1000;
}

export function isCoachActionAllowed(action: CoachBookingAction, status: keyof typeof bookingStatusLabel, date: string, startTime: string, endTime: string, now = new Date()): boolean {
  if (action === 'cancelled') return status === 'pending' || status === 'confirmed';
  if (action === 'confirmed') return status === 'pending' && localCoachDateTimeMs(date, startTime) > now.getTime();
  if (action === 'completed') return status === 'confirmed' && localCoachDateTimeMs(date, startTime) <= now.getTime();
  return status === 'confirmed' && localCoachDateTimeMs(date, endTime) <= now.getTime();
}

export function displayCoachDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: COACH_BOOKING_TIME_ZONE });
}

export function displayCoachTime(value: string): string {
  return value.slice(0, 5);
}
