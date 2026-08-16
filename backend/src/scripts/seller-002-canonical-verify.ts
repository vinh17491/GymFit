import { config } from '../config/config';
import { closePool,query } from '../config/database';
if(config.db.database!=='GYMFIT_DB')throw new Error('Canonical verification requires GYMFIT_DB');
async function run(){try{const result=await query(`SELECT
  (SELECT COUNT(*) FROM dbo.Products) products,
  (SELECT COUNT(*) FROM dbo.ProductVariants) variants,
  (SELECT COUNT(*) FROM dbo.Inventory) inventory,
  (SELECT COUNT(*) FROM dbo.ProductImages) images,
  (SELECT COUNT(*) FROM dbo.Products WHERE id=0 AND shop_id IS NOT NULL) product_zero_owned,
  (SELECT COUNT(*) FROM dbo.Products WHERE shop_id IS NULL) orphan_products,
  (SELECT COUNT(*) FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL' AND owner_user_id IS NULL AND is_system=1 AND is_verified=1 AND status=N'ACTIVE' AND slug=N'gymfit-official') official_valid,
  (SELECT COUNT(*) FROM dbo.Users u WHERE u.role=N'seller' AND (SELECT COUNT(*) FROM dbo.Shops s WHERE s.owner_user_id=u.id)<>1) sellers_without_exactly_one_shop,
  (SELECT COUNT(*) FROM dbo.Users WHERE email LIKE N'seller002-%@example.test') acceptance_users,
  (SELECT COUNT(*) FROM dbo.Products WHERE sku LIKE N'SELLER002-%') acceptance_products`);
console.log(`CANONICAL_SELLER002_VERIFICATION ${JSON.stringify(result.recordset[0])}`);}finally{await closePool();}}
run().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
