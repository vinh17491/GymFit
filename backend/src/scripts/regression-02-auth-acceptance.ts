import crypto from 'crypto';
import path from 'path';
import { execFileSync } from 'child_process';
import type { Server } from 'http';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as sql from 'mssql';
import { config } from '../config/config';
import { closePool, query } from '../config/database';

if (process.env.REGRESSION02_ACCEPTANCE !== '1') throw new Error('REGRESSION02_ACCEPTANCE=1 is required');
process.env.SELLER_APPLICATION_WRITE_RATE_LIMIT_MAX='1';
process.env.SELLER_APPLICATION_WRITE_RATE_LIMIT_WINDOW_MS='60000';
process.env.BRAND_REQUEST_RATE_LIMIT_MAX='1';
process.env.BRAND_REQUEST_RATE_LIMIT_WINDOW_MS='60000';
const database = config.db.database;
if (!database.startsWith('GYMFIT_REGRESSION_02_') || !/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error('Refusing mutation outside GYMFIT_REGRESSION_02_*');
}

type Role = 'member'|'coach'|'seller'|'admin';
type Account = {id:number;email:string;password:string;role:Role;accessToken?:string;refreshToken?:string;sessionId?:number;tokenVersion?:number};
type ApiResult = {status:number;data:any};
const accounts:Record<string,Account> = {};
const stamp = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const tsxCli = path.resolve(process.cwd(),'node_modules','tsx','dist','cli.mjs');
const setupScript = path.resolve(process.cwd(),'src','scripts','seller-002-acceptance-db.ts');
const migrateScript = path.resolve(process.cwd(),'src','scripts','migrate.ts');
let server:Server|undefined;
let base = '';
let assertions = 0;
let runtimeDeadline = 0;
let databaseCreated = false;
let databaseDropped = false;
let portReleased = false;

