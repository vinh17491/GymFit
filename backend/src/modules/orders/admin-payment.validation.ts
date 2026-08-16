import { z } from 'zod';
export const adminPaymentStatus=z.object({status:z.enum(['PAID','FAILED','UNPAID','REFUNDED']),note:z.string().trim().min(1).max(500).optional()}).strict();
