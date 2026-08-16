import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import * as sql from 'mssql';
import { config } from '../config/config';

const seller002=process.env.SELLER002_ACCEPTANCE==='1',seller003=process.env.SELLER003_ACCEPTANCE==='1',seller004=process.env.SELLER004_ACCEPTANCE==='1',seller005=process.env.SELLER005_ACCEPTANCE==='1',seller006=process.env.SELLER006_ACCEPTANCE==='1',seller007=process.env.SELLER007_ACCEPTANCE==='1',seller008=process.env.SELLER008_ACCEPTANCE==='1',seller008a=process.env.SELLER008A_ACCEPTANCE==='1',seller009=process.env.SELLER009_ACCEPTANCE==='1',seller010=process.env.SELLER010_ACCEPTANCE==='1',seller011=process.env.SELLER011_ACCEPTANCE==='1',seller011a=process.env.SELLER011A_ACCEPTANCE==='1',seller012=process.env.SELLER012_ACCEPTANCE==='1',seller013=process.env.SELLER013_SECURITY_ACCEPTANCE==='1',seller007Verification=process.env.SELLER007_VERIFICATION==='1',regression01=process.env.REGRESSION01==='1',regression02=process.env.REGRESSION02_ACCEPTANCE==='1',regression03=process.env.REGRESSION03_ACCEPTANCE==='1',regression04=process.env.REGRESSION04_ACCEPTANCE==='1';
if(!seller002&&!seller003&&!seller004&&!seller005&&!seller006&&!seller007&&!seller008&&!seller008a&&!seller009&&!seller010&&!seller011&&!seller011a&&!seller012&&!seller013&&!seller007Verification&&!regression02&&!regression03&&!regression04)throw new Error('A supported acceptance flag is required');
const target=config.db.database;
const safePrefix=seller007Verification?'GYMFIT_REGRESSION_07_':regression01||regression02||regression03||regression04?'GYMFIT_REGRESSION_':seller013?'GYMFIT_DB_SELLER013_ACCEPTANCE_':seller012?'GYMFIT_DB_SELLER012_ACCEPTANCE_':seller011a?'GYMFIT_DB_SELLER011A_ACCEPTANCE_':seller011?'GYMFIT_DB_SELLER011_ACCEPTANCE_':seller010?'GYMFIT_DB_SELLER010_ACCEPTANCE_':seller009?'GYMFIT_DB_SELLER009_ACCEPTANCE_':seller008a?'GYMFIT_DB_SELLER008A_ACCEPTANCE_':seller008?'GYMFIT_DB_SELLER008_ACCEPTANCE_':seller007?'GYMFIT_DB_SELLER007_ACCEPTANCE_':seller006?'GYMFIT_DB_SELLER006_ACCEPTANCE_':seller005?'GYMFIT_DB_SELLER005_ACCEPTANCE_':seller004?'GYMFIT_DB_SELLER004_ACCEPTANCE_':seller003?'GYMFIT_DB_SELLER003_ACCEPTANCE_':'GYMFIT_DB_SELLER002_ACCEPTANCE_';
if(target==='GYMFIT_DB'||!target.startsWith(safePrefix)||!/^[A-Za-z0-9_]+$/.test(target))throw new Error('Unsafe acceptance database name');
const action=process.argv[2];
const masterConfig={...config.db,database:'master'};

function batches(source:string){const output:string[]=[];let current:string[]=[];for(const line of source.split(/\r?\n/)){if(/^\s*GO\s*$/i.test(line)){if(current.join('\n').trim())output.push(current.join('\n'));current=[];}else current.push(line);}if(current.join('\n').trim())output.push(current.join('\n'));return output;}

