import { promises as fs } from 'fs';
import path from 'path';
import { closePool, getPool } from '../config/database';

interface RestoreRow { product_id:number; product_name:string; image_url:string; alt_text:string; sort_order:number; is_primary:boolean }
const apply=process.argv.includes('--apply');
const projectRoot=path.resolve(__dirname,'../../..');
const exportRoot=path.join(projectRoot,'backend','backups','product-images');

async function run(){
  const pool=await getPool();
  const source=await pool.request().query(`SELECT p.id product_id,p.product_name,LTRIM(RTRIM(p.main_image)) image_url FROM dbo.Products p WHERE NULLIF(LTRIM(RTRIM(p.main_image)),N'') IS NOT NULL ORDER BY p.id`);
  const candidates:RestoreRow[]=source.recordset.map(row=>({product_id:row.product_id,product_name:row.product_name,image_url:row.image_url,alt_text:row.product_name,sort_order:0,is_primary:true}));
  const duplicate=await pool.request().query('SELECT product_id,image_url FROM dbo.ProductImages');
  const keys=new Set(duplicate.recordset.map(row=>`${row.product_id}|${row.image_url}`));
  const pending=candidates.filter(row=>!keys.has(`${row.product_id}|${row.image_url}`));
  await fs.mkdir(exportRoot,{recursive:true});
  const exportPath=path.join(exportRoot,`restore-plan-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  await fs.writeFile(exportPath,JSON.stringify({created_at:new Date().toISOString(),mode:apply?'apply':'dry-run',source:'dbo.Products.main_image',candidate_count:candidates.length,pending_count:pending.length,records:pending},null,2),'utf8');
  let inserted=0;
  if(apply&&pending.length){const tx=pool.transaction();await tx.begin();try{for(const row of pending){const existingPrimary=await tx.request().input('productId',row.product_id).query('SELECT COUNT(*) total FROM dbo.ProductImages WHERE product_id=@productId AND is_primary=1');await tx.request().input('productId',row.product_id).input('url',row.image_url).input('alt',row.alt_text).input('primary',existingPrimary.recordset[0].total===0).query('INSERT dbo.ProductImages(product_id,image_url,alt_text,sort_order,is_primary,created_at) SELECT @productId,@url,@alt,0,@primary,SYSUTCDATETIME() WHERE NOT EXISTS(SELECT 1 FROM dbo.ProductImages WHERE product_id=@productId AND image_url=@url)');inserted++;}await tx.commit();}catch(error){await tx.rollback();throw error;}}
  const counts=await pool.request().query('SELECT (SELECT COUNT(*) FROM dbo.Products) products,(SELECT COUNT(*) FROM dbo.ProductImages) product_images');
  console.log(`PRODUCT_IMAGE_RESTORE ${JSON.stringify({mode:apply?'apply':'dry-run',source_records:candidates.length,pending_records:pending.length,inserted,products:counts.recordset[0].products,product_images:counts.recordset[0].product_images,export_path:exportPath})}`);
}
run().catch(error=>{console.error('PRODUCT_IMAGE_RESTORE_FAILED',error instanceof Error?error.message:error);process.exitCode=1;}).finally(closePool);
