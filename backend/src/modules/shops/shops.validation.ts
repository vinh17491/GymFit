import { z } from 'zod';

const nullableText = (max: number) => z.union([z.string().trim().max(max), z.null()]).optional()
  .transform(value => value === '' ? null : value);
const nullableUrl = z.union([z.string().trim().url().max(500), z.literal(''), z.null()]).optional()
  .transform(value => value === '' ? null : value);

export const sellerShopPatchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().min(3).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  logoUrl: nullableUrl,
  bannerUrl: nullableUrl,
  description: nullableText(2000),
  pickupAddress: nullableText(500),
}).strict().refine(value => Object.keys(value).length > 0, 'At least one editable field is required');

const boolQuery = z.enum(['true', 'false']).transform(value => value === 'true');
export const adminShopListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  verified: boolQuery.optional(),
  system: boolQuery.optional(),
  sort: z.enum(['created_desc', 'created_asc', 'name_asc', 'name_desc']).default('created_desc'),
}).strict();
export const shopSlugSchema = z.object({ shopSlug: z.string().min(3).max(200) }).strict();
export const shopIdSchema = z.object({ shopId: z.coerce.number().int().positive() }).strict();
export const shopStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  reason: z.string().trim().max(1000).optional(),
}).strict().superRefine((value, context) => {
  if (value.status === 'SUSPENDED' && !value.reason) context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'reason is required when suspending a shop' });
});
export const shopVerificationSchema = z.object({ isVerified: z.boolean() }).strict();
