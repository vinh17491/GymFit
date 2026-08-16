import { z } from 'zod';

const comment=z.union([z.string().trim().max(2000),z.null()]).optional().transform(value=>value===''?null:value);
export const createReviewBody=z.object({rating:z.number().int().min(1).max(5),comment}).strict();
export const orderItemParams=z.object({orderItemId:z.coerce.number().int().positive()}).strict();
export const shopOrderParams=z.object({shopOrderId:z.coerce.number().int().positive()}).strict();
export const orderParams=z.object({orderId:z.coerce.number().int().positive()}).strict();
export const publicProductParams=z.object({identifier:z.string().trim().min(1).max(255)}).strict();
export const publicShopParams=z.object({shopSlug:z.string().trim().min(3).max(200)}).strict();
const bool=z.enum(['true','false']).transform(x=>x==='true');
export const reviewListQuery=z.object({
  page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(20),
  rating:z.coerce.number().int().min(1).max(5).optional(),hasComment:bool.optional(),
  sort:z.enum(['newest','oldest','highest','lowest']).default('newest')
}).strict();
export const reviewIdParams=z.object({type:z.enum(['product','shop']),reviewId:z.coerce.number().int().positive()}).strict();
export const moderationBody=z.object({reason:z.string().trim().min(3).max(1000)}).strict();
export const adminReviewQuery=z.object({
  page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(20),
  type:z.enum(['PRODUCT','SHOP']).optional(),status:z.enum(['PENDING','PUBLISHED','HIDDEN','REJECTED']).optional(),
  rating:z.coerce.number().int().min(1).max(5).optional(),hasComment:bool.optional(),
  shopId:z.coerce.number().int().positive().optional(),productId:z.coerce.number().int().nonnegative().optional(),
  search:z.string().trim().max(120).optional()
}).strict();
