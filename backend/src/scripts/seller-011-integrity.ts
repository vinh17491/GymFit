import {closePool,query} from "../config/database";
if(process.env.SELLER011_INTEGRITY!=="1")throw new Error("SELLER011_INTEGRITY=1 is required");
let checks=0;const verify=(ok:boolean,message:string)=>{checks++;if(!ok)throw new Error(message);};
async function main(){
  const migration=(await query<any>("SELECT checksum FROM dbo.SchemaMigrations WHERE version=N'0109'")).recordset[0];verify(Boolean(migration),"0109 applied");
  const metadata=(await query<any>(`SELECT
    (SELECT COUNT(*) FROM sys.tables WHERE name IN(N'ShopOrderSettlements',N'SettlementStatusHistory',N'SettlementAdjustments',N'SettlementAdjustmentHistory',N'SettlementBatches',N'SettlementBatchItems')) tables,
    (SELECT COUNT(*) FROM sys.triggers WHERE name IN(N'TR_SettlementStatusHistory_Immutable',N'TR_SettlementAdjustmentHistory_Immutable',N'TR_SettlementBatchItems_Immutable')) triggers,
    (SELECT COUNT(*) FROM sys.indexes WHERE name IN(N'IX_ShopOrderSettlements_StatusEligible',N'IX_ShopOrderSettlements_ShopEarned',N'IX_SettlementAdjustments_ShopStatus',N'IX_SettlementBatchItems_BatchShop')) indexes`)).recordset[0];
  verify(Number(metadata.tables)===6,"finance tables present");verify(Number(metadata.triggers)===3,"immutable audit triggers present");verify(Number(metadata.indexes)===4,"finance indexes present");
  const integrity=(await query<any>(`SELECT
    (SELECT COUNT(*) FROM dbo.ShopOrderSettlements st LEFT JOIN dbo.ShopOrders so ON so.id=st.shop_order_id WHERE so.id IS NULL) settlementOrphans,
    (SELECT COUNT(*) FROM dbo.ShopOrderSettlements GROUP BY shop_order_id HAVING COUNT(*)>1) duplicateSettlements,
    (SELECT COUNT(*) FROM dbo.SettlementBatchItems GROUP BY settlement_id HAVING COUNT(*)>1) duplicateBatchItems,
    (SELECT COUNT(*) FROM dbo.ShopOrderSettlements WHERE payable_amount<0 OR payable_amount<>net_before_adjustment+applied_adjustment_amount OR eligible_at<>DATEADD(DAY,7,earned_at)) invalidAmounts,
    (SELECT COUNT(*) FROM dbo.Products WHERE id=0) productZero,
    (SELECT setting_value FROM dbo.MarketplaceSettings WHERE setting_key=N'default_commission_rate_bps') rate`)).recordset[0];
  verify(Number(integrity.settlementOrphans)===0,"no settlement orphans");verify(Number(integrity.duplicateSettlements)===0,"no duplicate settlements");verify(Number(integrity.duplicateBatchItems)===0,"no duplicate batch items");verify(Number(integrity.invalidAmounts)===0,"settlement arithmetic and dates valid");verify(Number(integrity.productZero)===1,"Product ID 0 preserved");verify(Number(integrity.rate)===500,"commission setting is 500 bps");
  console.log(`[SELLER-011 INTEGRITY PASS] checks=${checks} checksum=${migration.checksum}`);
}
void main().catch(error=>{console.error("[SELLER-011 INTEGRITY FAIL]",error instanceof Error?error.message:error);process.exitCode=1;}).finally(closePool);
