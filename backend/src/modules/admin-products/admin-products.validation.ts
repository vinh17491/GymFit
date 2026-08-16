import { z } from 'zod';

const money = z.number().finite().nonnegative().max(99999999.99);
const productFields = {
  product_name: z.string().trim().min(1).max(200),
  description: z.string().trim().nullable(),
  sku: z.string().trim().min(1).max(100),
  price: money.refine(value => value > 0, 'price must be greater than 0'),
  sale_price: money.nullable(),
  stock: z.number().int().nonnegative(),
  brand_id: z.number().int().positive().nullable(),
  category_id: z.number().int().positive(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  is_on_sale: z.boolean(),
};

const saleBelowPrice = (value: { price?: number; sale_price?: number | null }, context: z.RefinementCtx) => {
  if (value.price !== undefined && value.sale_price != null && value.sale_price >= value.price) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['sale_price'], message: 'sale_price must be lower than price' });
  }
};

export const adminProductCreateSchema = z.object({
  product_name: productFields.product_name,
  description: productFields.description.optional(),
  sku: productFields.sku,
  price: productFields.price,
  sale_price: productFields.sale_price.optional(),
  stock: productFields.stock,
  brand_id: productFields.brand_id.optional(),
  category_id: productFields.category_id,
  is_active: productFields.is_active.optional(),
  is_featured: productFields.is_featured.optional(),
  is_on_sale: productFields.is_on_sale.optional(),
}).strict().superRefine(saleBelowPrice);

export const adminProductUpdateSchema = z.object({
  product_name: productFields.product_name.optional(),
  description: productFields.description.optional(),
  sku: productFields.sku.optional(),
  price: productFields.price.optional(),
  sale_price: productFields.sale_price.optional(),
  stock: productFields.stock.optional(),
  brand_id: productFields.brand_id.optional(),
  category_id: productFields.category_id.optional(),
  is_active: productFields.is_active.optional(),
  is_featured: productFields.is_featured.optional(),
  is_on_sale: productFields.is_on_sale.optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'At least one field is required').superRefine(saleBelowPrice);

export const adminProductListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional().transform(value => value || undefined),
  category: z.string().trim().min(1).max(200).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sort: z.enum(['name_asc', 'name_desc', 'price_asc', 'price_desc', 'created_asc', 'created_desc', 'updated_desc']).default('updated_desc'),
}).strict();

export const adminProductIdSchema = z.object({ id: z.coerce.number().int().min(0) }).strict();
export const adminProductImageIdSchema = z.object({
  id: z.coerce.number().int().min(0),
  imageId: z.coerce.number().int().positive(),
}).strict();
