import { getPool, sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import type { AdminShopFilters, SellerShopPatch, ShopStatus } from './shops.types';
import { productsService,ProductListParams } from '../products/products.service';

const columns = `s.id,s.owner_user_id ownerUserId,s.system_key systemKey,s.name,s.slug,
  s.logo_url logoUrl,s.banner_url bannerUrl,s.description,s.pickup_address pickupAddress,
  s.status,s.is_verified isVerified,s.is_system isSystem,s.average_rating averageRating,
  s.review_count reviewCount,s.completed_order_count completedOrderCount,s.sold_count soldCount,
  s.created_at createdAt,s.updated_at updatedAt`;

function map(row: Record<string, unknown>): any {
  return { ...row, id:Number(row.id), ownerUserId:row.ownerUserId==null?null:Number(row.ownerUserId),
    isVerified:Boolean(row.isVerified),isSystem:Boolean(row.isSystem),averageRating:row.averageRating==null?null:Number(row.averageRating),
    reviewCount:Number(row.reviewCount),completedOrderCount:Number(row.completedOrderCount),soldCount:Number(row.soldCount) };
}

async function audit(tx: sql.Transaction, actorId: number, shopId: number, action: string, before: unknown, after: unknown) {
  await tx.request().input('auditActor',sql.Int,actorId).input('auditShop',sql.Int,shopId)
    .input('auditAction',sql.NVarChar(100),action)
    .input('auditBefore',sql.NVarChar(sql.MAX),before?JSON.stringify(before):null)
    .input('auditAfter',sql.NVarChar(sql.MAX),JSON.stringify(after))
    .query(`INSERT dbo.AuditLogs(user_id,action,entity_type,entity_id,old_value,new_value,timestamp)
      VALUES(@auditActor,@auditAction,N'Shop',@auditShop,@auditBefore,@auditAfter,SYSUTCDATETIME())`);
}

export function shopSlug(value: string, userId: number) {
  const base=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,160)||'seller';
  return `${base}-${userId}`;
}

export async function createSellerShopInTransaction(tx: sql.Transaction, application: {
  userId:number; businessName:string; pickupAddress:string|null; description:string|null;
}, actorId:number) {
  const existing=await tx.request().input('shopOwner',sql.Int,application.userId)
    .query('SELECT id FROM dbo.Shops WITH (UPDLOCK,HOLDLOCK) WHERE owner_user_id=@shopOwner');
  if(existing.recordset[0]) throw new AppError(409,'Seller already owns a shop');
  const slug=shopSlug(application.businessName,application.userId);
  const inserted=await tx.request().input('shopOwnerCreate',sql.Int,application.userId)
    .input('shopName',sql.NVarChar(200),application.businessName.trim())
    .input('shopSlug',sql.NVarChar(200),slug)
    .input('shopPickup',sql.NVarChar(500),application.pickupAddress)
    .input('shopDescription',sql.NVarChar(2000),application.description)
    .query<{id:number}>(`INSERT dbo.Shops(owner_user_id,name,slug,pickup_address,description,status,is_verified,is_system)
      OUTPUT INSERTED.id VALUES(@shopOwnerCreate,@shopName,@shopSlug,@shopPickup,@shopDescription,N'ACTIVE',0,0)`);
  const id=Number(inserted.recordset[0].id);
  await audit(tx,actorId,id,'shop.created_from_seller_approval',null,{ownerUserId:application.userId,name:application.businessName,slug,status:'ACTIVE'});
  return id;
}