function check(condition:unknown,label:string) {
  assertions++;
  if (!condition) throw new Error(`Assertion failed: ${label}`);
}
function report(group:string,test:string,expected:string,actual:string) {
  console.log(`R02_CASE ${group}|${test}|${expected}|${actual}|PASS`);
}
function child(script:string,args:string[] = []) {
  return execFileSync(process.execPath,[tsxCli,script,...args],{
    cwd:process.cwd(),env:process.env,encoding:'utf8',timeout:120000,windowsHide:true,
  });
}
async function api(method:string,url:string,options:{token?:string;rawAuthorization?:string;body?:unknown}={}):Promise<ApiResult> {
  if (Date.now()>runtimeDeadline) throw new Error('Runtime API deadline exceeded');
  const headers:Record<string,string>={};
  if (options.body!==undefined) headers['content-type']='application/json';
  if (options.rawAuthorization!==undefined) headers.authorization=options.rawAuthorization;
  else if (options.token) headers.authorization=`Bearer ${options.token}`;
  const response=await fetch(`${base}${url}`,{
    method,headers,body:options.body===undefined?undefined:JSON.stringify(options.body),signal:AbortSignal.timeout(5000),
  });
  let data:any=null;try{data=await response.json();}catch{}
  return {status:response.status,data};
}
async function expect(group:string,test:string,method:string,url:string,status:number,options:{token?:string;rawAuthorization?:string;body?:unknown}={}) {
  const result=await api(method,url,options);
  if(result.status>=500&&status<500)throw new Error(`Unexpected ${result.status} from ${method} ${url}`);
  check(result.status===status,`${test}: expected ${status}, got ${result.status}`);
  report(group,test,String(status),String(result.status));
  return result;
}
async function seed(key:string,role:Role,active=true) {
  const password=`Aa1!${crypto.randomBytes(16).toString('base64url')}`;
  const hash=await bcrypt.hash(password,12);
  const email=`regression-02-${key}-${stamp}@example.test`;
  const result=await query<{id:number}>(`INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version)
    OUTPUT INSERTED.id VALUES(@email,@hash,@name,@role,@active,1,0)`,
  {email,hash,name:`REGRESSION-02 ${key}`,role,active});
  accounts[key]={id:Number(result.recordset[0].id),email,password,role};
}
async function login(key:string) {
  const account=accounts[key];
  const result=await expect('LOGIN',`${key} valid login`,'POST','/auth/login',200,{body:{email:account.email,password:account.password}});
  account.accessToken=String(result.data.data.accessToken);
  account.refreshToken=String(result.data.data.refreshToken);
  const claims=jwt.decode(account.accessToken) as jwt.JwtPayload;
  account.sessionId=Number(claims.sessionId);account.tokenVersion=Number(claims.tokenVersion);
  check(claims.userId===account.id&&claims.role===roleClaim(account.role),'login token identity and role claims');
}
const roleClaim=(role:Role)=>role;
function sign(account:Account,overrides:Record<string,unknown>,options:jwt.SignOptions={}) {
  return jwt.sign({
    userId:account.id,email:account.email,role:account.role,tokenVersion:account.tokenVersion,sessionId:account.sessionId,...overrides,
  },config.jwt.accessSecret,{algorithm:'HS256',issuer:config.jwt.issuer,audience:config.jwt.audience,expiresIn:'15m',...options});
}
async function startRuntime() {
  const started=Date.now();
  const app=(await import('../app')).default;
  server=await new Promise<Server>((resolve,reject)=>{
    const candidate=app.listen(0,'127.0.0.1',()=>resolve(candidate));
    candidate.once('error',reject);
  });
  const address=server.address();
  if(!address||typeof address==='string')throw new Error('Runtime did not expose a TCP port');
  base=`http://127.0.0.1:${address.port}/api`;
  let healthy=false;
  for(let attempt=1;attempt<=20&&Date.now()-started<60000;attempt++){
    try{
      const response=await fetch(`${base}/health`,{signal:AbortSignal.timeout(2000)});
      if(response.status===200){healthy=true;report('RUNTIME','health polling','200',`${response.status} attempt ${attempt}`);break;}
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  check(healthy,'backend healthy within 60 seconds');
  runtimeDeadline=Date.now()+60000;
}

async function registrationTests() {
  const password=`Aa1!${crypto.randomBytes(14).toString('base64url')}`;
  const email=`regression-02-register-${stamp}@example.test`;
  const result=await expect('REGISTRATION','valid registration','POST','/auth/register',201,{body:{email,password,name:'Regression User',phone:'+84901234567'}});
  const registered=result.data.data.user;
  check(!/password|token_version|refresh_token_hash/i.test(JSON.stringify(registered)),'registration filters internal fields');
  report('REGISTRATION','sensitive response filtering','no internal fields','filtered');
  const stored=(await query<{email:string;password:string;role:string;is_active:boolean;email_verified:boolean}>('SELECT email,password,role,is_active,email_verified FROM dbo.Users WHERE id=@id',{id:registered.id})).recordset[0];
  check(stored.email===email&&stored.password!==password&&await bcrypt.compare(password,stored.password),'normalized email and bcrypt hash persisted');
  check(stored.role==='member'&&stored.is_active&&!stored.email_verified,'default role and status');
  report('REGISTRATION','password/default persistence','bcrypt/member/active/unverified','matched');
  await expect('REGISTRATION','missing email','POST','/auth/register',400,{body:{password,name:'Missing Email'}});
  await expect('REGISTRATION','invalid email','POST','/auth/register',400,{body:{email:'invalid',password,name:'Invalid Email'}});
  await expect('REGISTRATION','normalized duplicate','POST','/auth/register',409,{body:{email:`  ${email.toUpperCase()}  `,password,name:'Duplicate User'}});
  await expect('REGISTRATION','missing password','POST','/auth/register',400,{body:{email:`missing-password-${stamp}@example.test`,name:'Missing Password'}});
  await expect('REGISTRATION','short password','POST','/auth/register',400,{body:{email:`short-${stamp}@example.test`,password:'Aa1short',name:'Short Password'}});
  await expect('REGISTRATION','password over 128','POST','/auth/register',400,{body:{email:`long-password-${stamp}@example.test`,password:`Aa1${'x'.repeat(126)}`,name:'Long Password'}});
  await expect('REGISTRATION','missing name','POST','/auth/register',400,{body:{email:`missing-name-${stamp}@example.test`,password}});
  await expect('REGISTRATION','name over 100','POST','/auth/register',400,{body:{email:`long-name-${stamp}@example.test`,password,name:'x'.repeat(101)}});
  for(const [field,value] of [['role','admin'],['role','seller'],['status','active'],['isAdmin',true],['permission','all'],['unknown','value']] as Array<[string,unknown]>){
    await expect('REGISTRATION',`reject client field ${field}=${String(value)}`,'POST','/auth/register',400,{body:{email:`field-${field}-${String(value)}-${stamp}@example.test`,password,name:'Mass Assignment',[field]:value}});
  }
  const concurrentEmail=`regression-02-concurrent-${stamp}@example.test`;
  const concurrent=await Promise.all([api('POST','/auth/register',{body:{email:concurrentEmail,password,name:'Concurrent One'}}),api('POST','/auth/register',{body:{email:concurrentEmail,password,name:'Concurrent Two'}})]);
  const statuses=concurrent.map(item=>item.status).sort((a,b)=>a-b);
  check(statuses[0]===201&&statuses[1]===409,'concurrent duplicate registration has one winner');
  report('REGISTRATION','concurrent duplicate','201 + 409',statuses.join(' + '));
  const rollbackEmail=`regression-02-rollback-${stamp}@example.test`;
  await query(`CREATE TRIGGER dbo.TR_REGRESSION02_AuthSessionFail ON dbo.AuthSessions AFTER INSERT AS
    IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Users u ON u.id=i.user_id WHERE u.email=N'${rollbackEmail}')
    THROW 51998,'forced registration session failure',1`);
  try{
    const failed=await expect('REGISTRATION','session failure returns sanitized error','POST','/auth/register',500,{body:{email:rollbackEmail,password,name:'Rollback User'}});
    check(!/51998|forced registration|trigger|stack|insert/i.test(JSON.stringify(failed.data)),'forced registration error details are hidden');
  }finally{await query('DROP TRIGGER IF EXISTS dbo.TR_REGRESSION02_AuthSessionFail');}
  const rollbackCount=Number((await query('SELECT COUNT(*) count FROM dbo.Users WHERE email=@email',{email:rollbackEmail})).recordset[0].count);
  check(rollbackCount===0,'registration transaction rolls back user when session creation fails');
  report('REGISTRATION','session failure atomic rollback','zero user records',String(rollbackCount));
}

async function loginTests() {
  await login('memberA');
  const result=await expect('LOGIN','case and whitespace normalization','POST','/auth/login',200,{body:{email:`  ${accounts.memberA.email.toUpperCase()} `,password:accounts.memberA.password}});
  check(!/password|token_version|refresh_token_hash/i.test(JSON.stringify(result.data.data.user)),'login filters internal fields');
  report('LOGIN','sensitive response filtering','no internal fields','filtered');
  const wrong=await expect('LOGIN','wrong password','POST','/auth/login',401,{body:{email:accounts.memberA.email,password:'WrongPassword1'}});
  const missing=await expect('LOGIN','unknown user','POST','/auth/login',401,{body:{email:`missing-${stamp}@example.test`,password:'WrongPassword1'}});
  check(wrong.data.message===missing.data.message,'generic credential error prevents enumeration');
  await expect('LOGIN','missing email','POST','/auth/login',400,{body:{password:accounts.memberA.password}});
  await expect('LOGIN','missing password','POST','/auth/login',400,{body:{email:accounts.memberA.email}});
  await expect('LOGIN','invalid payload type','POST','/auth/login',400,{body:{email:123,password:true}});
  await expect('LOGIN','unknown property','POST','/auth/login',400,{body:{email:accounts.memberA.email,password:accounts.memberA.password,role:'admin'}});
  await expect('LOGIN','inactive account','POST','/auth/login',401,{body:{email:accounts.inactive.email,password:accounts.inactive.password}});
  const decoded=jwt.decode(String(result.data.data.accessToken)) as jwt.JwtPayload;
  check(decoded.userId===accounts.memberA.id&&decoded.role==='member'&&typeof decoded.exp==='number'&&typeof decoded.iat==='number','access token claims');
  check(decoded.iss===config.jwt.issuer&&decoded.aud===config.jwt.audience&&Number(decoded.exp)-Number(decoded.iat)===15*60,'access token issuer audience expiry');
  report('LOGIN','token claims and expiry','userId/role/iss/aud/15m','matched');
  const concurrent=await Promise.all([api('POST','/auth/login',{body:{email:accounts.memberA.email,password:accounts.memberA.password}}),api('POST','/auth/login',{body:{email:accounts.memberA.email,password:accounts.memberA.password}})]);
  check(concurrent.every(item=>item.status===200),'concurrent login supports multiple sessions');
  report('LOGIN','concurrent sessions','200 + 200',concurrent.map(item=>item.status).join(' + '));
}

async function tokenTests() {
  const account=accounts.memberA;
  await expect('TOKEN','missing token','GET','/auth/me',401);
  await expect('TOKEN','wrong header scheme','GET','/auth/me',401,{rawAuthorization:`Basic ${account.accessToken}`});
  await expect('TOKEN','empty bearer','GET','/auth/me',401,{rawAuthorization:'Bearer '});
  await expect('TOKEN','random token','GET','/auth/me',401,{rawAuthorization:'Bearer random-token'});
  const badSignature=jwt.sign({userId:account.id,sessionId:account.sessionId,tokenVersion:account.tokenVersion},'different-secret',{expiresIn:'15m'});
  await expect('TOKEN','wrong signature','GET','/auth/me',401,{token:badSignature});
  const decoded=jwt.decode(account.accessToken!) as jwt.JwtPayload;
  const parts=account.accessToken!.split('.');parts[1]=Buffer.from(JSON.stringify({...decoded,role:'admin'})).toString('base64url');
  await expect('TOKEN','tampered payload','GET','/auth/me',401,{token:parts.join('.')});
  await expect('TOKEN','expired token','GET','/auth/me',401,{token:sign(account,{}, {expiresIn:-1})});
  await expect('TOKEN','future nbf','GET','/auth/me',401,{token:sign(account,{nbf:Math.floor(Date.now()/1000)+120})});
  await expect('TOKEN','nonexistent user','GET','/auth/me',401,{token:sign(account,{userId:2147483000})});
  const fakeRole=sign(account,{role:'admin'});
  await expect('TOKEN','fake role claim uses database role','GET','/admin/brand-requests',403,{token:fakeRole});
  await expect('TOKEN','valid token','GET','/auth/me',200,{token:account.accessToken});
  const changed=accounts.roleChanged;
  await expect('TOKEN','admin changes account role','PATCH',`/users/${changed.id}/security`,200,{token:accounts.admin.accessToken,body:{role:'member'}});
  const roleAudit=Number((await query("SELECT COUNT(*) count FROM dbo.AuditLogs WHERE user_id=@actor AND action=N'user.security_updated' AND entity_type=N'User' AND entity_id=@target",{actor:accounts.admin.id,target:changed.id})).recordset[0].count);
  check(roleAudit===1,'role mutation audit persisted');
  await expect('TOKEN','stale role access invalidated','GET','/admin/brand-requests',401,{token:changed.accessToken});
  await expect('TOKEN','stale role refresh invalidated','POST','/auth/refresh',401,{body:{refreshToken:changed.refreshToken}});
  const disabled=accounts.disabled;
  await expect('TOKEN','disabled token initially valid','GET','/auth/me',200,{token:disabled.accessToken});
  await query('UPDATE dbo.Users SET is_active=0 WHERE id=@id',{id:disabled.id});
  await expect('TOKEN','disabled after issuance','GET','/auth/me',401,{token:disabled.accessToken});
}

async function refreshLogoutTests() {
  const account=accounts.refresh;
  const old=account.refreshToken!;
  const result=await expect('REFRESH','valid refresh rotation','POST','/auth/refresh',200,{body:{refreshToken:old}});
  const rotated=String(result.data.data.refreshToken);
  check(rotated!==old&&!/token_version|refresh_token_hash|password/i.test(JSON.stringify(result.data.data.user)),'refresh rotates and filters user');
  await expect('REFRESH','missing refresh token','POST','/auth/refresh',400,{body:{}});
  await expect('REFRESH','invalid refresh token','POST','/auth/refresh',401,{body:{refreshToken:'x'.repeat(64)}});
  await expect('REFRESH','old token replay','POST','/auth/refresh',401,{body:{refreshToken:old}});
  await expect('REFRESH','rotated family revoked after replay','POST','/auth/refresh',401,{body:{refreshToken:rotated}});
  await login('refresh');
  await query('UPDATE dbo.AuthSessions SET expires_at=DATEADD(second,-1,SYSUTCDATETIME()) WHERE id=@id',{id:accounts.refresh.sessionId});
  await expect('REFRESH','expired refresh token','POST','/auth/refresh',401,{body:{refreshToken:accounts.refresh.refreshToken}});
  await login('logout');
  const access=accounts.logout.accessToken!,refresh=accounts.logout.refreshToken!;
  await expect('LOGOUT','valid logout','POST','/auth/logout',200,{token:access});
  await expect('LOGOUT','access token after logout','GET','/auth/me',401,{token:access});
  await expect('LOGOUT','refresh token after logout','POST','/auth/refresh',401,{body:{refreshToken:refresh}});
  await expect('LOGOUT','repeated logout with revoked access','POST','/auth/logout',401,{token:access});
  await expect('LOGOUT','logout without token','POST','/auth/logout',401);
}

async function roleAndOwnershipTests() {
  const actors:Array<[string,number,number,number,number]>=[
    ['/auth/me',200,200,200,200],
    ['/videos',403,200,403,200],
    ['/seller/brand-requests',403,403,200,403],
    ['/admin/brand-requests',403,403,403,200],
  ];
  await expect('ROLE','public endpoint anonymous','GET','/videos/public',200);
  for(const [url,member,coach,seller,admin] of actors){
    await expect('ROLE',`${url} anonymous`,'GET',url,401);
    for(const [key,status] of [['memberA',member],['coach',coach],['sellerA',seller],['admin',admin]] as Array<[string,number]>){
      await expect('ROLE',`${url} ${accounts[key].role}`,'GET',url,status,{token:accounts[key].accessToken});
    }
  }
  await expect('ROLE','body role cannot elevate member','POST','/seller/brand-requests',403,{token:accounts.memberA.accessToken,body:{requestedName:'Body Escalation',role:'seller'}});
  const created=await expect('OWNERSHIP','seller B creates owned request','POST','/seller/brand-requests',201,{token:accounts.sellerB.accessToken,body:{requestedName:`Regression Brand ${stamp}`}});
  const requestId=Number(created.data.data.id);
  await expect('OWNERSHIP','owner reads request','GET',`/seller/brand-requests/${requestId}`,200,{token:accounts.sellerB.accessToken});
  await expect('OWNERSHIP','non-owner cannot read request','GET',`/seller/brand-requests/${requestId}`,404,{token:accounts.sellerA.accessToken});
  await expect('OWNERSHIP','nonexistent request concealed','GET','/seller/brand-requests/2147483000',404,{token:accounts.sellerA.accessToken});
  await expect('OWNERSHIP','sellerId body rejected','POST','/seller/brand-requests',400,{token:accounts.sellerA.accessToken,body:{requestedName:`Spoof ${stamp}`,sellerId:accounts.sellerB.id}});
  await expect('RATE_LIMIT','brand request limit','POST','/seller/brand-requests',429,{token:accounts.sellerB.accessToken,body:{requestedName:`Regression Brand Retry ${stamp}`}});
  const application={businessName:'Rate Limit Shop',businessType:'SPORTS_STORE',contactName:'Rate Tester',contactEmail:`rate-${stamp}@example.test`,contactPhone:'+84901234567',businessAddress:'Acceptance Address',pickupAddress:'Acceptance Pickup',description:'Acceptance rate limit fixture'};
  await expect('RATE_LIMIT','seller application first write','POST','/seller-applications',201,{token:accounts.memberA.accessToken,body:application});
  await expect('RATE_LIMIT','seller application write limit','POST','/seller-applications',429,{token:accounts.memberA.accessToken,body:{...application,businessName:'Payload Changed'}});
  const shopA=await expect('OWNERSHIP','seller reads own shop','GET','/seller/shop',200,{token:accounts.sellerA.accessToken});
  check(Number(shopA.data.data.ownerUserId)===accounts.sellerA.id,'seller shop is derived from principal');
  await expect('OWNERSHIP','URL cannot select another seller shop','GET',`/seller/shop/${accounts.sellerB.id}`,404,{token:accounts.sellerA.accessToken});
  const ownUsers=await expect('OWNERSHIP','member user list scoped to self','GET','/users',200,{token:accounts.memberA.accessToken});
  check(ownUsers.data.data.items.length===1&&Number(ownUsers.data.data.items[0].id)===accounts.memberA.id,'member cannot enumerate other users');
  const principal=await expect('OWNERSHIP','current user ignores query identity','GET',`/auth/me?userId=${accounts.sellerB.id}`,200,{token:accounts.memberA.accessToken});
  check(Number(principal.data.data.id)===accounts.memberA.id,'current user is derived from authenticated principal');
}

async function run() {
  console.log(child(setupScript,['setup']).trim());
  databaseCreated=true;
  console.log(child(migrateScript).split(/\r?\n/).filter(line=>/Target database:|Applied migrations:|Pending migrations:|Checksum mismatches:|Migration complete/.test(line)).join('\n'));
  const migrationCount=Number((await query('SELECT COUNT(*) count FROM dbo.SchemaMigrations')).recordset[0].count);
  check(migrationCount>=18,'all current migrations applied to isolated database');
  console.log(`REGRESSION02_MIGRATIONS ${migrationCount} PASS`);
  const live=(await query<{database_name:string}>('SELECT DB_NAME() database_name')).recordset[0].database_name;
  check(live===database&&live.startsWith('GYMFIT_REGRESSION_02_'),'live DB_NAME prefix gate before fixture writes');
  console.log(`REGRESSION02_DB_GATE ${live} PASS`);
  await startRuntime();
  for(const [key,role,active] of [['memberA','member',true],['coach','coach',true],['sellerA','seller',true],['sellerB','seller',true],['admin','admin',true],['roleChanged','admin',true],['inactive','member',false],['disabled','member',true],['refresh','member',true],['logout','member',true]] as Array<[string,Role,boolean]>)await seed(key,role,active);
  await query(`INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system) VALUES
    (@a,N'REGRESSION-02 Seller A',@slugA,N'ACTIVE',1,0),
    (@b,N'REGRESSION-02 Seller B',@slugB,N'ACTIVE',1,0)`,
  {a:accounts.sellerA.id,b:accounts.sellerB.id,slugA:`regression-02-a-${stamp}`,slugB:`regression-02-b-${stamp}`});
  for(const key of ['coach','sellerA','sellerB','admin','roleChanged','disabled','refresh'])await login(key);
  await registrationTests();
  await loginTests();
  await tokenTests();
  await refreshLogoutTests();
  await roleAndOwnershipTests();
  process.env.REGRESSION02_AUTH_LIMIT_MAX='1';
  try{
    await expect('LOGIN','auth rate limit enforcement','POST','/auth/login',429,{body:{email:`rate-limit-${stamp}@example.test`,password:'WrongPassword1'}});
  }finally{delete process.env.REGRESSION02_AUTH_LIMIT_MAX;}
  console.log(`REGRESSION02_AUTH_ACCEPTANCE ${JSON.stringify({verdict:'PASS',assertions,database,roles:['member','coach','seller','admin'],httpTimeoutMs:5000,runtimeDeadlineMs:60000})}`);
}

async function cleanup() {
  if(server)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
  if(base){
    try{await fetch(`${base}/health`,{signal:AbortSignal.timeout(500)});portReleased=false;}
    catch{portReleased=true;}
  }
  await closePool();
  if(databaseCreated){
    console.log(child(setupScript,['drop']).trim());
    const master=new sql.ConnectionPool({...config.db,database:'master'});
    await master.connect();
    try{
      const result=await master.request().input('name',sql.NVarChar(128),database).query('SELECT DB_ID(@name) database_id');
      databaseDropped=result.recordset[0].database_id===null;
      if(!databaseDropped)throw new Error('Acceptance database still exists after cleanup');
    }finally{await master.close();}
  }
  console.log(`REGRESSION02_CLEANUP ${JSON.stringify({serverClosed:!server||!server.listening,portReleased,databaseDropped})}`);
}

let failure:unknown;
run().catch(error=>{failure=error;}).finally(async()=>{
  try{await cleanup();}catch(error){failure=failure??error;}
  if(failure){console.error(failure instanceof Error?failure.message:'REGRESSION-02 acceptance failed');process.exitCode=1;}
});
