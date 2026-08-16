import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import * as controller from './admin-coaches.controller';

const router = Router();
const coachId = z.object({ coachId: z.coerce.number().int().positive() }).strict();
const memberId = z.object({ coachId: z.coerce.number().int().positive(), memberId: z.coerce.number().int().positive() }).strict();
const list = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20), search: z.string().trim().max(100).optional() }).strict();
const coachList = list.extend({ status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional() }).strict();
const status = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']), reason: z.string().trim().max(500).optional().nullable() }).strict();
const empty = z.object({}).strict();
const reassignment = z.object({
  newCoachId: z.number().int().positive(), programId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  scheduleTimezone: z.string().trim().min(1).max(64), note: z.string().trim().max(2000).optional().nullable(),
}).strict();

router.use(authenticate, authorize(UserRole.ADMIN));
router.get('/summary', controller.summary);
router.get('/', validate(coachList, 'query'), controller.list);
router.get('/coach-members/unassigned', validate(list, 'query'), controller.unassigned);
router.get('/:coachId', validate(coachId, 'params'), controller.detail);
router.get('/:coachId/members', validate(coachId, 'params'), validate(list, 'query'), controller.members);
router.patch('/:coachId/status', validate(coachId, 'params'), validate(status), controller.status);
router.post('/:coachId/members/:memberId/assign', validate(memberId, 'params'), validate(empty), controller.assign);
router.post('/:coachId/members/:memberId/reassign', validate(memberId, 'params'), validate(reassignment), controller.reassign);

export default router;
