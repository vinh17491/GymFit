import type {Request,Transaction} from "mssql";
import {getPool,sql} from "../../config/database";
import {AppError} from "../../middleware/errorHandler";

export type SettlementStatus="PENDING"|"HELD"|"ELIGIBLE"|"PAID";
export type DateFilters={from?:string;to?:string;status?:SettlementStatus;page?:number;pageSize?:number;search?:string;shopId?:number};

const requiredText=(value:string|undefined,label:string)=>{const text=value?.trim();if(!text)throw new AppError(400,`${label} is required`);return text;};

export async function loadCommissionConfiguration(transaction?:Transaction):Promise<{rateBps:number}>{
  const request=transaction?transaction.request():(await getPool()).request();
  const row=(await request.query<{value:number}>(
    "SELECT setting_value AS value FROM dbo.MarketplaceSettings WHERE setting_key=N'default_commission_rate_bps'",
  )).recordset[0];
  const rateBps=Number(row?.value);
  if(!Number.isInteger(rateBps)||rateBps<0||rateBps>10000)throw new AppError(500,"Marketplace commission configuration is missing or invalid");
  return {rateBps};
}

export async function createSettlementsForDeliveredOrder(transaction:Transaction,orderId:number):Promise<void>{
  await transaction.request().input("settlementOrderId",sql.Int,orderId).query(`
    DECLARE @Created TABLE(id BIGINT);
    INSERT dbo.ShopOrderSettlements(
      shop_order_id,shop_id,status,commission_rate_snapshot,gross_merchandise_amount,commission_amount,
      net_before_adjustment,applied_adjustment_amount,payable_amount,earned_at,eligible_at,created_at,updated_at
    )
    OUTPUT INSERTED.id INTO @Created(id)
    SELECT so.id,so.shop_id,N'PENDING',so.commission_rate_snapshot,so.commission_base_amount,so.commission_amount,
      so.seller_net_before_adjustment,0,so.seller_net_before_adjustment,so.delivered_at,DATEADD(DAY,7,so.delivered_at),
      SYSUTCDATETIME(),SYSUTCDATETIME()
    FROM dbo.ShopOrders so WITH(UPDLOCK,HOLDLOCK)
    WHERE so.order_id=@settlementOrderId AND so.status=N'HUB_CHECK_PASSED' AND so.delivered_at IS NOT NULL
      AND NOT EXISTS(SELECT 1 FROM dbo.ShopOrderSettlements x WITH(UPDLOCK,HOLDLOCK) WHERE x.shop_order_id=so.id);
    INSERT dbo.SettlementStatusHistory(settlement_id,previous_status,new_status,changed_by,reason,created_at)
    SELECT id,NULL,N'PENDING',NULL,N'CREATED_AT_PARENT_DELIVERY',SYSUTCDATETIME() FROM @Created;
  `);
}

async function refreshEligibilityTx(transaction:Transaction):Promise<number>{
  const result=await transaction.request().query<{count:number}>(`
    DECLARE @Changed TABLE(id BIGINT);
    UPDATE dbo.ShopOrderSettlements WITH(UPDLOCK,HOLDLOCK)
      SET status=N'ELIGIBLE',updated_at=SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Changed(id)
      WHERE status=N'PENDING' AND eligible_at<=SYSUTCDATETIME();
    INSERT dbo.SettlementStatusHistory(settlement_id,previous_status,new_status,changed_by,reason,created_at)
      SELECT id,N'PENDING',N'ELIGIBLE',NULL,N'ELIGIBILITY_WINDOW_REACHED',SYSUTCDATETIME() FROM @Changed;
    SELECT COUNT(*) AS count FROM @Changed;
  `);
  return Number(result.recordset[0]?.count||0);
}

