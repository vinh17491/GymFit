import crypto from "crypto";
import bcrypt from "bcryptjs";
import * as mssql from "mssql";
import type {Server} from "http";
import {config} from "../config/config";
import {closePool,query} from "../config/database";

if(process.env.SELLER010_ACCEPTANCE!=="1")throw new Error("SELLER010_ACCEPTANCE=1 is required");
if(!config.db.database.startsWith("GYMFIT_DB_SELLER010_ACCEPTANCE_"))throw new Error("Refusing unsafe database");
const port=Number(process.env.ACCEPTANCE_PORT||5540),base=`http://127.0.0.1:${port}/api`,stamp=Date.now();
let server:Server|undefined,assertions=0,lastStatus=0;
const verify=(value:boolean,message:string)=>{assertions++;if(!value)throw new Error(`Assertion ${assertions}: ${message}; status=${lastStatus}`);};
async function call(path:string,method="GET",token?:string,body?:unknown){
  const response=await fetch(base+path,{method,headers:{...(token?{authorization:`Bearer ${token}`}:{}) ,...(body===undefined?{}:{"content-type":"application/json"})},body:body===undefined?undefined:JSON.stringify(body)});
  lastStatus=response.status;let data:any={};try{data=await response.json();}catch{}return{status:response.status,data};
}
async function user(role:string,key:string){
  const email=`seller010-${key}-${stamp}@example.test`,password=`Aa1!${crypto.randomBytes(8).toString("hex")}`,hash=await bcrypt.hash(password,12);
  const row=(await query<any>("INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version) OUTPUT INSERTED.id VALUES(@email,@password,@name,@role,1,1,0)",{email,password:hash,name:`SELLER010 ${key}`,role})).recordset[0];
  const login=await call("/auth/login","POST",undefined,{email,password});verify(login.status===200,`${key} login`);
  return{id:Number(row.id),token:String(login.data.data.accessToken)};
}
async function shop(owner:number,key:string){
  return Number((await query<any>("INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system) OUTPUT INSERTED.id VALUES(@owner,@name,@slug,N'ACTIVE',1,0)",{owner,name:`Shop ${key}`,slug:`seller010-${key}-${stamp}`})).recordset[0].id);
}
async function product(shopId:number,key:string,price:number){
  const refs=(await query<any>("SELECT (SELECT TOP 1 id FROM dbo.Brands ORDER BY id) brand,(SELECT TOP 1 id FROM dbo.Categories ORDER BY id) category")).recordset[0],sku=`S010-${key}-${stamp}`;
  const product=(await query<any>("INSERT dbo.Products(product_name,slug,description,sku,price,stock,brand_id,category_id,is_active,shop_id,moderation_status,created_at,updated_at) OUTPUT INSERTED.id VALUES(@name,@slug,N'SELLER010',@sku,@price,5,@brand,@category,1,@shop,N'PUBLISHED',SYSUTCDATETIME(),SYSUTCDATETIME())",{name:`SELLER010 ${key}`,slug:`seller010-product-${key}-${stamp}`,sku,price,brand:refs.brand,category:refs.category,shop:shopId})).recordset[0];
  const variant=(await query<any>("INSERT dbo.ProductVariants(product_id,variant_name,sku,price,is_active,is_default,created_at,updated_at) OUTPUT INSERTED.id VALUES(@product,N'Default',@sku,@price,1,1,SYSUTCDATETIME(),SYSUTCDATETIME())",{product:product.id,sku:`${sku}-V`,price})).recordset[0];
  await query("INSERT dbo.Inventory(variant_id,on_hand,reserved,low_stock_threshold,updated_at) VALUES(@variant,5,0,0,SYSUTCDATETIME())",{variant:variant.id});
  return{productId:Number(product.id),variantId:Number(variant.id)};
}
async function checkout(buyer:{id:number;token:string},items:Array<{productId:number;variantId:number;quantity:number}>){
  const cart=(await query<any>("INSERT dbo.Carts(buyer_id,version) OUTPUT INSERTED.id,INSERTED.version VALUES(@buyer,1)",{buyer:buyer.id})).recordset[0];
  for(const item of items)await query("INSERT dbo.CartItems(cart_id,product_id,variant_id,quantity) VALUES(@cart,@product,@variant,@quantity)",{cart:cart.id,product:item.productId,variant:item.variantId,quantity:item.quantity});
  await query("UPDATE dbo.Carts SET version=2 WHERE id=@cart",{cart:cart.id});
  return call("/orders","POST",buyer.token,{customerName:"Buyer",customerPhone:"0900000000",shippingAddressLine1:"1 Test",shippingCity:"HCM",shippingCountry:"Vietnam",cartVersion:2});
}
async function main(){
  const admin=await user("admin","admin"),buyer=await user("member","buyer"),sellerA=await user("seller","a"),sellerB=await user("seller","b");
  const shopA=await shop(sellerA.id,"a"),shopB=await shop(sellerB.id,"b"),a=await product(shopA,"a",120000),b=await product(shopB,"b",150000);
  const created=await checkout(buyer,[{...a,quantity:1},{...b,quantity:1}]);verify(created.status===201,"multi-Shop checkout");
  const orderId=Number(created.data.data.id),children=created.data.data.shopOrders;
  const childA=children.find((child:any)=>child.shop.id===shopA),childB=children.find((child:any)=>child.shop.id===shopB);
  verify((await call(`/seller/orders/${childA.id}/ready-for-pickup`,"POST",sellerA.token)).status===409,"payment/status gate blocks early ready");
  verify((await call(`/admin/orders/${orderId}/logistics`,"POST",sellerA.token,{action:"READY_TO_SHIP"})).status===403,"Seller cannot transition Parent");
  verify((await call(`/admin/orders/${orderId}/payment-status`,"PATCH",admin.token,{status:"PAID",note:"Manual bank transfer confirmed"})).status===200,"Admin marks PAID");
  verify((await call(`/seller/orders/${childA.id}/stock-check`,"POST",sellerA.token,{action:"SUFFICIENT"})).status===200,"Seller A stock sufficient");
  verify((await call(`/seller/orders/${childA.id}/ready-for-pickup`,"POST",sellerB.token)).status===404,"cross-Shop ready IDOR blocked");
  verify((await call(`/seller/orders/${childA.id}/ready-for-pickup`,"POST",sellerA.token)).status===200,"Seller A ready");
  verify((await call(`/seller/orders/${childA.id}/ready-for-pickup`,"POST",sellerA.token)).status===200,"Seller ready retry idempotent");
  verify(Number((await query<any>("SELECT COUNT(*) count FROM dbo.ShopOrderStatusHistory WHERE shop_order_id=@id AND new_status=N'READY_FOR_PICKUP'",{id:childA.id})).recordset[0].count)===1,"ready retry has one history");
  verify((await call(`/seller/orders/${childB.id}/stock-check`,"POST",sellerB.token,{action:"UNABLE_TO_FULFILL",reason:"Physical stock unavailable"})).status===200,"Second child cancelled");
  verify((await call(`/admin/shop-orders/${childA.id}/logistics`,"POST",sellerA.token,{action:"PICKED_UP"})).status===403,"Seller cannot perform Admin inbound action");
  for(const action of ["PICKED_UP","IN_TRANSIT_TO_HUB","RECEIVED_AT_HUB"]){
    verify((await call(`/admin/shop-orders/${childA.id}/logistics`,"POST",admin.token,{action})).status===200,`Admin ${action}`);
  }
  verify((await call(`/admin/shop-orders/${childA.id}/logistics`,"POST",admin.token,{action:"HUB_CHECK_FAILED"})).status===400,"Hub failure reason required");
  const before=(await query<any>("SELECT (SELECT COUNT(*) FROM dbo.Refunds WHERE order_id=@id) refunds,(SELECT COUNT(*) FROM dbo.CompensationVouchers WHERE source_order_id=@id) vouchers,(SELECT COUNT(*) FROM dbo.MarketplaceNotifications WHERE order_id=@id) notices",{id:orderId})).recordset[0];
  verify((await call(`/admin/shop-orders/${childA.id}/logistics`,"POST",admin.token,{action:"HUB_CHECK_FAILED",reason:"Package seal requires manual review"})).status===200,"Hub check failed");
  verify((await call(`/admin/orders/${orderId}/logistics`,"POST",admin.token,{action:"READY_TO_SHIP"})).status===409,"failed child blocks Parent");
  const failed=(await query<any>("SELECT status FROM dbo.ShopOrders WHERE id=@id",{id:childA.id})).recordset[0];
  verify(failed.status==="HUB_CHECK_FAILED","failed status persisted");
  const after=(await query<any>("SELECT (SELECT COUNT(*) FROM dbo.Refunds WHERE order_id=@id) refunds,(SELECT COUNT(*) FROM dbo.CompensationVouchers WHERE source_order_id=@id) vouchers,(SELECT COUNT(*) FROM dbo.MarketplaceNotifications WHERE order_id=@id) notices",{id:orderId})).recordset[0];
  verify(before.refunds===after.refunds&&before.vouchers===after.vouchers&&before.notices===after.notices,"hub fail creates no refund/voucher/notification");
  verify((await call(`/admin/shop-orders/${childA.id}/logistics`,"POST",admin.token,{action:"HUB_CHECK_PASSED",reason:"Resolved outside system"})).status===200,"Admin recheck passes");
  verify((await query<any>("SELECT logistics_status FROM dbo.Orders WHERE id=@id",{id:orderId})).recordset[0].logistics_status==="WAITING_FOR_SHOPS","all pass does not auto-ready");
  verify((await call(`/admin/orders/${orderId}/logistics`,"POST",admin.token,{action:"SHIPPED"})).status===409,"Parent cannot skip READY_TO_SHIP");
  verify((await call(`/admin/orders/${orderId}/logistics`,"POST",admin.token,{action:"READY_TO_SHIP"})).status===200,"cancelled child does not block ready");
  verify((await call(`/admin/orders/${orderId}/logistics`,"POST",admin.token,{action:"SHIPPED"})).status===200,"Parent shipped");
  const inventoryBefore=(await query<any>("SELECT variant_id,on_hand,reserved FROM dbo.Inventory WHERE variant_id IN (@a,@b)",{a:a.variantId,b:b.variantId})).recordset;
  verify((await call(`/admin/orders/${orderId}/logistics`,"POST",admin.token,{action:"DELIVERED"})).status===200,"Parent delivered");
  const inventoryAfter=(await query<any>("SELECT variant_id,on_hand,reserved FROM dbo.Inventory WHERE variant_id IN (@a,@b)",{a:a.variantId,b:b.variantId})).recordset;
  const a0=inventoryBefore.find((row:any)=>row.variant_id===a.variantId),a1=inventoryAfter.find((row:any)=>row.variant_id===a.variantId),b0=inventoryBefore.find((row:any)=>row.variant_id===b.variantId),b1=inventoryAfter.find((row:any)=>row.variant_id===b.variantId);
  verify(a1.on_hand===a0.on_hand-1&&a1.reserved===0,"active reservation consumed");
  verify(b1.on_hand===b0.on_hand&&b1.reserved===0,"cancelled item not consumed");
  const adjustments=Number((await query<any>("SELECT COUNT(*) count FROM dbo.InventoryAdjustments WHERE reference_id=(SELECT order_number FROM dbo.Orders WHERE id=@id)",{id:orderId})).recordset[0].count);
  verify((await call(`/admin/orders/${orderId}/logistics`,"POST",admin.token,{action:"DELIVERED"})).status===200,"delivery retry idempotent");
  verify(Number((await query<any>("SELECT COUNT(*) count FROM dbo.InventoryAdjustments WHERE reference_id=(SELECT order_number FROM dbo.Orders WHERE id=@id)",{id:orderId})).recordset[0].count)===adjustments,"delivery retry does not consume twice");
  verify(Number((await query<any>("SELECT COUNT(*) count FROM dbo.ShopOrderStatusHistory WHERE shop_order_id=@id AND new_status=N'HUB_CHECK_FAILED'",{id:childA.id})).recordset[0].count)===1,"failed history retained");
  verify(Number((await query<any>("SELECT COUNT(*) count FROM dbo.OrderLogisticsStatusHistory WHERE order_id=@id",{id:orderId})).recordset[0].count)===4,"Parent immutable logistics history");
  console.log(`[SELLER-010 ACCEPTANCE PASS] assertions=${assertions} database=${config.db.database}`);
}
async function dropDatabase(){const master=new mssql.ConnectionPool({...config.db,database:"master"});await master.connect();try{await master.request().batch(`IF DB_ID(N'${config.db.database}') IS NOT NULL BEGIN ALTER DATABASE [${config.db.database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${config.db.database}]; END`);}finally{await master.close();}}
async function run(){try{const {default:app}=await import("../app");server=app.listen(port,"127.0.0.1");await new Promise<void>((resolve,reject)=>{server!.once("listening",resolve);server!.once("error",reject);});await main();return 0;}catch(error){console.error("[SELLER-010 ACCEPTANCE FAIL]",error instanceof Error?error.message:error);return 1;}finally{if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()));}await closePool();await dropDatabase();}}
void run().then(code=>{process.exitCode=code;});
