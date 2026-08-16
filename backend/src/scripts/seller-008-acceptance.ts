import crypto from "crypto";
import bcrypt from "bcryptjs";
import * as mssql from "mssql";
import type { Server } from "http";
import { config } from "../config/config";
import { closePool,query } from "../config/database";

if(process.env.SELLER008_ACCEPTANCE!=="1")throw new Error("SELLER008_ACCEPTANCE=1 is required");
if(config.db.database==="GYMFIT_DB"||!config.db.database.startsWith("GYMFIT_DB_SELLER008_ACCEPTANCE_"))throw new Error("Refusing canonical database");
const stamp=Date.now(),port=Number(process.env.ACCEPTANCE_PORT||5528),base=`http://127.0.0.1:${port}/api`;
let server:Server|undefined,lastStatus=0,assertions=0;
const verify=(value:boolean,message:string)=>{assertions++;if(!value)throw new Error(`Assertion ${assertions}: ${message}; lastStatus=${lastStatus}`);};
async function call(url:string,method="GET",token?:string,body?:unknown){
  const response=await fetch(base+url,{method,headers:{...(body===undefined?{}:{"content-type":"application/json"}),...(token?{authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  lastStatus=response.status;let data:any={};try{data=await response.json();}catch{}return{status:response.status,data};
}
async function seedUser(role:string,key:string){
  const email=`seller008-${key}-${stamp}@example.test`,password=`Aa1!${crypto.randomBytes(10).toString("hex")}`,hash=await bcrypt.hash(password,12);
  const result=await query<any>("INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version) OUTPUT INSERTED.id VALUES(@email,@hash,@name,@role,1,1,0)",{email,hash,name:`SELLER008 ${key}`,role});
  return{id:Number(result.recordset[0].id),email,password,token:""};
}
async function login(user:{email:string;password:string;token:string}){const result=await call("/auth/login","POST",undefined,{email:user.email,password:user.password});if(result.status!==200)throw new Error(`Login failed: ${user.email}`);user.token=String(result.data.data.accessToken);}
async function checkout(user:{id:number;token:string},body:any){
  const cart=(await query<any>("IF NOT EXISTS(SELECT 1 FROM dbo.Carts WHERE buyer_id=@buyer) INSERT dbo.Carts(buyer_id,version) VALUES(@buyer,1); SELECT id,version FROM dbo.Carts WHERE buyer_id=@buyer",{buyer:user.id})).recordset[0];
  await query("DELETE dbo.CartItems WHERE cart_id=@cart",{cart:cart.id});
  for(const item of body.items)await query("INSERT dbo.CartItems(cart_id,product_id,variant_id,quantity) SELECT @cart,product_id,id,@quantity FROM dbo.ProductVariants WHERE id=@variant",{cart:cart.id,quantity:item.quantity,variant:item.variantId});
  const version=Number(cart.version)+1;
  await query("UPDATE dbo.Carts SET version=@version,updated_at=SYSUTCDATETIME() WHERE id=@cart",{cart:cart.id,version});
  const address=Object.fromEntries(Object.entries(body).filter(([key])=>key!=="items"));
  return call("/orders","POST",user.token,{...address,cartVersion:version});
}
async function seedProduct(shopId:number,key:string,price:number,onHand:number,refs:{brand:number;category:number}){
  const sku=`SELLER008-${key}-${stamp}`;
  const product=(await query<any>("INSERT dbo.Products(product_name,slug,description,sku,price,stock,brand_id,category_id,is_active,shop_id,moderation_status,created_at,updated_at) OUTPUT INSERTED.id VALUES(@name,@slug,N'SELLER008',@sku,@price,@stock,@brand,@category,1,@shop,N'PUBLISHED',SYSUTCDATETIME(),SYSUTCDATETIME())",{name:`SELLER008 ${key}`,slug:`seller008-${key.toLowerCase()}-${stamp}`,sku,price,stock:onHand,brand:refs.brand,category:refs.category,shop:shopId})).recordset[0];
  const variant=(await query<any>("INSERT dbo.ProductVariants(product_id,variant_name,sku,price,is_active,is_default,created_at,updated_at) OUTPUT INSERTED.id VALUES(@product,N'Default',@sku,@price,1,1,SYSUTCDATETIME(),SYSUTCDATETIME())",{product:product.id,sku:`${sku}-V`,price})).recordset[0];
  await query("INSERT dbo.Inventory(variant_id,on_hand,reserved,low_stock_threshold,updated_at) VALUES(@variant,@stock,0,2,SYSUTCDATETIME())",{variant:variant.id,stock:onHand});
  return{productId:Number(product.id),variantId:Number(variant.id)};
}
async function dropDatabase(){
  const name=config.db.database;if(!/^GYMFIT_DB_SELLER008_ACCEPTANCE_[A-Za-z0-9_]+$/.test(name))throw new Error("Unsafe drop target");
  const pool=await new mssql.ConnectionPool({...config.db,database:"master"}).connect();
  try{await pool.request().batch(`IF DB_ID(N'${name}') IS NOT NULL BEGIN ALTER DATABASE [${name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;DROP DATABASE [${name}];END`);}finally{await pool.close();}
}

async function seedHistory(){
  const applied=(await query<any>("SELECT COUNT(*) count FROM dbo.SchemaMigrations WHERE version=N'0105'")).recordset[0];
  if(Number(applied.count)!==0)throw new Error("0105 must be pending for historical seed");
  const member=await seedUser("member","historical");
  const row=(await query<any>("SELECT TOP 1 p.id productId,v.id variantId,v.price,p.shop_id shopId FROM dbo.Products p JOIN dbo.ProductVariants v ON v.product_id=p.id AND v.is_active=1 JOIN dbo.Inventory i ON i.variant_id=v.id WHERE p.id=0 AND i.available>0 ORDER BY v.id")).recordset[0];
  if(!row)throw new Error("Product 0 fixture unavailable");
  const order=(await query<any>("DECLARE @inserted TABLE(id INT);INSERT dbo.Orders(order_number,user_id,customer_name,customer_email,customer_phone,shipping_address_line1,shipping_city,shipping_country,subtotal,total_amount,currency,order_status,payment_status,payment_provider,created_at,updated_at) OUTPUT INSERTED.id INTO @inserted VALUES(@number,@user,N'Historical Buyer',@email,N'0900000000',N'1 Legacy',N'HCM',N'VN',@price,@price,N'VND',N'PENDING',N'UNPAID',N'BANK_TRANSFER',SYSUTCDATETIME(),SYSUTCDATETIME());SELECT id FROM @inserted",{number:`SELLER008-HISTORY-${stamp}`,user:member.id,email:member.email,price:Number(row.price)})).recordset[0];
  await query("INSERT dbo.OrderItems(order_id,product_id,variant_id,product_name,variant_name,sku,quantity,unit_price,line_total,created_at) SELECT @order,p.id,v.id,p.product_name,v.variant_name,v.sku,1,v.price,v.price,SYSUTCDATETIME() FROM dbo.Products p JOIN dbo.ProductVariants v ON v.id=@variant WHERE p.id=@product",{order:order.id,product:row.productId,variant:row.variantId});
  await query("UPDATE dbo.Inventory SET reserved=reserved+1 WHERE variant_id=@variant",{variant:row.variantId});
  console.log(`[SELLER-008 HISTORICAL SEED READY] order=${order.id} product=0`);
}

async function main(){
  const migration=(await query<any>("SELECT COUNT(*) count FROM dbo.SchemaMigrations WHERE version=N'0105'")).recordset[0];
  verify(Number(migration.count)===1,"0105 applied");
  const historical=(await query<any>("SELECT TOP 1 o.id orderId,o.subtotal parentSubtotal,so.id shopOrderId,so.status,so.subtotal shopSubtotal,oi.shop_order_id itemShopOrderId,p.shop_id productShopId,so.shop_id shopOrderShopId FROM dbo.Orders o JOIN dbo.OrderItems oi ON oi.order_id=o.id JOIN dbo.ShopOrders so ON so.id=oi.shop_order_id JOIN dbo.Products p ON p.id=oi.product_id WHERE o.order_number LIKE N'SELLER008-HISTORY-%'")).recordset[0];
  verify(Boolean(historical),"historical Order backfilled");
  verify(historical.shopOrderId===historical.itemShopOrderId,"historical item association");
  verify(historical.productShopId===historical.shopOrderShopId,"historical Shop association");
  verify(Number(historical.parentSubtotal)===Number(historical.shopSubtotal),"historical subtotal");
  verify(historical.status==="PENDING_PAYMENT","historical status mapping");

  const buyer=await seedUser("member","buyer"),other=await seedUser("member","other"),coach=await seedUser("coach","coach"),admin=await seedUser("admin","admin"),sellerA=await seedUser("seller","seller-a"),sellerB=await seedUser("seller","seller-b");
  await Promise.all([login(buyer),login(other),login(coach),login(admin),login(sellerA),login(sellerB)]);
  await query("INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system) VALUES(@a,N'SELLER008 Shop A',@as,N'ACTIVE',1,0),(@b,N'SELLER008 Shop B',@bs,N'ACTIVE',1,0)",{a:sellerA.id,as:`seller008-a-${stamp}`,b:sellerB.id,bs:`seller008-b-${stamp}`});
  const shops=(await query<any>("SELECT id,owner_user_id FROM dbo.Shops WHERE owner_user_id IN(@a,@b)",{a:sellerA.id,b:sellerB.id})).recordset;
  const shopA=Number(shops.find((row:any)=>row.owner_user_id===sellerA.id).id),shopB=Number(shops.find((row:any)=>row.owner_user_id===sellerB.id).id);
  const refs=(await query<any>("SELECT (SELECT TOP 1 id FROM dbo.Brands WHERE is_active=1 ORDER BY id) brand,(SELECT TOP 1 id FROM dbo.Categories WHERE is_active=1 ORDER BY id) category")).recordset[0];
  const a1=await seedProduct(shopA,"A1",10000,10,refs),a2=await seedProduct(shopA,"A2",20000,10,refs),b1=await seedProduct(shopB,"B1",30000,2,refs);
  const body={customerName:"Buyer",customerPhone:"0900000000",shippingAddressLine1:"1 Test",shippingCity:"HCM",shippingCountry:"VN",items:[{variantId:a1.variantId,quantity:2},{variantId:a2.variantId,quantity:1},{variantId:b1.variantId,quantity:1}]};
  let result=await checkout(buyer,body);
  verify(result.status===201,"multi-Shop checkout");
  const orderId=Number(result.data.data.id);
  verify(result.data.data.shopOrders.length===2,"response has two ShopOrders");
  const integrity=(await query<any>("SELECT (SELECT COUNT(*) FROM dbo.ShopOrders WHERE order_id=@order) shopOrders,(SELECT COUNT(*) FROM dbo.OrderItems WHERE order_id=@order) items,(SELECT COUNT(*) FROM dbo.OrderItems oi JOIN dbo.ShopOrders so ON so.id=oi.shop_order_id JOIN dbo.Products p ON p.id=oi.product_id WHERE oi.order_id=@order AND (oi.order_id<>so.order_id OR p.shop_id<>so.shop_id)) mismatches,(SELECT SUM(subtotal) FROM dbo.ShopOrders WHERE order_id=@order) shopSubtotal,(SELECT subtotal FROM dbo.Orders WHERE id=@order) parentSubtotal",{order:orderId})).recordset[0];
  verify(Number(integrity.shopOrders)===2,"two Shops create two children");
  verify(Number(integrity.items)===3,"three items created");
  verify(Number(integrity.mismatches)===0,"item Parent/Shop invariants");
  verify(Number(integrity.shopSubtotal)===Number(integrity.parentSubtotal),"Parent subtotal equals child sum");
  result=await call(`/orders/${orderId}`,"GET",buyer.token);
  verify(result.status===200&&result.data.data.shopOrders.length===2&&result.data.data.items.length===3,"Buyer nested and flat compatibility");
  verify((await call(`/orders/${orderId}`,"GET",other.token)).status===403,"other Buyer blocked");
  result=await call(`/admin/orders/${orderId}`,"GET",admin.token);
  verify(result.status===200&&result.data.data.shopOrders.length===2&&result.data.data.items.length===3,"Admin Parent and children");
  result=await call("/seller/orders?page=1&limit=20&sortOrder=desc","GET",sellerA.token);
  verify(result.status===200&&result.data.data.items.length===1,"Seller A sees only own child");
  const sellerAShopOrder=Number(result.data.data.items[0].id);
  const sellerBList=await call("/seller/orders?page=1&limit=20&sortOrder=desc","GET",sellerB.token);
  const sellerBShopOrder=Number(sellerBList.data.data.items[0].id);
  verify((await call(`/seller/orders/${sellerAShopOrder}`,"GET",sellerA.token)).status===200,"Seller own detail");
  verify((await call(`/seller/orders/${sellerBShopOrder}`,"GET",sellerA.token)).status===404,"cross-Shop IDOR concealed");
  verify((await call(`/seller/orders/${sellerAShopOrder}/status`,"PATCH",sellerA.token,{status:"PREPARING"})).status===404,"Seller has no write route");
  verify((await call("/orders","POST",buyer.token,{...body,shopId:shopB,totalAmount:1})).status===400,"spoofed Shop/total rejected");
  verify((await call(`/orders/${orderId}/cancel`,"PATCH",buyer.token,{note:"acceptance"})).status===200,"Parent cancellation succeeds");
  verify(Number((await query<any>("SELECT COUNT(*) count FROM dbo.ShopOrders WHERE order_id=@order AND status=N'CANCELLED'",{order:orderId})).recordset[0].count)===2,"full Parent cancellation cancels every child");

  const beforeRollback=(await query<any>("SELECT reserved FROM dbo.Inventory WHERE variant_id=@variant",{variant:a1.variantId})).recordset[0];
  const orderCount=(await query<any>("SELECT COUNT(*) count FROM dbo.Orders")).recordset[0];
  result=await checkout(buyer,{...body,items:[{variantId:a1.variantId,quantity:1},{variantId:b1.variantId,quantity:3}]});
  verify(result.status===409,"insufficient inventory blocked");
  verify(Number((await query<any>("SELECT COUNT(*) count FROM dbo.Orders")).recordset[0].count)===Number(orderCount.count),"failed checkout leaves no Parent");
  verify(Number((await query<any>("SELECT reserved FROM dbo.Inventory WHERE variant_id=@variant",{variant:a1.variantId})).recordset[0].reserved)===Number(beforeRollback.reserved),"failed checkout leaves no reservation");
  await query("UPDATE dbo.Products SET is_active=0 WHERE id=@id",{id:a1.productId});
  verify((await checkout(buyer,{...body,items:[{variantId:a1.variantId,quantity:1}]})).status===404,"inactive Product blocked");
  await query("UPDATE dbo.Products SET is_active=1 WHERE id=@id",{id:a1.productId});
  await query("UPDATE dbo.Shops SET status=N'SUSPENDED' WHERE id=@id",{id:shopA});
  verify((await checkout(buyer,{...body,items:[{variantId:a1.variantId,quantity:1}]})).status===404,"inactive Shop blocked");
  await query("UPDATE dbo.Shops SET status=N'ACTIVE' WHERE id=@id",{id:shopA});
  await query("UPDATE dbo.ProductVariants SET is_active=0 WHERE id=@id",{id:a1.variantId});
  verify((await checkout(buyer,{...body,items:[{variantId:a1.variantId,quantity:1}]})).status===404,"inactive Variant blocked");
  await query("UPDATE dbo.ProductVariants SET is_active=1 WHERE id=@id",{id:a1.variantId});

  const zero=(await query<any>("SELECT TOP 1 v.id variantId FROM dbo.Products p JOIN dbo.ProductVariants v ON v.product_id=p.id JOIN dbo.Inventory i ON i.variant_id=v.id WHERE p.id=0 AND i.available>0")).recordset[0];
  verify(Boolean(zero),"Product 0 fixture available");
  result=await checkout(coach,{...body,items:[{variantId:Number(zero.variantId),quantity:1}]});
  verify(result.status===201,"Coach buyer and Product 0 checkout");
  const historyOwnership=(await query<any>("SELECT (SELECT COUNT(*) FROM dbo.PaymentStatusHistory p LEFT JOIN dbo.Orders o ON o.id=p.order_id WHERE o.id IS NULL) paymentOrphans,(SELECT COUNT(*) FROM dbo.OrderStatusHistory h LEFT JOIN dbo.Orders o ON o.id=h.order_id WHERE o.id IS NULL) orderHistoryOrphans,(SELECT COUNT(*) FROM dbo.OrderItems WHERE shop_order_id IS NULL) itemOrphans,(SELECT COUNT(*) FROM dbo.ShopOrders so LEFT JOIN dbo.Orders o ON o.id=so.order_id LEFT JOIN dbo.Shops s ON s.id=so.shop_id WHERE o.id IS NULL OR s.id IS NULL) shopOrderOrphans")).recordset[0];
  verify(Number(historyOwnership.paymentOrphans)===0,"Payment history remains Parent-owned");
  verify(Number(historyOwnership.orderHistoryOrphans)===0,"Order history remains Parent-owned");
  verify(Number(historyOwnership.itemOrphans)===0&&Number(historyOwnership.shopOrderOrphans)===0,"no orphans");
  console.log(`[SELLER-008 ACCEPTANCE PASS] assertions=${assertions} database=${config.db.database}`);
}

async function run(){
  if(process.argv.includes("seed-history")){try{await seedHistory();return 0;}catch(error){console.error("[SELLER-008 HISTORICAL SEED FAIL]",error instanceof Error?error.message:error);return 1;}finally{await closePool();}}
  try{const{default:app}=await import("../app");server=app.listen(port,"127.0.0.1");await new Promise<void>((resolve,reject)=>{server!.once("listening",resolve);server!.once("error",reject);});await main();return 0;}
  catch(error){console.error("[SELLER-008 ACCEPTANCE FAIL]",error instanceof Error?error.message:error);return 1;}
  finally{if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()));}await closePool();await dropDatabase();}
}
void run().then(code=>{process.exitCode=code;});
