import crypto from "crypto";
import bcrypt from "bcryptjs";
import * as mssql from "mssql";
import type {Server} from "http";
import {config} from "../config/config";
import {closePool,query} from "../config/database";

if(process.env.SELLER011_ACCEPTANCE!=="1")throw new Error("SELLER011_ACCEPTANCE=1 is required");
if(!config.db.database.startsWith("GYMFIT_DB_SELLER011_ACCEPTANCE_"))throw new Error("Refusing unsafe database");
const port=Number(process.env.ACCEPTANCE_PORT||5541),base=`http://127.0.0.1:${port}/api`,stamp=Date.now();
let server:Server|undefined,assertions=0,lastStatus=0;
const verify=(value:boolean,message:string)=>{assertions++;if(!value)throw new Error(`Assertion ${assertions}: ${message}; status=${lastStatus}`);};
async function call(path:string,method="GET",token?:string,body?:unknown){
  const response=await fetch(base+path,{method,headers:{...(token?{authorization:`Bearer ${token}`}:{}) ,...(body===undefined?{}:{"content-type":"application/json"})},body:body===undefined?undefined:JSON.stringify(body)});
  lastStatus=response.status;let data:any={};try{data=await response.json();}catch{}return{status:response.status,data};
}
async function user(role:string,key:string){
  const email=`seller011-${key}-${stamp}@example.test`,password=`Aa1!${crypto.randomBytes(8).toString("hex")}`,hash=await bcrypt.hash(password,12);
  const row=(await query<any>("INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version) OUTPUT INSERTED.id VALUES(@email,@password,@name,@role,1,1,0)",{email,password:hash,name:`SELLER011 ${key}`,role})).recordset[0];
  const login=await call("/auth/login","POST",undefined,{email,password});verify(login.status===200,`${key} login`);return{id:Number(row.id),token:String(login.data.data.accessToken)};
}
async function shop(owner:number,key:string){return Number((await query<any>("INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system) OUTPUT INSERTED.id VALUES(@owner,@name,@slug,N'ACTIVE',1,0)",{owner,name:`Shop ${key}`,slug:`seller011-${key}-${stamp}`})).recordset[0].id);}
async function fixture(input:{buyer:number;shop:number;admin:number;key:string;status:"PENDING"|"HELD"|"ELIGIBLE"|"PAID";gross:number;earnedDaysAgo:number}){
  const order=(await query<any>(`INSERT dbo.Orders(order_number,user_id,customer_name,customer_email,subtotal,total_amount,currency,order_status,payment_status,payment_provider,created_at,updated_at)
    VALUES(@number,@buyer,N'Buyer',N'buyer@example.test',@gross,@gross,N'VND',N'DELIVERED',N'PAID',N'BANK_TRANSFER',SYSUTCDATETIME(),SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS INT) id;`,
    {number:`S011-${input.key}-${stamp}`,buyer:input.buyer,gross:input.gross})).recordset[0];
  const commission=Math.round(input.gross*5)/100,net=input.gross-commission;
  const child=(await query<any>(`INSERT dbo.ShopOrders(order_id,shop_id,status,subtotal,delivered_at,commission_rate_snapshot,commission_base_amount,commission_amount,seller_net_before_adjustment,commission_snapshotted_at,created_at,updated_at)
    VALUES(@order,@shop,N'HUB_CHECK_PASSED',@gross,DATEADD(DAY,-@days,SYSUTCDATETIME()),500,@gross,@commission,@net,SYSUTCDATETIME(),SYSUTCDATETIME(),SYSUTCDATETIME()); SELECT CAST(SCOPE_IDENTITY() AS INT) id;`,
    {order:order.id,shop:input.shop,gross:input.gross,commission,net,days:input.earnedDaysAgo})).recordset[0];
  const held=input.status==="HELD",paid=input.status==="PAID";
  const settlement=(await query<any>(`DECLARE @earned DATETIME2=DATEADD(DAY,-@days,SYSUTCDATETIME()); INSERT dbo.ShopOrderSettlements(shop_order_id,shop_id,status,commission_rate_snapshot,gross_merchandise_amount,commission_amount,net_before_adjustment,applied_adjustment_amount,payable_amount,earned_at,eligible_at,held_at,hold_reason,hold_source_type,paid_at,paid_by,created_at,updated_at)
    OUTPUT INSERTED.id VALUES(@child,@shop,@status,500,@gross,@commission,@net,0,@net,@earned,DATEADD(DAY,7,@earned),CASE WHEN @held=1 THEN SYSUTCDATETIME() END,CASE WHEN @held=1 THEN N'Fixture hold' END,CASE WHEN @held=1 THEN N'MANUAL' END,CASE WHEN @paid=1 THEN SYSUTCDATETIME() END,CASE WHEN @paid=1 THEN @admin END,SYSUTCDATETIME(),SYSUTCDATETIME())`,
    {child:child.id,shop:input.shop,status:input.status,gross:input.gross,commission,net,days:input.earnedDaysAgo,held,paid,admin:input.admin})).recordset[0];
  return{id:Number(settlement.id),shopOrderId:Number(child.id),net};
}
async function main(){
  const admin=await user("admin","admin"),sellerA=await user("seller","a"),sellerB=await user("seller","b"),member=await user("member","buyer");
  const shopA=await shop(sellerA.id,"a"),shopB=await shop(sellerB.id,"b");
  const setting=(await query<any>("SELECT setting_value value FROM dbo.MarketplaceSettings WHERE setting_key=N'default_commission_rate_bps'")).recordset[0];verify(Number(setting.value)===500,"default commission is 500 bps");
  const due=await fixture({buyer:member.id,shop:shopA,admin:admin.id,key:"due",status:"PENDING",gross:100000,earnedDaysAgo:8});
  const future=await fixture({buyer:member.id,shop:shopA,admin:admin.id,key:"future",status:"PENDING",gross:200000,earnedDaysAgo:1});
  const other=await fixture({buyer:member.id,shop:shopB,admin:admin.id,key:"other",status:"ELIGIBLE",gross:300000,earnedDaysAgo:8});
  const paidSource=await fixture({buyer:member.id,shop:shopA,admin:admin.id,key:"paid",status:"PAID",gross:400000,earnedDaysAgo:12});
  verify((await call("/seller/finance/summary","GET",member.token)).status===403,"buyer cannot access seller finance");
  const summary=await call("/seller/finance/summary","GET",sellerA.token);verify(summary.status===200,"seller summary available");verify(Number(summary.data.data.grossMerchandiseAmount)===700000,"seller summary excludes other shop");
  verify((await call(`/seller/finance/settlements/${other.id}`,"GET",sellerA.token)).status===404,"cross-shop settlement IDOR blocked");
  verify((await call("/admin/marketplace-finance/settlements","GET",sellerA.token)).status===403,"seller cannot access admin finance");
  await call("/admin/marketplace-finance/settlements/refresh-eligibility","POST",admin.token,{});
  verify((await query<any>("SELECT status FROM dbo.ShopOrderSettlements WHERE id=@id",{id:due.id})).recordset[0].status==="ELIGIBLE","due pending becomes eligible");
  verify((await query<any>("SELECT status FROM dbo.ShopOrderSettlements WHERE id=@id",{id:future.id})).recordset[0].status==="PENDING","future remains pending");
  verify((await call(`/admin/marketplace-finance/settlements/${due.id}/hold`,"POST",admin.token,{reason:"x"})).status===400,"hold reason validation");
  verify((await call(`/admin/marketplace-finance/settlements/${due.id}/hold`,"POST",sellerA.token,{reason:"Manual risk review"})).status===403,"seller cannot hold");
  verify((await call(`/admin/marketplace-finance/settlements/${due.id}/hold`,"POST",admin.token,{reason:"Manual risk review"})).status===200,"admin holds eligible");
  verify((await call("/admin/marketplace-finance/settlement-batches","POST",admin.token,{periodStart:"2020-01-01",periodEnd:"2099-01-01",settlementIds:[due.id]})).status===409,"held settlement cannot enter batch");
  verify((await call(`/admin/marketplace-finance/settlements/${due.id}/release`,"POST",admin.token,{reason:"Review completed"})).status===200,"release held settlement");
  verify((await query<any>("SELECT status FROM dbo.ShopOrderSettlements WHERE id=@id",{id:due.id})).recordset[0].status==="ELIGIBLE","release after due returns eligible");
  verify((await call("/admin/marketplace-finance/adjustments","POST",admin.token,{shopId:shopA,signedAmount:0,reason:"Invalid zero"})).status===400,"zero adjustment blocked");
  const positive=await call("/admin/marketplace-finance/adjustments","POST",admin.token,{shopId:shopA,signedAmount:1000,reason:"Manual credit",sourceSettlementId:due.id});verify(positive.status===201,"positive adjustment created");
  verify((await call(`/admin/marketplace-finance/adjustments/${positive.data.data.id}/apply`,"POST",admin.token,{targetSettlementId:due.id})).status===200,"same-shop adjustment applied");
  verify((await call(`/admin/marketplace-finance/adjustments/${positive.data.data.id}/apply`,"POST",admin.token,{targetSettlementId:due.id})).status===409,"double apply blocked");
  verify(Number((await query<any>("SELECT payable_amount amount FROM dbo.ShopOrderSettlements WHERE id=@id",{id:due.id})).recordset[0].amount)===due.net+1000,"payable recalculated");
  const cross=await call("/admin/marketplace-finance/adjustments","POST",admin.token,{shopId:shopA,signedAmount:500,reason:"Cross-shop check"});verify(cross.status===201,"pending adjustment created");
  verify((await call(`/admin/marketplace-finance/adjustments/${cross.data.data.id}/apply`,"POST",admin.token,{targetSettlementId:other.id})).status===409,"cross-shop apply blocked");
  verify((await call(`/admin/marketplace-finance/adjustments/${cross.data.data.id}/void`,"POST",admin.token,{reason:"Wrong target"})).status===200,"pending adjustment voided");
  verify((await call(`/admin/marketplace-finance/adjustments/${cross.data.data.id}/void`,"POST",admin.token,{reason:"Retry"})).status===409,"void applied twice blocked");
  const excessive=await call("/admin/marketplace-finance/adjustments","POST",admin.token,{shopId:shopA,signedAmount:-999999,reason:"Negative guard",sourceSettlementId:due.id});verify(excessive.status===201,"negative adjustment created");
  verify((await call(`/admin/marketplace-finance/adjustments/${excessive.data.data.id}/apply`,"POST",admin.token,{targetSettlementId:due.id})).status===409,"negative payable blocked");
  const batch=await call("/admin/marketplace-finance/settlement-batches","POST",admin.token,{periodStart:"2020-01-01",periodEnd:"2099-01-01",settlementIds:[due.id]});verify(batch.status===201,"eligible batch created");verify(Number(batch.data.data.totalPayableAmount)===due.net+1000,"batch total computed by backend");
  verify((await call(`/admin/marketplace-finance/settlement-batches/${batch.data.data.id}/mark-paid`,"POST",sellerA.token,{reason:"Forbidden"})).status===403,"seller cannot mark paid");
  const marked=await call(`/admin/marketplace-finance/settlement-batches/${batch.data.data.id}/mark-paid`,"POST",admin.token,{reason:"External transfer confirmed",externalReference:"BANK-011"});verify(marked.status===200,"batch marked paid");
  verify((await call(`/admin/marketplace-finance/settlement-batches/${batch.data.data.id}/mark-paid`,"POST",admin.token,{reason:"Retry",externalReference:"DIFFERENT"})).status===200,"paid retry idempotent");
  const paid=(await query<any>("SELECT status,external_payment_reference reference,payable_amount payable FROM dbo.ShopOrderSettlements WHERE id=@id",{id:due.id})).recordset[0];verify(paid.status==="PAID"&&paid.reference==="BANK-011"&&Number(paid.payable)===due.net+1000,"paid settlement immutable on retry");
  const carry=await call("/admin/marketplace-finance/adjustments","POST",admin.token,{shopId:shopA,signedAmount:-500,reason:"Post-paid correction",sourcePaidSettlementId:paidSource.id,sourceReference:"TICKET-11"});verify(carry.status===201,"carry-forward created");
  verify((await query<any>("SELECT status FROM dbo.ShopOrderSettlements WHERE id=@id",{id:paidSource.id})).recordset[0].status==="PAID","source paid settlement unchanged");
  verify((await call(`/admin/marketplace-finance/adjustments/${carry.data.data.id}/apply`,"POST",admin.token,{targetSettlementId:future.id})).status===200,"carry-forward manually applied to future same-shop settlement");
  verify((await call("/admin/marketplace-finance/settlement-batches","POST",admin.token,{periodStart:"2020-01-01",periodEnd:"2099-01-01",settlementIds:[future.id]})).status===409,"pending settlement cannot enter batch");
  verify(Number((await query<any>("SELECT COUNT(*) count FROM dbo.SettlementStatusHistory WHERE settlement_id=@id AND new_status=N'PAID'",{id:due.id})).recordset[0].count)===1,"paid history written once");
  console.log(`[SELLER-011 ACCEPTANCE PASS] assertions=${assertions} database=${config.db.database}`);
}
async function dropDatabase(){const master=new mssql.ConnectionPool({...config.db,database:"master"});await master.connect();try{await master.request().batch(`IF DB_ID(N'${config.db.database}') IS NOT NULL BEGIN ALTER DATABASE [${config.db.database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${config.db.database}]; END`);}finally{await master.close();}}
async function run(){try{const {default:app}=await import("../app");server=app.listen(port,"127.0.0.1");await new Promise<void>((resolve,reject)=>{server!.once("listening",resolve);server!.once("error",reject);});await main();return 0;}catch(error){console.error("[SELLER-011 ACCEPTANCE FAIL]",error instanceof Error?error.message:error);return 1;}finally{if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()));}await closePool();await dropDatabase();}}
void run().then(code=>{process.exitCode=code;});
