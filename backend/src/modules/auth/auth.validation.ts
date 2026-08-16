import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+?[0-9 -]{8,20}$/).optional(),
  referral_code: z.string().trim().max(20).optional(),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1),
}).strict();