const filterSql=(request:Request,filters:DateFilters,alias="st")=>{
  const clauses:string[]=[];
  if(filters.from){request.input("filterFrom",sql.Date,filters.from);clauses.push(`${alias}.earned_at>=@filterFrom`);}
  if(filters.to){request.input("filterTo",sql.Date,filters.to);clauses.push(`${alias}.earned_at<DATEADD(DAY,1,@filterTo)`);}
  if(filters.status){request.input("filterStatus",sql.NVarChar(20),filters.status);clauses.push(`${alias}.status=@filterStatus`);}
  if(filters.shopId){request.input("filterShopId",sql.Int,filters.shopId);clauses.push(`${alias}.shop_id=@filterShopId`);}
  if(filters.search){request.input("filterSearch",sql.NVarChar(100),`%${filters.search.trim()}%`);clauses.push(`(o.order_number LIKE @filterSearch OR CONVERT(NVARCHAR(30),so.id) LIKE @filterSearch OR s.name LIKE @filterSearch OR u.email LIKE @filterSearch)`);}
  return clauses;
};

const baseSelect=`SELECT st.id,st.shop_order_id AS shopOrderId,st.shop_id AS shopId,s.name AS shopName,
  s.owner_user_id AS sellerUserId,u.email AS sellerEmail,o.order_number AS orderNumber,st.status,
  st.commission_rate_snapshot AS commissionRateSnapshot,st.gross_merchandise_amount AS grossMerchandiseAmount,
  st.commission_amount AS commissionAmount,st.net_before_adjustment AS netBeforeAdjustment,
  st.applied_adjustment_amount AS appliedAdjustmentAmount,st.payable_amount AS payableAmount,
  st.earned_at AS earnedAt,st.eligible_at AS eligibleAt,st.held_at AS heldAt,st.hold_reason AS holdReason,
  st.hold_source_type AS holdSourceType,st.hold_source_id AS holdSourceId,
  st.paid_at AS paidAt,st.external_payment_reference AS externalPaymentReference,
  bi.batch_id AS batchId,
  (SELECT COUNT(*) FROM dbo.MarketplaceComplaints c WHERE c.settlement_id=st.id AND c.status IN(N'OPEN',N'UNDER_REVIEW',N'REPLACEMENT_REQUIRED')) AS activeComplaintCount,
  (SELECT COUNT(*) FROM dbo.MarketplaceComplaints c WHERE c.settlement_id=st.id AND c.fault_party=N'SELLER_FAULT' AND c.status IN(N'OPEN',N'UNDER_REVIEW',N'REPLACEMENT_REQUIRED')) AS sellerFaultComplaintCount
  FROM dbo.ShopOrderSettlements st JOIN dbo.ShopOrders so ON so.id=st.shop_order_id
  JOIN dbo.Orders o ON o.id=so.order_id JOIN dbo.Shops s ON s.id=st.shop_id
  LEFT JOIN dbo.Users u ON u.id=s.owner_user_id
  LEFT JOIN dbo.SettlementBatchItems bi ON bi.settlement_id=st.id`;

async function resolveSellerShop(userId:number):Promise<number>{
  const row=(await (await getPool()).request().input("sellerId",sql.Int,userId)
    .query<{id:number}>("SELECT id FROM dbo.Shops WHERE owner_user_id=@sellerId AND status=N'ACTIVE'")).recordset[0];
  if(!row)throw new AppError(403,"Active seller shop is required");
  return row.id;
}

