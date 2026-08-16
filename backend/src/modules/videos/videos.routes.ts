import { Router } from 'express';
import { getVideos, getVideoById, createVideo, updateVideo, deleteVideo, getVideoCategories } from './videos.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/auth';
import { UserRole } from '../../types';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();

// Public routes - no authentication required
router.get('/public', getVideos);

// Admin/coach routes - require authentication and authorization
const id=z.object({id:z.coerce.number().int().positive()});
const video=z.object({name:z.string().trim().min(1).max(200),description:z.string().trim().max(10000).nullable().optional(),plan_type:z.string().trim().max(50).nullable().optional(),duration_minutes:z.number().int().min(1).max(1440).nullable().optional(),difficulty:z.enum(['beginner','intermediate','advanced']).optional(),coach_id:z.number().int().positive().optional(),is_active:z.boolean().optional()}).strict();
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), validate(video), createVideo);
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), validate(id,'params'), validate(video), updateVideo);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), validate(id,'params'), deleteVideo);

// All other routes require admin/coach permissions
router.get('/categories', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), getVideoCategories);
router.get('/', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), getVideos);
router.get('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), validate(id,'params'), getVideoById);

export default router;
