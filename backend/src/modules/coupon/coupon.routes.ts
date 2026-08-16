import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import { validateCoupon, createCoupon, listCoupons, getCouponStats } from './coupon.controller';
import { createCouponSchema, applyCouponSchema } from './coupon.validation';

const router = Router();
router.post('/validate', authenticate, authorize(UserRole.MEMBER), validate(applyCouponSchema), validateCoupon);
router.post('/', authenticate, authorize(UserRole.ADMIN), validate(createCouponSchema), createCoupon);
router.get('/', authenticate, authorize(UserRole.ADMIN), listCoupons);
router.get('/stats', authenticate, authorize(UserRole.ADMIN), getCouponStats);
export default router;
