import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { UserRole } from '../../types';
import { listCustomers, getCustomer, addNote, createTask } from './crm.controller';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
const id=z.object({id:z.coerce.number().int().positive()});
const list=z.object({search:z.string().trim().max(100).optional(),tag:z.string().trim().max(50).optional(),page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(20)}).strict();
const note=z.object({content:z.string().trim().min(1).max(5000),type:z.enum(['note','follow_up','coach_note']).optional()}).strict();
const task=z.object({assigned_to:z.number().int().positive().optional(),title:z.string().trim().min(1).max(200),description:z.string().trim().max(5000).optional(),due_date:z.coerce.date()}).strict();
router.get('/', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), validate(list,'query'), listCustomers);
router.get('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), validate(id,'params'), getCustomer);
router.post('/:id/notes', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), validate(id,'params'), validate(note), addNote);
router.post('/:id/tasks', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), validate(id,'params'), validate(task), createTask);
export default router;
