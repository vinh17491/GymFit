import { closePool,query } from '../config/database';
let checks=0;const verify=(ok:boolean,message:string)=>{checks++;if(!ok)throw new Error(`Check ${checks}: ${message}`);};
async function main(){
  const migration=(await query<any>("SELECT checksum FROM dbo.SchemaMigrations WHERE version=N'0111'")).recordset[0];verify(Boolean(migration),'0111 applied');
  const metadata=(await query<any>(`SELECT
    OBJECT_ID(N'dbo.ProductReviews') productReviews,OBJECT_ID(N'dbo.ShopReviews') shopReviews,
    OBJECT_ID(N'dbo.ReviewModerationHistory') history,
    OBJECT_ID(N'dbo.TR_ProductReviews_ContentImmutable') productTrigger,
    OBJECT_ID(N'dbo.TR_ShopReviews_ContentImmutable') shopTrigger,
    OBJECT_ID(N'dbo.TR_ReviewModerationHistory_Immutable') historyTrigger,
    INDEXPROPERTY(OBJECT_ID(N'dbo.ProductReviews'),N'UQ_ProductReviews_OrderItem',N'IndexID') productUnique,
    INDEXPROPERTY(OBJECT_ID(N'dbo.ShopReviews'),N'UQ_ShopReviews_ShopOrder',N'IndexID') shopUnique`)).recordset[0];
  for(const[name,value]of Object.entries(metadata))verify(Number(value)>0,`${name} present`);
  const bad=(await query<any>(`SELECT
    (SELECT COUNT(*) FROM dbo.ProductReviews r LEFT JOIN dbo.OrderItems oi ON oi.id=r.order_item_id LEFT JOIN dbo.ShopOrders so ON so.id=r.shop_order_id LEFT JOIN dbo.Orders o ON o.id=r.parent_order_id WHERE oi.id IS NULL OR so.id IS NULL OR o.id IS NULL OR oi.order_id<>r.parent_order_id OR oi.shop_order_id<>r.shop_order_id OR so.shop_id<>r.shop_id OR o.user_id<>r.buyer_id OR oi.product_id<>r.product_id) productOrphans,
    (SELECT COUNT(*) FROM dbo.ShopReviews r LEFT JOIN dbo.ShopOrders so ON so.id=r.shop_order_id LEFT JOIN dbo.Orders o ON o.id=r.parent_order_id WHERE so.id IS NULL OR o.id IS NULL OR so.order_id<>r.parent_order_id OR so.shop_id<>r.shop_id OR o.user_id<>r.buyer_id) shopOrphans,
    (SELECT COUNT(*) FROM(SELECT order_item_id FROM dbo.ProductReviews GROUP BY order_item_id HAVING COUNT(*)>1)d) duplicateProducts,
    (SELECT COUNT(*) FROM(SELECT shop_order_id FROM dbo.ShopReviews GROUP BY shop_order_id HAVING COUNT(*)>1)d) duplicateShops,
    (SELECT COUNT(*) FROM dbo.ProductReviews WHERE rating NOT BETWEEN 1 AND 5 OR verified_purchase<>1) invalidProducts,
    (SELECT COUNT(*) FROM dbo.ShopReviews WHERE rating NOT BETWEEN 1 AND 5 OR verified_purchase<>1) invalidShops,
    (SELECT COUNT(*) FROM dbo.ReviewModerationHistory h WHERE (h.review_type=N'PRODUCT' AND NOT EXISTS(SELECT 1 FROM dbo.ProductReviews r WHERE r.id=h.review_id)) OR (h.review_type=N'SHOP' AND NOT EXISTS(SELECT 1 FROM dbo.ShopReviews r WHERE r.id=h.review_id))) historyOrphans`)).recordset[0];
  for(const[name,value]of Object.entries(bad))verify(Number(value)===0,`${name}=0`);
  verify(Number((await query<any>('SELECT COUNT(*) count FROM dbo.Products WHERE id=0')).recordset[0].count)===1,'Product ID 0 preserved');
  console.log(`[SELLER-012 INTEGRITY PASS] checks=${checks} checksum=${migration.checksum}`);
}
void main().catch(error=>{console.error('[SELLER-012 INTEGRITY FAIL]',error instanceof Error?error.message:error);process.exitCode=1;}).finally(closePool);
