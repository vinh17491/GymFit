import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { UserRole } from '../../types';
import { getDashboard, getRevenue, getRetention, getConversion, getUserGrowth } from './analytics.controller';

const router = Router();
router.get('/dashboard', authenticate, authorize(UserRole.ADMIN), getDashboard);
router.get('/dashboard/summary', authenticate, authorize(UserRole.ADMIN), getDashboard);
router.get('/revenue', authenticate, authorize(UserRole.ADMIN), getRevenue);
router.get('/retention', authenticate, authorize(UserRole.ADMIN), getRetention);
router.get('/conversion', authenticate, authorize(UserRole.ADMIN), getConversion);
router.get('/user-growth', authenticate, authorize(UserRole.ADMIN), getUserGrowth);
export default router;
