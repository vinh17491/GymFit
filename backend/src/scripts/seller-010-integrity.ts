import {closePool,query} from "../config/database";

if(process.env.SELLER010_INTEGRITY!=="1")throw new Error("SELLER010_INTEGRITY=1 is required");
const checks:string[]=[];
const verify=(value:boolean,message:string)=>{if(!value)throw new Error(message);checks.push(message);};
async function main(){
  const migration=(await query<any>("SELECT checksum FROM dbo.SchemaMigrations WHERE version=N'0108'")).recordset[0];
  verify(Boolean(migration),"0108 migration applied");
  const metadata=(await query<any>("SELECT (SELECT COUNT(*) FROM sys.check_constraints WHERE name IN(N'CK_ShopOrders_Status',N'CK_Orders_LogisticsStatus')) checks,(SELECT COUNT(*) FROM sys.indexes WHERE name IN(N'IX_Orders_LogisticsStatus',N'IX_OrderLogisticsStatusHistory_OrderCreated')) indexes,(SELECT COUNT(*) FROM sys.triggers WHERE name IN(N'TR_ShopOrderStatusHistory_Immutable',N'TR_OrderLogisticsStatusHistory_Immutable')) triggers")).recordset[0];
  verify(Number(metadata.checks)===2&&Number(metadata.indexes)===2&&Number(metadata.triggers)===2,"constraints, indexes and immutable triggers present");
  const integrity=(await query<any>("SELECT (SELECT COUNT(*) FROM dbo.ShopOrders so LEFT JOIN dbo.Orders o ON o.id=so.order_id WHERE o.id IS NULL) shopOrphans,(SELECT COUNT(*) FROM dbo.OrderLogisticsStatusHistory h LEFT JOIN dbo.Orders o ON o.id=h.order_id WHERE o.id IS NULL) historyOrphans,(SELECT COUNT(*) FROM dbo.Inventory WHERE reserved<0 OR on_hand<0 OR reserved>on_hand) invalidInventory,(SELECT COUNT(*) FROM dbo.Products WHERE id=0) productZero,(SELECT COUNT(*) FROM dbo.Orders WHERE logistics_status=N'CONSOLIDATING') consolidating")).recordset[0];
  verify(Number(integrity.shopOrphans)===0&&Number(integrity.historyOrphans)===0,"no logistics orphans");
  verify(Number(integrity.invalidInventory)===0,"inventory remains non-negative and bounded");
  verify(Number(integrity.productZero)===1,"Product ID 0 remains present");
  verify(Number(integrity.consolidating)===0,"CONSOLIDATING absent from active data");
  console.log(`[SELLER-010 INTEGRITY PASS] checks=${checks.length} checksum=${migration.checksum}`);
}
void main().catch(error=>{console.error("[SELLER-010 INTEGRITY FAIL]",error instanceof Error?error.message:error);process.exitCode=1;}).finally(closePool);
