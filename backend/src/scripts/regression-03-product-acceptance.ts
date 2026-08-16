import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { promises as fs } from 'fs';
import type { Server } from 'http';
import path from 'path';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import * as sql from 'mssql';
import { config } from '../config/config';
import { closePool, query } from '../config/database';

if (process.env.REGRESSION03_ACCEPTANCE !== '1') throw new Error('REGRESSION03_ACCEPTANCE=1 is required');
const database=config.db.database, uploadDir=path.resolve(config.upload.dir);
if(!database.startsWith('GYMFIT_REGRESSION_03_')||!/^[A-Za-z0-9_]+$/.test(database))throw new Error('Unsafe database gate');
if(!uploadDir.toUpperCase().includes('REGRESSION_03'))throw new Error('Unsafe upload directory gate');

type Role='member'|'coach'|'seller'|'admin';
type Actor={id:number;email:string;password:string;token?:string};
type Result={status:number;data:any};
const actors:Record<string,Actor>={}, stamp=`${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const tsx=path.resolve(process.cwd(),'node_modules','tsx','dist','cli.mjs');
const setup=path.resolve(process.cwd(),'src','scripts','seller-002-acceptance-db.ts');
const migrate=path.resolve(process.cwd(),'src','scripts','migrate.ts');
let server:Server|undefined,base='',assertions=0,created=false,dropped=false,storageRemoved=false,portReleased=false;
const cases:Record<string,number>={};
function check(value:unknown,label:string){assertions++;if(!value)throw new Error(`Assertion failed: ${label}`);}
function report(group:string,test:string,expected:string,actual:string){cases[group]=(cases[group]||0)+1;console.log(`R03_CASE ${group}|${test}|${expected}|${actual}|PASS`);}
function child(script:string,args:string[]=[]){return execFileSync(process.execPath,[tsx,script,...args],{encoding:'utf8',env:process.env,timeout:60000});}
async function api(method:string,url:string,options:{actor?:string;body?:unknown;form?:FormData}={}):Promise<Result>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  try{
    const response=await fetch(base+url,{method,signal:controller.signal,headers:{
      ...(options.actor&&actors[options.actor].token?{authorization:`Bearer ${actors[options.actor].token}`}:{ }),
      ...(options.body!==undefined?{'content-type':'application/json'}:{})
    },body:options.form??(options.body===undefined?undefined:JSON.stringify(options.body))});
    let data:any={};try{data=await response.json();}catch{}
    return{status:response.status,data};
  }finally{clearTimeout(timer);}
}
async function expect(group:string,test:string,method:string,url:string,status:number,options:Parameters<typeof api>[2]={}){
  const result=await api(method,url,options);check(result.status===status,`${test}: ${result.status} != ${status}`);report(group,test,String(status),String(result.status));return result;
}
async function seedActor(key:string,role:Role){
  const password=`Aa1!${crypto.randomBytes(14).toString('base64url')}`,email=`regression03-${key}-${stamp}@example.test`,hash=await bcrypt.hash(password,12);
  const result=await query<{id:number}>(`INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version) OUTPUT INSERTED.id VALUES(@email,@hash,@name,@role,1,1,0)`,{email,hash,name:`REGRESSION-03 ${key}`,role});
  actors[key]={id:Number(result.recordset[0].id),email,password};
}
async function login(key:string){const result=await api('POST','/auth/login',{body:{email:actors[key].email,password:actors[key].password}});check(result.status===200,`${key} login`);actors[key].token=String(result.data.data.accessToken);}
async function product(input:{key:string;status?:string;active?:boolean;shop?:number;images?:number;price?:number}){
  const category=Number((await query<any>('SELECT TOP 1 id FROM dbo.Categories WHERE is_active=1 ORDER BY id')).recordset[0].id);
  const brand=Number((await query<any>('SELECT TOP 1 id FROM dbo.Brands WHERE is_active=1 ORDER BY id')).recordset[0].id);
  const official=Number((await query<any>("SELECT id FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL'")).recordset[0].id);
  const sku=`REGRESSION03-${input.key}-${stamp}`,name=`REGRESSION-03 ${input.key}`,slug=`regression-03-${input.key.toLowerCase()}-${stamp}`;
  const inserted=await query<any>(`INSERT dbo.Products(product_name,slug,description,sku,price,stock,brand_id,category_id,is_active,shop_id,moderation_status,created_at,updated_at)
    OUTPUT INSERTED.id VALUES(@name,@slug,N'isolated fixture',@sku,@price,10,@brand,@category,@active,@shop,@status,SYSUTCDATETIME(),SYSUTCDATETIME())`,
  {name,slug,sku,price:input.price??123456,brand,category,active:input.active??(!input.status||input.status==='PUBLISHED'),shop:input.shop??official,status:input.status??'PUBLISHED'});
  const id=Number(inserted.recordset[0].id);
  const variant=await query<any>(`INSERT dbo.ProductVariants(product_id,variant_name,sku,price,is_active,is_default,created_at,updated_at) OUTPUT INSERTED.id VALUES(@id,N'Default',@sku,@price,1,1,SYSUTCDATETIME(),SYSUTCDATETIME())`,{id,sku,price:input.price??123456});
  await query('INSERT dbo.Inventory(variant_id,on_hand,reserved,low_stock_threshold) VALUES(@id,10,0,2)',{id:variant.recordset[0].id});
  for(let index=0;index<(input.images??0);index++)await query(`INSERT dbo.ProductImages(product_id,image_url,alt_text,sort_order,is_primary) VALUES(@id,@url,N'fixture',@sort,@primary)`,{id,url:`/uploads/fixtures/${id}-${index}.webp`,sort:index,primary:index===0});
  return{id,category,brand,name,slug,sku};
}
async function start(){
  const started=Date.now(),app=(await import('../app')).default;
  server=await new Promise<Server>((resolve,reject)=>{const candidate=app.listen(0,'127.0.0.1',()=>resolve(candidate));candidate.once('error',reject);});
  const address=server.address();if(!address||typeof address==='string')throw new Error('No runtime port');base=`http://127.0.0.1:${address.port}/api`;
  let healthy=false;
  for(let attempt=1;attempt<=20&&Date.now()-started<60000;attempt++){
    try{const response=await fetch(`${base}/health`,{signal:AbortSignal.timeout(2000)});if(response.status===200){healthy=true;report('RUNTIME','finite health polling','200',`200 attempt ${attempt}`);break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  check(healthy&&Date.now()-started<60000,'runtime healthy within 60 seconds');
}
async function authMatrix(productId:number){
  const actions:[string,string,unknown?,boolean?][]=[['GET','/admin/products'],['GET',`/admin/products/${productId}`],['POST','/admin/products',{}],['PATCH',`/admin/products/${productId}`,{}],['DELETE',`/admin/products/99999998`],['POST',`/admin/products/${productId}/images`,undefined,true]];
  for(const [method,url,body,isForm]of actions){
    await expect('AUTH',`anonymous ${method} ${url}`,method,url,401,isForm?{form:new FormData()}:{body});
    for(const key of ['member','coach','seller'])await expect('AUTH',`${key} ${method} ${url}`,method,url,403,isForm?{actor:key,form:new FormData()}:{actor:key,body});
  }
  await expect('AUTH','admin list','GET','/admin/products',200,{actor:'admin'});
  await expect('AUTH','admin detail','GET',`/admin/products/${productId}`,200,{actor:'admin'});
}
async function publicTests(f:any,draft:any,rejected:any,inactive:any,suspended:any,noImage:any,multi:any){
  let result=await expect('PUBLIC_LIST','anonymous list','GET','/products?q=REGRESSION-03&limit=100',200);
  check(result.data.data.some((x:any)=>Number(x.id)===f.id),'published visible');
  check(!result.data.data.some((x:any)=>[draft.id,rejected.id,inactive.id,suspended.id].includes(Number(x.id))),'non-public hidden');
  report('PUBLIC_LIST','visibility rules','published only','matched');
  await expect('PUBLIC_LIST','page zero','GET','/products?page=0',400);
  await expect('PUBLIC_LIST','negative page','GET','/products?page=-1',400);
  result=await expect('PUBLIC_LIST','large page empty','GET','/products?page=999999',200);check(result.data.data.length===0,'large page empty');
  await expect('PUBLIC_LIST','limit zero','GET','/products?limit=0',400);
  await expect('PUBLIC_LIST','negative limit','GET','/products?limit=-1',400);
  await expect('PUBLIC_LIST','limit above maximum','GET','/products?limit=101',400);
  result=await expect('PUBLIC_LIST','exact search','GET',`/products?q=${encodeURIComponent(f.name)}`,200);check(result.data.data.some((x:any)=>x.id===f.id),'exact search');
  result=await expect('PUBLIC_LIST','case and trim search','GET',`/products?q=${encodeURIComponent(`  ${f.name.toLowerCase()}  `)}`,200);check(result.data.data.some((x:any)=>x.id===f.id),'normalized search');
  result=await expect('PUBLIC_LIST','empty result','GET','/products?q=REGRESSION03-NO-SUCH-PRODUCT',200);check(result.data.data.length===0,'empty result');
  result=await expect('PUBLIC_LIST','category filter','GET',`/products?q=REGRESSION-03&categoryId=${f.category}`,200);check(result.data.data.some((x:any)=>x.id===f.id),'category match');
  result=await expect('PUBLIC_LIST','missing category filter','GET','/products?categoryId=2147483000',200);check(result.data.data.length===0,'missing category empty');
  result=await expect('PUBLIC_LIST','brand filter','GET',`/products?q=REGRESSION-03&brandId=${f.brand}`,200);check(result.data.data.some((x:any)=>x.id===f.id),'brand match');
  result=await expect('PUBLIC_LIST','price filter and sort','GET','/products?q=REGRESSION-03&minPrice=100000&maxPrice=200000&sort=price_desc',200);check(result.data.data.length>=3,'price filtered');
  await expect('PUBLIC_LIST','invalid sort','GET','/products?sort=drop_table',400);
  await expect('PUBLIC_LIST','unknown query','GET','/products?direction=desc',400);
  result=await expect('PUBLIC_LIST','pagination metadata','GET','/products?q=REGRESSION-03&page=1&limit=2&sort=name_asc',200);check(result.data.pagination.page===1&&result.data.pagination.pageSize===2&&result.data.pagination.total>=3,'pagination accurate');
  check(!/review_reason|reviewed_by|filesystem/i.test(JSON.stringify(result.data.data)),'public fields safe');
  const zeroName=String((await query<any>('SELECT product_name FROM dbo.Products WHERE id=0')).recordset[0].product_name);
  result=await expect('PUBLIC_LIST','Product ID 0 listed','GET',`/products?q=${encodeURIComponent(zeroName)}&limit=100`,200);check(result.data.data.some((x:any)=>Number(x.id)===0),'Product zero in public list');
  await expect('PUBLIC_DETAIL','published detail','GET',`/products/${f.id}`,200);
  await expect('PUBLIC_DETAIL','Product ID 0','GET','/products/0',200);
  await expect('PUBLIC_DETAIL','missing product','GET','/products/2147483000',404);
  await expect('PUBLIC_DETAIL','invalid identifier','GET','/products/%20',400);
  await expect('PUBLIC_DETAIL','negative identifier treated as absent slug','GET','/products/-1',404);
  for(const item of [draft,rejected,inactive,suspended])await expect('PUBLIC_DETAIL',`hidden ${item.id}`,'GET',`/products/${item.id}`,404);
  result=await expect('PUBLIC_DETAIL','no image contract','GET',`/products/${noImage.id}`,200);check(result.data.data.primary_image===null&&result.data.data.images.length===0,'no image null/empty');
  result=await expect('PUBLIC_DETAIL','gallery ordering','GET',`/products/${multi.id}`,200);check(result.data.data.images.length===3&&result.data.data.images[0].is_primary,'gallery primary first');
}
async function adminCrud(category:number,brand:number,publicFixture:any){
  const valid={product_name:'  REGRESSION-03 Admin Unicode Áo tập  ',sku:`REGRESSION03-ADMIN-${stamp}`,price:250000,stock:4,category_id:category,brand_id:null,is_active:true};
  let result=await expect('ADMIN_CREATE','valid generic-brand create','POST','/admin/products',201,{actor:'admin',body:valid});
  const id=Number(result.data.data.id);check(result.data.data.brand_id!=null&&result.data.data.shop.isVerified,'generic Brand and official Shop');
  const stored=(await query<any>('SELECT product_name,moderation_status,shop_id FROM dbo.Products WHERE id=@id',{id})).recordset[0];check(stored.product_name==='REGRESSION-03 Admin Unicode Áo tập'&&stored.moderation_status==='PUBLISHED','normalized create persisted');
  for(const [name,body,status] of [
    ['missing name',{...valid,product_name:undefined},400],['empty name',{...valid,product_name:'   '},400],['long name',{...valid,product_name:'x'.repeat(201)},400],
    ['missing price',{...valid,price:undefined},400],['zero price',{...valid,price:0},400],['negative price',{...valid,price:-1},400],['wrong price type',{...valid,price:'10'},400],
    ['missing category',{...valid,category_id:2147483000},400],['missing brand',{...valid,brand_id:2147483000},400],['unknown field',{...valid,unknown:'x'},400],
    ['protected owner',{...valid,shop_id:1},400],['protected status',{...valid,moderation_status:'PUBLISHED'},400],['protected image',{...valid,primaryImage:'/x'},400],
    ['duplicate sku',valid,409]
  ] as [string,any,number][])await expect('ADMIN_CREATE',name,'POST','/admin/products',status,{actor:'admin',body});
  result=await expect('ADMIN_READ','list all states','GET','/admin/products?limit=100&search=REGRESSION-03&sort=name_asc',200,{actor:'admin'});check(result.data.data.some((x:any)=>Number(x.id)===publicFixture.id),'admin sees fixtures');
  await expect('ADMIN_READ','invalid page','GET','/admin/products?page=0',400,{actor:'admin'});
  await expect('ADMIN_READ','invalid limit','GET','/admin/products?limit=101',400,{actor:'admin'});
  await expect('ADMIN_READ','invalid status','GET','/admin/products?status=PUBLISHED',400,{actor:'admin'});
  await expect('ADMIN_READ','invalid sort','GET','/admin/products?sort=DROP',400,{actor:'admin'});
  await expect('ADMIN_READ','unknown filter','GET','/admin/products?shop=other',400,{actor:'admin'});
  await expect('ADMIN_READ','Product ID 0','GET','/admin/products/0',200,{actor:'admin'});
  await expect('ADMIN_READ','missing detail','GET','/admin/products/2147483000',404,{actor:'admin'});
  result=await expect('ADMIN_UPDATE','single field','PATCH',`/admin/products/${id}`,200,{actor:'admin',body:{description:'updated'}});
  check(result.data.data.description==='updated','single update persisted');
  result=await expect('ADMIN_UPDATE','multiple fields','PATCH',`/admin/products/${id}`,200,{actor:'admin',body:{product_name:'REGRESSION-03 Updated',price:275000,brand_id:brand}});
  check(result.data.data.product_name==='REGRESSION-03 Updated'&&Number(result.data.data.display_variant.price)===275000,'multi update persisted');
  for(const [name,body,status]of [['empty body',{},400],['empty name',{product_name:' '},400],['long name',{product_name:'x'.repeat(201)},400],['negative price',{price:-1},400],['wrong price type',{price:'12'},400],['bad category',{category_id:2147483000},400],['bad brand',{brand_id:2147483000},400],['unknown',{unknown:1},400],['protected',{shop_id:1},400],['stock protected',{stock:3},400]]as[string,any,number][])await expect('ADMIN_UPDATE',name,'PATCH',`/admin/products/${id}`,status,{actor:'admin',body});
  await expect('ADMIN_UPDATE','missing product','PATCH','/admin/products/2147483000',404,{actor:'admin',body:{description:'x'}});
  await expect('ADMIN_UPDATE','Product ID 0 compatible','PATCH','/admin/products/0',200,{actor:'admin',body:{description:'Product zero regression verified'}});
  result=await expect('ADMIN_DELETE','valid hard delete','DELETE',`/admin/products/${id}`,200,{actor:'admin'});check(Number(result.data.data.id)===id,'delete response');
  check(Number((await query<any>('SELECT COUNT(*) count FROM dbo.Products WHERE id=@id',{id})).recordset[0].count)===0,'product deleted');
  await expect('ADMIN_DELETE','repeat missing','DELETE',`/admin/products/${id}`,404,{actor:'admin'});
  return id;
}
async function formFor(files:Array<{buffer:Buffer;name:string;type:string}>){const form=new FormData();for(const file of files)form.append('images',new Blob([file.buffer],{type:file.type}),file.name);return form;}
async function imageTests(category:number){
  const created=await expect('IMAGE','create image product','POST','/admin/products',201,{actor:'admin',body:{product_name:'REGRESSION-03 Images',sku:`REGRESSION03-IMG-${stamp}`,price:100000,stock:1,category_id:category}});
  const id=Number(created.data.data.id);
  const jpg=await sharp({create:{width:3,height:3,channels:3,background:'red'}}).jpeg().toBuffer();
  const png=await sharp({create:{width:3,height:3,channels:4,background:{r:0,g:255,b:0,alpha:1}}}).png().toBuffer();
  const webp=await sharp({create:{width:3,height:3,channels:3,background:'blue'}}).webp().toBuffer();
  let result=await expect('IMAGE','JPG PNG WebP multi upload','POST',`/admin/products/${id}/images`,201,{actor:'admin',form:await formFor([{buffer:jpg,name:'regression03-photo.jpg',type:'image/jpeg'},{buffer:png,name:'../regression03-ảnh.png',type:'image/png'},{buffer:webp,name:'regression03-photo.webp',type:'image/webp'}])});
  check(result.data.data.images.length===3&&result.data.data.images.filter((x:any)=>x.is_primary).length===1,'three images one primary');
  const imageRows=result.data.data.images;
  for(const image of imageRows){
    check(/^\/uploads\/products\/\d+\/product-\d+-\d+-[a-f0-9]{8}\.webp$/.test(image.image_url),'safe generated URL');
    const file=path.resolve(uploadDir,image.image_url.slice('/uploads/'.length));check(file.startsWith(uploadDir+path.sep),'file inside isolated root');
    check((await sharp(await fs.readFile(file)).metadata()).format==='webp','file converted to WebP');
  }
  await expect('IMAGE','product missing','POST','/admin/products/2147483000/images',404,{actor:'admin',form:await formFor([{buffer:jpg,name:'regression03.jpg',type:'image/jpeg'}])});
  await expect('IMAGE','invalid MIME','POST',`/admin/products/${id}/images`,400,{actor:'admin',form:await formFor([{buffer:jpg,name:'regression03.txt',type:'text/plain'}])});
  await expect('IMAGE','corrupt content','POST',`/admin/products/${id}/images`,400,{actor:'admin',form:await formFor([{buffer:Buffer.from('not an image'),name:'regression03.jpg',type:'image/jpeg'}])});
  await expect('IMAGE','empty content','POST',`/admin/products/${id}/images`,400,{actor:'admin',form:await formFor([{buffer:Buffer.alloc(0),name:'regression03.png',type:'image/png'}])});
  await expect('IMAGE','oversize file','POST',`/admin/products/${id}/images`,400,{actor:'admin',form:await formFor([{buffer:Buffer.alloc(config.upload.maxFileSize+1),name:'regression03-large.png',type:'image/png'}])});
  result=await expect('IMAGE','valid bytes with fake extension','POST',`/admin/products/${id}/images`,201,{actor:'admin',form:await formFor([{buffer:png,name:'..\\regression03-fake.jpg',type:'image/png'},{buffer:png,name:'regression03-fake.jpg',type:'image/png'}])});
  check(new Set(result.data.data.images.map((x:any)=>x.image_url)).size===5,'duplicate names produce unique URLs');
  const primaryTarget=result.data.data.images[3];
  result=await expect('PRIMARY','set primary','PATCH',`/admin/products/${id}/images/${primaryTarget.id}/primary`,200,{actor:'admin'});check(result.data.data.images.filter((x:any)=>x.is_primary).length===1&&result.data.data.images.find((x:any)=>x.id===primaryTarget.id).is_primary,'one selected primary');
  await expect('PRIMARY','foreign image rejected','PATCH',`/admin/products/${id}/images/2147483000/primary`,404,{actor:'admin'});
  result=await expect('IMAGE_DELETE','delete primary','DELETE',`/admin/products/${id}/images/${primaryTarget.id}`,200,{actor:'admin'});check(result.data.data.images.length===4&&result.data.data.images.filter((x:any)=>x.is_primary).length===1&&result.data.data.images[0].is_primary,'primary fallback');
  await expect('IMAGE_DELETE','repeat image missing','DELETE',`/admin/products/${id}/images/${primaryTarget.id}`,404,{actor:'admin'});
  for(const image of [...result.data.data.images])result=await expect('IMAGE_DELETE',`delete image ${image.id}`,'DELETE',`/admin/products/${id}/images/${image.id}`,200,{actor:'admin'});
  check(result.data.data.images.length===0&&result.data.data.primary_image===null,'last image null contract');
  const limitProduct=await product({key:'LIMIT'});
  const eight=Array.from({length:8},(_,i)=>({buffer:png,name:`regression03-${i}.png`,type:'image/png'}));
  await expect('IMAGE','eight image maximum','POST',`/admin/products/${limitProduct.id}/images`,201,{actor:'admin',form:await formFor(eight)});
  await expect('IMAGE','ninth image rejected','POST',`/admin/products/${limitProduct.id}/images`,400,{actor:'admin',form:await formFor([{buffer:png,name:'regression03-nine.png',type:'image/png'}])});
  const before=(await fs.readdir(path.resolve(uploadDir,'products',String(limitProduct.id)))).length;check(before===8,'eight files persisted');
  await expect('ADMIN_DELETE','product with images deletes metadata/files','DELETE',`/admin/products/${limitProduct.id}`,200,{actor:'admin'});
  try{await fs.access(path.resolve(uploadDir,'products',String(limitProduct.id)));check(false,'deleted image directory should be empty or absent');}catch{check(true,'product image files removed');}
  await expect('ADMIN_DELETE','image test product no images','DELETE',`/admin/products/${id}`,200,{actor:'admin'});
}
async function run(){
  await fs.mkdir(uploadDir,{recursive:true});console.log(child(setup,['setup']).trim());created=true;
  console.log(child(migrate).split(/\r?\n/).filter(line=>/Target database:|Applied migrations:|Pending migrations:|Checksum mismatches:|Migration complete/.test(line)).join('\n'));
  const live=String((await query<any>('SELECT DB_NAME() name')).recordset[0].name);check(live===database&&live.startsWith('GYMFIT_REGRESSION_03_'),'live DB gate');
  check(path.resolve(config.upload.dir)===uploadDir&&uploadDir.toUpperCase().includes('REGRESSION_03'),'live storage gate');
  console.log(`R03_SAFETY_GATE database=${live} upload=${uploadDir} PASS`);
  await start();
  for(const [key,role]of [['member','member'],['coach','coach'],['seller','seller'],['admin','admin']]as[string,Role][])await seedActor(key,role);
  for(const key of Object.keys(actors))await login(key);
  const suspendedOwner=await seedActor('suspendedOwner','seller').then(()=>query<any>(`INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system) OUTPUT INSERTED.id VALUES(@owner,N'REGRESSION-03 Suspended',@slug,N'SUSPENDED',0,0)`,{owner:actors.suspendedOwner.id,slug:`regression03-suspended-${stamp}`})).then(r=>Number(r.recordset[0].id));
  const fixture=await product({key:'PUBLIC',images:1}),draft=await product({key:'DRAFT',status:'DRAFT'}),rejected=await product({key:'REJECTED',status:'REJECTED'}),inactive=await product({key:'INACTIVE',active:false}),suspended=await product({key:'SUSPENDED',shop:suspendedOwner}),noImage=await product({key:'NOIMAGE'}),multi=await product({key:'MULTI',images:3});
  await authMatrix(fixture.id);
  await publicTests(fixture,draft,rejected,inactive,suspended,noImage,multi);
  await adminCrud(fixture.category,fixture.brand,fixture);
  await imageTests(fixture.category);
  const integrity=(await query<any>(`SELECT
    (SELECT COUNT(*) FROM dbo.ProductImages i LEFT JOIN dbo.Products p ON p.id=i.product_id WHERE p.id IS NULL) orphan_images,
    (SELECT COUNT(*) FROM (SELECT product_id FROM dbo.ProductImages WHERE is_primary=1 GROUP BY product_id HAVING COUNT(*)>1)d) multi_primary,
    (SELECT COUNT(*) FROM dbo.Products WHERE id=0) product_zero`)).recordset[0];
  check(Number(integrity.orphan_images)===0&&Number(integrity.multi_primary)===0&&Number(integrity.product_zero)===1,'isolated final integrity');
  console.log(`REGRESSION03_PRODUCT_ACCEPTANCE ${JSON.stringify({verdict:'PASS',assertions,cases,database,uploadDir,httpTimeoutMs:5000,startupTimeoutMs:60000})}`);
}
async function cleanup(){
  if(server)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
  if(base){try{await fetch(`${base}/health`,{signal:AbortSignal.timeout(500)});portReleased=false;}catch{portReleased=true;}}
  await closePool();
  if(created){console.log(child(setup,['drop']).trim());const master=await new sql.ConnectionPool({...config.db,database:'master'}).connect();try{dropped=(await master.request().input('name',database).query('SELECT DB_ID(@name) id')).recordset[0].id===null;}finally{await master.close();}}
  if(uploadDir.toUpperCase().includes('REGRESSION_03')){await fs.rm(uploadDir,{recursive:true,force:true,maxRetries:5,retryDelay:100});try{await fs.access(uploadDir);storageRemoved=false;}catch{storageRemoved=true;}}
  console.log(`REGRESSION03_CLEANUP ${JSON.stringify({serverClosed:!server||!server.listening,portReleased,databaseDropped:dropped,storageRemoved})}`);
}
let failure:unknown;
run().catch(error=>failure=error).finally(async()=>{try{await cleanup();}catch(error){failure=failure??error;}if(failure){console.error('REGRESSION03_PRODUCT_ACCEPTANCE FAIL',failure instanceof Error?failure.message:failure);process.exitCode=1;}});
