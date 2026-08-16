import { z } from 'zod';
import { moderationStatuses } from './product-moderation.types';
export const productIdSchema=z.object({productId:z.coerce.number().int().nonnegative()}).strict();
export const inboxQuerySchema=z.object({
  page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(20),
  search:z.string().trim().min(1).max(200).optional(),shopId:z.coerce.number().int().positive().optional(),
  status:z.enum(moderationStatuses).default('PENDING_REVIEW'),categoryId:z.coerce.number().int().positive().optional(),brandId:z.coerce.number().int().positive().optional(),
  submittedFrom:z.coerce.date().optional(),submittedTo:z.coerce.date().optional(),
  sortBy:z.enum(['submittedAt','createdAt','reviewedAt']).default('submittedAt'),sortOrder:z.enum(['asc','desc']).default('desc')
}).strict().superRefine((value,ctx)=>{if(value.submittedFrom&&value.submittedTo&&value.submittedFrom>value.submittedTo)ctx.addIssue({code:z.ZodIssueCode.custom,path:['submittedTo'],message:'submittedTo must be on or after submittedFrom'});});
export const approveSchema=z.object({note:z.string().trim().min(1).max(1000).optional()}).strict();
export const reasonSchema=z.object({reason:z.string().trim().min(1).max(1000)}).strict();
export const republishSchema=approveSchema;
