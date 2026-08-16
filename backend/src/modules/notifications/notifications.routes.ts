import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './notifications.controller';

const router = Router();
const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  unreadOnly: z.enum(['true', 'false']).optional(),
}).strict();
const id = z.object({ id: z.coerce.number().int().positive() }).strict();

router.use(authenticate);
router.get('/', validate(listQuery, 'query'), controller.list);
router.get('/unread-count', controller.unreadCount);
router.post('/read-all', controller.markAllRead);
router.patch('/:id/read', validate(id, 'params'), controller.markRead);

export default router;
