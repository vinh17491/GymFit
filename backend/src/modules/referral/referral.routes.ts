import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { UserRole } from '../../types';
import { getMyCode, createCode, getReferrals, getCommission, getAll } from './referral.controller';

const router = Router();
router.get('/my-code', authenticate, getMyCode);
router.post('/create-code', authenticate, createCode);
router.get('/my-referrals', authenticate, getReferrals);
router.get('/commission', authenticate, getCommission);
router.get('/all', authenticate, authorize(UserRole.ADMIN), getAll);
export default router;
