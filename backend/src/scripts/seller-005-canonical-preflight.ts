import{closePool,query}from'../config/database';
async function run(){try{const result=await query(`SELECT
(SELECT COUNT(*) FROM dbo.Products) products,(SELECT COUNT(*) FROM dbo.Products WHERE is_active=1) active_products,
(SELECT COUNT(*) FROM dbo.ProductVariants) variants,(SELECT COUNT(*) FROM dbo.Inventory) inventory,(SELECT COUNT(*) FROM dbo.ProductImages) images,
(SELECT COUNT(*) FROM dbo.Products WHERE id=0) product_zero,(SELECT COUNT(*) FROM dbo.Products WHERE shop_id IS NULL) null_owners,
(SELECT COUNT(*) FROM dbo.Products p LEFT JOIN dbo.Shops s ON s.id=p.shop_id WHERE s.id IS NULL) orphan_owners,
(SELECT COUNT(*) FROM dbo.Products WHERE brand_id IS NULL) null_brands,(SELECT COUNT(*) FROM dbo.Products WHERE category_id IS NULL) null_categories,
(SELECT COUNT(*) FROM dbo.OrderItems) order_items,(SELECT COUNT(*) FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL' AND is_system=1 AND status=N'ACTIVE' AND is_verified=1) official_valid,
(SELECT COUNT(*) FROM dbo.Brands WHERE is_generic=1 AND is_active=1) generic_valid,
COL_LENGTH(N'dbo.Products',N'moderation_status') moderation_column,COL_LENGTH(N'dbo.Products',N'brand_request_id') brand_request_column`);
console.log(`SELLER005_PREFLIGHT ${JSON.stringify(result.recordset[0])}`);}finally{await closePool();}}
run().catch(error=>{console.error(error);process.exitCode=1;});