export const shopsService = {
  async getMine(userId:number) {
    const pool=await getPool();
    const result=await pool.request().input('owner',sql.Int,userId).query(`SELECT ${columns},
      review_stats.averageRating liveAverageRating,review_stats.reviewCount liveReviewCount,
      completed.completedOrderCount liveCompletedOrderCount,sold.soldCount liveSoldCount
      FROM dbo.Shops s
      OUTER APPLY(SELECT CAST(AVG(CAST(r.rating AS DECIMAL(10,4))) AS DECIMAL(4,2)) averageRating,COUNT_BIG(*) reviewCount FROM dbo.ShopReviews r WHERE r.shop_id=s.id AND r.status=N'PUBLISHED') review_stats
      OUTER APPLY(SELECT COUNT_BIG(*) completedOrderCount FROM dbo.ShopOrders so JOIN dbo.Orders o ON o.id=so.order_id WHERE so.shop_id=s.id AND so.delivered_at IS NOT NULL AND so.status NOT IN(N'CANCELLED',N'UNABLE_TO_FULFILL') AND o.logistics_status=N'DELIVERED') completed
      OUTER APPLY(SELECT COALESCE(SUM(CAST(oi.quantity AS BIGINT)),0) soldCount FROM dbo.OrderItems oi JOIN dbo.ShopOrders so ON so.id=oi.shop_order_id JOIN dbo.Orders o ON o.id=oi.order_id WHERE so.shop_id=s.id AND so.delivered_at IS NOT NULL AND so.status NOT IN(N'CANCELLED',N'UNABLE_TO_FULFILL') AND o.logistics_status=N'DELIVERED') sold
      WHERE s.owner_user_id=@owner`);
    if(!result.recordset[0]) throw new AppError(409,'Seller account has no shop; contact an administrator');
    const resultMap=map(result.recordset[0]);return{...resultMap,averageRating:resultMap.liveAverageRating==null?null:Number(resultMap.liveAverageRating),reviewCount:Number(resultMap.liveReviewCount),completedOrderCount:Number(resultMap.liveCompletedOrderCount),soldCount:Number(resultMap.liveSoldCount)};
  },
  async updateMine(userId:number,input:SellerShopPatch) {
    const pool=await getPool(); const tx=pool.transaction(); let begun=false;
    try {
      await tx.begin(); begun=true;
      const locked=await tx.request().input('owner',sql.Int,userId).query(`SELECT ${columns} FROM dbo.Shops s WITH(UPDLOCK,HOLDLOCK) WHERE s.owner_user_id=@owner`);
      if(!locked.recordset[0]) throw new AppError(409,'Seller account has no shop; contact an administrator');
      const before=map(locked.recordset[0]); const request=tx.request().input('id',sql.Int,before.id); const set:string[]=[];
      const fields:[keyof SellerShopPatch,string,any][]=[
        ['name','name',sql.NVarChar(200)],['slug','slug',sql.NVarChar(200)],['logoUrl','logo_url',sql.NVarChar(500)],
        ['bannerUrl','banner_url',sql.NVarChar(500)],['description','description',sql.NVarChar(2000)],['pickupAddress','pickup_address',sql.NVarChar(500)]
      ];
      for(const [key,column,type] of fields) if(Object.prototype.hasOwnProperty.call(input,key)){
        request.input(key,type,input[key]); set.push(`${column}=@${key}`);
      }
      await request.query(`UPDATE dbo.Shops SET ${set.join(',')},updated_at=SYSUTCDATETIME() WHERE id=@id`);
      const after={...before,...input}; await audit(tx,userId,Number(before.id),'shop.profile_updated',before,after);
      await tx.commit(); begun=false; return this.getMine(userId);
    } catch(error) { if(begun) await tx.rollback(); if([2601,2627].includes((error as {number?:number}).number??0)) throw new AppError(409,'Shop slug is already in use'); throw error; }
  },
  async publicDetail(slug:string,filters:Omit<ProductListParams,'shopSlug'>) {
    const pool=await getPool(); const shop=await pool.request().input('slug',sql.NVarChar(200),slug)
      .query(`SELECT s.id,s.name,s.slug,s.logo_url logoUrl,s.banner_url bannerUrl,s.description,s.is_verified isVerified,s.created_at createdAt,
        review_stats.averageRating,review_stats.reviewCount,completed.completedOrderCount,sold.soldCount
        FROM dbo.Shops s
        OUTER APPLY(SELECT CAST(AVG(CAST(r.rating AS DECIMAL(10,4))) AS DECIMAL(4,2)) averageRating,COUNT_BIG(*) reviewCount FROM dbo.ShopReviews r WHERE r.shop_id=s.id AND r.status=N'PUBLISHED') review_stats
        OUTER APPLY(SELECT COUNT_BIG(*) completedOrderCount FROM dbo.ShopOrders so JOIN dbo.Orders o ON o.id=so.order_id WHERE so.shop_id=s.id AND so.delivered_at IS NOT NULL AND so.status NOT IN(N'CANCELLED',N'UNABLE_TO_FULFILL') AND o.logistics_status=N'DELIVERED') completed
        OUTER APPLY(SELECT COALESCE(SUM(CAST(oi.quantity AS BIGINT)),0) soldCount FROM dbo.OrderItems oi JOIN dbo.ShopOrders so ON so.id=oi.shop_order_id JOIN dbo.Orders o ON o.id=oi.order_id WHERE so.shop_id=s.id AND so.delivered_at IS NOT NULL AND so.status NOT IN(N'CANCELLED',N'UNABLE_TO_FULFILL') AND o.logistics_status=N'DELIVERED') sold
        WHERE s.slug=@slug AND s.status=N'ACTIVE'`);
    if(!shop.recordset[0]) throw new AppError(404,'Shop not found');
    const products=await productsService.list({...filters,shopSlug:slug});
    const s=map(shop.recordset[0]);
    return { shop:{name:s.name,slug:s.slug,logoUrl:s.logoUrl,bannerUrl:s.bannerUrl,description:s.description,isVerified:s.isVerified,
      averageRating:s.averageRating,reviewCount:s.reviewCount,completedOrderCount:s.completedOrderCount,soldCount:s.soldCount,createdAt:s.createdAt},
       products:products.products,page:products.page,pageSize:products.pageSize,total:products.total };
  },
  async listAdmin(filters:AdminShopFilters) {
    const pool=await getPool(); const req=pool.request().input('offset',sql.Int,(filters.page-1)*filters.limit).input('limit',sql.Int,filters.limit);
    const clauses:string[]=[];
    if(filters.search){req.input('search',sql.NVarChar(202),`%${filters.search}%`);clauses.push('(s.name LIKE @search OR s.slug LIKE @search OR u.email LIKE @search)');}
    if(filters.status){req.input('status',sql.NVarChar(20),filters.status);clauses.push('s.status=@status');}
    if(filters.verified!==undefined){req.input('verified',sql.Bit,filters.verified);clauses.push('s.is_verified=@verified');}
    if(filters.system!==undefined){req.input('system',sql.Bit,filters.system);clauses.push('s.is_system=@system');}
    const orders={created_desc:'s.created_at DESC',created_asc:'s.created_at ASC',name_asc:'s.name ASC',name_desc:'s.name DESC'};
    const result=await req.query(`SELECT ${columns},u.name ownerName,u.email ownerEmail,
      (SELECT COUNT(*) FROM dbo.Products p WHERE p.shop_id=s.id) productCount,COUNT_BIG(*) OVER() total
      FROM dbo.Shops s LEFT JOIN dbo.Users u ON u.id=s.owner_user_id ${clauses.length?'WHERE '+clauses.join(' AND '):''}
      ORDER BY ${orders[filters.sort]},s.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    return {items:result.recordset.map(map),page:filters.page,limit:filters.limit,total:Number(result.recordset[0]?.total??0)};
  },
  async adminDetail(id:number) {
    const pool=await getPool(); const result=await pool.request().input('id',sql.Int,id).query(`SELECT ${columns},u.name ownerName,u.email ownerEmail,
      (SELECT COUNT(*) FROM dbo.Products p WHERE p.shop_id=s.id) productCount FROM dbo.Shops s LEFT JOIN dbo.Users u ON u.id=s.owner_user_id WHERE s.id=@id`);
    if(!result.recordset[0]) throw new AppError(404,'Shop not found'); return map(result.recordset[0]);
  },
  async setStatus(id:number,status:ShopStatus,reason:string|undefined,adminId:number) {
    const pool=await getPool(); const tx=pool.transaction(); let begun=false;
    try { await tx.begin();begun=true;const result=await tx.request().input('id',sql.Int,id).query(`SELECT id,status,is_system isSystem FROM dbo.Shops WITH(UPDLOCK,HOLDLOCK) WHERE id=@id`);
      const row=result.recordset[0];if(!row)throw new AppError(404,'Shop not found');if(row.isSystem)throw new AppError(409,'System shop status cannot be changed');
      await tx.request().input('id2',sql.Int,id).input('status',sql.NVarChar(20),status).query('UPDATE dbo.Shops SET status=@status,updated_at=SYSUTCDATETIME() WHERE id=@id2');
      await audit(tx,adminId,id,status==='SUSPENDED'?'shop.suspended':'shop.reactivated',{status:row.status},{status,reason:reason??null});
      await tx.commit();begun=false;return this.adminDetail(id);
    }catch(e){if(begun)await tx.rollback();throw e;}
  },
  async setVerification(id:number,isVerified:boolean,adminId:number) {
    const pool=await getPool();const tx=pool.transaction();let begun=false;
    try{await tx.begin();begun=true;const result=await tx.request().input('id',sql.Int,id).query('SELECT id,is_verified isVerified,is_system isSystem FROM dbo.Shops WITH(UPDLOCK,HOLDLOCK) WHERE id=@id');
      const row=result.recordset[0];if(!row)throw new AppError(404,'Shop not found');if(row.isSystem&&!isVerified)throw new AppError(409,'GymFit Official must remain verified');
      await tx.request().input('id2',sql.Int,id).input('verified',sql.Bit,isVerified).query('UPDATE dbo.Shops SET is_verified=@verified,updated_at=SYSUTCDATETIME() WHERE id=@id2');
      await audit(tx,adminId,id,isVerified?'shop.verified':'shop.unverified',{isVerified:Boolean(row.isVerified)},{isVerified});
      await tx.commit();begun=false;return this.adminDetail(id);
    }catch(e){if(begun)await tx.rollback();throw e;}
  }
};
