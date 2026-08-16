import crypto from 'crypto';
import path from 'path';
import { spawnSync } from 'child_process';

type Status='PASS'|'FAIL'|'BLOCKED'|'NOT APPLICABLE'|'NOT RUN';
type Result={suite:string;status:Status;detail:string};
type Suite={name:string;flag:string;version:string;port:number;upload?:string};

const mode=(process.argv[2]||'all').toLowerCase();
const allowed=['security','historical','marketplace','legacy','integrity','all'];
if(!allowed.includes(mode))throw new Error(`Mode must be one of: ${allowed.join(', ')}`);
const tsx=path.resolve(process.cwd(),'node_modules','tsx','dist','cli.mjs');
const script=(name:string)=>path.resolve(process.cwd(),'src','scripts',name);
const results:Result[]=[];
const stamp=`${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

function execute(label:string,file:string,args:string[],env:NodeJS.ProcessEnv,timeout=300000):boolean{
  console.log(`\n=== ${label} ===`);
  const child=spawnSync(process.execPath,[tsx,file,...args],{cwd:process.cwd(),env:{...process.env,...env},encoding:'utf8',timeout,windowsHide:true});
  if(child.stdout)process.stdout.write(child.stdout);
  if(child.stderr)process.stderr.write(child.stderr);
  if(child.error)console.error(child.error.message);
  return child.status===0&&!child.error;
}
function record(suite:string,status:Status,detail:string){results.push({suite,status,detail});console.log(`SELLER013_SUITE ${suite}|${status}|${detail}`);}
function isolatedEnv(suite:Suite){
  const compact=suite.name.replace(/-/g,'').toUpperCase();
  return {
    NODE_ENV:'test',
    DB_NAME:`GYMFIT_DB_${compact}_ACCEPTANCE_${stamp}`,
    [suite.flag]:'1',
    ACCEPTANCE_PORT:String(suite.port),
    ...(suite.upload?{UPLOAD_DIR:path.resolve(process.cwd(),suite.upload,stamp)}:{}),
  };
}
function ordinary(suite:Suite){
  const env=isolatedEnv(suite);
  const setup=execute(`${suite.name} setup`,script('seller-002-acceptance-db.ts'),['setup'],env);
  const migrate=setup&&execute(`${suite.name} migrate through ${suite.version}`,script('migrate.ts'),[`--through=${suite.version}`],env);
  const acceptance=migrate&&execute(`${suite.name} acceptance`,script(`${suite.name}-acceptance.ts`),[],env,420000);
  if(acceptance)record(suite.name,'PASS',`isolated migration epoch ${suite.version}; runner cleanup`);
  else{
    execute(`${suite.name} cleanup`,script('seller-002-acceptance-db.ts'),['drop'],env);
    record(suite.name,'FAIL',`setup=${setup} migrate=${migrate} acceptance=${acceptance}`);
  }
}
function historical(){
  const suite:Suite={name:'seller-008',flag:'SELLER008_ACCEPTANCE',version:'0105',port:5618};
  const env=isolatedEnv(suite);
  const setup=execute('seller-008 historical setup',script('seller-002-acceptance-db.ts'),['setup'],env);
  const pre=setup&&execute('seller-008 migrate pre-0105',script('migrate.ts'),['--historical-pre-0105'],env);
  const seed=pre&&execute('seller-008 seed historical Product ID 0 order',script('seller-008-acceptance.ts'),['seed-history'],env);
  const forward=seed&&execute('seller-008 migrate forward',script('migrate.ts'),[],env);
  const acceptance=forward&&execute('seller-008 historical acceptance',script('seller-008-acceptance.ts'),[],env,420000);
  if(acceptance)record('historical','PASS','0104 seed -> 0105/latest forward migration -> acceptance; disposable DB dropped');
  else{
    execute('seller-008 historical cleanup',script('seller-002-acceptance-db.ts'),['drop'],env);
    record('historical','FAIL',`setup=${setup} pre0105=${pre} seed=${seed} forward=${forward} acceptance=${acceptance}`);
  }
}
function security(){
  const ok=execute('seller-013 security',script('seller-013-security-acceptance.ts'),[],{SELLER013_SECURITY_ACCEPTANCE:'1',NODE_ENV:'test'},420000);
  record('security',ok?'PASS':'FAIL','isolated auth/session/RBAC/rate-limit/audit acceptance');
}
function integrity(){
  const env={DB_NAME:'GYMFIT_DB'};
  const checks=[
    ['migration-status','migrate.ts',['--status'],{}],
    ['auth-integrity','regression-02-auth-integrity.ts',[],{REGRESSION02_CANONICAL_READONLY:'1'}],
    ['seller-integrity','regression-04-seller-integrity.ts',[],{REGRESSION04_CANONICAL_READONLY:'1'}],
    ['seller-012-integrity','seller-012-integrity.ts',[],{}],
  ] as Array<[string,string,string[],NodeJS.ProcessEnv]>;
  const ok=checks.every(([label,file,args,extra])=>execute(label,script(file),args,{...env,...extra}));
  record('integrity',ok?'PASS':'FAIL','canonical read-only migration/auth/seller/review checks');
}
function legacy(){
  const ok=execute('legacy canonical integrity',script('seller-013-legacy-integrity.ts'),[],{DB_NAME:'GYMFIT_DB',SELLER013_LEGACY_READONLY:'1'});
  record('legacy',ok?'PASS':'FAIL','read-only membership/payment/invoice/coupon referential smoke');
}
function catalog(){
  const database=`GYMFIT_REGRESSION_03_SELLER013_${stamp}`;
  const upload=path.resolve(process.cwd(),'regression_03_seller013_uploads',stamp);
  const ok=execute('current catalog/product/upload regression',script('regression-03-product-acceptance.ts'),[],{
    NODE_ENV:'test',REGRESSION03_ACCEPTANCE:'1',DB_NAME:database,UPLOAD_DIR:upload,
  },420000);
  record('catalog-current',ok?'PASS':'FAIL','current-schema product/RBAC/query/upload acceptance and cleanup');
}
function marketplace(){
  catalog();
  record('seller-001-through-007-epoch-runners','NOT APPLICABLE','historical schema-epoch runners superseded by security and current catalog suites');
  historical();
  [
    {name:'seller-008a',flag:'SELLER008A_ACCEPTANCE',version:'0111',port:5608},
    {name:'seller-009',flag:'SELLER009_ACCEPTANCE',version:'0111',port:5609},
    {name:'seller-010',flag:'SELLER010_ACCEPTANCE',version:'0111',port:5610},
    {name:'seller-011',flag:'SELLER011_ACCEPTANCE',version:'0111',port:5611},
    {name:'seller-011a',flag:'SELLER011A_ACCEPTANCE',version:'0111',port:5612},
    {name:'seller-012',flag:'SELLER012_ACCEPTANCE',version:'0111',port:5613},
  ].forEach(ordinary);
}

if(mode==='security')security();
else if(mode==='historical')historical();
else if(mode==='marketplace')marketplace();
else if(mode==='legacy')legacy();
else if(mode==='integrity')integrity();
else{security();marketplace();integrity();legacy();}

const failed=results.filter(item=>item.status==='FAIL');
const blocked=results.filter(item=>item.status==='BLOCKED');
console.log(`\nSELLER013_FINAL_ACCEPTANCE ${JSON.stringify({mode,verdict:failed.length?'FAIL':blocked.length?'BLOCKED':'PASS',results})}`);
process.exitCode=failed.length?1:blocked.length?2:0;
