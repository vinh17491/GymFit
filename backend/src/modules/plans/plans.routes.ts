import { Router } from 'express';
import { getPlans, createPlan, updatePlan, deletePlan, subscribe, confirmSubscriptionPayment, upgradeMembership, downgradeMembership, cancelMembership, getMyMembership } from './plans.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { z } from 'zod';
import { UserRole } from '../../types';

const router = Router();

const entitlementSchema = z.object({
  entitlement_key: z.enum(['COACH_BOOKING_ENABLED', 'COACH_BOOKING_MONTHLY_LIMIT']),
  entitlement_value: z.string().trim().min(1).max(50),
  value_type: z.enum(['BOOLEAN', 'INTEGER', 'UNLIMITED']),
});

const planSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  price: z.number().positive(),
  duration_days: z.number().int().positive(),
  type: z.enum(['monthly', 'quarterly', 'yearly', 'custom']),
  features: z.array(z.string()).optional(),
  entitlements: z.array(entitlementSchema).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

const subscribeSchema = z.object({
  plan_id: z.number().int().positive(),
});

const paymentConfirmationSchema = z.object({
  payment_id: z.number().int().positive(),
});

router.get('/', getPlans);
router.get('/my-membership', authenticate, authorize(UserRole.MEMBER), getMyMembership);
router.post('/subscribe', authenticate, authorize(UserRole.MEMBER), validate(subscribeSchema), subscribe);
router.post('/subscribe/confirm', authenticate, authorize(UserRole.MEMBER), validate(paymentConfirmationSchema), confirmSubscriptionPayment);
router.post('/upgrade', authenticate, authorize(UserRole.MEMBER), validate(subscribeSchema), upgradeMembership);
router.post('/downgrade', authenticate, authorize(UserRole.MEMBER), validate(subscribeSchema), downgradeMembership);
router.post('/cancel', authenticate, authorize(UserRole.MEMBER), cancelMembership);

router.post('/', authenticate, authorize(UserRole.ADMIN), validate(planSchema), createPlan);
router.put('/:id', authenticate, authorize(UserRole.ADMIN), validate(planSchema), updatePlan);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), deletePlan);

export default router;
