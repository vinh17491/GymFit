import crypto from "crypto";
import bcrypt from "bcryptjs";
import * as mssql from "mssql";
import type {Server} from "http";
import {config} from "../config/config";
import {closePool,query} from "../config/database";

if(process.env.SELLER009_ACCEPTANCE!=="1")throw new Error("SELLER009_ACCEPTANCE=1 is required");
if(config.db.database==="GYFIT_DB"||!config.db.database.startsWith("GYMFIT_DB_SELLER009_ACCEPTANCE_"))throw new Error("Refusing unsafe database");
process.env.NODE_ENV="test";
process.env.MAIL_MODE="acceptance";
process.env.BANK_NAME="GymFit Acceptance Bank";
process.env.BANK_ACCOUNT_NAME="GYMFIT ACCEPTANCE";
process.env.BANK_ACCOUNT_NUMBER="0000000000";
process.env.BANK_QR_IMAGE_URL="https://example.test/gymfit-acceptance-qr.png";
const port=Number(process.env.ACCEPTANCE_PORT||5530),base=`http://127.0.0.1:${port}/api`,stamp=Date.now();
let server:Server|undefined,assertions=0,lastStatus=0;
const verify=(value:boolean,message:string)=>{assertions++;if(!value)throw new Error(`Assertion ${assertions}: ${message}; status=${lastStatus}`);};
async function call(path:string,method="GET",token?:string,body?:unknown){
  const response=await fetch(base+path,{method,headers:{...(token?{authorization:`Bearer ${token}`}:{}) ,...(body===undefined?{}:{"content-type":"application/json"})},body:body===undefined?undefined:JSON.stringify(body)});
  lastStatus=response.status;let data:any={};try{data=await response.json();}catch{}return{status:response.status,data};
}
async function user(role:string,key:string){
  const email=`seller009-${key}-${stamp}@example.test`,password=`Aa1!${crypto.randomBytes(8).toString("hex")}`,hash=await bcrypt.hash(password,12);
  const row=(await query<any>("INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version) OUTPUT INSERTED.id VALUES(@email,@password,@name,@role,1,1,0)",{email,password:hash,name:`SELLER009 ${key}`,role})).recordset[0];
  const login=await call("/auth/login","POST",undefined,{email,password});verify(login.status===200,`${key} login`);
  return{id:Number(row.id),token:String(login.data.data.accessToken)};
}
async function shop(owner:number,key:string){
  return Number((await query<any>("INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system) OUTPUT INSERTED.id VALUES(@owner,@name,@slug,N'ACTIVE',1,0)",{owner,name:`Shop ${key}`,slug:`seller009-${key}-${stamp}`})).recordset[0].id);
}
async function product(shopId:number,key:string,price:number,onHand:number){
  const refs=(await query<any>("SELECT (SELECT TOP 1 id FROM dbo.Brands ORDER BY id) brand,(SELECT TOP 1 id FROM dbo.Categories ORDER BY id) category")).recordset[0],sku=`S009-${key}-${stamp}`;
  const p=(await query<any>("INSERT dbo.Products(product_name,slug,description,sku,price,stock,brand_id,category_id,is_active,shop_id,moderation_status,created_at,updated_at) OUTPUT INSERTED.id VALUES(@name,@slug,N'SELLER009',@sku,@price,@stock,@brand,@category,1,@shop,N'PUBLISHED',SYSUTCDATETIME(),SYSUTCDATETIME())",{name:`SELLER009 ${key}`,slug:`seller009-product-${key}-${stamp}`,sku,price,stock:onHand,brand:refs.brand,category:refs.category,shop:shopId})).recordset[0];
  const v=(await query<any>("INSERT dbo.ProductVariants(product_id,variant_name,sku,price,is_active,is_default,created_at,updated_at) OUTPUT INSERTED.id VALUES(@product,N'Default',@sku,@price,1,1,SYSUTCDATETIME(),SYSUTCDATETIME())",{product:p.id,sku:`${sku}-V`,price})).recordset[0];
  await query("INSERT dbo.Inventory(variant_id,on_hand,reserved,low_stock_threshold,updated_at) VALUES(@variant,@onHand,0,0,SYSUTCDATETIME())",{variant:v.id,onHand});
  return{productId:Number(p.id),variantId:Number(v.id)};
}
async function checkout(buyer:{id:number;token:string},items:Array<{productId:number;variantId:number;quantity:number}>,voucherCode?:string){
  const cart=(await query<any>("IF NOT EXISTS(SELECT 1 FROM dbo.Carts WHERE buyer_id=@buyer) INSERT dbo.Carts(buyer_id,version) VALUES(@buyer,1); SELECT id,version FROM dbo.Carts WHERE buyer_id=@buyer",{buyer:buyer.id})).recordset[0];
  await query("DELETE dbo.CartItems WHERE cart_id=@cart",{cart:cart.id});
  for(const item of items)await query("INSERT dbo.CartItems(cart_id,product_id,variant_id,quantity) VALUES(@cart,@product,@variant,@quantity)",{cart:cart.id,product:item.productId,variant:item.variantId,quantity:item.quantity});
  const version=Number(cart.version)+1;await query("UPDATE dbo.Carts SET version=@version WHERE id=@cart",{version,cart:cart.id});
  return call("/orders","POST",buyer.token,{customerName:"Buyer",customerPhone:"0900000000",shippingAddressLine1:"1 Test",shippingCity:"HCM",shippingCountry:"Vietnam",cartVersion:version,voucherCode});
}
async function paid(orderId:number,buyerToken:string,adminToken:string){
  const notification=await call(`/orders/${orderId}/payment-notification`,"POST",buyerToken,{paymentReference:`REF-${orderId}`});
  verify(notification.status===200,"Buyer payment notification");
  verify(notification.data.data.emailConfigured===true&&notification.data.data.emailAttempted===true&&notification.data.data.emailSent===true,"Isolated deterministic mail transport");
  verify((await call(`/admin/orders/${orderId}/payment-status`,"PATCH",adminToken,{status:"PAID"})).status===200,"Admin marks Parent PAID");
}
async function dropDatabase(){
  const master=new mssql.ConnectionPool({...config.db,database:"master"});await master.connect();
  try{await master.request().batch(`IF DB_ID(N'${config.db.database}') IS NOT NULL BEGIN ALTER DATABASE [${config.db.database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${config.db.database}]; END`);}finally{await master.close();}
}
async function main(){
  const admin=await user("admin","admin"),buyer=await user("member","buyer"),sellerA=await user("seller","a"),sellerB=await user("seller","b");
  const shopA=await shop(sellerA.id,"a"),shopB=await shop(sellerB.id,"b"),a=await product(shopA,"a",120000,5),b=await product(shopB,"b",150000,5);
  const created=await checkout(buyer,[{...a,quantity:1},{...b,quantity:1}]);verify(created.status===201,"Multi-Shop checkout");
  const orderId=Number(created.data.data.id),children=created.data.data.shopOrders;verify(children.every((child:any)=>child.status==="PENDING_PAYMENT"),"Children start PENDING_PAYMENT");
  await query("UPDATE dbo.Orders SET shipping_amount=20000,total_amount=total_amount+20000 WHERE id=@id",{id:orderId});
  await paid(orderId,buyer.token,admin.token);
  verify((await query<any>("SELECT COUNT(*) count FROM dbo.ShopOrders WHERE order_id=@id AND status=N'PENDING_STOCK_CHECK'",{id:orderId})).recordset[0].count===2,"PAID transitions every child");
  verify((await call(`/admin/orders/${orderId}/payment-status`,"PATCH",admin.token,{status:"PAID"})).status===200,"PAID retry is idempotent");
  verify(Number((await query<any>("SELECT COUNT(*) count FROM dbo.PaymentStatusHistory WHERE order_id=@id AND new_status=N'PAID'",{id:orderId})).recordset[0].count)===1,"No duplicate payment history");
  const childA=children.find((child:any)=>child.shop.id===shopA),childB=children.find((child:any)=>child.shop.id===shopB);
  verify((await call(`/seller/orders/${childB.id}/stock-check`,"POST",sellerA.token,{action:"UNABLE_TO_FULFILL",reason:"Cross shop attempt"})).status===404,"Cross-Shop IDOR blocked");
  verify((await call(`/seller/orders/${childA.id}/stock-check`,"POST",sellerA.token,{action:"UNABLE_TO_FULFILL"})).status===400,"Unable reason required");
  verify((await call(`/seller/orders/${childA.id}/stock-check`,"POST",sellerA.token,{action:"UNABLE_TO_FULFILL",reason:"Physical stock is unavailable"})).status===200,"Seller A unable succeeds");
  const afterA=(await query<any>("SELECT v.id,i.reserved FROM dbo.Inventory i JOIN dbo.ProductVariants v ON v.id=i.variant_id WHERE v.id IN (@a,@b) ORDER BY v.id",{a:a.variantId,b:b.variantId})).recordset;
  verify(afterA.find((row:any)=>row.id===a.variantId).reserved===0,"Only Shop A reservation released");
  verify(afterA.find((row:any)=>row.id===b.variantId).reserved===1,"Shop B reservation remains");
  const refundA=(await query<any>("SELECT * FROM dbo.Refunds WHERE shop_order_id=@id",{id:childA.id})).recordset[0];
  verify(Number(refundA.merchandise_amount)===120000&&Number(refundA.shipping_amount)===0&&refundA.status==="PENDING","Partial refund snapshot and no shipping");
  verify((await call(`/seller/orders/${childA.id}/stock-check`,"POST",sellerA.token,{action:"UNABLE_TO_FULFILL",reason:"retry"})).status===200,"Cancellation retry idempotent");
  verify(Number((await query<any>("SELECT COUNT(*) count FROM dbo.Refunds WHERE shop_order_id=@id",{id:childA.id})).recordset[0].count)===1,"No duplicate refund");
  verify((await call(`/seller/orders/${childB.id}/stock-check`,"POST",sellerB.token,{action:"UNABLE_TO_FULFILL",reason:"Damaged physical stock"})).status===200,"Seller B unable succeeds");
  const refundB=(await query<any>("SELECT * FROM dbo.Refunds WHERE shop_order_id=@id",{id:childB.id})).recordset[0];
  verify(Number(refundB.shipping_amount)===20000,"All-child cancellation refunds shipping once");
  verify(Number((await query<any>("SELECT reserved FROM dbo.Inventory WHERE variant_id=@id",{id:b.variantId})).recordset[0].reserved)===0,"Later full cancellation releases remaining B");
  verify(Number((await query<any>("SELECT COUNT(*) count FROM dbo.CompensationVouchers WHERE source_order_id=@id",{id:orderId})).recordset[0].count)===1,"One voucher per Parent");
  const voucher=(await query<any>("SELECT * FROM dbo.CompensationVouchers WHERE source_order_id=@id",{id:orderId})).recordset[0];
  verify(Number(voucher.amount)===30000&&Number(voucher.minimum_order_amount)===200000,"Voucher uses central configuration snapshot");
  verify(Number((await query<any>("SELECT COUNT(*) count FROM dbo.MarketplaceNotifications WHERE order_id=@id",{id:orderId})).recordset[0].count)===2,"One apology per canceled ShopOrder");
  verify((await call(`/admin/refunds/${refundA.id}/status`,"PATCH",sellerA.token,{status:"COMPLETED",reason:"forged"})).status===403,"Seller cannot complete refund");
  verify((await call(`/admin/refunds/${refundA.id}/status`,"PATCH",admin.token,{status:"FAILED",reason:"External transfer rejected"})).status===200,"Admin fails refund");
  verify((await call(`/admin/refunds/${refundA.id}/status`,"PATCH",admin.token,{status:"PENDING",reason:"Admin retry"})).status===200,"Failed refund retry audited");
  verify((await call(`/admin/refunds/${refundA.id}/status`,"PATCH",admin.token,{status:"COMPLETED",reason:"External refund confirmed",externalReference:"EXT-009"})).status===200,"Admin completes refund");
  await query("UPDATE dbo.MarketplaceSettings SET setting_value=40000 WHERE setting_key=N'compensation_voucher_amount'");
  verify(Number((await query<any>("SELECT amount FROM dbo.CompensationVouchers WHERE id=@id",{id:voucher.id})).recordset[0].amount)===30000,"Config change does not mutate old voucher");
  const c=await product(shopA,"c",250000,5),redeemed=await checkout(buyer,[{...c,quantity:1}],String(voucher.code));verify(redeemed.status===201,"Voucher redemption checkout");
  const redeemedOrder=await query<any>("SELECT discount_amount,total_amount,compensation_voucher_id FROM dbo.Orders WHERE id=@id",{id:redeemed.data.data.id});
  verify(Number(redeemedOrder.recordset[0].discount_amount)===30000&&Number(redeemedOrder.recordset[0].total_amount)===220000,"Voucher reduces merchandise, not shipping");
  verify((await query<any>("SELECT status FROM dbo.CompensationVouchers WHERE id=@id",{id:voucher.id})).recordset[0].status==="USED","Voucher marked used atomically");
  await paid(Number(redeemed.data.data.id),buyer.token,admin.token);
  const redeemedChild=redeemed.data.data.shopOrders[0];
  verify((await call(`/seller/orders/${redeemedChild.id}/stock-check`,"POST",sellerA.token,{action:"SUFFICIENT"})).status===200,"Seller sufficient action");
  verify((await query<any>("SELECT status FROM dbo.ShopOrders WHERE id=@id",{id:redeemedChild.id})).recordset[0].status==="PREPARING","Sufficient transitions to PREPARING");
  console.log(`[SELLER-009 ACCEPTANCE PASS] assertions=${assertions} database=${config.db.database}`);
}
async function run(){try{const {default:app}=await import("../app");server=app.listen(port,"127.0.0.1");await new Promise<void>((resolve,reject)=>{server!.once("listening",resolve);server!.once("error",reject);});await main();return 0;}catch(error){console.error("[SELLER-009 ACCEPTANCE FAIL]",error instanceof Error?error.message:error);return 1;}finally{if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()));}await closePool();await dropDatabase();}}
void run().then(code=>{process.exitCode=code;});
