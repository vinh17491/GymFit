import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import type { Metadata } from 'sharp';
import { getPool, sql } from '../../config/database';
import { config } from '../../config/config';
import { AppError } from '../../middleware/errorHandler';
import { productsService } from '../products/products.service';

export interface AdminProductInput {
  product_name?: string;
  description?: string | null;
  sku?: string;
  price?: number;
  sale_price?: number | null;
  stock?: number;
  brand_id?: number | null;
  category_id?: number;
  is_active?: boolean;
  is_featured?: boolean;
  is_on_sale?: boolean;
}

const uploadRoot = path.resolve(config.upload.dir, 'products');

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180) || 'product';
}

function validate(input: AdminProductInput, partial = false) {
  const required: (keyof AdminProductInput)[] = ['product_name', 'sku', 'price', 'stock', 'category_id'];
  if (!partial) for (const key of required) if (input[key] === undefined || input[key] === '') throw new AppError(400, `${key} is required`);
  if (input.product_name !== undefined && !input.product_name.trim()) throw new AppError(400, 'product_name is required');
  if (input.sku !== undefined && !input.sku.trim()) throw new AppError(400, 'sku is required');
  if (input.price !== undefined && (!Number.isFinite(Number(input.price)) || Number(input.price) <= 0)) throw new AppError(400, 'price must be greater than 0');
  if (input.sale_price != null && (!Number.isFinite(Number(input.sale_price)) || Number(input.sale_price) < 0 || (input.price !== undefined && Number(input.sale_price) >= Number(input.price)))) throw new AppError(400, 'sale_price must be non-negative and lower than price');
  if (input.stock !== undefined && (!Number.isSafeInteger(Number(input.stock)) || Number(input.stock) < 0)) throw new AppError(400, 'stock must be a non-negative integer');
  if (input.category_id !== undefined && (!Number.isSafeInteger(Number(input.category_id)) || Number(input.category_id) < 1)) throw new AppError(400, 'category_id is invalid');
}

async function uniqueSlug(request: sql.Request, name: string, excludeId?: number) {
  const base = slugify(name);
  for (let suffix = 0; suffix < 1000; suffix++) {
    const slug = suffix ? `${base}-${suffix}` : base;
    const result = await request.input(`slug${suffix}`, sql.NVarChar, slug).query(
      `SELECT id FROM dbo.Products WHERE slug=@slug${suffix}${excludeId ? ' AND id<>@excludeId' : ''}`,
    );
    if (!result.recordset[0]) return slug;
  }
  throw new AppError(409, 'Unable to create a unique slug');
}

async function assertCategory(request: sql.Request, categoryId: number) {
  const result = await request.input('validatedCategoryId', sql.Int, categoryId).query('SELECT id FROM dbo.Categories WHERE id=@validatedCategoryId AND is_active=1');
  if (!result.recordset[0]) throw new AppError(400, 'category_id does not reference an active category');
}

async function assertBrand(request: sql.Request, brandId: number | null) {
  if (brandId === null) return;
  const result = await request.input('validatedBrandId', sql.Int, brandId).query('SELECT id FROM dbo.Brands WHERE id=@validatedBrandId AND is_active=1');
  if (!result.recordset[0]) throw new AppError(400, 'brand_id does not reference an active brand');
}

