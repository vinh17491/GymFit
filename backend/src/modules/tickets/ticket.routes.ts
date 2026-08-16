import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import { createTicketSchema, replyTicketSchema } from './ticket.validation';
import { create, list, getById, reply, updateStatus } from './ticket.controller';
import { z } from 'zod';

const router = Router();
const id=z.object({id:z.coerce.number().int().positive()});
router.post('/', authenticate, authorize(UserRole.MEMBER), validate(createTicketSchema), create);
router.get('/', authenticate, authorize(UserRole.MEMBER, UserRole.COACH, UserRole.ADMIN), list);
router.get('/:id', authenticate, authorize(UserRole.MEMBER, UserRole.COACH, UserRole.ADMIN), validate(id,'params'), getById);
router.post('/:id/reply', authenticate, authorize(UserRole.MEMBER, UserRole.COACH, UserRole.ADMIN), validate(id,'params'), validate(replyTicketSchema), reply);
router.patch('/:id/status', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), validate(id,'params'), validate(z.object({ status: z.enum(['open','pending','resolved','closed']) }).strict()), updateStatus);
export default router;
