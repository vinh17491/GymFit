import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';
import type { Server } from 'http';
import { config } from '../config/config';
import { closePool, query } from '../config/database';
import { stopOrderExpirationRunner } from '../modules/orders/order-expiration.runner';

if (process.env.SELLER001_ACCEPTANCE !== '1') throw new Error('SELLER001_ACCEPTANCE=1 is required');
const regression04=process.env.REGRESSION04_ACCEPTANCE==='1';
if (!(regression04?config.db.database.startsWith('GYMFIT_REGRESSION_04_'):config.db.database.startsWith('GYMFIT_DB_SELLER001_ACCEPTANCE_')) || config.db.database === 'GYMFIT_DB') {
  throw new Error('Refusing mutation outside a disposable SELLER-001 acceptance database');
}

type Role='member'|'coach'|'admin'|'seller';
type Account={id:number;email:string;password:string;role:Role;accessToken?:string;refreshToken?:string};
type AcceptanceResource={
  id:number;
  status:string;
  accessToken:string;
  refreshToken:string;
  reviewReason:string|null;
  history:Array<{toStatus:string}>;
  applicant:{role:string};
  items:Array<{id:number}>;
  user:{role:string};
  [key:string]:unknown;
};
const requestTimeoutMs=regression04?5_000:15_000;
const suiteTimeoutMs=regression04?60_000:300_000;
const testPort=Number(process.env.ACCEPTANCE_PORT||5511);
let base=`http://127.0.0.1:${testPort}/api`;
let server:Server|undefined;
const suiteAbort=new AbortController();
const stamp=Date.now();
const accounts:Record<string,Account>={};
let assertions=0;
let lastStatus=0;
const check=(condition:boolean,message:string)=>{assertions++;if(!condition)throw new Error(`${message}; last HTTP status=${lastStatus}`);};
const secret=()=>`Aa1!${crypto.randomBytes(18).toString('base64url')}`;