async function run(){
  const pool=await new sql.ConnectionPool(masterConfig).connect();
  try{
    if(action==='drop'){await pool.request().batch(`IF DB_ID(N'${target}') IS NOT NULL BEGIN ALTER DATABASE [${target}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${target}]; END`);console.log(`[ACCEPTANCE DB DROPPED] ${target}`);return;}
    if(action!=='setup')throw new Error('Expected setup or drop');
    await pool.request().batch(`IF DB_ID(N'${target}') IS NOT NULL BEGIN ALTER DATABASE [${target}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${target}]; END; CREATE DATABASE [${target}];`);
    const schema=await fs.readFile(path.resolve(__dirname,'../../../db/schema.sql'),'utf8');
    const marker=/USE\s+GYMFIT_DB\s*;\s*\r?\nGO\s*\r?\n/i.exec(schema);if(!marker)throw new Error('Schema database marker not found');
    const body=schema.slice(marker.index+marker[0].length).replace(/\bGYMFIT_DB\b/g,target);
    const dbPool=await new sql.ConnectionPool({...config.db,database:target}).connect();
    try{
      for(const batch of batches(body))await dbPool.request().batch(batch);
      if(await dbPool.request().query(`SELECT COL_LENGTH(N'dbo.Products',N'reviewed_at') value`).then(r=>r.recordset[0].value)){
        await dbPool.request().batch(`DROP TRIGGER IF EXISTS dbo.TR_ProductModerationHistory_Immutable;
          DROP TABLE IF EXISTS dbo.ProductModerationHistory;
          DROP INDEX IF EXISTS IX_Products_Moderation_Reviewed ON dbo.Products;
          ALTER TABLE dbo.Products DROP CONSTRAINT FK_Products_ReviewedBy;
          ALTER TABLE dbo.Products DROP COLUMN reviewed_at,published_at,reviewed_by_user_id;`);
      }
      if(await dbPool.request().query(`SELECT COL_LENGTH(N'dbo.Products',N'moderation_status') value`).then(r=>r.recordset[0].value)){
        await dbPool.request().batch(`DROP INDEX IF EXISTS IX_Products_Moderation_Submitted ON dbo.Products;
          DROP INDEX IF EXISTS IX_Products_Shop_Moderation ON dbo.Products;
          ALTER TABLE dbo.Products DROP CONSTRAINT CK_Products_ModerationState,CK_Products_BrandSource,CK_Products_ModerationStatus,FK_Products_BrandRequest,DF_Products_ModerationStatus;
          ALTER TABLE dbo.Products DROP COLUMN moderation_status,submitted_at,review_reason,brand_request_id;`);
      }
      if(await dbPool.request().query(`SELECT OBJECT_ID(N'dbo.BrandRequests') id`).then(r=>r.recordset[0].id)){
        await dbPool.request().batch(`DROP TRIGGER IF EXISTS dbo.TR_BrandRequestStatusHistory_Immutable;DROP TABLE IF EXISTS dbo.BrandRequestStatusHistory;DROP TABLE IF EXISTS dbo.BrandRequests;
          DELETE dbo.Brands WHERE is_generic=1;
          DROP INDEX IF EXISTS UX_Brands_OneGeneric ON dbo.Brands;DROP INDEX IF EXISTS UX_Brands_NormalizedName ON dbo.Brands;
          DECLARE @dc SYSNAME=(SELECT dc.name FROM sys.default_constraints dc JOIN sys.columns c ON c.default_object_id=dc.object_id WHERE c.object_id=OBJECT_ID(N'dbo.Brands') AND c.name=N'is_generic');
          IF @dc IS NOT NULL BEGIN DECLARE @dropDc NVARCHAR(500)=N'ALTER TABLE dbo.Brands DROP CONSTRAINT '+QUOTENAME(@dc);EXEC(@dropDc);END;
          ALTER TABLE dbo.Brands DROP COLUMN normalized_name,is_generic;
          ALTER TABLE dbo.Products DROP CONSTRAINT FK_Products_Shops;DROP INDEX IX_Products_Shop_Active ON dbo.Products;ALTER TABLE dbo.Products DROP COLUMN shop_id;
          DROP TABLE dbo.Shops;`);
      }
      await dbPool.request().batch(`DROP TRIGGER IF EXISTS dbo.TR_SellerApplicationStatusHistory_Immutable;
        DROP TABLE IF EXISTS dbo.SellerApplicationStatusHistory;
        DROP TABLE IF EXISTS dbo.SellerApplications;`);
      const constraints=await dbPool.request().query(`SELECT cc.name FROM sys.check_constraints cc WHERE cc.parent_object_id=OBJECT_ID(N'dbo.Users') AND LOWER(cc.definition) LIKE N'%role%in%'`);
      if(constraints.recordset.length!==1)throw new Error('Expected one Users role constraint');
      await dbPool.request().batch(`ALTER TABLE dbo.Users DROP CONSTRAINT [${String(constraints.recordset[0].name).replace(/]/g,']]')}]; ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role_Acceptance CHECK(role IN(N'member',N'coach',N'admin',N'seller'));`);
      const hash=await bcrypt.hash(`Aa1!${Date.now()}Acceptance`,12);
      await dbPool.request().input('email',sql.NVarChar(255),`preexisting-seller-${Date.now()}@example.test`).input('hash',sql.NVarChar(255),hash)
        .query(`INSERT dbo.Users(email,password,name,role,is_active,email_verified) VALUES(@email,@hash,N'Preexisting Seller',N'seller',1,1)`);
    }finally{await dbPool.close();}
    console.log(`[ACCEPTANCE DB READY] ${target}`);
  }finally{await pool.close();}
}
run().catch(error=>{console.error('[ACCEPTANCE DB FAIL]',error instanceof Error?error.message:error);process.exitCode=1;});
