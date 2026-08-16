import{closePool,query}from'../config/database';
async function run(){try{const result=await query(`SELECT
(SELECT COUNT(*) FROM dbo.SchemaMigrations) migrations,(SELECT COUNT(*) FROM dbo.Products) products,
(SELECT COUNT(*) FROM dbo.Products WHERE moderation_status=N'PUBLISHED') published_products,
(SELECT COUNT(*) FROM dbo.Products WHERE is_active=1 AND moderation_status=N'PUBLISHED' AND shop_id=(SELECT id FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL')) public_products,
(SELECT COUNT(*) FROM dbo.ProductVariants) variants,(SELECT COUNT(*) FROM dbo.Inventory) inventory,(SELECT COUNT(*) FROM dbo.ProductImages) images,
(SELECT COUNT(*) FROM dbo.Products WHERE id=0 AND moderation_status=N'PUBLISHED' AND reviewed_at IS NULL AND published_at IS NULL AND reviewed_by_user_id IS NULL) product_zero_legacy,
(SELECT COUNT(*) FROM dbo.ProductModerationHistory) moderation_history,
(SELECT COUNT(*) FROM dbo.Products p LEFT JOIN dbo.Shops s ON s.id=p.shop_id WHERE s.id IS NULL) orphan_products,
(SELECT COUNT(*) FROM dbo.Products WHERE (brand_id IS NULL AND brand_request_id IS NULL) OR (brand_id IS NOT NULL AND brand_request_id IS NOT NULL)) invalid_brand_source,
(SELECT COUNT(*) FROM dbo.OrderItems) order_items,(SELECT COUNT(*) FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL' AND is_system=1 AND status=N'ACTIVE' AND is_verified=1) official_valid,
(SELECT COUNT(*) FROM dbo.Brands WHERE is_generic=1 AND is_active=1) generic_valid,
(SELECT COUNT(*) FROM dbo.Users u WHERE u.role=N'seller' AND (SELECT COUNT(*) FROM dbo.Shops s WHERE s.owner_user_id=u.id)<>1) seller_shop_failures,
(SELECT COUNT(*) FROM dbo.Users WHERE email LIKE N'seller006-%@example.test') acceptance_users,
(SELECT COUNT(*) FROM dbo.Products WHERE sku LIKE N'SELLER006-%') acceptance_products,
(SELECT COUNT(*) FROM sys.triggers WHERE name=N'TR_ProductModerationHistory_Immutable') immutable_trigger`);
console.log(`SELLER006_CANONICAL_VERIFY ${JSON.stringify(result.recordset[0])}`);}finally{await closePool();}}
run().catch(error=>{console.error(error);process.exitCode=1;});
