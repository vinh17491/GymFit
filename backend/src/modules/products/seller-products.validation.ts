import { z } from 'zod';

const productId=z.coerce.number().int().min(0);
const childId=z.coerce.number().int().positive();
export const sellerProductIdSchema=z.object({productId}).strict();
export const sellerVariantPathSchema=z.object({productId,variantId:childId}).strict();
export const sellerImagePathSchema=z.object({productId,imageId:childId}).strict();

export const sellerProductListSchema=z.object({
  page:z.coerce.number().int().min(1).default(1),
  limit:z.coerce.number().int().min(1).max(100).default(20),
  search:z.string().trim().max(200).optional(),
  status:z.enum(['active','inactive']).optional(),
  moderationStatus:z.enum(['DRAFT','PENDING_REVIEW','PUBLISHED','REJECTED','SUSPENDED']).optional(),
  sort:z.enum(['created_desc','created_asc','name_asc','name_desc']).default('created_desc'),
}).strict();

const brandSource={
  brandId:z.coerce.number().int().positive().optional(),
  brandRequestId:z.coerce.number().int().positive().optional(),
};
const sourceRefinement=(value:{brandId?:number;brandRequestId?:number})=>
  (value.brandId===undefined)!==(value.brandRequestId===undefined);
const defaultVariant=z.object({
  name:z.string().trim().min(1).max(200).default('Default'),
  sku:z.string().trim().min(1).max(200),
  price:z.coerce.number().finite().positive(),
  salePrice:z.coerce.number().finite().min(0).nullable().optional(),
  initialOnHand:z.coerce.number().int().min(0).max(1_000_000).default(0),
  lowStockThreshold:z.coerce.number().int().min(0).max(1_000_000).default(10),
}).strict().superRefine((value,context)=>{
  if(value.salePrice!=null&&value.salePrice>=value.price)context.addIssue({code:z.ZodIssueCode.custom,path:['salePrice'],message:'salePrice must be lower than price'});
});
export const sellerProductCreateSchema=z.object({
  name:z.string().trim().min(1).max(200),
  slug:z.string().trim().min(1).max(200).optional(),
  description:z.string().trim().max(10_000).nullable().optional(),
  categoryId:z.coerce.number().int().positive(),
  ...brandSource,
  defaultVariant,
}).strict().refine(sourceRefinement,{message:'Provide exactly one of brandId or brandRequestId',path:['brandId']});
export const sellerProductUpdateSchema=z.object({
  name:z.string().trim().min(1).max(200).optional(),
  slug:z.string().trim().min(1).max(200).optional(),
  description:z.string().trim().max(10_000).nullable().optional(),
  categoryId:z.coerce.number().int().positive().optional(),
  ...brandSource,
}).strict().refine(value=>Object.keys(value).length>0,'At least one field is required')
  .superRefine((value,context)=>{
    if(value.brandId!==undefined&&value.brandRequestId!==undefined)context.addIssue({code:z.ZodIssueCode.custom,path:['brandId'],message:'Use only one Brand source'});
  });

const variantFields=z.object({
  name:z.string().trim().min(1).max(200),
  sku:z.string().trim().min(1).max(200),
  price:z.coerce.number().finite().positive(),
  salePrice:z.coerce.number().finite().min(0).nullable().optional(),
  barcode:z.string().trim().max(100).nullable().optional(),
  weight:z.coerce.number().finite().min(0).nullable().optional(),
  isDefault:z.boolean().optional(),
  isActive:z.boolean().optional(),
  initialOnHand:z.coerce.number().int().min(0).max(1_000_000).optional(),
  lowStockThreshold:z.coerce.number().int().min(0).max(1_000_000).optional(),
}).strict();
export const sellerVariantCreateSchema=variantFields.superRefine((value,context)=>{
  if(value.salePrice!=null&&value.salePrice>=value.price)context.addIssue({code:z.ZodIssueCode.custom,path:['salePrice'],message:'salePrice must be lower than price'});
});
export const sellerVariantUpdateSchema=variantFields.omit({initialOnHand:true,lowStockThreshold:true}).partial()
  .refine(value=>Object.keys(value).length>0,'At least one field is required')
  .superRefine((value,context)=>{
    if(value.price!==undefined&&value.salePrice!=null&&value.salePrice>=value.price)context.addIssue({code:z.ZodIssueCode.custom,path:['salePrice'],message:'salePrice must be lower than price'});
  });
export const sellerInventoryAdjustmentSchema=z.object({
  quantityDelta:z.number().int().safe().refine(value=>value!==0,'quantityDelta must not be zero'),
  reason:z.string().trim().min(1).max(500),
}).strict();