async function call(method:string,path:string,key?:string,body?:unknown){
  const label=`${method} ${path}`;
  console.log(`[REQUEST START] ${label}`);
  const requestAbort=new AbortController();
  const timeout=setTimeout(()=>requestAbort.abort(new Error(`Request timed out after ${requestTimeoutMs}ms`)),requestTimeoutMs);
  timeout.unref();
  const abortFromSuite=()=>requestAbort.abort(suiteAbort.signal.reason);
  suiteAbort.signal.addEventListener('abort',abortFromSuite,{once:true});
  try{
    const response=await fetch(base+path,{method,signal:requestAbort.signal,headers:{'content-type':'application/json',...(key&&accounts[key].accessToken?{authorization:`Bearer ${accounts[key].accessToken}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    lastStatus=response.status;
    let data:unknown=null;
    try{data=await response.json();}catch{}
    console.log(`[REQUEST END] ${label} status=${response.status}`);
    return {status:response.status,data:data as {data:AcceptanceResource;message?:string}};
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    console.error(`[REQUEST FAIL] ${label}: ${message}`);
    throw new Error(`${label} failed: ${message}`);
  }finally{
    clearTimeout(timeout);
    suiteAbort.signal.removeEventListener('abort',abortFromSuite);
  }
}
async function expect(method:string,path:string,key:string|undefined,status:number,body?:unknown){
  const result=await call(method,path,key,body);
  check(result.status===status,`${method} ${path} expected ${status}, got ${result.status}`);
  console.log(`[TEST PASS] ${method} ${path} expected=${status}`);
  return result;
}
async function seed(key:string,role:Role,active=true){
  const email=`seller001-${key}-${stamp}@example.test`,password=secret(),hash=await bcrypt.hash(password,12);
  const result=await query<{id:number}>(`INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version)
    OUTPUT INSERTED.id VALUES(@email,@hash,@name,@role,@active,0,0)`,{email,hash,name:`SELLER001 ${key}`,role,active});
  accounts[key]={id:Number(result.recordset[0].id),email,password,role};
}
async function login(key:string){
  const response=await call('POST','/auth/login',undefined,{email:accounts[key].email,password:accounts[key].password});
  check(response.status===200,`${key} login`);
  accounts[key].accessToken=String(response.data.data.accessToken);
  accounts[key].refreshToken=String(response.data.data.refreshToken);
  return response;
}

const completeApplication={
  businessName:'Acceptance Sports Store',businessType:'SPORTS_STORE',contactName:'Acceptance Contact',
  contactEmail:`contact-${stamp}@example.test`,contactPhone:'+84901234567',
  businessAddress:'1 Acceptance Street, Ho Chi Minh City',pickupAddress:'2 Pickup Street, Ho Chi Minh City',
  taxCode:'TEST-TAX',websiteUrl:'https://example.test',socialUrl:'https://example.test/social',
  description:'Disposable SELLER-001 acceptance fixture.',
};

async function main(){
  for(const [key,role] of [['admin','admin'],['memberA','member'],['memberB','member'],['memberWithdraw','member'],['memberDraft','member'],['memberInactive','member'],['memberRate','member'],['coach','coach'],['seller','seller']] as Array<[string,Role]>)await seed(key,role);
  for(const key of Object.keys(accounts))await login(key);

  let result=await expect('POST','/seller-applications','memberA',201,{businessName:'Draft business',contactEmail:completeApplication.contactEmail});
  const applicationId=Number(result.data.data.id);
  check(result.data.data.status==='DRAFT','create produces DRAFT');
  check(result.data.data.history.length===1&&result.data.data.history[0].toStatus==='DRAFT','DRAFT history recorded');
  result=await expect('GET','/seller-applications/me','memberA',200);
  check(Number(result.data.data.id)===applicationId,'GET me returns owner application');
  result=await expect('GET',`/seller-applications/me?user_id=${accounts.memberA.id}`,'memberB',404);
  check(result.status===404,'user_id query cannot select another application');
  await expect('PATCH','/seller-applications/me','memberB',400,{userId:accounts.memberA.id,businessName:'IDOR'});
  await expect('POST','/seller-applications','memberA',409,completeApplication);
  result=await expect('GET','/admin/seller-applications','admin',200);
  check(!result.data.data.items.some((item:{id:number})=>item.id===applicationId),'DRAFT excluded from default Admin inbox');
  await expect('POST',`/admin/seller-applications/${applicationId}/approve`,'admin',409);
  await expect('PATCH','/seller-applications/me','memberA',200,completeApplication);
  result=await expect('POST','/seller-applications/me/submit','memberA',200);
  check(result.data.data.status==='PENDING','submit produces PENDING');
  await expect('PATCH','/seller-applications/me','memberA',409,{businessName:'Blocked'});
  await expect('POST','/seller-applications/me/submit','memberA',409);
  result=await expect('GET','/admin/seller-applications','admin',200);
  check(result.data.data.items.some((item:{id:number})=>item.id===applicationId),'PENDING appears in default Admin inbox');
  await expect('POST',`/admin/seller-applications/${applicationId}/approve`,'memberB',403);
  await expect('POST',`/admin/seller-applications/${applicationId}/reject`,'admin',400,{});
  result=await expect('POST',`/admin/seller-applications/${applicationId}/reject`,'admin',200,{reason:'Please clarify pickup operations'});
  check(result.data.data.status==='REJECTED'&&Boolean(result.data.data.reviewReason),'reject records reason');
  result=await expect('PATCH','/seller-applications/me','memberA',200,{pickupAddress:'Updated pickup address'});
  check(Number(result.data.data.id)===applicationId,'rejected edit reuses application ID');
  result=await expect('POST','/seller-applications/me/submit','memberA',200);
  check(Number(result.data.data.id)===applicationId&&result.data.data.status==='PENDING','resubmit reuses application ID');
  const before=await query<{token_version:number}>('SELECT token_version FROM dbo.Users WHERE id=@id',{id:accounts.memberA.id});
  check(Number((await query('SELECT COUNT(*) count FROM dbo.AuthSessions WHERE user_id=@id AND revoked_at IS NULL',{id:accounts.memberA.id})).recordset[0].count)>0,'applicant has active session before approval');
  result=await expect('POST',`/admin/seller-applications/${applicationId}/approve`,'admin',200);
  check(result.data.data.status==='APPROVED'&&result.data.data.applicant.role==='seller','approval returns Seller role');
  const after=await query<{role:string;token_version:number}>('SELECT role,token_version FROM dbo.Users WHERE id=@id',{id:accounts.memberA.id});
  check(after.recordset[0].role==='seller','approval updates role');
  check(Number(after.recordset[0].token_version)===Number(before.recordset[0].token_version)+1,'approval increments token_version');
  check(Number((await query('SELECT COUNT(*) count FROM dbo.AuthSessions WHERE user_id=@id AND revoked_at IS NULL',{id:accounts.memberA.id})).recordset[0].count)===0,'approval revokes active AuthSessions');
  await expect('GET','/auth/me','memberA',401);
  await expect('POST',`/admin/seller-applications/${applicationId}/approve`,'admin',409);
  result=await login('memberA');
  check(result.data.data.user.role==='seller','fresh login returns Seller');
  await expect('GET','/seller-applications/me','memberA',200);
  await expect('POST','/seller-applications','memberA',403,completeApplication);
  const history=(await query<{from_status:string|null;to_status:string;reason:string|null}>('SELECT from_status,to_status,reason FROM dbo.SellerApplicationStatusHistory WHERE seller_application_id=@id ORDER BY created_at,id',{id:applicationId})).recordset;
  check(history.map(item=>`${item.from_status??'NULL'}>${item.to_status}`).join(',')==='NULL>DRAFT,DRAFT>PENDING,PENDING>REJECTED,REJECTED>PENDING,PENDING>APPROVED','status history order');
  check(history[2].reason==='Please clarify pickup operations','old rejection reason retained in history');

  for(const key of ['coach','admin','seller'])await expect('POST','/seller-applications',key,403,completeApplication);

  result=await expect('POST','/seller-applications','memberWithdraw',201,completeApplication);
  const withdrawId=Number(result.data.data.id);
  await expect('POST','/seller-applications/me/submit','memberWithdraw',200);
  result=await expect('POST','/seller-applications/me/withdraw','memberWithdraw',200);
  check(result.data.data.status==='WITHDRAWN','pending may be withdrawn');
  await expect('PATCH','/seller-applications/me','memberWithdraw',200,{businessName:'Withdrawn edited'});
  result=await expect('POST','/seller-applications/me/submit','memberWithdraw',200);
  check(Number(result.data.data.id)===withdrawId&&result.data.data.status==='PENDING','withdrawn resubmit reuses ID');
  await expect('POST','/seller-applications/me/withdraw','memberA',403);

  result=await expect('POST','/seller-applications','memberDraft',201,completeApplication);
  await expect('POST',`/admin/seller-applications/${Number(result.data.data.id)}/reject`,'admin',409,{reason:'Draft review forbidden'});

  result=await expect('POST','/seller-applications','memberInactive',201,completeApplication);
  const inactiveApplicationId=Number(result.data.data.id);
  await expect('POST','/seller-applications/me/submit','memberInactive',200);
  await query('UPDATE dbo.Users SET is_active=0 WHERE id=@id',{id:accounts.memberInactive.id});
  await expect('POST',`/admin/seller-applications/${inactiveApplicationId}/approve`,'admin',409);

  await expect('POST','/seller-applications','memberRate',201,completeApplication);
  const submitStatuses:number[]=[];
  for(let index=0;index<6;index++)submitStatuses.push((await call('POST','/seller-applications/me/submit','memberRate')).status);
  check(submitStatuses[0]===200&&submitStatuses[5]===429,'submit rate limit enforced at sixth request');

  const database=await query(`SELECT
    (SELECT COUNT(*) FROM dbo.SellerApplications) applications,
    (SELECT COUNT(*) FROM dbo.SellerApplicationStatusHistory) history,
    (SELECT COUNT(*) FROM dbo.Shops WHERE owner_user_id=@userId AND status=N'ACTIVE' AND is_verified=0) approved_seller_shops`,{userId:accounts.memberA.id});
  check(Number(database.recordset[0].approved_seller_shops)===1,'approval creates exactly one ACTIVE unverified owned Shop');
  const browserFixturePath=process.env.SELLER001_BROWSER_FIXTURE_PATH;
  if(browserFixturePath){
    await fs.writeFile(browserFixturePath,JSON.stringify({
      database:config.db.database,
      accounts:{
        admin:{email:accounts.admin.email,password:accounts.admin.password},
        memberDraft:{email:accounts.memberDraft.email,password:accounts.memberDraft.password},
        approvedSeller:{email:accounts.memberA.email,password:accounts.memberA.password},
      },
    }),{encoding:'utf8',mode:0o600});
    console.log(`[BROWSER FIXTURE] written=${browserFixturePath}`);
  }
}

async function startOwnedServer(){
  const {default:app}=await import('../app');
  server=app.listen(testPort,'127.0.0.1');
  await new Promise<void>((resolve,reject)=>{
    const onListening=()=>{server?.off('error',onError);resolve();};
    const onError=(error:Error)=>{server?.off('listening',onListening);reject(error);};
    server?.once('listening',onListening);
    server?.once('error',onError);
  });
  base=`http://127.0.0.1:${testPort}/api`;
  if(regression04){
    let healthy=false,lastError='no response';
    for(let attempt=1;attempt<=20&&!healthy;attempt++){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2000);
      try{const response=await fetch(`${base}/health`,{signal:controller.signal});healthy=response.ok;lastError=`HTTP ${response.status}`;}
      catch(error){lastError=error instanceof Error?error.message:String(error);}
      finally{clearTimeout(timer);}
      if(!healthy)await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(!healthy)throw new Error(`Runtime health failed after finite polling: ${lastError}`);
  }
  console.log(`[SERVER READY] ${base} database=${config.db.database}`);
}

async function stopOwnedServer(){
  if(!server)return;
  server.closeAllConnections();
  await new Promise<void>(resolve=>server?.close(()=>resolve()));
  server=undefined;
  console.log('[CLEANUP] HTTP listener closed');
}

async function run():Promise<number>{
  const startedAt=Date.now();
  let timeout:NodeJS.Timeout|undefined;
  try{
    await startOwnedServer();
    const timeoutPromise=new Promise<never>((_,reject)=>{
      timeout=setTimeout(()=>{
        const error=new Error(`Suite timed out after ${suiteTimeoutMs}ms`);
        suiteAbort.abort(error);
        reject(error);
      },suiteTimeoutMs);
      timeout.unref();
    });
    await Promise.race([main(),timeoutPromise]);
    console.log(JSON.stringify({verdict:'SELLER_001_API_ACCEPTANCE_PASS',assertions,database:config.db.database,durationMs:Date.now()-startedAt}));
    return 0;
  }catch(error){
    console.error(`[SUITE FAIL] ${error instanceof Error?error.message:String(error)}`);
    return 1;
  }finally{
    if(timeout)clearTimeout(timeout);
    suiteAbort.abort(new Error('Suite cleanup'));
    stopOrderExpirationRunner();
    try{await stopOwnedServer();}catch(error){console.error(`[CLEANUP FAIL] HTTP listener: ${error instanceof Error?error.message:String(error)}`);}
    try{await closePool();console.log('[CLEANUP] SQL pool closed');}catch(error){console.error(`[CLEANUP FAIL] SQL pool: ${error instanceof Error?error.message:String(error)}`);}
    console.log(`[SUITE END] durationMs=${Date.now()-startedAt}`);
  }
}

void run().then(code=>process.exit(code));
