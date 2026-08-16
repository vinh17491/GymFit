import { z } from 'zod';

const bool=z.enum(['true','false']).transform(value=>value==='true');
const money=z.coerce.number().finite().nonnegative().max(999999999999.99);
const normalizedSearch=z.string().max(300).transform(value=>value.trim().replace(/\s+/g,' ')).refine(value=>value.length<=120,'q must be at most 120 normalized characters').transform(value=>value||undefined);

export const productListQuerySchema=z.object({
  q:normalizedSearch.optional(),
  search:normalizedSearch.optional(),
  categoryId:z.coerce.number().int().positive().optional(),
  category:z.string().trim().min(1).max(200).optional(),
  brandId:z.coerce.number().int().positive().optional(),
  brand:z.string().trim().min(1).max(200).optional(),
  shopSlug:z.string().trim().min(3).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  verifiedShop:bool.optional(),
  minPrice:money.optional(),
  maxPrice:money.optional(),
  minRating:z.coerce.number().min(1).max(5).optional(),
  inStock:bool.optional(),
  featured:bool.optional(),
  page:z.coerce.number().int().min(1).default(1),
  pageSize:z.coerce.number().int().min(1).max(100).optional(),
  limit:z.coerce.number().int().min(1).max(100).optional(),
  sort:z.enum(['relevance','newest','price_asc','price_desc','name_asc','name_desc','featured','sale','rating','best_selling']).default('newest'),
}).strict().superRefine((value,context)=>{
  if(value.q!==undefined&&value.search!==undefined)context.addIssue({code:z.ZodIssueCode.custom,path:['q'],message:'Use only q'});
  if(value.categoryId!==undefined&&value.category!==undefined)context.addIssue({code:z.ZodIssueCode.custom,path:['categoryId'],message:'Use only categoryId or category'});
  if(value.brandId!==undefined&&value.brand!==undefined)context.addIssue({code:z.ZodIssueCode.custom,path:['brandId'],message:'Use only brandId or brand'});
  if(value.pageSize!==undefined&&value.limit!==undefined)context.addIssue({code:z.ZodIssueCode.custom,path:['pageSize'],message:'Use only pageSize or limit'});
  if(value.minPrice!==undefined&&value.maxPrice!==undefined&&value.minPrice>value.maxPrice)context.addIssue({code:z.ZodIssueCode.custom,path:['minPrice'],message:'minPrice must be less than or equal to maxPrice'});
}).transform(value=>({...value,q:value.q??value.search,pageSize:value.pageSize??value.limit??24}));

export const shopProductQuerySchema=productListQuerySchema.refine(value=>value.shopSlug===undefined,{path:['shopSlug'],message:'Shop path cannot be overridden'});
export const productLookupSchema=z.object({slug:z.string().trim().min(1).max(255)}).strict();
