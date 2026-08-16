import { z } from 'zod';
import { sellerApplicationStatuses, sellerBusinessTypes } from './seller-applications.types';

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const nullableUrl = z.union([z.string().trim().url().max(500), z.literal(''), z.null()]).optional()
  .transform(value => value === '' ? null : value);
const applicationFields = {
  businessName: nullableText(200),
  businessType: z.enum(sellerBusinessTypes).nullable().optional(),
  contactName: nullableText(200),
  contactEmail: z.union([z.string().trim().email().max(255), z.literal(''), z.null()]).optional()
    .transform(value => value === '' ? null : value),
  contactPhone: nullableText(50),
  businessAddress: nullableText(500),
  pickupAddress: nullableText(500),
  taxCode: nullableText(50),
  websiteUrl: nullableUrl,
  socialUrl: nullableUrl,
  description: nullableText(2000),
};

export const createSellerApplicationSchema = z.object(applicationFields).strict();
export const updateSellerApplicationSchema = z.object(applicationFields).strict()
  .refine(value => Object.keys(value).length > 0, 'At least one application field is required');
export const applicationIdParamSchema = z.object({ applicationId: z.coerce.number().int().positive() }).strict();
export const adminSellerApplicationListSchema = z.object({
  status: z.enum(sellerApplicationStatuses).default('PENDING'),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();
export const rejectSellerApplicationSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
}).strict();

