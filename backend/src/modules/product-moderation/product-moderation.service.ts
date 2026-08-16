import { getPool,sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { evaluateProductReadiness } from './product-moderation.readiness';
import { ModerationAction,ModerationQuery,ModerationStatus } from './product-moderation.types';

type LockedProduct={id:number;shop_id:number;shop_status:string;is_system:boolean;moderation_status:ModerationStatus;is_active:boolean};
const actionPolicy:Record<ModerationAction,{from:ModerationStatus;to:ModerationStatus;active:boolean;needsReadiness:boolean;needsActiveShop:boolean;action:string}>={
  approve:{from:'PENDING_REVIEW',to:'PUBLISHED',active:true,needsReadiness:true,needsActiveShop:true,action:'product_moderation.approved'},
  reject:{from:'PENDING_REVIEW',to:'REJECTED',active:false,needsReadiness:false,needsActiveShop:false,action:'product_moderation.rejected'},
  suspend:{from:'PUBLISHED',to:'SUSPENDED',active:false,needsReadiness:false,needsActiveShop:false,action:'product_moderation.suspended'},
  republish:{from:'SUSPENDED',to:'PUBLISHED',active:true,needsReadiness:true,needsActiveShop:true,action:'product_moderation.republished'}
};
async function history(tx:sql.Transaction,productId:number,from:ModerationStatus,to:ModerationStatus,actor:number,reason:string|null){
  await tx.request().input('historyProduct',sql.Int,productId).input('historyFrom',sql.NVarChar(20),from).input('historyTo',sql.NVarChar(20),to).input('historyActor',sql.Int,actor).input('historyReason',sql.NVarChar(1000),reason)
    .query('INSERT dbo.ProductModerationHistory(product_id,from_status,to_status,actor_user_id,reason,created_at) VALUES(@historyProduct,@historyFrom,@historyTo,@historyActor,@historyReason,SYSUTCDATETIME())');
}
async function audit(tx:sql.Transaction,actor:number,product:LockedProduct,action:string,to:ModerationStatus,reason:string|null){
  await tx.request().input('auditActor',sql.Int,actor).input('auditAction',sql.NVarChar(100),action).input('auditProduct',sql.Int,product.id)
    .input('auditBefore',sql.NVarChar(sql.MAX),JSON.stringify({shopId:product.shop_id,moderationStatus:product.moderation_status,isActive:Boolean(product.is_active)}))
    .input('auditAfter',sql.NVarChar(sql.MAX),JSON.stringify({shopId:product.shop_id,moderationStatus:to,isActive:to==='PUBLISHED',reason}))
    .query(`INSERT dbo.AuditLogs(user_id,action,entity_type,entity_id,old_value,new_value,timestamp)
      VALUES(@auditActor,@auditAction,N'Product',@auditProduct,@auditBefore,@auditAfter,SYSUTCDATETIME())`);
}
function mapList(row:Record<string,unknown>){return{...row,isActive:Boolean(row.isActive),shop:{id:row.shopId,name:row.shopName,slug:row.shopSlug,status:row.shopStatus,isVerified:Boolean(row.shopVerified)},seller:{id:row.sellerId,name:row.sellerName},primaryImage:row.primaryImage??null,variantCount:Number(row.variantCount),availableInventory:Number(row.availableInventory??0)};}

export const productModerationService={
  async list(query:ModerationQuery){
    const pool=await getPool(),request=pool.request().input('offset',sql.Int,(query.page-1)*query.limit).input('limit',sql.Int,query.limit).input('status',sql.NVarChar(20),query.status);
    const clauses=['s.is_system=0','p.moderation_status=@status'];
    if(query.search){request.input('search',sql.NVarChar(202),`%${query.search}%`);clauses.push('(p.product_name LIKE @search OR p.slug LIKE @search OR EXISTS(SELECT 1 FROM dbo.ProductVariants sv WHERE sv.product_id=p.id AND sv.sku LIKE @search))');}
    for(const [key,column] of [['shopId','p.shop_id'],['categoryId','p.category_id'],['brandId','p.brand_id']] as const)if(query[key]){request.input(key,sql.Int,query[key]);clauses.push(`${column}=@${key}`);}
    if(query.submittedFrom){request.input('submittedFrom',sql.DateTime2,query.submittedFrom);clauses.push('p.submitted_at>=@submittedFrom');}
    if(query.submittedTo){request.input('submittedTo',sql.DateTime2,query.submittedTo);clauses.push('p.submitted_at<=@submittedTo');}
    const sort={submittedAt:'p.submitted_at',createdAt:'p.created_at',reviewedAt:'p.reviewed_at'}[query.sortBy],direction=query.sortOrder==='asc'?'ASC':'DESC';
    const result=await request.query(`SELECT p.id,p.product_name name,p.slug,p.moderation_status moderationStatus,p.is_active isActive,p.submitted_at submittedAt,p.reviewed_at reviewedAt,p.published_at publishedAt,p.review_reason reviewReason,p.created_at createdAt,
      b.id brandId,b.name brand,c.id categoryId,c.name category,s.id shopId,s.name shopName,s.slug shopSlug,s.status shopStatus,s.is_verified shopVerified,u.id sellerId,u.name sellerName,
      pi.image_url primaryImage,(SELECT COUNT(*) FROM dbo.ProductVariants v WHERE v.product_id=p.id) variantCount,
      (SELECT SUM(i.available) FROM dbo.ProductVariants v JOIN dbo.Inventory i ON i.variant_id=v.id WHERE v.product_id=p.id) availableInventory,COUNT_BIG(*) OVER() total
      FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id JOIN dbo.Users u ON u.id=s.owner_user_id
      LEFT JOIN dbo.Brands b ON b.id=p.brand_id LEFT JOIN dbo.Categories c ON c.id=p.category_id
      OUTER APPLY(SELECT TOP 1 image_url FROM dbo.ProductImages WHERE product_id=p.id ORDER BY is_primary DESC,sort_order,id)pi
      WHERE ${clauses.join(' AND ')} ORDER BY ${sort} ${direction},p.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    return{items:result.recordset.map(mapList),page:query.page,limit:query.limit,total:Number(result.recordset[0]?.total??0)};
  },
  async detail(productId:number){
    const pool=await getPool(),base=await pool.request().input('id',sql.Int,productId).query(`SELECT p.id,p.product_name name,p.slug,p.description,p.specifications,p.moderation_status moderationStatus,p.is_active isActive,p.submitted_at submittedAt,p.reviewed_at reviewedAt,p.published_at publishedAt,p.review_reason reviewReason,p.created_at createdAt,p.updated_at updatedAt,
      b.id brandId,b.name brand,c.id categoryId,c.name category,s.id shopId,s.name shopName,s.slug shopSlug,s.status shopStatus,s.is_verified shopVerified,u.id sellerId,u.name sellerName
      FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id JOIN dbo.Users u ON u.id=s.owner_user_id LEFT JOIN dbo.Brands b ON b.id=p.brand_id LEFT JOIN dbo.Categories c ON c.id=p.category_id WHERE p.id=@id AND s.is_system=0`);
    if(!base.recordset[0])throw new AppError(404,'Seller Product not found');
    const tx=pool.transaction();await tx.begin();let readiness;try{readiness=await evaluateProductReadiness(tx,productId);await tx.commit();}catch(error){await tx.rollback();throw error;}
    const[variants,images,moderationHistory]=await Promise.all([
      pool.request().input('id',sql.Int,productId).query(`SELECT v.id,v.variant_name variantName,v.sku,v.barcode,v.price,v.sale_price salePrice,v.weight,v.is_active isActive,v.is_default isDefault,i.on_hand onHand,i.reserved,i.available,i.low_stock_threshold lowStockThreshold FROM dbo.ProductVariants v LEFT JOIN dbo.Inventory i ON i.variant_id=v.id WHERE v.product_id=@id ORDER BY v.is_default DESC,v.id`),
      pool.request().input('id',sql.Int,productId).query('SELECT id,image_url imageUrl,alt_text altText,is_primary isPrimary,sort_order sortOrder FROM dbo.ProductImages WHERE product_id=@id ORDER BY is_primary DESC,sort_order,id'),
      pool.request().input('id',sql.Int,productId).query(`SELECT id,from_status fromStatus,to_status toStatus,reason,created_at createdAt,CASE WHEN actor_user_id IS NULL THEN N'System' ELSE N'Admin' END actorLabel FROM dbo.ProductModerationHistory WHERE product_id=@id ORDER BY created_at DESC,id DESC`)
    ]);
    const row=base.recordset[0];return{...row,isActive:Boolean(row.isActive),shop:{id:row.shopId,name:row.shopName,slug:row.shopSlug,status:row.shopStatus,isVerified:Boolean(row.shopVerified)},seller:{id:row.sellerId,name:row.sellerName},readiness,variants:variants.recordset.map(v=>({...v,isActive:Boolean(v.isActive),isDefault:Boolean(v.isDefault)})),images:images.recordset.map(i=>({...i,isPrimary:Boolean(i.isPrimary)})),history:moderationHistory.recordset};
  },
  async transition(productId:number,adminId:number,action:ModerationAction,reasonOrNote?:string){
    const policy=actionPolicy[action],reason=reasonOrNote?.trim()||null,pool=await getPool(),tx=pool.transaction();await tx.begin();
    try{
      const product=(await tx.request().input('id',sql.Int,productId).query<LockedProduct>(`SELECT p.id,p.shop_id,s.status shop_status,s.is_system,p.moderation_status,p.is_active FROM dbo.Products p WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Shops s ON s.id=p.shop_id WHERE p.id=@id`)).recordset[0];
      if(!product||product.is_system)throw new AppError(404,'Seller Product not found');
      if(product.moderation_status!==policy.from)throw new AppError(409,`${action} requires ${policy.from}`);
      if((action==='reject'||action==='suspend')&&!reason)throw new AppError(400,'Reason is required');
      if(policy.needsActiveShop&&product.shop_status!=='ACTIVE')throw new AppError(409,'Shop must be ACTIVE');
      if(policy.needsReadiness){const readiness=await evaluateProductReadiness(tx,productId);if(!readiness.ready)throw new AppError(409,`Product is not ready: ${readiness.missing.join(', ')}`);}
      await tx.request().input('id2',sql.Int,productId).input('admin',sql.Int,adminId).input('reason',sql.NVarChar(1000),policy.to==='REJECTED'||policy.to==='SUSPENDED'?reason:null)
        .input('status',sql.NVarChar(20),policy.to).input('active',sql.Bit,policy.active)
        .query(`UPDATE dbo.Products SET moderation_status=@status,is_active=@active,review_reason=@reason,reviewed_at=SYSUTCDATETIME(),reviewed_by_user_id=@admin,
          published_at=CASE WHEN @status=N'PUBLISHED' THEN SYSUTCDATETIME() ELSE published_at END,updated_at=SYSUTCDATETIME() WHERE id=@id2`);
      await history(tx,productId,product.moderation_status,policy.to,adminId,reason);await audit(tx,adminId,product,policy.action,policy.to,reason);await tx.commit();return this.detail(productId);
    }catch(error){await tx.rollback();throw error;}
  }
};