async function removeLocalFile(imageUrl: string) {
  if (!imageUrl.startsWith('/uploads/products/')) return;
  const relative = imageUrl.slice('/uploads/products/'.length).replace(/\//g, path.sep);
  const target = path.resolve(uploadRoot, relative);
  if (target !== uploadRoot && !target.startsWith(uploadRoot + path.sep)) throw new AppError(400, 'Unsafe image path');
  for (let attempt = 0; attempt < 4; attempt++) {
    try { await fs.unlink(target); return; } catch (error) {
      const code=(error as NodeJS.ErrnoException).code;
      if(code==='ENOENT')return;
      if((code==='EBUSY'||code==='EPERM')&&attempt<3){
        await new Promise(resolve=>setTimeout(resolve,25*(attempt+1)));
        continue;
      }
      console.error('Unable to remove product image file', error);
      return;
    }
  }
}

export const adminProductsService = {
  async list(query: Record<string, unknown>) {
    const pool = await getPool();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const request = pool.request().input('offset', sql.Int, (page - 1) * limit).input('limit', sql.Int, limit);
    const clauses: string[] = [];
    if (query.search) { request.input('search', sql.NVarChar, `%${String(query.search).trim()}%`); clauses.push('(p.product_name LIKE @search OR v.sku LIKE @search)'); }
    if (query.category) { request.input('category', sql.NVarChar, String(query.category)); clauses.push('c.slug=@category'); }
    if (query.status === 'active') clauses.push('p.is_active=1');
    if (query.status === 'inactive') clauses.push('p.is_active=0');
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sorts: Record<string, string> = { name_asc: 'p.product_name ASC', name_desc: 'p.product_name DESC', price_asc: 'v.price ASC', price_desc: 'v.price DESC', created_asc: 'p.created_at ASC', created_desc: 'p.created_at DESC', updated_desc: 'p.updated_at DESC' };
    const order = sorts[String(query.sort)] || sorts.updated_desc;
    const result = await request.query(`
      SELECT p.id,p.product_name,p.slug,p.description,p.brand_id,p.category_id,p.is_active,p.is_featured,p.is_on_sale,p.moderation_status,p.submitted_at,p.review_reason,p.brand_request_id,p.created_at,p.updated_at,
        b.name brand,c.name category,c.slug category_slug,s.id shop_id,s.name shop_name,s.slug shop_slug,s.status shop_status,s.is_verified shop_verified,v.id variant_id,v.sku,v.price,v.sale_price,i.available stock,
        pi.id image_id,pi.image_url,pi.is_primary,pi.sort_order,COUNT(*) OVER() total
      FROM dbo.Products p
      LEFT JOIN dbo.Brands b ON b.id=p.brand_id JOIN dbo.Categories c ON c.id=p.category_id
      JOIN dbo.Shops s ON s.id=p.shop_id
      CROSS APPLY (SELECT TOP 1 * FROM dbo.ProductVariants WHERE product_id=p.id ORDER BY CASE WHEN variant_name=N'Default' THEN 0 ELSE 1 END,id) v
      JOIN dbo.Inventory i ON i.variant_id=v.id
      OUTER APPLY (SELECT TOP 1 * FROM dbo.ProductImages WHERE product_id=p.id ORDER BY is_primary DESC,sort_order,id) pi
      ${where} ORDER BY ${order},p.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    return { products: result.recordset.map(row => ({ ...row, is_active: Boolean(row.is_active), is_featured: Boolean(row.is_featured), is_on_sale: Boolean(row.is_on_sale),shop:{id:Number(row.shop_id),name:row.shop_name,slug:row.shop_slug,status:row.shop_status,isVerified:Boolean(row.shop_verified)}, primary_image: row.image_id ? { id: row.image_id, image_url: row.image_url, is_primary: Boolean(row.is_primary), sort_order: row.sort_order } : null })), page, limit, total: result.recordset[0]?.total || 0 };
  },

  async filters() {
    const pool = await getPool();
    const [categories, brands] = await Promise.all([pool.request().query('SELECT id,name,slug FROM dbo.Categories WHERE is_active=1 ORDER BY name'), pool.request().query('SELECT id,name,slug,is_generic isGeneric FROM dbo.Brands WHERE is_active=1 ORDER BY name')]);
    return { categories: categories.recordset, brands: brands.recordset.map(row=>({...row,isGeneric:Boolean(row.isGeneric)})) };
  },

  async get(id: number) {
    const product = await productsService.getDetail('p.id=@lookup', id, true);
    if (!product) throw new AppError(404, 'Product not found');
    const pool = await getPool();
    const meta = await pool.request().input('id', id).query('SELECT p.brand_id,p.brand_request_id,p.category_id,p.moderation_status,p.submitted_at,p.reviewed_at,p.published_at,p.review_reason,p.updated_at,s.is_system shop_is_system FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id WHERE p.id=@id');
    return { ...product, ...meta.recordset[0] };
  },

  async create(input: AdminProductInput) {
    validate(input);
    const pool = await getPool();
    const tx = pool.transaction(); await tx.begin();
    try {
      const request = tx.request().input('excludeId', sql.Int, -1);
      await assertCategory(request, Number(input.category_id));
      let brandId=input.brand_id??null;
      if(brandId===null){const generic=await tx.request().query('SELECT id FROM dbo.Brands WHERE is_generic=1 AND is_active=1');if(!generic.recordset[0])throw new AppError(500,'Generic Brand is missing');brandId=Number(generic.recordset[0].id);}
      await assertBrand(tx.request(), brandId);
      const slug = await uniqueSlug(request, input.product_name!.trim());
      const duplicate = await tx.request().input('sku', sql.NVarChar, input.sku!.trim()).query('SELECT id FROM dbo.ProductVariants WHERE sku=@sku');
      if (duplicate.recordset[0]) throw new AppError(409, 'SKU already exists');
      const official = await tx.request().query(`SELECT id FROM dbo.Shops WITH (UPDLOCK,HOLDLOCK) WHERE system_key=N'GYMFIT_OFFICIAL' AND is_system=1`);
      if (!official.recordset[0]) throw new AppError(500, 'GymFit Official shop is missing; product creation was rolled back');
      const inserted = await tx.request()
        .input('name', sql.NVarChar, input.product_name!.trim()).input('slug', sql.NVarChar, slug).input('description', sql.NVarChar, input.description?.trim() || null)
        .input('brandId', sql.Int, brandId).input('categoryId', sql.Int, input.category_id)
        .input('active', sql.Bit, input.is_active ?? true).input('featured', sql.Bit, input.is_featured ?? false).input('sale', sql.Bit, input.is_on_sale ?? false)
        .input('sku', sql.NVarChar, input.sku!.trim()).input('price', sql.Decimal(10,2), input.price).input('salePrice', sql.Decimal(10,2), input.sale_price ?? null).input('stock', sql.Int, input.stock)
        .input('officialShopId',sql.Int,official.recordset[0].id)
        .query(`INSERT dbo.Products(product_name,slug,description,sku,price,sale_price,stock,brand_id,category_id,is_active,is_featured,is_on_sale,shop_id,moderation_status,created_at,updated_at)
          OUTPUT INSERTED.id VALUES(@name,@slug,@description,@sku,@price,@salePrice,@stock,@brandId,@categoryId,@active,@featured,@sale,@officialShopId,N'PUBLISHED',SYSUTCDATETIME(),SYSUTCDATETIME())`);
      const productId = inserted.recordset[0].id;
      const variant = await tx.request().input('productId', productId).input('sku', input.sku!.trim()).input('price', input.price).input('salePrice', input.sale_price ?? null)
        .query(`INSERT dbo.ProductVariants(product_id,variant_name,sku,price,sale_price,is_active,is_default,created_at,updated_at) OUTPUT INSERTED.id VALUES(@productId,N'Default',@sku,@price,@salePrice,1,1,SYSUTCDATETIME(),SYSUTCDATETIME())`);
      await tx.request().input('variantId', variant.recordset[0].id).input('stock', input.stock).query('INSERT dbo.Inventory(variant_id,on_hand,reserved,last_restocked,updated_at) VALUES(@variantId,@stock,0,SYSUTCDATETIME(),SYSUTCDATETIME())');
      await tx.commit(); return this.get(productId);
    } catch (error) { await tx.rollback(); throw error; }
  },

  async update(id: number, input: AdminProductInput) {
    if (input.stock !== undefined) throw new AppError(400, 'Stock must be changed through inventory adjustment API');
    validate(input, true);
    const existing = await this.get(id);
    if (!existing.shop_is_system && input.is_active !== undefined) throw new AppError(409, 'Seller Product activity is controlled by Product moderation');
    const merged = { product_name: input.product_name?.trim() ?? existing.product_name, description: input.description === undefined ? existing.description : input.description?.trim() || null, sku: input.sku?.trim() ?? existing.display_variant.sku, price: input.price ?? existing.display_variant.price, sale_price: input.sale_price === undefined ? existing.display_variant.sale_price : input.sale_price, stock:existing.stock, brand_id: input.brand_id === undefined ? existing.brand_id : input.brand_id, category_id: input.category_id ?? existing.category_id, is_active: input.is_active ?? existing.is_active, is_featured: input.is_featured ?? existing.is_featured, is_on_sale: input.is_on_sale ?? existing.is_on_sale };
    validate(merged);
    const pool = await getPool(); const tx = pool.transaction(); await tx.begin();
    try {
      const slugRequest = tx.request().input('excludeId', id); await assertCategory(slugRequest, Number(merged.category_id)); await assertBrand(tx.request(), merged.brand_id);
      const slug = await uniqueSlug(slugRequest, merged.product_name, id);
      const duplicate = await tx.request().input('sku', merged.sku).input('variantId', existing.display_variant.id).query('SELECT id FROM dbo.ProductVariants WHERE sku=@sku AND id<>@variantId');
      if (duplicate.recordset[0]) throw new AppError(409, 'SKU already exists');
      await tx.request().input('id', id).input('name', merged.product_name).input('slug', slug).input('description', merged.description).input('brandId', merged.brand_id).input('categoryId', merged.category_id).input('active', merged.is_active).input('featured', merged.is_featured).input('sale', merged.is_on_sale)
        .query('UPDATE dbo.Products SET product_name=@name,slug=@slug,description=@description,brand_id=@brandId,category_id=@categoryId,is_active=@active,is_featured=@featured,is_on_sale=@sale,updated_at=SYSUTCDATETIME() WHERE id=@id');
      await tx.request().input('id', existing.display_variant.id).input('sku', merged.sku).input('price', merged.price).input('salePrice', merged.sale_price).query('UPDATE dbo.ProductVariants SET sku=@sku,price=@price,sale_price=@salePrice,updated_at=SYSUTCDATETIME() WHERE id=@id');
      await tx.commit(); return this.get(id);
    } catch (error) { await tx.rollback(); throw error; }
  },

  async remove(id: number) {
    const product = await this.get(id); const localImages = (product.images || []).map((image: {image_url:string}) => image.image_url);
    const pool = await getPool(); const tx = pool.transaction(); await tx.begin();
    try {
      await tx.request().input('id', id).query(`DELETE FROM dbo.VariantOptionValues WHERE variant_id IN(SELECT id FROM dbo.ProductVariants WHERE product_id=@id);
        DELETE FROM dbo.ProductOptionValues WHERE product_option_id IN(SELECT id FROM dbo.ProductOptions WHERE product_id=@id);
        DELETE FROM dbo.ProductOptions WHERE product_id=@id; DELETE FROM dbo.ProductTags WHERE product_id=@id;
        DELETE FROM dbo.ProductImages WHERE product_id=@id; DELETE FROM dbo.Inventory WHERE variant_id IN(SELECT id FROM dbo.ProductVariants WHERE product_id=@id);
        DELETE FROM dbo.ProductVariants WHERE product_id=@id; DELETE FROM dbo.Products WHERE id=@id;`);
      await tx.commit(); await Promise.all(localImages.map(removeLocalFile)); return { id, product_name: product.product_name };
    } catch (error) { await tx.rollback(); if ((error as {number?:number}).number === 547) throw new AppError(409, 'Product is referenced by historical data and cannot be deleted'); throw error; }
  },

  async addImages(productId: number, files: Express.Multer.File[]) {
    await this.get(productId); if (!files.length) throw new AppError(400, 'At least one image is required');
    const pool = await getPool(); const count = await pool.request().input('productId', productId).query('SELECT COUNT(*) total FROM dbo.ProductImages WHERE product_id=@productId');
    if (count.recordset[0].total + files.length > 8) throw new AppError(400, 'A product can have at most 8 images');
    const productDir = path.join(uploadRoot, String(productId)); await fs.mkdir(productDir, { recursive: true }); const written: string[] = [];
    const prepared: { target:string; url:string; alt:string; sort:number; primary:boolean }[]=[];
    try {
      for (const file of files) {
        let metadata: Metadata;
        try{metadata=await sharp(file.buffer,{failOn:'error'}).metadata();}catch{throw new AppError(400,`${file.originalname}: invalid image content`);}
        if (!['jpeg','png','webp'].includes(metadata.format || '')) throw new AppError(400, `${file.originalname}: unsupported image content`);
        const filename = `product-${productId}-${Date.now()}-${randomBytes(4).toString('hex')}.webp`; const target = path.join(productDir, filename);
        try{await sharp(file.buffer).rotate().webp({ quality: 88 }).toFile(target);}catch{throw new AppError(400,`${file.originalname}: image transform failed`);}written.push(target);
        prepared.push({target,url:`/uploads/products/${productId}/${filename}`,alt:file.originalname.slice(0,200),sort:Number(count.recordset[0].total)+prepared.length,primary:Number(count.recordset[0].total)===0&&prepared.length===0});
      }
      const tx=pool.transaction(); await tx.begin();
      try { for(const image of prepared) await tx.request().input('productId',productId).input('url',image.url).input('alt',image.alt).input('sort',image.sort).input('primary',image.primary).query('INSERT dbo.ProductImages(product_id,image_url,alt_text,sort_order,is_primary,created_at) VALUES(@productId,@url,@alt,@sort,@primary,SYSUTCDATETIME())'); await tx.commit(); }
      catch(error){await tx.rollback();throw error;}
      return this.get(productId);
    } catch (error) { await Promise.all(written.map(file => fs.unlink(file).catch(() => undefined))); throw error; }
  },

  async setPrimary(productId: number, imageId: number) {
    const pool = await getPool(); const tx = pool.transaction(); await tx.begin();
    try { const found = await tx.request().input('productId', productId).input('imageId', imageId).query('SELECT id FROM dbo.ProductImages WHERE id=@imageId AND product_id=@productId'); if (!found.recordset[0]) throw new AppError(404, 'Image does not belong to product');
      await tx.request().input('productId', productId).query('UPDATE dbo.ProductImages SET is_primary=0 WHERE product_id=@productId');
      await tx.request().input('productId', productId).input('imageId', imageId).query('UPDATE dbo.ProductImages SET is_primary=1 WHERE product_id=@productId AND id=@imageId'); await tx.commit(); return this.get(productId);
    } catch (error) { await tx.rollback(); throw error; }
  },

  async removeImage(productId: number, imageId: number) {
    const pool = await getPool(); const tx = pool.transaction(); await tx.begin(); let imageUrl = '';
    try { const found = await tx.request().input('productId', productId).input('imageId', imageId).query('SELECT image_url,is_primary FROM dbo.ProductImages WHERE id=@imageId AND product_id=@productId'); if (!found.recordset[0]) throw new AppError(404, 'Image does not belong to product'); imageUrl=found.recordset[0].image_url;
      await tx.request().input('imageId', imageId).query('DELETE dbo.ProductImages WHERE id=@imageId'); if (found.recordset[0].is_primary) await tx.request().input('productId', productId).query('UPDATE dbo.ProductImages SET is_primary=1 WHERE id=(SELECT TOP 1 id FROM dbo.ProductImages WHERE product_id=@productId ORDER BY sort_order,id)'); await tx.commit();
    } catch (error) { await tx.rollback(); throw error; }
    await removeLocalFile(imageUrl); return this.get(productId);
  },
};
