import assert from 'node:assert/strict';
import {
  addMinutesToTime,
  assertBookingDate,
  assertBookingStartTime,
  COACH_BOOKING_DURATION_MINUTES,
  COACH_BOOKING_MAX_DAYS,
  COACH_BOOKING_TIME_ZONE,
  intervalsOverlap,
  isFutureLocalDateTime,
  isValidBookingTransition,
  normalizeSqlDate,
  normalizeSqlDateTime,
  normalizeSqlTime,
  timeToMinutes,
} from '../utils/coachBooking';
import { mapBooking } from '../modules/bookings/bookings.controller';
import { todayInTimeZone } from '../utils/timezone';

const now = new Date('2026-08-04T03:00:00.000Z'); // 10:00 in Asia/Ho_Chi_Minh
const today = todayInTimeZone(COACH_BOOKING_TIME_ZONE, now);

assert.equal(today, '2026-08-04');
assert.equal(COACH_BOOKING_DURATION_MINUTES, 60);
assert.equal(timeToMinutes('10:30'), 630);
assert.equal(addMinutesToTime('17:00', 60), '18:00');
assert.equal(intervalsOverlap('10:00', '11:00', '10:30', '11:30'), true);
assert.equal(intervalsOverlap('10:00', '11:00', '11:00', '12:00'), false);
assert.equal(isFutureLocalDateTime('2026-08-04', '11:00', now), true);
assert.equal(isFutureLocalDateTime('2026-08-04', '09:00', now), false);
assert.doesNotThrow(() => assertBookingDate(today, now));
assert.doesNotThrow(() => assertBookingStartTime('17:00'));
assert.doesNotThrow(() => assertBookingStartTime('10:30'));
assert.throws(() => assertBookingStartTime('23:30'));
assert.throws(() => assertBookingDate('2026-08-03', now));

const maxDate = new Date(Date.parse(`${today}T00:00:00Z`) + COACH_BOOKING_MAX_DAYS * 86400000).toISOString().slice(0, 10);
assert.doesNotThrow(() => assertBookingDate(maxDate, now));
const outsideDate = new Date(Date.parse(`${today}T00:00:00Z`) + (COACH_BOOKING_MAX_DAYS + 1) * 86400000).toISOString().slice(0, 10);
assert.throws(() => assertBookingDate(outsideDate, now));

assert.equal(isValidBookingTransition('pending', 'confirmed'), true);
assert.equal(isValidBookingTransition('pending', 'completed'), false);
assert.equal(isValidBookingTransition('confirmed', 'completed'), true);
assert.equal(isValidBookingTransition('completed', 'cancelled'), false);

assert.equal(normalizeSqlTime('09:30:00.0000000'), '09:30');
assert.equal(normalizeSqlTime(34_200_000), '09:30');
assert.equal(normalizeSqlTime(new Date('1970-01-01T09:30:00.000Z')), '09:30');
assert.throws(() => normalizeSqlTime('not-a-time'));
assert.equal(normalizeSqlDate(new Date('2026-08-04T00:00:00.000Z')), '2026-08-04');
assert.equal(normalizeSqlDate('2026-08-04T00:00:00.000Z'), '2026-08-04');
assert.equal(normalizeSqlDateTime('2026-08-04 03:00:00.000'), '2026-08-04T03:00:00.000Z');
assert.equal(normalizeSqlDateTime(new Date('2026-08-04T03:00:00.000Z')), '2026-08-04T03:00:00.000Z');
assert.throws(() => normalizeSqlDate('2026-02-30'));
assert.throws(() => normalizeSqlDateTime('not-a-datetime'));

const dto = mapBooking({
  id: 9,
  coach_id: 2,
  member_id: 3,
  booking_date: new Date('2026-08-04T00:00:00.000Z'),
  start_time: '09:00:00',
  end_time: 36_000_000,
  session_mode: 'ONLINE',
  location: 'Online',
  status: 'pending',
  notes: null,
  created_at: new Date('2026-08-03T04:00:00.000Z'),
  updated_at: '2026-08-03 04:00:00.000',
  member_name: 'Member',
  coach_name: 'Coach',
  coach_avatar_url: null,
});
assert.deepEqual(dto, {
  id: 9,
  coach_id: 2,
  member_id: 3,
  booking_date: '2026-08-04',
  start_time: '09:00',
  end_time: '10:00',
  session_mode: 'ONLINE',
  location: 'Online',
  status: 'pending',
  notes: null,
  created_at: '2026-08-03T04:00:00.000Z',
  updated_at: '2026-08-03T04:00:00.000Z',
  member_name: 'Member',
  coach_name: 'Coach',
  coach_avatar_url: null,
});

console.log('COACH_BOOKING_UNIT PASS');
