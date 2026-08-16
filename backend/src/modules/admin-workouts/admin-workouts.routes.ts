import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import * as controller from './admin-workouts.controller';

const router = Router();
const query = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20), coachId: z.coerce.number().int().positive().optional(), memberId: z.coerce.number().int().positive().optional(), status: z.string().trim().max(20).optional(), fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), q: z.string().trim().max(100).optional() }).strict();
router.use(authenticate, authorize(UserRole.ADMIN));
router.get('/programs', validate(query, 'query'), controller.programs);
router.get('/assignments', validate(query, 'query'), controller.assignments);
router.get('/schedules', validate(query, 'query'), controller.schedules);
router.get('/sessions', validate(query, 'query'), controller.sessions);
router.get('/progress', validate(query, 'query'), controller.progress);
export default router;
