import {closePool,query} from "../config/database";
async function main(){
  const row=(await query<Record<string,number|string>>(`
    SELECT
      (SELECT COUNT(*) FROM dbo.SchemaMigrations WHERE version=N'0107') migration,
      (SELECT COUNT(*) FROM dbo.MarketplaceSettings WHERE setting_key IN(N'compensation_voucher_amount',N'compensation_voucher_expiry_days',N'compensation_voucher_min_order_amount',N'compensation_voucher_max_per_parent_order')) settings,
      (SELECT COUNT(*) FROM dbo.Refunds r LEFT JOIN dbo.Orders o ON o.id=r.order_id LEFT JOIN dbo.ShopOrders so ON so.id=r.shop_order_id LEFT JOIN dbo.Users u ON u.id=r.buyer_id WHERE o.id IS NULL OR so.id IS NULL OR u.id IS NULL OR so.order_id<>r.order_id OR o.user_id<>r.buyer_id) refundOrphans,
      (SELECT COUNT(*) FROM (SELECT shop_order_id FROM dbo.Refunds GROUP BY shop_order_id HAVING COUNT(*)>1) d) duplicateRefunds,
      (SELECT COUNT(*) FROM (SELECT order_id FROM dbo.Refunds WHERE shipping_amount>0 GROUP BY order_id HAVING COUNT(*)>1) d) duplicateShippingRefunds,
      (SELECT COUNT(*) FROM dbo.CompensationVouchers v LEFT JOIN dbo.Orders o ON o.id=v.source_order_id LEFT JOIN dbo.ShopOrders so ON so.id=v.source_shop_order_id LEFT JOIN dbo.Users u ON u.id=v.buyer_id WHERE o.id IS NULL OR so.id IS NULL OR u.id IS NULL OR so.order_id<>v.source_order_id OR o.user_id<>v.buyer_id) voucherOrphans,
      (SELECT COUNT(*) FROM (SELECT source_order_id,compensation_type FROM dbo.CompensationVouchers GROUP BY source_order_id,compensation_type HAVING COUNT(*)>1) d) duplicateVouchers,
      (SELECT COUNT(*) FROM dbo.Inventory WHERE reserved<0 OR reserved>on_hand) invalidReserved,
      (SELECT COUNT(*) FROM dbo.OrderItems WHERE (reservation_released_at IS NULL AND (reservation_release_reason IS NOT NULL OR reservation_released_by IS NOT NULL)) OR (reservation_released_at IS NOT NULL AND reservation_release_reason IS NULL)) invalidMarkers,
      (SELECT COUNT(*) FROM dbo.MarketplaceNotifications n LEFT JOIN dbo.Users u ON u.id=n.buyer_id WHERE u.id IS NULL) notificationOrphans
  `)).recordset[0];
  const expected={migration:1,settings:4,refundOrphans:0,duplicateRefunds:0,duplicateShippingRefunds:0,voucherOrphans:0,duplicateVouchers:0,invalidReserved:0,invalidMarkers:0,notificationOrphans:0};
  for(const [key,value] of Object.entries(expected))if(Number(row[key])!==value)throw new Error(`${key}: expected ${value}, got ${row[key]}`);
  const settings=(await query("SELECT setting_key,setting_value FROM dbo.MarketplaceSettings ORDER BY setting_key")).recordset;
  console.log(`[SELLER-009 INTEGRITY PASS] ${JSON.stringify({...row,settings})}`);
}
main().catch(error=>{console.error("[SELLER-009 INTEGRITY FAIL]",error instanceof Error?error.message:error);process.exitCode=1;}).finally(closePool);
