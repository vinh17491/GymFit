import { config } from '../config/config';
import { closePool,query } from '../config/database';

if(process.env.SELLER013_LEGACY_READONLY!=='1'||config.db.database!=='GYMFIT_DB')throw new Error('SELLER-013 legacy read-only canonical gate failed');

async function main(){
  const current=String((await query<any>('SELECT DB_NAME() name')).recordset[0].name);
  if(current!=='GYMFIT_DB')throw new Error(`Unexpected database ${current}`);
  const row=(await query<any>(`SELECT
    (SELECT COUNT(*) FROM dbo.Memberships m LEFT JOIN dbo.Users u ON u.id=m.user_id LEFT JOIN dbo.Plans p ON p.id=m.plan_id WHERE u.id IS NULL OR p.id IS NULL) membershipOrphans,
    (SELECT COUNT(*) FROM dbo.Payments p LEFT JOIN dbo.Users u ON u.id=p.user_id LEFT JOIN dbo.Plans pl ON pl.id=p.plan_id WHERE u.id IS NULL OR (p.plan_id IS NOT NULL AND pl.id IS NULL)) paymentOrphans,
    (SELECT COUNT(*) FROM dbo.Invoices i LEFT JOIN dbo.Users u ON u.id=i.user_id LEFT JOIN dbo.Payments p ON p.id=i.payment_id WHERE u.id IS NULL OR (i.payment_id IS NOT NULL AND p.id IS NULL)) invoiceOrphans,
    (SELECT COUNT(*) FROM dbo.CouponUsages cu LEFT JOIN dbo.Coupons c ON c.id=cu.coupon_id LEFT JOIN dbo.Users u ON u.id=cu.user_id WHERE c.id IS NULL OR u.id IS NULL) couponUsageOrphans,
    (SELECT COUNT(*) FROM dbo.Products WHERE id=0) productZero,
    (SELECT COUNT(*) FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL' AND is_system=1 AND status=N'ACTIVE') officialShop`)).recordset[0];
  const pass=Number(row.membershipOrphans)===0&&Number(row.paymentOrphans)===0&&Number(row.invoiceOrphans)===0
    &&Number(row.couponUsageOrphans)===0&&Number(row.productZero)===1&&Number(row.officialShop)===1;
  if(!pass)throw new Error(`Legacy/canonical integrity finding: ${JSON.stringify(row)}`);
  console.log(`SELLER013_LEGACY_INTEGRITY ${JSON.stringify({verdict:'PASS',database:current,...row,routes:['/api/plans','/api/coupons','/api/invoices']})}`);
}
main().finally(closePool).catch(error=>{console.error('SELLER013_LEGACY_INTEGRITY FAIL',error instanceof Error?error.message:error);process.exitCode=1;});