async function detail(settlementId:number,shopId?:number){
  const request=(await getPool()).request().input("detailId",sql.BigInt,settlementId);
  const owner=shopId?(request.input("detailShop",sql.Int,shopId)," AND st.shop_id=@detailShop"):"";
  const settlement=(await request.query(`${baseSelect} WHERE st.id=@detailId${owner}`)).recordset[0];
  if(!settlement)throw new AppError(404,"Settlement not found");
  const history=(await (await getPool()).request().input("historySettlement",sql.BigInt,settlementId).query(
    "SELECT id,previous_status AS previousStatus,new_status AS newStatus,reason,batch_id AS batchId,external_reference AS externalReference,created_at AS createdAt FROM dbo.SettlementStatusHistory WHERE settlement_id=@historySettlement ORDER BY created_at,id",
  )).recordset;
  const adjustments=(await (await getPool()).request().input("adjustmentSettlement",sql.BigInt,settlementId).query(
    "SELECT id,signed_amount AS signedAmount,status,reason,source_reference AS sourceReference,created_at AS createdAt,applied_at AS appliedAt FROM dbo.SettlementAdjustments WHERE applied_settlement_id=@adjustmentSettlement OR source_settlement_id=@adjustmentSettlement OR source_paid_settlement_id=@adjustmentSettlement ORDER BY created_at,id",
  )).recordset;
  const refunds=(await (await getPool()).request().input("refundShopOrder",sql.Int,settlement.shopOrderId).query(
    "SELECT id,status,merchandise_amount AS merchandiseAmount,shipping_amount AS shippingAmount,total_amount AS totalAmount,reason,external_reference AS externalReference,created_at AS createdAt FROM dbo.Refunds WHERE shop_order_id=@refundShopOrder ORDER BY created_at DESC",
  )).recordset;
  const complaints=(await (await getPool()).request().input("complaintSettlement",sql.BigInt,settlementId).query(
    "SELECT c.id,c.status,c.fault_party AS faultParty,c.category,c.affected_quantity AS affectedQuantity,cr.id AS replacementId,cr.status AS replacementStatus,r.id AS refundId,r.status AS refundStatus,c.created_at AS createdAt FROM dbo.MarketplaceComplaints c LEFT JOIN dbo.ComplaintReplacements cr ON cr.complaint_id=c.id LEFT JOIN dbo.Refunds r ON r.complaint_id=c.id WHERE c.settlement_id=@complaintSettlement ORDER BY c.created_at DESC,c.id DESC",
  )).recordset;
  return {...settlement,history,adjustments,refunds,complaints};
}

