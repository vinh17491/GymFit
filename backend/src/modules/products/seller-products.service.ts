import { promises as fs } from 'fs';
import path from 'path';
import { getPool,sql } from '../../config/database';
import { config } from '../../config/config';
import { AppError } from '../../middleware/errorHandler';
import { adminProductsService } from '../admin-products/admin-products.service';
import { adminVariantsService } from '../admin-variants/admin-variants.service';
import { adminInventoryService } from '../admin-inventory/admin-inventory.service';
import { productOwnershipService } from './product-ownership.service';
import { evaluateProductReadiness } from '../product-moderation/product-moderation.readiness';

type Filters={page:number;limit:number;search?:string;status?:'active'|'inactive';moderationStatus?:string;sort:'created_desc'|'created_asc'|'name_asc'|'name_desc'};
type ProductInput={name?:string;slug?:string;description?:string|null;categoryId?:number;brandId?:number;brandRequestId?:number;defaultVariant?:{name:string;sku:string;price:number;salePrice?:number|null;initialOnHand:number;lowStockThreshold:number}};
type VariantInput={name?:string;sku?:string;price?:number;salePrice?:number|null;barcode?:string|null;weight?:number|null;isDefault?:boolean;isActive?:boolean;initialOnHand?:number;lowStockThreshold?:number};
type MutableProduct={id:number;shop_id:number;shop_status:string;moderation_status:string;product_name:string;slug:string;description:string|null;category_id:number;brand_id:number|null;brand_request_id:number|null};
const editable=new Set(['DRAFT','REJECTED']);
const uploadRoot=path.resolve(config.upload.dir,'products');

