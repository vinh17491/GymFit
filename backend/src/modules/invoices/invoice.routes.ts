import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { UserRole } from '../../types';
import { list, getById, generate, sendEmail } from './invoice.controller';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
const id=z.object({id:z.coerce.number().int().positive()});
router.get('/', authenticate, authorize(UserRole.MEMBER,UserRole.ADMIN), list);
router.get('/:id', authenticate, authorize(UserRole.MEMBER,UserRole.ADMIN), validate(id,'params'), getById);
router.post('/generate', authenticate, authorize(UserRole.MEMBER), validate(z.object({payment_id:z.number().int().positive()}).strict()), generate);
router.post('/:id/send-email', authenticate, authorize(UserRole.ADMIN), validate(id,'params'), sendEmail);
export default router;
