import { closePool, query } from "../config/database";

let assertions=0;
const check=(ok:boolean,message:string)=>{assertions++;if(!ok)throw new Error(`Assertion ${assertions}: ${message}`);};
async function main(){
  const db=String((await query<any>("SELECT DB_NAME() name")).recordset[0].name);
  const objects=(await query<any>(`SELECT
    OBJECT_ID(N'dbo.MarketplaceComplaints') complaints,
    OBJECT_ID(N'dbo.ComplaintEventHistory') complaintHistory,
    OBJECT_ID(N'dbo.ComplaintReplacements') replacements,
    OBJECT_ID(N'dbo.ReplacementStatusHistory') replacementHistory,
    OBJECT_ID(N'dbo.TR_ComplaintEventHistory_Immutable') complaintTrigger,
    OBJECT_ID(N'dbo.TR_ReplacementStatusHistory_Immutable') replacementTrigger`)).recordset[0];
  for(const [name,value] of Object.entries(objects))check(Number(value)>0,`${name} present`);
  const indexes=(await query<any>(`SELECT
    INDEXPROPERTY(OBJECT_ID(N'dbo.MarketplaceComplaints'),N'UQ_MarketplaceComplaints_OrderItem',N'IndexID') complaintUnique,
    INDEXPROPERTY(OBJECT_ID(N'dbo.ComplaintReplacements'),N'UQ_ComplaintReplacements_Complaint',N'IndexID') replacementUnique,
    INDEXPROPERTY(OBJECT_ID(N'dbo.Refunds'),N'UX_Refunds_Complaint',N'IndexID') refundUnique`)).recordset[0];
  for(const [name,value] of Object.entries(indexes))check(Number(value)>0,`${name} index present`);
  const bad=(await query<any>(`SELECT
    (SELECT COUNT(*) FROM dbo.MarketplaceComplaints c LEFT JOIN dbo.OrderItems oi ON oi.id=c.order_item_id LEFT JOIN dbo.ShopOrders so ON so.id=c.shop_order_id LEFT JOIN dbo.ShopOrderSettlements st ON st.id=c.settlement_id WHERE oi.id IS NULL OR so.id IS NULL OR st.id IS NULL OR oi.order_id<>c.order_id OR oi.shop_order_id<>c.shop_order_id OR so.shop_id<>c.shop_id) complaintOrphans,
    (SELECT COUNT(*) FROM (SELECT order_item_id FROM dbo.MarketplaceComplaints GROUP BY order_item_id HAVING COUNT(*)>1) d) duplicateComplaints,
    (SELECT COUNT(*) FROM (SELECT complaint_id FROM dbo.ComplaintReplacements GROUP BY complaint_id HAVING COUNT(*)>1) d) duplicateReplacements,
    (SELECT COUNT(*) FROM (SELECT complaint_id FROM dbo.Refunds WHERE complaint_id IS NOT NULL GROUP BY complaint_id HAVING COUNT(*)>1) d) duplicateRefunds,
    (SELECT COUNT(*) FROM dbo.ComplaintReplacements cr JOIN dbo.MarketplaceComplaints c ON c.id=cr.complaint_id WHERE cr.order_item_id<>c.order_item_id OR cr.shop_order_id<>c.shop_order_id OR cr.shop_id<>c.shop_id OR cr.product_id<>c.product_id OR cr.variant_id<>c.variant_id OR cr.replacement_quantity>c.affected_quantity) invalidReplacement,
    (SELECT COUNT(*) FROM dbo.Refunds r JOIN dbo.MarketplaceComplaints c ON c.id=r.complaint_id WHERE r.refund_source_type<>N'COMPLAINT_RESOLUTION' OR r.shipping_amount<>0 OR r.merchandise_amount>c.unit_price_snapshot*c.affected_quantity) invalidRefund,
    (SELECT COUNT(*) FROM dbo.ShopOrderSettlements WHERE status=N'PAID' AND hold_source_type=N'COMPLAINT') paidComplaintHold,
    (SELECT COUNT(*) FROM dbo.InventoryAdjustments ia WHERE ia.adjustment_type=N'COMPLAINT_REPLACEMENT' AND (ia.quantity_delta>=0 OR ia.reference_type<>N'COMPLAINT_REPLACEMENT')) invalidInventoryAdjustment`)).recordset[0];
  for(const [name,value] of Object.entries(bad))check(Number(value)===0,`${name}=0`);
  const migration=(await query<any>("SELECT checksum FROM dbo.SchemaMigrations WHERE version=N'0110'")).recordset[0];
  check(migration?.checksum==="cf25554ac110a726c34d5c2664054329db3064e3d0869f7cf40b78e6a2b3dfcc","0110 checksum tracked");
  const product0=Number((await query<any>("SELECT COUNT(*) count FROM dbo.Products WHERE id=0")).recordset[0].count);
  check(product0===1,"Product ID 0 preserved");
  console.log(`[SELLER-011A INTEGRITY PASS] assertions=${assertions} database=${db}`);
}
main().catch(error=>{console.error("[SELLER-011A INTEGRITY FAIL]",error instanceof Error?error.message:error);process.exitCode=1;}).finally(closePool);
