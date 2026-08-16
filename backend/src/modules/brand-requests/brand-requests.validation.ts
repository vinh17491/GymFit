import { z } from 'zod';
export const requestIdSchema=z.object({requestId:z.coerce.number().int().positive()}).strict();
export const createBrandRequestSchema=z.object({
  requestedName:z.string().trim().min(2).max(200),
  websiteUrl:z.union([z.string().trim().url().max(500),z.literal(''),z.null()]).optional().transform(v=>v===''?null:v),
  description:z.union([z.string().trim().max(2000),z.null()]).optional().transform(v=>v===''?null:v),
}).strict();
export const sellerListSchema=z.object({page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(20),status:z.enum(['PENDING','APPROVED','REJECTED']).optional()}).strict();
export const adminListSchema=sellerListSchema.extend({search:z.string().trim().max(200).optional(),sortOrder:z.enum(['asc','desc']).default('desc')}).strict();
export const rejectSchema=z.object({reason:z.string().trim().min(1).max(1000)}).strict();
