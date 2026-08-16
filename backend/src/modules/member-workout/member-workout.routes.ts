import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import * as controller from './member-workout.controller';

const router = Router();
const id = (name: string) => z.object({ [name]: z.coerce.number().int().positive() }).strict();
const page = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) }).strict();
const scheduleList = page.extend({ fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), status: z.enum(['SCHEDULED','IN_PROGRESS','COMPLETED','SKIPPED','CANCELLED']).optional() }).strict();
const progressSessions = page.extend({ fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), status: z.enum(['COMPLETED','ABANDONED']).optional(), programId: z.coerce.number().int().positive().optional(), day: z.string().trim().max(200).optional() }).strict();
const setBody = z.object({
  set_number: z.number().int().positive().optional(),
  reps: z.number().int().min(0).max(10000).nullable().optional(),
  weight_kg: z.number().finite().min(0).max(100000).nullable().optional(),
  duration_seconds: z.number().int().min(0).max(86400).nullable().optional(),
  distance_meters: z.number().finite().min(0).max(1000000).nullable().optional(),
  completed: z.boolean().optional(),
  note: z.string().trim().max(500).nullable().optional(),
}).strict();
const postSetBody = setBody.extend({ set_number: z.number().int().positive() }).strict();
const patchSetBody = setBody.refine(value => Object.keys(value).length > 0, { message: 'At least one set field is required' });
const sessionExerciseParams = z.object({ sessionId: z.coerce.number().int().positive(), sessionExerciseId: z.coerce.number().int().positive() }).strict();
const setParams = sessionExerciseParams.extend({ setId: z.coerce.number().int().positive() }).strict();

router.use(authenticate, authorize(UserRole.MEMBER));
router.get('/current', controller.getCurrent);
router.get('/schedules', validate(scheduleList, 'query'), controller.listSchedules);
router.get('/schedules/:scheduleId', validate(id('scheduleId'), 'params'), controller.getSchedule);
router.post('/schedules/:scheduleId/start', validate(id('scheduleId'), 'params'), controller.startSession);
router.get('/sessions', validate(page, 'query'), controller.listSessions);
router.get('/progress/sessions', validate(progressSessions, 'query'), controller.listProgressSessions);
router.get('/sessions/:sessionId', validate(id('sessionId'), 'params'), controller.getSession);
router.post('/sessions/:sessionId/complete', validate(id('sessionId'), 'params'), controller.completeSession);
router.post('/sessions/:sessionId/abandon', validate(id('sessionId'), 'params'), controller.abandonSession);
router.post('/sessions/:sessionId/exercises/:sessionExerciseId/sets', validate(sessionExerciseParams, 'params'), validate(postSetBody), controller.createSet);
router.patch('/sessions/:sessionId/exercises/:sessionExerciseId/sets/:setId', validate(setParams, 'params'), validate(patchSetBody), controller.updateSet);
router.delete('/sessions/:sessionId/exercises/:sessionExerciseId/sets/:setId', validate(setParams, 'params'), controller.deleteSet);
router.get('/progress', controller.getProgress);
router.get('/progress/exercises/:exerciseId', validate(id('exerciseId'), 'params'), controller.getExerciseProgress);
export default router;
