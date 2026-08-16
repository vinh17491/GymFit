import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import { create, getMine, submitMine, updateMine, withdrawMine } from './seller-applications.controller';
import { createSellerApplicationSchema, updateSellerApplicationSchema } from './seller-applications.validation';
import {
  sellerApplicationSubmitLimiter,
  sellerApplicationWithdrawLimiter,
  sellerApplicationWriteLimiter,
} from './seller-applications.rate-limit';

const router = Router();

router.get('/me', authenticate, authorize(UserRole.MEMBER, UserRole.SELLER), getMine);
router.post('/', authenticate, authorize(UserRole.MEMBER), sellerApplicationWriteLimiter, validate(createSellerApplicationSchema), create);
router.patch('/me', authenticate, authorize(UserRole.MEMBER), sellerApplicationWriteLimiter, validate(updateSellerApplicationSchema), updateMine);
router.post('/me/submit', authenticate, authorize(UserRole.MEMBER), sellerApplicationSubmitLimiter, submitMine);
router.post('/me/withdraw', authenticate, authorize(UserRole.MEMBER), sellerApplicationWithdrawLimiter, withdrawMine);

export default router;

