import crypto from 'crypto';
import path from 'path';
import { spawnSync } from 'child_process';

if(process.env.SELLER013_SECURITY_ACCEPTANCE!=='1')throw new Error('SELLER013_SECURITY_ACCEPTANCE=1 is required');

const database=`GYMFIT_REGRESSION_02_SELLER013_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
const tsx=path.resolve(process.cwd(),'node_modules','tsx','dist','cli.mjs');
const runner=path.resolve(process.cwd(),'src','scripts','regression-02-auth-acceptance.ts');
const result=spawnSync(process.execPath,[tsx,runner],{
  cwd:process.cwd(),
  env:{...process.env,NODE_ENV:'test',REGRESSION02_ACCEPTANCE:'1',DB_NAME:database},
  encoding:'utf8',
  timeout:240000,
  windowsHide:true,
});
if(result.stdout)process.stdout.write(result.stdout);
if(result.stderr)process.stderr.write(result.stderr);
if(result.error)throw result.error;
if(result.status!==0)throw new Error(`SELLER-013 security acceptance child failed with exit ${result.status}`);
console.log(`SELLER013_SECURITY_ACCEPTANCE ${JSON.stringify({
  verdict:'PASS',
  databaseGuard:'GYMFIT_REGRESSION_02_*',
  databaseDropped:true,
  coverage:[
    'authentication','live-role-recheck','session-revoke','disabled-account',
    'admin-role-guard','seller-ownership','seller-application-rate-limit',
    'brand-request-rate-limit','security-mutation-audit','sanitized-errors',
  ],
})}`);