function slugify(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,180)||'product';}
async function audit(actor:number,action:string,entityType:string,entityId:number,before:unknown,after:unknown){
  const pool=await getPool();
  await pool.request().input('actor',sql.Int,actor).input('action',sql.NVarChar(100),action).input('type',sql.NVarChar(50),entityType).input('id',sql.Int,entityId)
    .input('before',sql.NVarChar(sql.MAX),before==null?null:JSON.stringify(before)).input('after',sql.NVarChar(sql.MAX),after==null?null:JSON.stringify(after))
    .query('INSERT dbo.AuditLogs(user_id,action,entity_type,entity_id,old_value,new_value,timestamp) VALUES(@actor,@action,@type,@id,@before,@after,SYSUTCDATETIME())');
}
async function txAudit(tx:sql.Transaction,actor:number,action:string,entityType:string,entityId:number,before:unknown,after:unknown){
  await tx.request().input('auditActor',sql.Int,actor).input('auditAction',sql.NVarChar(100),action).input('auditType',sql.NVarChar(50),entityType).input('auditId',sql.Int,entityId)
    .input('auditBefore',sql.NVarChar(sql.MAX),before==null?null:JSON.stringify(before)).input('auditAfter',sql.NVarChar(sql.MAX),after==null?null:JSON.stringify(after))
    .query('INSERT dbo.AuditLogs(user_id,action,entity_type,entity_id,old_value,new_value,timestamp) VALUES(@auditActor,@auditAction,@auditType,@auditId,@auditBefore,@auditAfter,SYSUTCDATETIME())');
}
async function mutable(tx:sql.Transaction,userId:number,productId:number,allowSuspended=false){
  const row=(await tx.request().input('owner',sql.Int,userId).input('productId',sql.Int,productId).query(`SELECT p.id,p.shop_id,p.moderation_status,p.product_name,p.slug,p.description,p.category_id,p.brand_id,p.brand_request_id,s.status shop_status FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id WHERE p.id=@productId AND s.owner_user_id=@owner`)).recordset[0] as MutableProduct|undefined;
  if(!row)throw new AppError(404,'Product not found');
  if(!allowSuspended&&row.shop_status!=='ACTIVE')throw new AppError(409,'Suspended Shop cannot mutate Product content');
  if(!editable.has(row.moderation_status))throw new AppError(409,`Product cannot be changed while ${row.moderation_status}`);
  return row;
}
async function brandSource(tx:sql.Transaction,shopId:number,brandId?:number,brandRequestId?:number){
  if(brandId!==undefined){
    const brand=(await tx.request().input('brand',sql.Int,brandId).query('SELECT id FROM dbo.Brands WHERE id=@brand AND is_active=1')).recordset[0];
    if(!brand)throw new AppError(400,'Brand must reference an active Brand');
    return{brandId:Number(brand.id),brandRequestId:null};
  }
  if(brandRequestId!==undefined){
    const request=(await tx.request().input('request',sql.Int,brandRequestId).input('shop',sql.Int,shopId).query('SELECT id,status,resolved_brand_id FROM dbo.BrandRequests WHERE id=@request AND shop_id=@shop')).recordset[0];
    if(!request)throw new AppError(404,'Brand request not found');
    if(request.status==='REJECTED')throw new AppError(409,'Rejected Brand request cannot be used');
    if(request.status==='APPROVED'){
      const brand=(await tx.request().input('resolved',sql.Int,request.resolved_brand_id).query('SELECT id FROM dbo.Brands WHERE id=@resolved AND is_active=1')).recordset[0];
      if(!brand)throw new AppError(409,'Approved Brand request has no active resolved Brand');
      return{brandId:Number(brand.id),brandRequestId:null};
    }
    return{brandId:null,brandRequestId:Number(request.id)};
  }
  throw new AppError(400,'Provide exactly one Brand source');
}
async function uniqueSlug(tx:sql.Transaction,value:string,excludeId?:number){
  const slug=slugify(value);
  const found=(await tx.request().input('slugCheck',sql.NVarChar(200),slug).input('exclude',sql.Int,excludeId??-1).query('SELECT id FROM dbo.Products WITH(UPDLOCK,HOLDLOCK) WHERE slug=@slugCheck AND id<>@exclude')).recordset[0];
  if(found)throw new AppError(409,'Product slug already exists');
  return slug;
}
async function assertCategory(tx:sql.Transaction,id:number){const row=(await tx.request().input('category',sql.Int,id).query('SELECT id FROM dbo.Categories WHERE id=@category AND is_active=1')).recordset[0];if(!row)throw new AppError(400,'Category must reference an active Category');}
async function removeLocalFile(imageUrl:string){
  if(!imageUrl.startsWith('/uploads/products/'))return;
  const relative=imageUrl.slice('/uploads/products/'.length).replace(/\//g,path.sep),target=path.resolve(uploadRoot,relative);
  if(target===uploadRoot||!target.startsWith(uploadRoot+path.sep))throw new AppError(400,'Unsafe image path');
  await fs.unlink(target).catch(error=>{if((error as NodeJS.ErrnoException).code!=='ENOENT')console.warn('Seller Product image cleanup failed');});
}
async function assertVariantPath(userId:number,productId:number,variantId:number){
  await productOwnershipService.assertSellerOwnsProduct(productId,userId);
  const variant=await productOwnershipService.assertSellerOwnsVariant(variantId,userId);
  if(Number(variant.productId)!==productId)throw new AppError(404,'Variant not found');
  return variant;
}

export const sellerProductsService={
  async list(userId:number,f:Filters){
    const shop=await productOwnershipService.resolveSellerShop(userId),pool=await getPool();
    const req=pool.request().input('shopId',sql.Int,shop.id).input('offset',sql.Int,(f.page-1)*f.limit).input('limit',sql.Int,f.limit),clauses=['p.shop_id=@shopId'];
    if(f.search){req.input('search',sql.NVarChar(202),`%${f.search}%`);clauses.push('(p.product_name LIKE @search OR EXISTS(SELECT 1 FROM dbo.ProductVariants sv WHERE sv.product_id=p.id AND sv.sku LIKE @search))');}
    if(f.status)clauses.push(`p.is_active=${f.status==='active'?1:0}`);
    if(f.moderationStatus){req.input('moderation',sql.NVarChar(20),f.moderationStatus);clauses.push('p.moderation_status=@moderation');}
    const order={created_desc:'p.created_at DESC',created_asc:'p.created_at ASC',name_asc:'p.product_name ASC',name_desc:'p.product_name DESC'}[f.sort];
    const r=await req.query(`SELECT p.id,p.product_name name,p.slug,p.is_active isActive,p.moderation_status moderationStatus,p.submitted_at submittedAt,p.reviewed_at reviewedAt,p.published_at publishedAt,p.review_reason reviewReason,p.created_at createdAt,p.updated_at updatedAt,b.id brandId,b.name brand,c.id categoryId,c.name category,
      br.id brandRequestId,br.requested_name brandRequestName,br.status brandRequestStatus,
      (SELECT COUNT(*) FROM dbo.ProductVariants v WHERE v.product_id=p.id) variantCount,
      (SELECT SUM(i.available) FROM dbo.ProductVariants v JOIN dbo.Inventory i ON i.variant_id=v.id WHERE v.product_id=p.id) availableInventory,
      dv.price,dv.sale_price salePrice,pi.image_url primaryImage,COUNT_BIG(*) OVER() total
      FROM dbo.Products p LEFT JOIN dbo.Brands b ON b.id=p.brand_id LEFT JOIN dbo.BrandRequests br ON br.id=p.brand_request_id LEFT JOIN dbo.Categories c ON c.id=p.category_id
      OUTER APPLY(SELECT TOP 1 price,sale_price FROM dbo.ProductVariants WHERE product_id=p.id ORDER BY is_default DESC,id)dv
      OUTER APPLY(SELECT TOP 1 image_url FROM dbo.ProductImages WHERE product_id=p.id ORDER BY is_primary DESC,sort_order,id)pi
      WHERE ${clauses.join(' AND ')} ORDER BY ${order},p.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    return{items:r.recordset.map(x=>({...x,isActive:Boolean(x.isActive)})),shop,page:f.page,limit:f.limit,total:Number(r.recordset[0]?.total??0)};
  },
  async detail(userId:number,productId:number){
    await productOwnershipService.assertSellerOwnsProduct(productId,userId);const pool=await getPool();
    const base=await pool.request().input('id',sql.Int,productId).query(`SELECT p.id,p.product_name name,p.slug,p.description,p.specifications,p.is_active isActive,p.moderation_status moderationStatus,p.submitted_at submittedAt,p.reviewed_at reviewedAt,p.published_at publishedAt,p.review_reason reviewReason,p.created_at createdAt,p.updated_at updatedAt,b.id brandId,b.name brand,br.id brandRequestId,br.requested_name brandRequestName,br.status brandRequestStatus,br.review_reason brandRequestReviewReason,c.id categoryId,c.name category,s.id shopId,s.name shopName,s.slug shopSlug,s.status shopStatus,s.is_verified shopVerified FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id LEFT JOIN dbo.Brands b ON b.id=p.brand_id LEFT JOIN dbo.BrandRequests br ON br.id=p.brand_request_id LEFT JOIN dbo.Categories c ON c.id=p.category_id WHERE p.id=@id`);
    if(!base.recordset[0])throw new AppError(404,'Product not found');
    const[variants,images,moderationHistory]=await Promise.all([
      pool.request().input('id',sql.Int,productId).query(`SELECT v.id,v.variant_name variantName,v.sku,v.barcode,v.price,v.sale_price salePrice,v.weight,v.is_active isActive,v.is_default isDefault,i.id inventoryId,i.on_hand onHand,i.reserved,i.available,i.low_stock_threshold lowStockThreshold FROM dbo.ProductVariants v JOIN dbo.Inventory i ON i.variant_id=v.id WHERE v.product_id=@id ORDER BY v.is_default DESC,v.id`),
      pool.request().input('id',sql.Int,productId).query(`SELECT id,image_url imageUrl,alt_text altText,is_primary isPrimary,sort_order sortOrder FROM dbo.ProductImages WHERE product_id=@id ORDER BY is_primary DESC,sort_order,id`),
      pool.request().input('id',sql.Int,productId).query(`SELECT from_status fromStatus,to_status toStatus,reason,created_at createdAt,CASE WHEN actor_user_id IS NULL THEN N'System' ELSE N'Admin' END actorLabel FROM dbo.ProductModerationHistory WHERE product_id=@id ORDER BY created_at DESC,id DESC`)
    ]);
    const row=base.recordset[0];
    return{...row,isActive:Boolean(row.isActive),shop:{id:row.shopId,name:row.shopName,slug:row.shopSlug,status:row.shopStatus,isVerified:Boolean(row.shopVerified)},variants:variants.recordset.map(v=>({...v,isActive:Boolean(v.isActive),isDefault:Boolean(v.isDefault)})),images:images.recordset.map(i=>({...i,isPrimary:Boolean(i.isPrimary)})),history:moderationHistory.recordset};
  },
  async filters(userId:number){
    const shop=await productOwnershipService.resolveSellerShop(userId),pool=await getPool();
    const[categories,brands,requests]=await Promise.all([
      pool.request().query('SELECT id,name,slug FROM dbo.Categories WHERE is_active=1 ORDER BY name'),
      pool.request().query('SELECT id,name,slug,is_generic isGeneric FROM dbo.Brands WHERE is_active=1 ORDER BY name'),
      pool.request().input('shop',sql.Int,shop.id).query(`SELECT id,requested_name requestedName,status,resolved_brand_id resolvedBrandId,review_reason reviewReason FROM dbo.BrandRequests WHERE shop_id=@shop ORDER BY created_at DESC,id DESC`)
    ]);
    return{categories:categories.recordset,brands:brands.recordset.map(x=>({...x,isGeneric:Boolean(x.isGeneric)})),brandRequests:requests.recordset};
  },
  async create(userId:number,input:ProductInput){
    const pool=await getPool(),tx=pool.transaction();await tx.begin();
    try{
      const shop=(await tx.request().input('owner',sql.Int,userId).query('SELECT id,status FROM dbo.Shops WITH(UPDLOCK,HOLDLOCK) WHERE owner_user_id=@owner')).recordset[0];
      if(!shop)throw new AppError(409,'Seller account has no Shop');if(shop.status!=='ACTIVE')throw new AppError(409,'Suspended Shop cannot create Products');
      await assertCategory(tx,Number(input.categoryId));const source=await brandSource(tx,shop.id,input.brandId,input.brandRequestId),variant=input.defaultVariant!;
      const slug=await uniqueSlug(tx,input.slug||input.name!);
      const duplicate=(await tx.request().input('skuCheck',sql.NVarChar(200),variant.sku).query('SELECT id FROM dbo.ProductVariants WITH(UPDLOCK,HOLDLOCK) WHERE sku=@skuCheck')).recordset[0];if(duplicate)throw new AppError(409,'SKU already exists');
      const inserted=await tx.request().input('name',sql.NVarChar(200),input.name!.trim()).input('slug',sql.NVarChar(200),slug).input('description',sql.NVarChar(sql.MAX),input.description?.trim()||null)
        .input('sku',sql.NVarChar(100),variant.sku).input('price',sql.Decimal(10,2),variant.price).input('salePrice',sql.Decimal(10,2),variant.salePrice??null).input('stock',sql.Int,variant.initialOnHand)
        .input('brand',sql.Int,source.brandId).input('request',sql.Int,source.brandRequestId).input('category',sql.Int,input.categoryId).input('shop',sql.Int,shop.id)
        .query<{id:number}>(`INSERT dbo.Products(product_name,slug,description,sku,price,sale_price,stock,brand_id,brand_request_id,category_id,is_active,is_featured,is_on_sale,shop_id,moderation_status,created_at,updated_at)
          OUTPUT INSERTED.id VALUES(@name,@slug,@description,@sku,@price,@salePrice,@stock,@brand,@request,@category,0,0,0,@shop,N'DRAFT',SYSUTCDATETIME(),SYSUTCDATETIME())`);
      const id=Number(inserted.recordset[0].id);
      const createdVariant=await tx.request().input('product',sql.Int,id).input('variantName',sql.NVarChar(200),variant.name).input('variantSku',sql.NVarChar(200),variant.sku).input('variantPrice',sql.Decimal(10,2),variant.price).input('variantSale',sql.Decimal(10,2),variant.salePrice??null)
        .query<{id:number}>('INSERT dbo.ProductVariants(product_id,variant_name,sku,price,sale_price,is_active,is_default,created_at,updated_at) OUTPUT INSERTED.id VALUES(@product,@variantName,@variantSku,@variantPrice,@variantSale,1,1,SYSUTCDATETIME(),SYSUTCDATETIME())');
      await tx.request().input('variant',sql.Int,createdVariant.recordset[0].id).input('onHand',sql.Int,variant.initialOnHand).input('threshold',sql.Int,variant.lowStockThreshold).query('INSERT dbo.Inventory(variant_id,on_hand,reserved,low_stock_threshold,updated_at) VALUES(@variant,@onHand,0,@threshold,SYSUTCDATETIME())');
      await txAudit(tx,userId,'seller_product.created','Product',id,null,{moderationStatus:'DRAFT',shopId:shop.id,brandId:source.brandId,brandRequestId:source.brandRequestId});
      await tx.commit();return this.detail(userId,id);
    }catch(error){await tx.rollback();throw error;}
  },
  async update(userId:number,productId:number,input:ProductInput){
    const pool=await getPool(),tx=pool.transaction();await tx.begin();
    try{
      const current=await mutable(tx,userId,productId);const before={name:current.product_name,slug:current.slug,description:current.description,categoryId:current.category_id,brandId:current.brand_id,brandRequestId:current.brand_request_id};
      const category=input.categoryId??current.category_id;await assertCategory(tx,category);
      let source={brandId:current.brand_id,brandRequestId:current.brand_request_id};
      if(input.brandId!==undefined||input.brandRequestId!==undefined)source=await brandSource(tx,current.shop_id,input.brandId,input.brandRequestId);
      const name=input.name??current.product_name,slug=input.slug!==undefined||input.name!==undefined?await uniqueSlug(tx,input.slug||name,productId):current.slug;
      await tx.request().input('id',sql.Int,productId).input('name',sql.NVarChar(200),name).input('slug',sql.NVarChar(200),slug).input('description',sql.NVarChar(sql.MAX),input.description===undefined?current.description:input.description?.trim()||null)
        .input('category',sql.Int,category).input('brand',sql.Int,source.brandId).input('request',sql.Int,source.brandRequestId)
        .query('UPDATE dbo.Products SET product_name=@name,slug=@slug,description=@description,category_id=@category,brand_id=@brand,brand_request_id=@request,updated_at=SYSUTCDATETIME() WHERE id=@id');
      await txAudit(tx,userId,'seller_product.updated','Product',productId,before,{name,slug,categoryId:category,...source});await tx.commit();return this.detail(userId,productId);
    }catch(error){await tx.rollback();throw error;}
  },
  async remove(userId:number,productId:number){
    const pool=await getPool(),tx=pool.transaction();await tx.begin();let images:string[]=[];
    try{
      const current=await mutable(tx,userId,productId);
      const refs=(await tx.request().input('id',sql.Int,productId).query(`SELECT (SELECT COUNT(*) FROM dbo.OrderItems WHERE product_id=@id) orders,(SELECT COUNT(*) FROM dbo.Inventory i JOIN dbo.ProductVariants v ON v.id=i.variant_id WHERE v.product_id=@id AND i.reserved>0) reservations,(SELECT COUNT(*) FROM dbo.InventoryAdjustments ia JOIN dbo.ProductVariants v ON v.id=ia.variant_id WHERE v.product_id=@id) adjustments,(SELECT COUNT(*) FROM dbo.ProductModerationHistory WHERE product_id=@id) moderationHistory`)).recordset[0];
      if(Number(refs.orders)>0||Number(refs.reservations)>0||Number(refs.adjustments)>0||Number(refs.moderationHistory)>0)throw new AppError(409,'Product has commerce, reservation, Inventory, or immutable moderation history');
      images=(await tx.request().input('imageProduct',sql.Int,productId).query('SELECT image_url FROM dbo.ProductImages WHERE product_id=@imageProduct')).recordset.map(x=>String(x.image_url));
      await txAudit(tx,userId,'seller_product.deleted','Product',productId,{name:current.product_name,moderationStatus:current.moderation_status},null);
      await tx.request().input('deleteId',sql.Int,productId).query(`DELETE dbo.VariantOptionValues WHERE variant_id IN(SELECT id FROM dbo.ProductVariants WHERE product_id=@deleteId);
        DELETE dbo.ProductOptionValues WHERE product_option_id IN(SELECT id FROM dbo.ProductOptions WHERE product_id=@deleteId);
        DELETE dbo.ProductOptions WHERE product_id=@deleteId;DELETE dbo.ProductTags WHERE product_id=@deleteId;DELETE dbo.ProductImages WHERE product_id=@deleteId;
        DELETE dbo.Inventory WHERE variant_id IN(SELECT id FROM dbo.ProductVariants WHERE product_id=@deleteId);DELETE dbo.ProductVariants WHERE product_id=@deleteId;DELETE dbo.Products WHERE id=@deleteId;`);
      await tx.commit();await Promise.all(images.map(removeLocalFile));return{id:productId};
    }catch(error){try{await tx.rollback();}catch{}throw error;}
  },
  async submit(userId:number,productId:number){
    const pool=await getPool(),tx=pool.transaction();await tx.begin();
    try{
      const current=await mutable(tx,userId,productId);
      const readiness=await evaluateProductReadiness(tx,productId);if(!readiness.ready)throw new AppError(409,`Product is not ready: ${readiness.missing.join(', ')}`);
      await tx.request().input('submitId',sql.Int,productId).query(`UPDATE dbo.Products SET moderation_status=N'PENDING_REVIEW',submitted_at=SYSUTCDATETIME(),review_reason=NULL,is_active=0,updated_at=SYSUTCDATETIME() WHERE id=@submitId`);
      await tx.request().input('historyProduct',sql.Int,productId).input('historyActor',sql.Int,userId).input('historyFrom',sql.NVarChar(20),current.moderation_status)
        .query(`INSERT dbo.ProductModerationHistory(product_id,from_status,to_status,actor_user_id,reason,created_at) VALUES(@historyProduct,@historyFrom,N'PENDING_REVIEW',@historyActor,NULL,SYSUTCDATETIME())`);
      await txAudit(tx,userId,'seller_product.submitted','Product',productId,{moderationStatus:current.moderation_status},{moderationStatus:'PENDING_REVIEW'});await tx.commit();return this.detail(userId,productId);
    }catch(error){await tx.rollback();throw error;}
  },
  async createVariant(userId:number,productId:number,input:VariantInput){
    const pool=await getPool(),tx=pool.transaction();await tx.begin();try{await mutable(tx,userId,productId);await tx.commit();}catch(error){await tx.rollback();throw error;}
    const result=await adminVariantsService.create(productId,{variant_name:input.name,sku:input.sku,price:input.price,sale_price:input.salePrice,barcode:input.barcode,weight:input.weight,is_default:input.isDefault,is_active:input.isActive,initial_on_hand:input.initialOnHand,low_stock_threshold:input.lowStockThreshold});
    await audit(userId,'seller_variant.created','ProductVariant',Number(result.id),null,{productId,sku:result.sku,price:result.price});return result;
  },
  async updateVariant(userId:number,productId:number,variantId:number,input:VariantInput){
    await assertVariantPath(userId,productId,variantId);const pool=await getPool(),tx=pool.transaction();await tx.begin();try{await mutable(tx,userId,productId);await tx.commit();}catch(error){await tx.rollback();throw error;}
    const before=await adminVariantsService.get(variantId),result=await adminVariantsService.update(variantId,{variant_name:input.name,sku:input.sku,price:input.price,sale_price:input.salePrice,barcode:input.barcode,weight:input.weight,is_default:input.isDefault,is_active:input.isActive});
    await audit(userId,'seller_variant.updated','ProductVariant',variantId,{sku:before.sku,price:before.price,salePrice:before.sale_price},{sku:result.sku,price:result.price,salePrice:result.sale_price});return result;
  },
  async removeVariant(userId:number,productId:number,variantId:number){
    await assertVariantPath(userId,productId,variantId);const pool=await getPool(),tx=pool.transaction();await tx.begin();
    try{await mutable(tx,userId,productId);const check=(await tx.request().input('variant',sql.Int,variantId).input('product',sql.Int,productId).query(`SELECT (SELECT COUNT(*) FROM dbo.ProductVariants WHERE product_id=@product) total,(SELECT COUNT(*) FROM dbo.OrderItems WHERE variant_id=@variant) orders,(SELECT reserved FROM dbo.Inventory WHERE variant_id=@variant) reserved`)).recordset[0];if(Number(check.total)<=1)throw new AppError(409,'Product must retain at least one Variant');if(Number(check.orders)>0||Number(check.reserved)>0)throw new AppError(409,'Variant has commerce or reservation references');await tx.commit();}catch(error){await tx.rollback();throw error;}
    const result=await adminVariantsService.remove(variantId);await audit(userId,'seller_variant.deleted','ProductVariant',variantId,{productId},result);return result;
  },
  async addImages(userId:number,productId:number,files:Express.Multer.File[]){
    const pool=await getPool(),tx=pool.transaction();await tx.begin();try{await mutable(tx,userId,productId);await tx.commit();}catch(error){await tx.rollback();throw error;}
    const result=await adminProductsService.addImages(productId,files);await audit(userId,'seller_product_images.uploaded','Product',productId,null,{count:files.length});return result;
  },
  async setPrimaryImage(userId:number,productId:number,imageId:number){
    const image=await productOwnershipService.assertSellerOwnsImage(imageId,userId);if(Number(image.productId)!==productId)throw new AppError(404,'Image not found');
    const pool=await getPool(),tx=pool.transaction();await tx.begin();try{await mutable(tx,userId,productId);await tx.commit();}catch(error){await tx.rollback();throw error;}
    const result=await adminProductsService.setPrimary(productId,imageId);await audit(userId,'seller_product_image.primary_changed','ProductImage',imageId,null,{productId,isPrimary:true});return result;
  },
  async removeImage(userId:number,productId:number,imageId:number){
    const image=await productOwnershipService.assertSellerOwnsImage(imageId,userId);if(Number(image.productId)!==productId)throw new AppError(404,'Image not found');
    const pool=await getPool(),tx=pool.transaction();await tx.begin();try{await mutable(tx,userId,productId);await tx.commit();}catch(error){await tx.rollback();throw error;}
    const result=await adminProductsService.removeImage(productId,imageId);await audit(userId,'seller_product_image.deleted','ProductImage',imageId,{productId},null);return result;
  },
  async adjustInventory(userId:number,productId:number,variantId:number,quantityDelta:number,reason:string){
    await assertVariantPath(userId,productId,variantId);const before=await adminInventoryService.detail(variantId);
    const result=await adminInventoryService.adjust(variantId,{type:'MANUAL_CORRECTION',quantityDelta,reason},userId);
    await audit(userId,'seller_inventory.adjusted','Inventory',Number(before.inventory_id),{onHand:before.on_hand,reserved:before.reserved},{onHand:result.newOnHand,reserved:result.reserved,delta:quantityDelta,reason});return result;
  }
};
