import { z } from 'zod';
export const createCouponSchema = z.object({
  code: z.string().min(3).max(50), type: z.enum(['fixed','percentage','free_trial','first_purchase','referral','flash_sale']),
  value: z.number().positive(), min_purchase: z.number().min(0).default(0),
  start_date: z.string(), end_date: z.string(), usage_limit: z.number().int().positive().optional(),
  user_limit: z.number().int().positive().default(1), applicable_plans: z.string().optional()
});
export const applyCouponSchema = z.object({ code: z.string(), plan_id: z.number().int().positive() });
