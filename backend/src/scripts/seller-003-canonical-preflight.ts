import { config } from '../config/config';
import { closePool,query } from '../config/database';
import { normalizeBrandName } from '../utils/brand-normalization';
if(config.db.database!=='GYMFIT_DB')throw new Error('Canonical preflight requires GYMFIT_DB');
async function run(){try{const brands=(await query<{id:number;name:string}>('SELECT id,name FROM dbo.Brands ORDER BY id')).recordset;const groups=new Map<string,number[]>();for(const brand of brands){const key=normalizeBrandName(brand.name);groups.set(key,[...(groups.get(key)||[]),brand.id]);}const duplicates=[...groups].filter(([,ids])=>ids.length>1).map(([normalizedName,ids])=>({normalizedName,ids}));const counts=await query(`SELECT
(SELECT COUNT(*) FROM dbo.Brands) brands,(SELECT COUNT(*) FROM dbo.Products WHERE brand_id IS NOT NULL) product_brand_refs,
(SELECT COUNT(*) FROM dbo.Products) products,(SELECT COUNT(*) FROM dbo.ProductVariants) variants,
(SELECT COUNT(*) FROM dbo.Inventory) inventory,(SELECT COUNT(*) FROM dbo.ProductImages) images,
(SELECT COUNT(*) FROM dbo.Products WHERE id=0) product_zero,
(SELECT COUNT(*) FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL' AND owner_user_id IS NULL AND is_system=1 AND status=N'ACTIVE' AND is_verified=1) official_valid,
(SELECT COUNT(*) FROM dbo.Users u WHERE u.role=N'seller' AND (SELECT COUNT(*) FROM dbo.Shops s WHERE s.owner_user_id=u.id)<>1) seller_shop_failures`);
console.log(`SELLER003_PREFLIGHT ${JSON.stringify({...counts.recordset[0],normalized_duplicates:duplicates})}`);}finally{await closePool();}}
run().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
