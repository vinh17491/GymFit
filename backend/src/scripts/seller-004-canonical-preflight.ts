import{closePool,query}from'../config/database';
async function run(){try{const r=await query(`SELECT
(SELECT COUNT(*) FROM dbo.Products) products,(SELECT COUNT(*) FROM dbo.ProductVariants) variants,
(SELECT COUNT(*) FROM dbo.Inventory) inventory,(SELECT COUNT(*) FROM dbo.ProductImages) images,
(SELECT COUNT(*) FROM dbo.Products WHERE shop_id IS NULL) null_owners,
(SELECT COUNT(*) FROM dbo.Products p LEFT JOIN dbo.Shops s ON s.id=p.shop_id WHERE s.id IS NULL) orphan_owners,
(SELECT COUNT(*) FROM dbo.Products WHERE id=0) product_zero,
(SELECT TOP 1 shop_id FROM dbo.Products WHERE id=0) product_zero_shop,
(SELECT COUNT(*) FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id WHERE s.system_key=N'GYMFIT_OFFICIAL') official_products,
(SELECT COUNT(*) FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id WHERE s.owner_user_id IS NOT NULL) seller_products,
(SELECT COUNT(*) FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id WHERE s.status=N'SUSPENDED') suspended_products,
(SELECT COUNT(*) FROM sys.tables WHERE object_id=OBJECT_ID(N'dbo.CartItems')) cart_table,(SELECT COUNT(*) FROM dbo.OrderItems) order_refs,
COL_LENGTH(N'dbo.ProductVariants',N'shop_id') variant_shop_column,
COL_LENGTH(N'dbo.ProductImages',N'shop_id') image_shop_column,
COL_LENGTH(N'dbo.Inventory',N'shop_id') inventory_shop_column`);
const meta=await query(`SELECT
(SELECT is_nullable FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.Products') AND name=N'shop_id') shop_nullable,
(SELECT COUNT(*) FROM sys.foreign_key_columns f WHERE f.parent_object_id=OBJECT_ID(N'dbo.Products') AND COL_NAME(f.parent_object_id,f.parent_column_id)=N'shop_id' AND f.referenced_object_id=OBJECT_ID(N'dbo.Shops')) shop_fk,
(SELECT COUNT(*) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=OBJECT_ID(N'dbo.Products') AND c.name=N'shop_id') shop_indexes`);
const byShop=await query(`SELECT s.id,s.name,s.status,COUNT(p.id) product_count FROM dbo.Shops s LEFT JOIN dbo.Products p ON p.shop_id=s.id GROUP BY s.id,s.name,s.status ORDER BY s.id`);
console.log(`SELLER004_PREFLIGHT ${JSON.stringify({...r.recordset[0],...meta.recordset[0],by_shop:byShop.recordset})}`);}finally{await closePool();}}
run().catch(e=>{console.error(e);process.exitCode=1;});
