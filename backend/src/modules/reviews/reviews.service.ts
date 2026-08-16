import { getPool,sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import type { AdminReviewQuery,ReviewAction,ReviewCreateInput,ReviewListQuery,ReviewStatus,ReviewType } from './reviews.types';

const normalize=(value:string|null|undefined)=>value?.trim()||null;
const publicOrder=(sort:ReviewListQuery['sort'])=>({
  newest:'r.published_at DESC,r.id DESC',oldest:'r.published_at ASC,r.id ASC',
  highest:'r.rating DESC,r.published_at DESC,r.id DESC',lowest:'r.rating ASC,r.published_at DESC,r.id DESC'
}[sort]);
const buyerName=`COALESCE(NULLIF(LTRIM(RTRIM(u.name)),N''),N'Người mua GymFit')`;

function productMap(row:any){return{
  id:Number(row.id),type:'PRODUCT',rating:Number(row.rating),comment:row.comment??null,status:row.status,
  verifiedPurchase:Boolean(row.verifiedPurchase),buyerName:row.buyerName,variantName:row.variantName??null,
  product:row.productId==null?undefined:{id:Number(row.productId),name:row.productName,slug:row.productSlug},
  shop:row.shopId==null?undefined:{id:Number(row.shopId),name:row.shopName,slug:row.shopSlug},
  createdAt:row.createdAt,publishedAt:row.publishedAt,moderationReason:row.moderationReason??null
};}
function shopMap(row:any){return{
  id:Number(row.id),type:'SHOP',rating:Number(row.rating),comment:row.comment??null,status:row.status,
  verifiedPurchase:Boolean(row.verifiedPurchase),buyerName:row.buyerName,
  shop:{id:Number(row.shopId),name:row.shopName,slug:row.shopSlug},
  createdAt:row.createdAt,publishedAt:row.publishedAt,moderationReason:row.moderationReason??null
};}

async function history(tx:sql.Transaction,type:ReviewType,id:number,event:string,from:ReviewStatus|null,to:ReviewStatus,actor:number,reason:string|null){
  await tx.request().input('historyType',sql.NVarChar(20),type).input('historyId',sql.BigInt,id)
    .input('historyEvent',sql.NVarChar(40),event).input('historyFrom',sql.NVarChar(20),from)
    .input('historyTo',sql.NVarChar(20),to).input('historyActor',sql.Int,actor).input('historyReason',sql.NVarChar(1000),reason)
    .query(`INSERT dbo.ReviewModerationHistory(review_type,review_id,event_type,from_status,to_status,actor_id,reason)
      VALUES(@historyType,@historyId,@historyEvent,@historyFrom,@historyTo,@historyActor,@historyReason)`);
}
async function audit(tx:sql.Transaction,type:ReviewType,id:number,actor:number,action:string,before:unknown,after:unknown){
  await tx.request().input('auditActor',sql.Int,actor).input('auditAction',sql.NVarChar(100),action)
    .input('auditType',sql.NVarChar(50),`${type === 'PRODUCT'?'Product':'Shop'}Review`).input('auditId',sql.Int,id)
    .input('auditBefore',sql.NVarChar(sql.MAX),JSON.stringify(before)).input('auditAfter',sql.NVarChar(sql.MAX),JSON.stringify(after))
    .query(`INSERT dbo.AuditLogs(user_id,action,entity_type,entity_id,old_value,new_value,timestamp)
      VALUES(@auditActor,@auditAction,@auditType,@auditId,@auditBefore,@auditAfter,SYSUTCDATETIME())`);
}

export const reviewsService={
  async createProduct(buyerId:number,orderItemId:number,input:ReviewCreateInput){
    const pool=await getPool(),tx=pool.transaction();let begun=false;
    try{
      await tx.begin();begun=true;
      const result=await tx.request().input('buyer',sql.Int,buyerId).input('item',sql.Int,orderItemId).query<any>(`
        SELECT oi.id orderItemId,oi.order_id parentOrderId,oi.shop_order_id shopOrderId,oi.product_id productId,
          oi.variant_id variantId,so.shop_id shopId
        FROM dbo.OrderItems oi WITH(UPDLOCK,HOLDLOCK)
        JOIN dbo.Orders o ON o.id=oi.order_id
        JOIN dbo.ShopOrders so WITH(UPDLOCK,HOLDLOCK) ON so.id=oi.shop_order_id AND so.order_id=o.id
        WHERE oi.id=@item AND o.user_id=@buyer`);
      const row=result.recordset[0];if(!row)throw new AppError(404,'Delivered OrderItem not found');
      if(row.shopOrderId==null)throw new AppError(409,'OrderItem is not attached to a ShopOrder');
      const delivery=(await tx.request().input('deliveryShopOrder',sql.Int,row.shopOrderId).query<any>(`
        SELECT so.status,so.delivered_at deliveredAt,o.logistics_status logisticsStatus
        FROM dbo.ShopOrders so JOIN dbo.Orders o ON o.id=so.order_id WHERE so.id=@deliveryShopOrder`)).recordset[0];
      if(!delivery||delivery.status==='CANCELLED'||delivery.status==='UNABLE_TO_FULFILL'||!delivery.deliveredAt||delivery.logisticsStatus!=='DELIVERED')
        throw new AppError(409,'Product Review is available only after successful delivery');
      const inserted=await tx.request().input('createBuyer',sql.Int,buyerId).input('parent',sql.Int,row.parentOrderId)
        .input('shopOrder',sql.Int,row.shopOrderId).input('orderItem',sql.Int,row.orderItemId)
        .input('product',sql.Int,row.productId).input('variant',sql.Int,row.variantId).input('shop',sql.Int,row.shopId)
        .input('rating',sql.TinyInt,input.rating).input('comment',sql.NVarChar(2000),normalize(input.comment))
        .query<any>(`INSERT dbo.ProductReviews(buyer_id,parent_order_id,shop_order_id,order_item_id,product_id,variant_id,shop_id,rating,comment,status,verified_purchase,published_at)
          OUTPUT INSERTED.id VALUES(@createBuyer,@parent,@shopOrder,@orderItem,@product,@variant,@shop,@rating,@comment,N'PUBLISHED',1,SYSUTCDATETIME())`);
      const id=Number(inserted.recordset[0].id);await history(tx,'PRODUCT',id,'CREATED_AND_PUBLISHED',null,'PUBLISHED',buyerId,null);
      await audit(tx,'PRODUCT',id,buyerId,'product_review.created',null,{orderItemId,rowProductId:row.productId,rating:input.rating,status:'PUBLISHED',verifiedPurchase:true});
      await tx.commit();begun=false;return this.productDetail(id,buyerId);
    }catch(error){if(begun)await tx.rollback();if([2601,2627].includes((error as any).number))throw new AppError(409,'This OrderItem has already been reviewed');throw error;}
  },
  async createShop(buyerId:number,shopOrderId:number,input:ReviewCreateInput){
    const pool=await getPool(),tx=pool.transaction();let begun=false;
    try{
      await tx.begin();begun=true;
      const result=await tx.request().input('buyer',sql.Int,buyerId).input('shopOrder',sql.Int,shopOrderId).query<any>(`
        SELECT so.id shopOrderId,so.order_id parentOrderId,so.shop_id shopId,so.status,so.delivered_at deliveredAt,o.logistics_status logisticsStatus
        FROM dbo.ShopOrders so WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Orders o ON o.id=so.order_id
        WHERE so.id=@shopOrder AND o.user_id=@buyer`);
      const row=result.recordset[0];if(!row)throw new AppError(404,'Delivered ShopOrder not found');
      if(row.status==='CANCELLED'||row.status==='UNABLE_TO_FULFILL'||!row.deliveredAt||row.logisticsStatus!=='DELIVERED')
        throw new AppError(409,'Shop Review is available only after successful delivery');
      const inserted=await tx.request().input('createBuyer',sql.Int,buyerId).input('parent',sql.Int,row.parentOrderId)
        .input('createShopOrder',sql.Int,row.shopOrderId).input('shop',sql.Int,row.shopId)
        .input('rating',sql.TinyInt,input.rating).input('comment',sql.NVarChar(2000),normalize(input.comment))
        .query<any>(`INSERT dbo.ShopReviews(buyer_id,parent_order_id,shop_order_id,shop_id,rating,comment,status,verified_purchase,published_at)
          OUTPUT INSERTED.id VALUES(@createBuyer,@parent,@createShopOrder,@shop,@rating,@comment,N'PUBLISHED',1,SYSUTCDATETIME())`);
      const id=Number(inserted.recordset[0].id);await history(tx,'SHOP',id,'CREATED_AND_PUBLISHED',null,'PUBLISHED',buyerId,null);
      await audit(tx,'SHOP',id,buyerId,'shop_review.created',null,{shopOrderId,rowShopId:row.shopId,rating:input.rating,status:'PUBLISHED',verifiedPurchase:true});
      await tx.commit();begun=false;return this.shopDetail(id,buyerId);
    }catch(error){if(begun)await tx.rollback();if([2601,2627].includes((error as any).number))throw new AppError(409,'This ShopOrder has already been reviewed');throw error;}
  },
  async productDetail(id:number,buyerId?:number){
    const pool=await getPool(),req=pool.request().input('id',sql.BigInt,id);if(buyerId!==undefined)req.input('buyer',sql.Int,buyerId);
    const result=await req.query<any>(`SELECT r.id,r.rating,r.comment,r.status,r.verified_purchase verifiedPurchase,r.created_at createdAt,
      r.published_at publishedAt,${buyerName} buyerName,r.moderation_reason moderationReason,v.variant_name variantName,
      p.id productId,p.product_name productName,p.slug productSlug,s.id shopId,s.name shopName,s.slug shopSlug
      FROM dbo.ProductReviews r JOIN dbo.Users u ON u.id=r.buyer_id JOIN dbo.Products p ON p.id=r.product_id
      JOIN dbo.Shops s ON s.id=r.shop_id LEFT JOIN dbo.ProductVariants v ON v.id=r.variant_id
      WHERE r.id=@id ${buyerId===undefined?'':`AND r.buyer_id=@buyer`}`);
    if(!result.recordset[0])throw new AppError(404,'Product Review not found');return productMap(result.recordset[0]);
  },
  async shopDetail(id:number,buyerId?:number){
    const pool=await getPool(),req=pool.request().input('id',sql.BigInt,id);if(buyerId!==undefined)req.input('buyer',sql.Int,buyerId);
    const result=await req.query<any>(`SELECT r.id,r.rating,r.comment,r.status,r.verified_purchase verifiedPurchase,r.created_at createdAt,
      r.published_at publishedAt,${buyerName} buyerName,r.moderation_reason moderationReason,
      s.id shopId,s.name shopName,s.slug shopSlug FROM dbo.ShopReviews r JOIN dbo.Users u ON u.id=r.buyer_id
      JOIN dbo.Shops s ON s.id=r.shop_id WHERE r.id=@id ${buyerId===undefined?'':`AND r.buyer_id=@buyer`}`);
    if(!result.recordset[0])throw new AppError(404,'Shop Review not found');return shopMap(result.recordset[0]);
  },
  async publicProduct(identifier:string,q:ReviewListQuery){
    const pool=await getPool(),base=pool.request().input('identifier',sql.NVarChar(255),identifier).input('offset',sql.Int,(q.page-1)*q.limit).input('limit',sql.Int,q.limit);
    const product=(await base.query<any>(`SELECT p.id FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id
      WHERE (p.slug=@identifier OR (TRY_CONVERT(INT,@identifier) IS NOT NULL AND p.id=TRY_CONVERT(INT,@identifier)))
        AND p.is_active=1 AND p.moderation_status=N'PUBLISHED' AND s.status=N'ACTIVE'`)).recordset[0];
    if(!product)throw new AppError(404,'Product not found');
    const req=pool.request().input('product',sql.Int,product.id).input('offset',sql.Int,(q.page-1)*q.limit).input('limit',sql.Int,q.limit);
    const clauses=[`r.product_id=@product`,`r.status=N'PUBLISHED'`];if(q.rating){req.input('rating',sql.TinyInt,q.rating);clauses.push('r.rating=@rating');}
    if(q.hasComment!==undefined)clauses.push(q.hasComment?`r.comment IS NOT NULL`:`r.comment IS NULL`);
    const rows=await req.query<any>(`SELECT r.id,r.rating,r.comment,r.status,r.verified_purchase verifiedPurchase,r.created_at createdAt,
      r.published_at publishedAt,${buyerName} buyerName,v.variant_name variantName,p.id productId,p.product_name productName,p.slug productSlug,
      s.id shopId,s.name shopName,s.slug shopSlug,COUNT_BIG(*) OVER() total
      FROM dbo.ProductReviews r JOIN dbo.Users u ON u.id=r.buyer_id JOIN dbo.Products p ON p.id=r.product_id
      JOIN dbo.Shops s ON s.id=r.shop_id LEFT JOIN dbo.ProductVariants v ON v.id=r.variant_id WHERE ${clauses.join(' AND ')}
      ORDER BY ${publicOrder(q.sort)} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    const total=Number(rows.recordset[0]?.total??0);return{items:rows.recordset.map(productMap),page:q.page,limit:q.limit,total,totalPages:Math.ceil(total/q.limit)};
  },
  async publicShop(slug:string,q:ReviewListQuery){
    const pool=await getPool(),shop=(await pool.request().input('slug',sql.NVarChar(200),slug).query<any>(`SELECT id FROM dbo.Shops WHERE slug=@slug AND status=N'ACTIVE'`)).recordset[0];
    if(!shop)throw new AppError(404,'Shop not found');
    const req=pool.request().input('shop',sql.Int,shop.id).input('offset',sql.Int,(q.page-1)*q.limit).input('limit',sql.Int,q.limit);
    const clauses=[`r.shop_id=@shop`,`r.status=N'PUBLISHED'`];if(q.rating){req.input('rating',sql.TinyInt,q.rating);clauses.push('r.rating=@rating');}
    if(q.hasComment!==undefined)clauses.push(q.hasComment?`r.comment IS NOT NULL`:`r.comment IS NULL`);
    const rows=await req.query<any>(`SELECT r.id,r.rating,r.comment,r.status,r.verified_purchase verifiedPurchase,r.created_at createdAt,
      r.published_at publishedAt,${buyerName} buyerName,s.id shopId,s.name shopName,s.slug shopSlug,COUNT_BIG(*) OVER() total
      FROM dbo.ShopReviews r JOIN dbo.Users u ON u.id=r.buyer_id JOIN dbo.Shops s ON s.id=r.shop_id
      WHERE ${clauses.join(' AND ')} ORDER BY ${publicOrder(q.sort)} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    const total=Number(rows.recordset[0]?.total??0);return{items:rows.recordset.map(shopMap),page:q.page,limit:q.limit,total,totalPages:Math.ceil(total/q.limit)};
  },
  async eligibility(buyerId:number,orderId:number){
    const pool=await getPool();
    const owner=(await pool.request().input('buyer',sql.Int,buyerId).input('order',sql.Int,orderId).query<any>('SELECT id,logistics_status logisticsStatus FROM dbo.Orders WHERE id=@order AND user_id=@buyer')).recordset[0];
    if(!owner)throw new AppError(404,'Order not found');
    const items=await pool.request().input('orderItemsOrder',sql.Int,orderId).query<any>(`SELECT oi.id orderItemId,so.id shopOrderId,
      CASE WHEN owner.logistics_status=N'DELIVERED' AND so.delivered_at IS NOT NULL AND so.status NOT IN(N'CANCELLED',N'UNABLE_TO_FULFILL') THEN 1 ELSE 0 END delivered,
      r.id reviewId,r.rating,r.comment,r.status,r.moderation_reason moderationReason
      FROM dbo.OrderItems oi JOIN dbo.ShopOrders so ON so.id=oi.shop_order_id JOIN dbo.Orders owner ON owner.id=oi.order_id
      LEFT JOIN dbo.ProductReviews r ON r.order_item_id=oi.id WHERE oi.order_id=@orderItemsOrder ORDER BY oi.id`);
    const shops=await pool.request().input('shopOrdersOrder',sql.Int,orderId).query<any>(`SELECT so.id shopOrderId,
      CASE WHEN o.logistics_status=N'DELIVERED' AND so.delivered_at IS NOT NULL AND so.status NOT IN(N'CANCELLED',N'UNABLE_TO_FULFILL') THEN 1 ELSE 0 END delivered,
      r.id reviewId,r.rating,r.comment,r.status,r.moderation_reason moderationReason
      FROM dbo.ShopOrders so JOIN dbo.Orders o ON o.id=so.order_id LEFT JOIN dbo.ShopReviews r ON r.shop_order_id=so.id
      WHERE so.order_id=@shopOrdersOrder ORDER BY so.id`);
    const map=(x:any)=>({...x,orderItemId:x.orderItemId==null?undefined:Number(x.orderItemId),shopOrderId:Number(x.shopOrderId),delivered:Boolean(x.delivered),reviewId:x.reviewId==null?null:Number(x.reviewId),rating:x.rating==null?null:Number(x.rating)});
    return{items:items.recordset.map(map),shopOrders:shops.recordset.map(map)};
  },
  async mine(buyerId:number){
    const pool=await getPool();
    const [products,shops]=await Promise.all([
      pool.request().input('buyerProduct',sql.Int,buyerId).query<any>(`SELECT r.id,r.rating,r.comment,r.status,r.verified_purchase verifiedPurchase,r.created_at createdAt,r.published_at publishedAt,
        ${buyerName} buyerName,r.moderation_reason moderationReason,v.variant_name variantName,p.id productId,p.product_name productName,p.slug productSlug,
        s.id shopId,s.name shopName,s.slug shopSlug FROM dbo.ProductReviews r JOIN dbo.Users u ON u.id=r.buyer_id JOIN dbo.Products p ON p.id=r.product_id
        JOIN dbo.Shops s ON s.id=r.shop_id LEFT JOIN dbo.ProductVariants v ON v.id=r.variant_id WHERE r.buyer_id=@buyerProduct ORDER BY r.created_at DESC,r.id DESC`),
      pool.request().input('buyerShop',sql.Int,buyerId).query<any>(`SELECT r.id,r.rating,r.comment,r.status,r.verified_purchase verifiedPurchase,r.created_at createdAt,r.published_at publishedAt,
        ${buyerName} buyerName,r.moderation_reason moderationReason,s.id shopId,s.name shopName,s.slug shopSlug
        FROM dbo.ShopReviews r JOIN dbo.Users u ON u.id=r.buyer_id JOIN dbo.Shops s ON s.id=r.shop_id WHERE r.buyer_id=@buyerShop ORDER BY r.created_at DESC,r.id DESC`)
    ]);return{productReviews:products.recordset.map(productMap),shopReviews:shops.recordset.map(shopMap)};
  },
  async seller(userId:number){
    const pool=await getPool(),shop=(await pool.request().input('owner',sql.Int,userId).query<any>('SELECT id FROM dbo.Shops WHERE owner_user_id=@owner')).recordset[0];
    if(!shop)throw new AppError(404,'Seller Shop not found');
    const [products,shops]=await Promise.all([
      pool.request().input('sellerShop',sql.Int,shop.id).query<any>(`SELECT r.id,r.rating,r.comment,r.status,r.verified_purchase verifiedPurchase,r.created_at createdAt,r.published_at publishedAt,
        ${buyerName} buyerName,NULL moderationReason,v.variant_name variantName,p.id productId,p.product_name productName,p.slug productSlug,
        s.id shopId,s.name shopName,s.slug shopSlug FROM dbo.ProductReviews r JOIN dbo.Users u ON u.id=r.buyer_id JOIN dbo.Products p ON p.id=r.product_id
        JOIN dbo.Shops s ON s.id=r.shop_id LEFT JOIN dbo.ProductVariants v ON v.id=r.variant_id WHERE r.shop_id=@sellerShop AND r.status=N'PUBLISHED' ORDER BY r.published_at DESC,r.id DESC`),
      pool.request().input('sellerShopReviews',sql.Int,shop.id).query<any>(`SELECT r.id,r.rating,r.comment,r.status,r.verified_purchase verifiedPurchase,r.created_at createdAt,r.published_at publishedAt,
        ${buyerName} buyerName,NULL moderationReason,s.id shopId,s.name shopName,s.slug shopSlug FROM dbo.ShopReviews r JOIN dbo.Users u ON u.id=r.buyer_id
        JOIN dbo.Shops s ON s.id=r.shop_id WHERE r.shop_id=@sellerShopReviews AND r.status=N'PUBLISHED' ORDER BY r.published_at DESC,r.id DESC`)
    ]);return{productReviews:products.recordset.map(productMap),shopReviews:shops.recordset.map(shopMap)};
  },
  async adminList(q:AdminReviewQuery){
    const pool=await getPool(),req=pool.request().input('offset',sql.Int,(q.page-1)*q.limit).input('limit',sql.Int,q.limit);
    const clauses:string[]=[];if(q.type){req.input('type',sql.NVarChar(20),q.type);clauses.push('x.reviewType=@type');}
    if(q.status){req.input('status',sql.NVarChar(20),q.status);clauses.push('x.status=@status');}
    if(q.rating){req.input('rating',sql.TinyInt,q.rating);clauses.push('x.rating=@rating');}
    if(q.hasComment!==undefined)clauses.push(q.hasComment?'x.comment IS NOT NULL':'x.comment IS NULL');
    if(q.shopId){req.input('shop',sql.Int,q.shopId);clauses.push('x.shopId=@shop');}
    if(q.productId!==undefined){req.input('product',sql.Int,q.productId);clauses.push('x.productId=@product');}
    if(q.search){req.input('search',sql.NVarChar(122),`%${q.search}%`);clauses.push('(x.comment LIKE @search OR x.buyerName LIKE @search OR x.shopName LIKE @search OR x.productName LIKE @search)');}
    const rows=await req.query<any>(`WITH x AS(
      SELECT N'PRODUCT' reviewType,r.id,r.rating,r.comment,r.status,r.verified_purchase verifiedPurchase,r.created_at createdAt,r.published_at publishedAt,
        r.moderation_reason moderationReason,${buyerName} buyerName,s.id shopId,s.name shopName,s.slug shopSlug,p.id productId,p.product_name productName,p.slug productSlug
      FROM dbo.ProductReviews r JOIN dbo.Users u ON u.id=r.buyer_id JOIN dbo.Shops s ON s.id=r.shop_id JOIN dbo.Products p ON p.id=r.product_id
      UNION ALL
      SELECT N'SHOP',r.id,r.rating,r.comment,r.status,r.verified_purchase,r.created_at,r.published_at,r.moderation_reason,
        ${buyerName},s.id,s.name,s.slug,NULL,NULL,NULL FROM dbo.ShopReviews r JOIN dbo.Users u ON u.id=r.buyer_id JOIN dbo.Shops s ON s.id=r.shop_id)
      SELECT x.*,COUNT_BIG(*) OVER() total FROM x ${clauses.length?'WHERE '+clauses.join(' AND '):''}
      ORDER BY x.createdAt DESC,x.reviewType,x.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    const total=Number(rows.recordset[0]?.total??0);return{items:rows.recordset.map((x:any)=>x.reviewType==='PRODUCT'?productMap({...x,type:'PRODUCT'}):shopMap(x)),page:q.page,limit:q.limit,total,totalPages:Math.ceil(total/q.limit)};
  },
  async moderate(type:ReviewType,id:number,action:ReviewAction,reasonValue:string,adminId:number){
    const reason=reasonValue.trim(),table=type==='PRODUCT'?'ProductReviews':'ShopReviews',pool=await getPool(),tx=pool.transaction();let begun=false;
    try{await tx.begin();begun=true;
      const row=(await tx.request().input('id',sql.BigInt,id).query<any>(`SELECT id,status FROM dbo.${table} WITH(UPDLOCK,HOLDLOCK) WHERE id=@id`)).recordset[0];
      if(!row)throw new AppError(404,'Review not found');const from=row.status as ReviewStatus;
      const to:ReviewStatus=action==='hide'?'HIDDEN':action==='reject'?'REJECTED':'PUBLISHED';
      if(from===to){await tx.commit();begun=false;return type==='PRODUCT'?this.productDetail(id):this.shopDetail(id);}
      const allowed=(action==='hide'&&from==='PUBLISHED')||(action==='reject'&&(from==='PUBLISHED'||from==='HIDDEN'))||(action==='restore'&&(from==='HIDDEN'||from==='REJECTED'));
      if(!allowed)throw new AppError(409,`Invalid Review transition: ${from} to ${to}`);
      await tx.request().input('updateId',sql.BigInt,id).input('to',sql.NVarChar(20),to).input('actor',sql.Int,adminId).input('reason',sql.NVarChar(1000),reason)
        .query(`UPDATE dbo.${table} SET status=@to,hidden_at=CASE WHEN @to=N'HIDDEN' THEN SYSUTCDATETIME() END,
          rejected_at=CASE WHEN @to=N'REJECTED' THEN SYSUTCDATETIME() END,moderated_by=@actor,moderation_reason=@reason,updated_at=SYSUTCDATETIME()
          WHERE id=@updateId`);
      const event=action==='hide'?'HIDDEN':action==='reject'?'REJECTED':'RESTORED';
      await history(tx,type,id,event,from,to,adminId,reason);await audit(tx,type,id,adminId,`review.${action}`,{status:from},{status:to,reason});
      await tx.commit();begun=false;return type==='PRODUCT'?this.productDetail(id):this.shopDetail(id);
    }catch(error){if(begun)await tx.rollback();throw error;}
  },
  async adminHistory(type:ReviewType,id:number){
    const pool=await getPool();return(await pool.request().input('type',sql.NVarChar(20),type).input('id',sql.BigInt,id).query<any>(`
      SELECT h.id,h.event_type eventType,h.from_status fromStatus,h.to_status toStatus,h.reason,h.created_at createdAt,
      h.actor_id actorId,u.name actorName FROM dbo.ReviewModerationHistory h JOIN dbo.Users u ON u.id=h.actor_id
      WHERE h.review_type=@type AND h.review_id=@id ORDER BY h.created_at DESC,h.id DESC`)).recordset;
  }
};
