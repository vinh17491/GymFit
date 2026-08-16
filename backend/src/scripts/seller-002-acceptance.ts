import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { Server } from 'http';
import { config } from '../config/config';
import { closePool,query } from '../config/database';

if(process.env.SELLER002_ACCEPTANCE!=='1')throw new Error('SELLER002_ACCEPTANCE=1 is required');
const regression04=process.env.REGRESSION04_ACCEPTANCE==='1',safePrefix=regression04?'GYMFIT_REGRESSION_04_':'GYMFIT_DB_SELLER002_ACCEPTANCE_';
if(config.db.database==='GYMFIT_DB'||!config.db.database.startsWith(safePrefix))throw new Error('Refusing mutation outside a disposable SELLER-002 acceptance database');

type Role='member'|'coach'|'admin'|'seller';
type Account={id:number;email:string;password:string;token?:string};
const accounts:Record<string,Account>={};const stamp=Date.now();const port=Number(process.env.ACCEPTANCE_PORT||5522);
const base=`http://127.0.0.1:${port}/api`;const suiteAbort=new AbortController();let server:Server|undefined;let assertions=0,lastStatus=0;
const check=(condition:boolean,message:string)=>{assertions++;if(!condition)throw new Error(`${message}; last status=${lastStatus}`);};
async function call(method:string,path:string,key?:string,body?:unknown){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),regression04?5000:15000);const suite=()=>controller.abort();suiteAbort.signal.addEventListener('abort',suite,{once:true});try{const response=await fetch(base+path,{method,signal:controller.signal,headers:{'content-type':'application/json',...(key&&accounts[key]?.token?{authorization:`Bearer ${accounts[key].token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});lastStatus=response.status;let data:any={};try{data=await response.json();}catch{}return{status:response.status,data};}finally{clearTimeout(timer);suiteAbort.signal.removeEventListener('abort',suite);}}
async function expect(method:string,path:string,key:string|undefined,status:number,body?:unknown){const result=await call(method,path,key,body);check(result.status===status,`${method} ${path}: expected ${status}, got ${result.status}`);return result;}
async function seed(key:string,role:Role){const email=`seller002-${key}-${stamp}@example.test`,password=`Aa1!${crypto.randomBytes(16).toString('hex')}`,hash=await bcrypt.hash(password,12);const inserted=await query<{id:number}>(`INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version) OUTPUT INSERTED.id VALUES(@email,@hash,@name,@role,1,1,0)`,{email,hash,name:`SELLER002 ${key}`,role});accounts[key]={id:Number(inserted.recordset[0].id),email,password};}
async function login(key:string){const r=await call('POST','/auth/login',undefined,{email:accounts[key].email,password:accounts[key].password});check(r.status===200,`${key} login`);accounts[key].token=String(r.data.data.accessToken);}
async function main(){
  const meta=await query(`SELECT
    (SELECT COUNT(*) FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL') official,
    (SELECT COUNT(*) FROM dbo.Products WHERE shop_id IS NULL) orphans,
    (SELECT COUNT(*) FROM dbo.Products WHERE id=0) productZero,
    COL_LENGTH(N'dbo.Products',N'shop_id') shopColumn`);
  check(Number(meta.recordset[0].official)===1,'exactly one official shop');check(Number(meta.recordset[0].orphans)===0,'no product orphan');check(Number(meta.recordset[0].productZero)===1,'Product ID 0 preserved');check(meta.recordset[0].shopColumn!==null,'Products.shop_id exists');
  const official=(await query<any>(`SELECT * FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL'`)).recordset[0];
  check(official.owner_user_id===null&&official.is_system&&official.status==='ACTIVE'&&official.is_verified&&official.slug==='gymfit-official','official invariants');
  const nullable=await query<any>(`SELECT is_nullable FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.Products') AND name=N'shop_id'`);check(nullable.recordset[0].is_nullable===false,'shop_id NOT NULL');
  check(Number((await query<any>(`SELECT COUNT(*) count FROM dbo.Products WHERE shop_id<>@id`,{id:official.id})).recordset[0].count)===0,'legacy products assigned official');
  check(Number((await query<any>(`SELECT COUNT(*) count FROM dbo.Users u JOIN dbo.Shops s ON s.owner_user_id=u.id WHERE u.name=N'Preexisting Seller'`)).recordset[0].count)===1,'preexisting seller backfilled exactly one shop');
  for(const [key,role] of [['admin','admin'],['member','member'],['memberRollback','member'],['sellerA','seller'],['sellerB','seller'],['coach','coach']] as [string,Role][])await seed(key,role);
  for(const key of Object.keys(accounts))await login(key);
  await query(`INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system) VALUES(@owner,N'Seller A',@slug,N'ACTIVE',0,0)`,{owner:accounts.sellerA.id,slug:`seller-a-${stamp}`});
  await query(`INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system) VALUES(@owner,N'Seller B',@slug,N'ACTIVE',0,0)`,{owner:accounts.sellerB.id,slug:`seller-b-${stamp}`});
  let r=await expect('GET','/seller/shop','sellerA',200);const shopA=r.data.data;check(shopA.ownerUserId===accounts.sellerA.id,'seller GET own shop');
  await expect('GET','/seller/shop','member',403);await expect('GET','/seller/shop','coach',403);await expect('GET','/seller/shop','admin',403);
  await expect('PATCH','/seller/shop','sellerA',400,{status:'SUSPENDED'});await expect('PATCH','/seller/shop','sellerA',400,{ownerUserId:accounts.sellerB.id});
  r=await expect('PATCH','/seller/shop','sellerA',200,{name:'Seller A Updated',description:'Acceptance'});check(r.data.data.name==='Seller A Updated','seller PATCH own shop');
  const shopB=(await query<any>('SELECT id,slug FROM dbo.Shops WHERE owner_user_id=@id',{id:accounts.sellerB.id})).recordset[0];
  await expect('GET',`/admin/shops/${shopA.id}`,'sellerA',403);await expect('GET','/admin/shops','admin',200);
  await expect('PATCH',`/admin/shops/${shopA.id}/status`,'admin',400,{status:'SUSPENDED'});
  await expect('PATCH',`/admin/shops/${shopA.id}/status`,'admin',200,{status:'SUSPENDED',reason:'Acceptance suspension'});
  await expect('GET',`/shops/${shopA.slug}`,undefined,404);await expect('GET','/seller/shop','sellerA',200);
  await expect('PATCH',`/admin/shops/${shopA.id}/status`,'admin',200,{status:'ACTIVE'});
  await expect('PATCH',`/admin/shops/${shopA.id}/verification`,'admin',200,{isVerified:true});
  await expect('PATCH',`/admin/shops/${shopA.id}/verification`,'admin',200,{isVerified:false});
  await expect('PATCH',`/admin/shops/${official.id}/status`,'admin',409,{status:'SUSPENDED',reason:'Forbidden'});
  await expect('PATCH',`/admin/shops/${official.id}/verification`,'admin',409,{isVerified:false});
  await expect('DELETE',`/admin/shops/${shopB.id}`,'admin',404);
  r=await expect('GET','/shops/gymfit-official?page=1&limit=100',undefined,200);check(!('pickupAddress'in r.data.data)&&!('ownerUserId'in r.data.data),'public privacy');const second=await expect('GET','/shops/gymfit-official?page=2&limit=100',undefined,200);check([...r.data.products,...second.data.products].some((p:any)=>p.id===0),'official pagination includes Product ID 0');
  await expect('GET','/products',undefined,200);await expect('GET','/products/0',undefined,200);
  const category=(await query<any>('SELECT TOP 1 id FROM dbo.Categories WHERE is_active=1 ORDER BY id')).recordset[0];
  const sku=`SELLER002-${stamp}`;await expect('POST','/admin/products','admin',400,{product_name:'SELLER-002 protected',sku:`${sku}-PROTECTED`,price:100000,stock:3,category_id:category.id,shop_id:shopA.id});
  r=await expect('POST','/admin/products','admin',201,{product_name:'SELLER-002 admin regression',sku,price:100000,stock:3,category_id:category.id});
  const createdProductId=Number(r.data.data.id);const ownership=(await query<any>('SELECT shop_id FROM dbo.Products WHERE id=@id',{id:createdProductId})).recordset[0];check(Number(ownership.shop_id)===Number(official.id),'admin create rejects spoofed shop_id and valid create uses official');
  await expect('PATCH',`/admin/products/${createdProductId}`,'admin',200,{description:'Updated regression product'});await expect('DELETE',`/admin/products/${createdProductId}`,'admin',200);
  const application={businessName:'Approval Sports',businessType:'SPORTS_STORE',contactName:'Contact',contactEmail:`approval-${stamp}@example.test`,contactPhone:'+84901234567',businessAddress:'Address',pickupAddress:'Pickup',description:'Approval acceptance'};
  await expect('POST','/seller-applications','member',201,application);await expect('POST','/seller-applications/me/submit','member',200);
  const app=(await query<any>('SELECT id FROM dbo.SellerApplications WHERE user_id=@id',{id:accounts.member.id})).recordset[0];await expect('POST',`/admin/seller-applications/${app.id}/approve`,'admin',200);
  check(Number((await query<any>('SELECT COUNT(*) count FROM dbo.Shops WHERE owner_user_id=@id',{id:accounts.member.id})).recordset[0].count)===1,'approval atomically creates one shop');
  await query(`INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system) VALUES(@id,N'Rollback collision',@slug,N'ACTIVE',0,0)`,{id:accounts.memberRollback.id,slug:`rollback-${stamp}`});
  await expect('POST','/seller-applications','memberRollback',201,{...application,businessName:'Rollback Sports',contactEmail:`rollback-${stamp}@example.test`});await expect('POST','/seller-applications/me/submit','memberRollback',200);
  const rollbackApp=(await query<any>('SELECT id FROM dbo.SellerApplications WHERE user_id=@id',{id:accounts.memberRollback.id})).recordset[0];await expect('POST',`/admin/seller-applications/${rollbackApp.id}/approve`,'admin',409);
  const rollbackState=(await query<any>('SELECT u.role,sa.status FROM dbo.Users u JOIN dbo.SellerApplications sa ON sa.user_id=u.id WHERE u.id=@id',{id:accounts.memberRollback.id})).recordset[0];check(rollbackState.role==='member'&&rollbackState.status==='PENDING','shop failure rolls back approval and role');
  check(Number((await query<any>(`SELECT COUNT(*) count FROM dbo.AuditLogs WHERE entity_type=N'Shop'`)).recordset[0].count)>=5,'shop actions audited');
  let duplicateFailed=false;try{await query(`INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system) VALUES(@id,N'Duplicate',@slug,N'ACTIVE',0,0)`,{id:accounts.sellerA.id,slug:`duplicate-${stamp}`});}catch{duplicateFailed=true;}check(duplicateFailed,'owner unique constraint');
  console.log(`[ACCEPTANCE PASS] assertions=${assertions} database=${config.db.database}`);
}
async function run(){let timer:NodeJS.Timeout|undefined;try{const{default:app}=await import('../app');server=app.listen(port,'127.0.0.1');await new Promise<void>((resolve,reject)=>{server!.once('listening',()=>resolve());server!.once('error',reject);});const limit=regression04?60000:300000;const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{suiteAbort.abort();reject(new Error(`Suite timed out after ${limit}ms`));},limit);});await Promise.race([main(),timeout]);return 0;}catch(e){console.error('[ACCEPTANCE FAIL]',e instanceof Error?e.message:e);return 1;}finally{if(timer)clearTimeout(timer);if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()));}await closePool();}}
run().then(code=>{process.exitCode=code;});