export const marketplaceFinanceService={
  async refreshEligibility(){const pool=await getPool(),tx=pool.transaction();let started=false;try{await tx.begin();started=true;const count=await refreshEligibilityTx(tx);await tx.commit();started=false;return {updated:count};}catch(error){if(started)await tx.rollback();throw error;}},
  async sellerSummary(userId:number,filters:DateFilters){
    await this.refreshEligibility();const shopId=await resolveSellerShop(userId);const request=(await getPool()).request().input("summaryShop",sql.Int,shopId);
    const clauses=filterSql(request,filters);clauses.push("st.shop_id=@summaryShop");
    const row=(await request.query(`SELECT COUNT(*) AS settlementCount,COUNT(DISTINCT st.shop_order_id) AS deliveredShopOrderCount,
      COALESCE(SUM(st.gross_merchandise_amount),0) AS grossMerchandiseAmount,COALESCE(SUM(st.commission_amount),0) AS commissionAmount,
      COALESCE(SUM(st.applied_adjustment_amount),0) AS appliedAdjustmentAmount,COALESCE(SUM(st.payable_amount),0) AS netPayableAmount,
      COALESCE(SUM(CASE WHEN st.status=N'PENDING' THEN st.payable_amount ELSE 0 END),0) AS pendingAmount,
      COALESCE(SUM(CASE WHEN st.status=N'HELD' THEN st.payable_amount ELSE 0 END),0) AS heldAmount,
      COALESCE(SUM(CASE WHEN st.status=N'ELIGIBLE' THEN st.payable_amount ELSE 0 END),0) AS eligibleAmount,
      COALESCE(SUM(CASE WHEN st.status=N'PAID' THEN st.payable_amount ELSE 0 END),0) AS paidAmount
      FROM dbo.ShopOrderSettlements st JOIN dbo.ShopOrders so ON so.id=st.shop_order_id JOIN dbo.Orders o ON o.id=so.order_id
      WHERE ${clauses.join(" AND ")}`)).recordset[0];
    const pending=(await (await getPool()).request().input("pendingShop",sql.Int,shopId).query<{amount:number}>(
      "SELECT COALESCE(SUM(signed_amount),0) AS amount FROM dbo.SettlementAdjustments WHERE shop_id=@pendingShop AND status=N'PENDING' AND source_paid_settlement_id IS NOT NULL",
    )).recordset[0];return {...row,pendingCarryForwardAdjustmentAmount:Number(pending?.amount||0)};
  },
  async sellerList(userId:number,filters:DateFilters){await this.refreshEligibility();return this.list({...filters,shopId:await resolveSellerShop(userId)});},
  async sellerDetail(userId:number,id:number){await this.refreshEligibility();return detail(id,await resolveSellerShop(userId));},
  async sellerAdjustments(userId:number){const shopId=await resolveSellerShop(userId);return (await (await getPool()).request().input("sellerAdjustmentShop",sql.Int,shopId).query(
    "SELECT id,signed_amount AS signedAmount,status,reason,source_reference AS sourceReference,source_paid_settlement_id AS sourcePaidSettlementId,applied_settlement_id AS appliedSettlementId,created_at AS createdAt,applied_at AS appliedAt FROM dbo.SettlementAdjustments WHERE shop_id=@sellerAdjustmentShop AND (status=N'APPLIED' OR source_paid_settlement_id IS NOT NULL) ORDER BY created_at DESC,id DESC",
  )).recordset;},
  async list(filters:DateFilters){await this.refreshEligibility();const page=filters.page||1,pageSize=filters.pageSize||25,request=(await getPool()).request();const clauses=filterSql(request,filters);request.input("offset",sql.Int,(page-1)*pageSize).input("pageSize",sql.Int,pageSize);const where=clauses.length?` WHERE ${clauses.join(" AND ")}`:"";const rows=(await request.query(`${baseSelect}${where} ORDER BY st.earned_at DESC,st.id DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`)).recordset;return {items:rows,page,pageSize};},
  async detail(id:number){await this.refreshEligibility();return detail(id);},
  async hold(id:number,adminId:number,input:{reason:string;sourceType?:string;sourceId?:string}){return this.changeHold(id,adminId,true,input);},
  async release(id:number,adminId:number,input:{reason:string}){return this.changeHold(id,adminId,false,input);},
  async changeHold(id:number,adminId:number,hold:boolean,input:{reason:string;sourceType?:string;sourceId?:string}){
    const reason=requiredText(input.reason,"Reason"),pool=await getPool(),tx=pool.transaction();let started=false;
    try{await tx.begin();started=true;const row=(await tx.request().input("holdId",sql.BigInt,id).query<{status:SettlementStatus;eligibleAt:Date}>("SELECT status,eligible_at AS eligibleAt FROM dbo.ShopOrderSettlements WITH(UPDLOCK,HOLDLOCK) WHERE id=@holdId")).recordset[0];if(!row)throw new AppError(404,"Settlement not found");
      const next:SettlementStatus=hold?"HELD":row.eligibleAt<=new Date()?"ELIGIBLE":"PENDING";
      if(hold&&!["PENDING","ELIGIBLE"].includes(row.status))throw new AppError(409,"Only pending or eligible settlement can be held");
      if(!hold&&row.status!=="HELD")throw new AppError(409,"Only held settlement can be released");
      if(!hold){const blockers=Number((await tx.request().input("complaintBlockSettlement",sql.BigInt,id).query<{count:number}>("SELECT COUNT(*) AS count FROM dbo.MarketplaceComplaints c WITH(UPDLOCK,HOLDLOCK) JOIN dbo.ShopOrderSettlements st ON st.shop_order_id=c.shop_order_id WHERE st.id=@complaintBlockSettlement AND c.fault_party=N'SELLER_FAULT' AND c.status IN(N'OPEN',N'UNDER_REVIEW',N'REPLACEMENT_REQUIRED')")).recordset[0].count);if(blockers)throw new AppError(409,"Settlement cannot be released while an unresolved Seller-fault complaint exists");}
      await tx.request().input("holdId2",sql.BigInt,id).input("next",sql.NVarChar(20),next).input("reason",sql.NVarChar(500),reason).input("sourceType",sql.NVarChar(50),hold?input.sourceType?.trim()||"MANUAL":null).input("sourceId",sql.NVarChar(100),hold?input.sourceId?.trim()||null:null).query("UPDATE dbo.ShopOrderSettlements SET status=@next,held_at=CASE WHEN @next=N'HELD' THEN SYSUTCDATETIME() END,hold_reason=CASE WHEN @next=N'HELD' THEN @reason END,hold_source_type=CASE WHEN @next=N'HELD' THEN @sourceType END,hold_source_id=CASE WHEN @next=N'HELD' THEN @sourceId END,updated_at=SYSUTCDATETIME() WHERE id=@holdId2");
      await tx.request().input("historyId",sql.BigInt,id).input("previous",sql.NVarChar(20),row.status).input("next2",sql.NVarChar(20),next).input("actor",sql.Int,adminId).input("historyReason",sql.NVarChar(500),reason).query("INSERT dbo.SettlementStatusHistory(settlement_id,previous_status,new_status,changed_by,reason,created_at) VALUES(@historyId,@previous,@next2,@actor,@historyReason,SYSUTCDATETIME())");
      await tx.commit();started=false;return detail(id);}catch(error){if(started)await tx.rollback();throw error;}
  },
  async createAdjustment(adminId:number,input:{shopId:number;signedAmount:number;reason:string;internalNote?:string;sourceShopOrderId?:number;sourceSettlementId?:number;sourcePaidSettlementId?:number;sourceRefundId?:number;sourceReference?:string}){
    const reason=requiredText(input.reason,"Reason");if(!Number.isFinite(input.signedAmount)||input.signedAmount===0)throw new AppError(400,"Signed amount must be non-zero");
    if(input.sourceSettlementId&&input.sourcePaidSettlementId)throw new AppError(400,"Choose either an unpaid source settlement or a paid carry-forward source");
    const pool=await getPool(),tx=pool.transaction();let started=false;try{await tx.begin();started=true;
      if(input.sourcePaidSettlementId){const source=(await tx.request().input("paidSource",sql.BigInt,input.sourcePaidSettlementId).query<{shopId:number;status:string}>("SELECT shop_id AS shopId,status FROM dbo.ShopOrderSettlements WITH(UPDLOCK,HOLDLOCK) WHERE id=@paidSource")).recordset[0];if(!source||source.status!=="PAID"||source.shopId!==input.shopId)throw new AppError(409,"Carry-forward source must be a paid settlement for the same shop");}
      if(input.sourceSettlementId){const source=(await tx.request().input("sourceSettlement",sql.BigInt,input.sourceSettlementId).query<{shopId:number;status:string}>("SELECT shop_id AS shopId,status FROM dbo.ShopOrderSettlements WHERE id=@sourceSettlement")).recordset[0];if(!source||source.shopId!==input.shopId||source.status==="PAID")throw new AppError(409,"Source settlement must be unpaid and belong to the same shop");}
      if(input.sourceShopOrderId){const source=(await tx.request().input("sourceShopOrder",sql.Int,input.sourceShopOrderId).query<{shopId:number}>("SELECT shop_id AS shopId FROM dbo.ShopOrders WHERE id=@sourceShopOrder")).recordset[0];if(!source||source.shopId!==input.shopId)throw new AppError(409,"Source ShopOrder must belong to the same shop");}
      if(input.sourceRefundId){const source=(await tx.request().input("sourceRefund",sql.BigInt,input.sourceRefundId).query<{shopId:number}>("SELECT so.shop_id AS shopId FROM dbo.Refunds r JOIN dbo.ShopOrders so ON so.id=r.shop_order_id WHERE r.id=@sourceRefund")).recordset[0];if(!source||source.shopId!==input.shopId)throw new AppError(409,"Source refund must belong to the same shop");}
      const result=await tx.request().input("shop",sql.Int,input.shopId).input("amount",sql.Decimal(18,2),input.signedAmount).input("reason",sql.NVarChar(500),reason).input("note",sql.NVarChar(1000),input.internalNote?.trim()||null).input("actor",sql.Int,adminId).input("shopOrder",sql.Int,input.sourceShopOrderId||null).input("source",sql.BigInt,input.sourceSettlementId||null).input("paidSource2",sql.BigInt,input.sourcePaidSettlementId||null).input("refund",sql.BigInt,input.sourceRefundId||null).input("reference",sql.NVarChar(255),input.sourceReference?.trim()||null).query<{id:number}>("INSERT dbo.SettlementAdjustments(shop_id,source_shop_order_id,source_settlement_id,source_paid_settlement_id,source_refund_id,source_reference,signed_amount,status,reason,internal_note,created_by,created_at) OUTPUT INSERTED.id VALUES(@shop,@shopOrder,@source,@paidSource2,@refund,@reference,@amount,N'PENDING',@reason,@note,@actor,SYSUTCDATETIME())");
      const id=result.recordset[0].id;await tx.request().input("adjustment",sql.BigInt,id).input("actor2",sql.Int,adminId).input("reason2",sql.NVarChar(500),reason).query("INSERT dbo.SettlementAdjustmentHistory(adjustment_id,action,actor_id,reason,created_at) VALUES(@adjustment,N'CREATED',@actor2,@reason2,SYSUTCDATETIME())");await tx.commit();started=false;return {id,status:"PENDING"};}catch(error){if(started)await tx.rollback();throw error;}
  },
  async applyAdjustment(id:number,targetId:number,adminId:number){
    const pool=await getPool(),tx=pool.transaction();let started=false;try{await tx.begin();started=true;
      const adjustment=(await tx.request().input("adjustmentId",sql.BigInt,id).query<{shopId:number;amount:number;status:string}>("SELECT shop_id AS shopId,signed_amount AS amount,status FROM dbo.SettlementAdjustments WITH(UPDLOCK,HOLDLOCK) WHERE id=@adjustmentId")).recordset[0];if(!adjustment)throw new AppError(404,"Adjustment not found");if(adjustment.status!=="PENDING")throw new AppError(409,"Adjustment is not pending");
      const target=(await tx.request().input("targetId",sql.BigInt,targetId).query<{shopId:number;status:string;payable:number}>("SELECT shop_id AS shopId,status,payable_amount AS payable FROM dbo.ShopOrderSettlements WITH(UPDLOCK,HOLDLOCK) WHERE id=@targetId")).recordset[0];if(!target)throw new AppError(404,"Target settlement not found");if(target.shopId!==adjustment.shopId)throw new AppError(409,"Adjustment and settlement shop do not match");if(target.status==="PAID")throw new AppError(409,"Paid settlement is immutable");if(Number(target.payable)+Number(adjustment.amount)<0)throw new AppError(409,"Adjustment would make payable amount negative");
      await tx.request().input("targetId2",sql.BigInt,targetId).input("amount",sql.Decimal(18,2),adjustment.amount).query("UPDATE dbo.ShopOrderSettlements SET applied_adjustment_amount=applied_adjustment_amount+@amount,payable_amount=payable_amount+@amount,updated_at=SYSUTCDATETIME() WHERE id=@targetId2");
      await tx.request().input("adjustmentId2",sql.BigInt,id).input("targetId3",sql.BigInt,targetId).input("actor",sql.Int,adminId).query("UPDATE dbo.SettlementAdjustments SET status=N'APPLIED',applied_settlement_id=@targetId3,applied_by=@actor,applied_at=SYSUTCDATETIME() WHERE id=@adjustmentId2 AND status=N'PENDING'; IF @@ROWCOUNT<>1 THROW 51012,'Adjustment was already processed.',1;");
      await tx.request().input("adjustmentId3",sql.BigInt,id).input("targetId4",sql.BigInt,targetId).input("actor2",sql.Int,adminId).query("INSERT dbo.SettlementAdjustmentHistory(adjustment_id,action,actor_id,settlement_id,reason,created_at) VALUES(@adjustmentId3,N'APPLIED',@actor2,@targetId4,N'Manually applied by administrator',SYSUTCDATETIME())");
      await tx.commit();started=false;return detail(targetId);}catch(error){if(started)await tx.rollback();throw error;}
  },
  async voidAdjustment(id:number,adminId:number,reasonInput:string){const reason=requiredText(reasonInput,"Void reason"),pool=await getPool(),tx=pool.transaction();let started=false;try{await tx.begin();started=true;const result=await tx.request().input("voidId",sql.BigInt,id).input("actor",sql.Int,adminId).input("reason",sql.NVarChar(500),reason).query("UPDATE dbo.SettlementAdjustments WITH(ROWLOCK) SET status=N'VOIDED',voided_by=@actor,voided_at=SYSUTCDATETIME(),void_reason=@reason WHERE id=@voidId AND status=N'PENDING'");if(result.rowsAffected[0]!==1)throw new AppError(409,"Only pending adjustment can be voided");await tx.request().input("voidId2",sql.BigInt,id).input("actor2",sql.Int,adminId).input("reason2",sql.NVarChar(500),reason).query("INSERT dbo.SettlementAdjustmentHistory(adjustment_id,action,actor_id,reason,created_at) VALUES(@voidId2,N'VOIDED',@actor2,@reason2,SYSUTCDATETIME())");await tx.commit();started=false;return {id,status:"VOIDED"};}catch(error){if(started)await tx.rollback();throw error;}},
  async createBatch(adminId:number,input:{periodStart:string;periodEnd:string;settlementIds:number[]}){
    const ids=[...new Set(input.settlementIds)];if(!ids.length||ids.length!==input.settlementIds.length)throw new AppError(400,"Settlement ids must be non-empty and unique");const pool=await getPool(),tx=pool.transaction();let started=false;
    try{await tx.begin();started=true;await refreshEligibilityTx(tx);const request=tx.request().input("periodStart",sql.Date,input.periodStart).input("periodEnd",sql.Date,input.periodEnd);const names=ids.map((id,index)=>{request.input(`id${index}`,sql.BigInt,id);return `@id${index}`;});
      const selected=(await request.query<{id:number;shopId:number;payable:number}>(`SELECT st.id,st.shop_id AS shopId,st.payable_amount AS payable FROM dbo.ShopOrderSettlements st WITH(UPDLOCK,HOLDLOCK) LEFT JOIN dbo.SettlementBatchItems bi ON bi.settlement_id=st.id WHERE st.id IN(${names.join(",")}) AND st.status=N'ELIGIBLE' AND st.earned_at>=@periodStart AND st.earned_at<DATEADD(DAY,1,@periodEnd) AND bi.id IS NULL ORDER BY st.id`)).recordset;if(selected.length!==ids.length)throw new AppError(409,"Every selected settlement must be eligible, in range, and unbatched");
      const total=selected.reduce((sum,row)=>sum+Number(row.payable),0);const batch=(await tx.request().input("start",sql.Date,input.periodStart).input("end",sql.Date,input.periodEnd).input("count",sql.Int,selected.length).input("total",sql.Decimal(18,2),total).input("actor",sql.Int,adminId).query<{id:number}>("INSERT dbo.SettlementBatches(period_start,period_end,status,settlement_count,total_payable_amount,created_by,created_at) OUTPUT INSERTED.id VALUES(@start,@end,N'DRAFT',@count,@total,@actor,SYSUTCDATETIME())")).recordset[0];
      for(const row of selected)await tx.request().input("batch",sql.BigInt,batch.id).input("settlement",sql.BigInt,row.id).input("shop",sql.Int,row.shopId).input("payable",sql.Decimal(18,2),row.payable).query("INSERT dbo.SettlementBatchItems(batch_id,settlement_id,shop_id,payable_amount_snapshot,created_at) VALUES(@batch,@settlement,@shop,@payable,SYSUTCDATETIME())");
      await tx.commit();started=false;return {id:batch.id,status:"DRAFT",settlementCount:selected.length,totalPayableAmount:total};}catch(error){if(started)await tx.rollback();throw error;}
  },
  async batches(){return (await (await getPool()).request().query("SELECT id,period_start AS periodStart,period_end AS periodEnd,status,settlement_count AS settlementCount,total_payable_amount AS totalPayableAmount,created_at AS createdAt,paid_at AS paidAt,external_payment_reference AS externalPaymentReference FROM dbo.SettlementBatches ORDER BY created_at DESC,id DESC")).recordset;},
  async batchDetail(id:number){const pool=await getPool();const batch=(await pool.request().input("batchId",sql.BigInt,id).query("SELECT id,period_start AS periodStart,period_end AS periodEnd,status,settlement_count AS settlementCount,total_payable_amount AS totalPayableAmount,created_at AS createdAt,paid_at AS paidAt,paid_reason AS paidReason,external_payment_reference AS externalPaymentReference FROM dbo.SettlementBatches WHERE id=@batchId")).recordset[0];if(!batch)throw new AppError(404,"Batch not found");const items=(await pool.request().input("batchItems",sql.BigInt,id).query("SELECT bi.settlement_id AS settlementId,bi.shop_id AS shopId,s.name AS shopName,bi.payable_amount_snapshot AS payableAmount,st.status AS settlementStatus,st.hold_source_type AS holdSourceType,(SELECT COUNT(*) FROM dbo.MarketplaceComplaints c WHERE c.settlement_id=st.id AND c.status IN(N'OPEN',N'UNDER_REVIEW',N'REPLACEMENT_REQUIRED')) AS activeComplaintCount,(SELECT COUNT(*) FROM dbo.MarketplaceComplaints c WHERE c.settlement_id=st.id AND c.fault_party=N'SELLER_FAULT' AND c.status IN(N'OPEN',N'UNDER_REVIEW',N'REPLACEMENT_REQUIRED')) AS sellerFaultComplaintCount FROM dbo.SettlementBatchItems bi JOIN dbo.Shops s ON s.id=bi.shop_id JOIN dbo.ShopOrderSettlements st ON st.id=bi.settlement_id WHERE bi.batch_id=@batchItems ORDER BY bi.shop_id,bi.settlement_id")).recordset;return {...batch,items};},
  async markBatchPaid(id:number,adminId:number,input:{reason:string;externalReference?:string}){
    const reason=requiredText(input.reason,"Paid reason"),pool=await getPool(),tx=pool.transaction();let started=false;try{await tx.begin();started=true;const batch=(await tx.request().input("batchId",sql.BigInt,id).query<{status:string}>("SELECT status FROM dbo.SettlementBatches WITH(UPDLOCK,HOLDLOCK) WHERE id=@batchId")).recordset[0];if(!batch)throw new AppError(404,"Batch not found");if(batch.status==="PAID"){await tx.commit();started=false;return this.batchDetail(id);}
      const invalid=(await tx.request().input("validateBatch",sql.BigInt,id).query<{count:number}>("SELECT COUNT(*) AS count FROM dbo.SettlementBatchItems bi JOIN dbo.ShopOrderSettlements st WITH(UPDLOCK,HOLDLOCK) ON st.id=bi.settlement_id WHERE bi.batch_id=@validateBatch AND (st.status<>N'ELIGIBLE' OR st.payable_amount<>bi.payable_amount_snapshot)")).recordset[0];if(Number(invalid.count))throw new AppError(409,"Batch contains a non-eligible or changed settlement");
      await tx.request().input("paidBatch",sql.BigInt,id).input("actor",sql.Int,adminId).input("reference",sql.NVarChar(255),input.externalReference?.trim()||null).query("UPDATE st SET status=N'PAID',paid_at=SYSUTCDATETIME(),paid_by=@actor,external_payment_reference=@reference,updated_at=SYSUTCDATETIME() FROM dbo.ShopOrderSettlements st JOIN dbo.SettlementBatchItems bi ON bi.settlement_id=st.id WHERE bi.batch_id=@paidBatch AND st.status=N'ELIGIBLE'; INSERT dbo.SettlementStatusHistory(settlement_id,previous_status,new_status,changed_by,reason,batch_id,external_reference,created_at) SELECT settlement_id,N'ELIGIBLE',N'PAID',@actor,N'Manual external payment confirmed',@paidBatch,@reference,SYSUTCDATETIME() FROM dbo.SettlementBatchItems WHERE batch_id=@paidBatch");
      await tx.request().input("paidBatch2",sql.BigInt,id).input("actor2",sql.Int,adminId).input("reason2",sql.NVarChar(500),reason).input("reference2",sql.NVarChar(255),input.externalReference?.trim()||null).query("UPDATE dbo.SettlementBatches SET status=N'PAID',paid_at=SYSUTCDATETIME(),paid_by=@actor2,paid_reason=@reason2,external_payment_reference=@reference2 WHERE id=@paidBatch2 AND status=N'DRAFT'");
      await tx.commit();started=false;return this.batchDetail(id);}catch(error){if(started)await tx.rollback();throw error;}
  },
};
