import { promises as fs } from 'fs';
import path from 'path';
import { closePool, getPool } from '../config/database';
import { config } from '../config/config';

interface ImageRow {
  id:number;
  product_id:number;
  image_url:string;
  alt_text:string|null;
  sort_order:number;
  is_primary:boolean;
  created_at:Date;
  updated_at:Date|null;
}
type Classification = 'kept_external'|'kept_upload'|'kept_legacy'|'empty'|'malformed'|'missing_local';

const apply = process.argv.includes('--apply');
const legacyArg = process.argv.find(arg => arg.startsWith('--legacy-root='))?.slice('--legacy-root='.length);
const legacyRoot = path.resolve(legacyArg || process.env.LEGACY_PRODUCT_IMAGE_DIR || '');
const uploadRoot = path.resolve(config.upload.dir);
const projectRoot = path.resolve(__dirname, '../../..');
const mediaRoot = path.join(projectRoot, 'backend', 'public', 'media');
const backupRoot = path.join(projectRoot, 'backend', 'backups', 'product-images');

async function isRegularFile(file:string) { try { return (await fs.stat(file)).isFile(); } catch { return false; } }
async function directoryExists(directory:string) { try { return (await fs.stat(directory)).isDirectory(); } catch { return false; } }
function inside(root:string, target:string) {
  const relative=path.relative(root,target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
function safeResolve(root:string, relative:string) {
  const target = path.resolve(root, relative.replace(/^[/\\]+/, ''));
  if (!inside(root, target)) throw new Error(`Resolved image path escapes allowed root: ${relative}`);
  return target;
}

async function classify(value:string|null):Promise<{kind:Classification;resolved?:string}> {
  const image=value?.trim(); if(!image)return {kind:'empty'};
  if(/^https?:\/\/[^\s]+$/i.test(image))return {kind:'kept_external'};
  try {
    if(image.startsWith('/uploads/')) { const resolved=safeResolve(uploadRoot,image.slice('/uploads/'.length)); return {kind:await isRegularFile(resolved)?'kept_upload':'missing_local',resolved}; }
    if(image.startsWith('/media/')) { const resolved=safeResolve(mediaRoot,image.slice('/media/'.length)); return {kind:await isRegularFile(resolved)?'kept_legacy':'missing_local',resolved}; }
    let relative:string|undefined;
    if(image.startsWith('/image/')) relative=image.slice('/image/'.length);
    else if(image.startsWith('image/')) relative=image.slice('image/'.length);
    else if(!path.isAbsolute(image) && !image.includes('://')) relative=image;
    else if(path.isAbsolute(image)) {
      const absolute=path.resolve(image);
      if(!inside(legacyRoot,absolute)) return {kind:'malformed'};
      relative=path.relative(legacyRoot,absolute);
    }
    if(relative!==undefined){const resolved=safeResolve(legacyRoot,relative);return {kind:await isRegularFile(resolved)?'kept_legacy':'missing_local',resolved};}
    return {kind:'malformed'};
  } catch {
    return {kind:'malformed'};
  }
}

function reasonFor(classification: Classification): string {
  if (classification === 'empty') return 'empty: image URL is empty';
  if (classification === 'malformed') return 'malformed: unsupported or unsafe image path';
  if (classification === 'missing_local') return 'missing_local: resolved local image file does not exist';
  return `unexpected invalid classification: ${classification}`;
}

async function run(){
  if(!process.env.LEGACY_PRODUCT_IMAGE_DIR && !legacyArg) throw new Error('Set LEGACY_PRODUCT_IMAGE_DIR or pass --legacy-root=<directory>');
  if(!(await directoryExists(legacyRoot))) throw new Error(`Legacy image root does not exist: ${legacyRoot}`);
  const pool=await getPool();
  const products=await pool.request().query('SELECT id FROM dbo.Products');
  const hasUpdatedAt=Boolean((await pool.request().query(`SELECT CASE WHEN COL_LENGTH(N'dbo.ProductImages', N'updated_at') IS NULL THEN 0 ELSE 1 END present`)).recordset[0]?.present);
  const rows=(await pool.request().query<ImageRow>(`SELECT id,product_id,image_url,alt_text,sort_order,is_primary,created_at,${hasUpdatedAt ? 'updated_at' : 'CAST(NULL AS DATETIME2) AS updated_at'} FROM dbo.ProductImages ORDER BY product_id,id`)).recordset;
  const stats={mode:apply?'apply':'dry-run',legacy_root:legacyRoot,products_checked:products.recordset.length,image_records_checked:rows.length,images_kept:0,images_would_remove:0,images_removed:0,products_using_fallback:0,kept_external:0,kept_upload:0,kept_legacy:0,empty:0,malformed:0,missing_local:0};
  const invalid:(ImageRow&{classification:Classification;resolved_path?:string;planned_action:'DELETE_INVALID_PRODUCT_IMAGE';reason:string})[]=[];
  for(const row of rows){const result=await classify(row.image_url);stats[result.kind]++;if(result.kind.startsWith('kept_'))stats.images_kept++;else{stats.images_would_remove++;invalid.push({...row,classification:result.kind,resolved_path:result.resolved,planned_action:'DELETE_INVALID_PRODUCT_IMAGE',reason:reasonFor(result.kind)});}}
  let backupPath:string|undefined;
  if(apply&&invalid.length){
    await fs.mkdir(backupRoot,{recursive:true});
    backupPath=path.join(backupRoot,`repair-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
    const databaseIdentity=(await pool.request().query(`SELECT @@SERVERNAME server_name,DB_NAME() database_name,DB_ID() database_id,create_date,service_broker_guid FROM sys.databases WHERE database_id=DB_ID()`)).recordset[0];
    const envelope={format_version:1,created_at:new Date().toISOString(),mode:'apply',legacy_root:legacyRoot,database_identity:databaseIdentity,record_count:invalid.length,records:invalid};
    await fs.writeFile(backupPath,JSON.stringify(envelope,null,2),{encoding:'utf8',flag:'wx'});
    const verified=JSON.parse(await fs.readFile(backupPath,'utf8')) as typeof envelope;
    const expectedIds=new Set(invalid.map(row=>row.id));
    const backupIds=verified.records.map(row=>row.id);
    if(verified.record_count!==invalid.length||backupIds.length!==invalid.length||new Set(backupIds).size!==backupIds.length||backupIds.some(id=>!expectedIds.has(id))) throw new Error('Repair backup verification failed before deletion');
    const tx=pool.transaction();await tx.begin();try{
      for(const row of invalid){const deleted=await tx.request().input('id',row.id).query('DELETE dbo.ProductImages WHERE id=@id; SELECT @@ROWCOUNT affected_rows;');if(deleted.recordset[0]?.affected_rows!==1) throw new Error(`Expected one ProductImage delete for id ${row.id}`);}
      await tx.request().query(`;WITH choice AS (SELECT id,ROW_NUMBER() OVER(PARTITION BY product_id ORDER BY is_primary DESC,sort_order,id) rank FROM dbo.ProductImages) UPDATE pi SET is_primary=CASE WHEN c.rank=1 THEN 1 ELSE 0 END FROM dbo.ProductImages pi JOIN choice c ON c.id=pi.id`);
      await tx.commit();stats.images_removed=invalid.length;
    }catch(error){await tx.rollback();throw error;}
  }
  const fallback=await pool.request().query('SELECT COUNT(*) total FROM dbo.Products p WHERE NOT EXISTS(SELECT 1 FROM dbo.ProductImages pi WHERE pi.product_id=p.id)');stats.products_using_fallback=fallback.recordset[0].total;
  console.log(`PRODUCT_IMAGE_REPAIR ${JSON.stringify({...stats,backup_path:backupPath||null})}`);
}
run().catch(error=>{console.error('PRODUCT_IMAGE_REPAIR_FAILED',error instanceof Error?error.message:error);process.exitCode=1;}).finally(closePool);
