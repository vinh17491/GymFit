import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import * as controller from './admin-exercises.controller';

const router = Router();
const id = z.object({ exerciseId: z.coerce.number().int().positive() }).strict();
const list = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20), search: z.string().trim().max(100).optional(), status: z.enum(['ACTIVE', 'INACTIVE']).optional(), muscleGroup: z.string().trim().max(100).optional(), difficulty: z.string().trim().max(40).optional() }).strict();
const url = z.string().trim().max(500).url().nullable().optional();
const body = z.object({ name: z.string().trim().min(1).max(200), slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), description: z.string().trim().max(10000).nullable().optional(), instructions: z.string().trim().max(20000).nullable().optional(), muscle_group: z.string().trim().max(100).nullable().optional(), equipment: z.string().trim().max(100).nullable().optional(), difficulty: z.string().trim().max(20).nullable().optional(), video_url: url, thumbnail_url: url }).strict();
const patch = body.partial().extend({ is_active: z.boolean().optional() }).strict().refine(value => Object.keys(value).length > 0, { message: 'At least one exercise field is required' });

router.use(authenticate, authorize(UserRole.ADMIN));
router.get('/', validate(list, 'query'), controller.list);
router.post('/', validate(body), controller.create);
router.get('/:exerciseId', validate(id, 'params'), controller.detail);
router.patch('/:exerciseId', validate(id, 'params'), validate(patch), controller.update);
router.post('/:exerciseId/activate', validate(id, 'params'), controller.activate);
router.post('/:exerciseId/deactivate', validate(id, 'params'), controller.deactivate);
export default router;
