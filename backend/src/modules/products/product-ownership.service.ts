import { getPool,sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export const productScopes={
  public:`p.is_active=1 AND p.moderation_status=N'PUBLISHED' AND shop.status=N'ACTIVE'`,
  admin:'1=1',
  seller:'s.owner_user_id=@sellerUserId',
};

export const productOwnershipService={
  buildPublicProductScope(){return productScopes.public;},
  buildAdminProductScope(){return productScopes.admin;},
  buildSellerProductScope(){return 'p.shop_id=@shopId';},
  async resolveSellerShop(userId:number){const pool=await getPool();const r=await pool.request().input('userId',sql.Int,userId).query('SELECT id,name,slug,status,is_verified isVerified FROM dbo.Shops WHERE owner_user_id=@userId');if(!r.recordset[0])throw new AppError(409,'Seller account has no Shop');return{...r.recordset[0],isVerified:Boolean(r.recordset[0].isVerified)};},
  async resolveGymFitOfficialShop(){const pool=await getPool();const r=await pool.request().query(`SELECT id,name,slug,status,is_verified isVerified FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL' AND is_system=1`);if(!r.recordset[0])throw new AppError(500,'GymFit Official Shop is missing');return r.recordset[0];},
  async getSellerOwnedProduct(productId:number,userId:number){const pool=await getPool();const r=await pool.request().input('productId',sql.Int,productId).input('userId',sql.Int,userId).query(`SELECT p.id,p.shop_id shopId FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id WHERE p.id=@productId AND s.owner_user_id=@userId`);return r.recordset[0]||null;},
  async assertSellerOwnsProduct(productId:number,userId:number){const row=await this.getSellerOwnedProduct(productId,userId);if(!row)throw new AppError(404,'Product not found');return row;},
  async assertSellerOwnsVariant(variantId:number,userId:number){const pool=await getPool();const r=await pool.request().input('variantId',sql.Int,variantId).input('userId',sql.Int,userId).query(`SELECT v.id,v.product_id productId FROM dbo.ProductVariants v JOIN dbo.Products p ON p.id=v.product_id JOIN dbo.Shops s ON s.id=p.shop_id WHERE v.id=@variantId AND s.owner_user_id=@userId`);if(!r.recordset[0])throw new AppError(404,'Variant not found');return r.recordset[0];},
  async assertSellerOwnsImage(imageId:number,userId:number){const pool=await getPool();const r=await pool.request().input('imageId',sql.Int,imageId).input('userId',sql.Int,userId).query(`SELECT pi.id,pi.product_id productId FROM dbo.ProductImages pi JOIN dbo.Products p ON p.id=pi.product_id JOIN dbo.Shops s ON s.id=p.shop_id WHERE pi.id=@imageId AND s.owner_user_id=@userId`);if(!r.recordset[0])throw new AppError(404,'Image not found');return r.recordset[0];},
  async assertSellerOwnsInventoryRecord(inventoryId:number,userId:number){const pool=await getPool();const r=await pool.request().input('inventoryId',sql.Int,inventoryId).input('userId',sql.Int,userId).query(`SELECT i.id,i.variant_id variantId,p.id productId FROM dbo.Inventory i JOIN dbo.ProductVariants v ON v.id=i.variant_id JOIN dbo.Products p ON p.id=v.product_id JOIN dbo.Shops s ON s.id=p.shop_id WHERE i.id=@inventoryId AND s.owner_user_id=@userId`);if(!r.recordset[0])throw new AppError(404,'Inventory not found');return r.recordset[0];},
};
