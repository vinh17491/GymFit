import { Router } from 'express';
import { getCoaches, getCoachAvailability, createBooking, getMyBookings, getBookingSummary, getBookingQuota, getBookingById, updateBookingStatus } from './bookings.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { UserRole } from '../../types';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
const id = z.object({ id: z.coerce.number().int().positive() }).strict();
const availabilityQuery = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).strict();
const listQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.string().regex(/^(?:pending|confirmed|completed|cancelled|no_show)(?:,(?:pending|confirmed|completed|cancelled|no_show))*$/).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

const canonicalBooking = z.object({
  coachId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  sessionMode: z.enum(['ONLINE', 'IN_PERSON']).optional(),
  note: z.string().trim().max(500).optional(),
}).strict().transform(value => ({
  coach_id: value.coachId,
  booking_date: value.date,
  start_time: value.startTime,
  session_mode: value.sessionMode,
  notes: value.note,
}));

// Short-lived compatibility for existing auth/RBAC callers. The controller enforces the same fixed 60-minute rule.
const legacyBooking = z.object({
  coach_id: z.coerce.number().int().positive(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  end_time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  session_mode: z.enum(['ONLINE', 'IN_PERSON']).optional(),
  notes: z.string().trim().max(500).optional(),
}).strict();
const booking = z.union([canonicalBooking, legacyBooking]);
const status = z.object({ status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']) }).strict();

// Legacy Coach discovery routes delegate to the canonical Coach controller/query.
router.get('/coaches', getCoaches);
router.get('/coaches/:id/availability', validate(id, 'params'), validate(availabilityQuery, 'query'), getCoachAvailability);

router.post('/', authenticate, authorize(UserRole.MEMBER), validate(booking), createBooking);
router.get('/', authenticate, authorize(UserRole.MEMBER, UserRole.COACH, UserRole.ADMIN), validate(listQuery, 'query'), getMyBookings);
router.get('/summary', authenticate, authorize(UserRole.MEMBER, UserRole.COACH, UserRole.ADMIN), validate(listQuery.pick({ fromDate: true, toDate: true }), 'query'), getBookingSummary);
router.get('/quota', authenticate, authorize(UserRole.MEMBER), validate(availabilityQuery, 'query'), getBookingQuota);
router.put('/:id/status', authenticate, authorize(UserRole.MEMBER, UserRole.COACH, UserRole.ADMIN), validate(id, 'params'), validate(status), updateBookingStatus);
router.get('/:id', authenticate, authorize(UserRole.MEMBER, UserRole.COACH, UserRole.ADMIN), validate(id, 'params'), getBookingById);

export default router;
