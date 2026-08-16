import { sql } from '../../config/database';
import { ReadinessResult } from './product-moderation.types';

export async function evaluateProductReadiness(tx:sql.Transaction,productId:number):Promise<ReadinessResult>{
  const row=(await tx.request().input('readinessProductId',sql.Int,productId).query(`SELECT p.id,p.product_name,p.slug,p.brand_id,p.brand_request_id,
    c.is_active category_active,b.is_active brand_active,
    (SELECT COUNT(*) FROM dbo.ProductVariants v WHERE v.product_id=p.id) variants,
    (SELECT COUNT(*) FROM dbo.ProductVariants v WHERE v.product_id=p.id AND v.is_active=1) active_variants,
    (SELECT COUNT(*) FROM dbo.ProductVariants v WHERE v.product_id=p.id AND v.is_active=1 AND v.is_default=1) defaults,
    (SELECT COUNT(*) FROM dbo.ProductVariants v LEFT JOIN dbo.Inventory i ON i.variant_id=v.id WHERE v.product_id=p.id AND i.id IS NULL) missing_inventory,
    (SELECT COUNT(*) FROM dbo.ProductVariants v JOIN dbo.Inventory i ON i.variant_id=v.id WHERE v.product_id=p.id AND
      (v.price<=0 OR (v.sale_price IS NOT NULL AND (v.sale_price<0 OR v.sale_price>=v.price)) OR i.on_hand<0 OR i.reserved<0 OR i.reserved>i.on_hand)) invalid_children,
    (SELECT COUNT(*) FROM dbo.ProductImages pi WHERE pi.product_id=p.id) images,
    (SELECT COUNT(*) FROM dbo.ProductImages pi WHERE pi.product_id=p.id AND pi.is_primary=1) primaries
    FROM dbo.Products p LEFT JOIN dbo.Categories c ON c.id=p.category_id LEFT JOIN dbo.Brands b ON b.id=p.brand_id WHERE p.id=@readinessProductId`)).recordset[0];
  const missing:string[]=[];
  if(!row||!String(row.product_name||'').trim()||!String(row.slug||'').trim())missing.push('required product fields');
  if(!row?.category_active)missing.push('active Category');
  if(!row?.brand_id||row.brand_request_id||!row.brand_active)missing.push('approved active Brand');
  if(Number(row?.variants)<1||Number(row?.active_variants)<1)missing.push('active Variant');
  if(Number(row?.defaults)!==1)missing.push('exactly one default Variant');
  if(Number(row?.missing_inventory)>0)missing.push('Inventory for every Variant');
  if(Number(row?.invalid_children)>0)missing.push('valid Variant price and Inventory');
  if(Number(row?.images)<1)missing.push('Product image');
  if(Number(row?.primaries)!==1)missing.push('exactly one primary image');
  return{ready:missing.length===0,missing};
}
