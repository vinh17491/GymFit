import { Router } from 'express';
import { getVideos, getVideoById, retireVideoMutation, getVideoCategories } from './videos.controller';
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
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), retireVideoMutation);
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), validate(id,'params'), retireVideoMutation);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), validate(id,'params'), retireVideoMutation);

// All other routes require admin/coach permissions
router.get('/categories', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), getVideoCategories);
router.get('/', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), getVideos);
router.get('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COACH), validate(id,'params'), getVideoById);

export default router;
