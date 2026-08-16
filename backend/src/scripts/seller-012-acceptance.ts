import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import * as mssql from 'mssql';
import type { Server } from 'http';
import { config } from '../config/config';
import { closePool,query } from '../config/database';

if(process.env.SELLER012_ACCEPTANCE!=='1')throw new Error('SELLER012_ACCEPTANCE=1 is required');
if(!/^GYMFIT_DB_SELLER012_ACCEPTANCE_[A-Za-z0-9_]+$/.test(config.db.database))throw new Error('Refusing unsafe database');
const port=Number(process.env.ACCEPTANCE_PORT||5543),base=`http://127.0.0.1:${port}/api`,stamp=Date.now();
let server:Server|undefined,assertions=0,lastStatus=0;
const check=(ok:boolean,message:string)=>{assertions++;if(!ok)throw new Error(`Assertion ${assertions}: ${message}; status=${lastStatus}`);};
async function call(method:string,path:string,token?:string,body?:unknown){
  const response=await fetch(base+path,{method,headers:{...(token?{authorization:`Bearer ${token}`}:{}) ,...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});
  lastStatus=response.status;let data:any={};try{data=await response.json();}catch{}return{status:response.status,data};
}
async function user(role:string,key:string){
  const email=`seller012-${key}-${stamp}@example.test`,password=`Aa1!${crypto.randomBytes(8).toString('hex')}`,hash=await bcrypt.hash(password,12);
  const row=(await query<any>('INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version) OUTPUT INSERTED.id VALUES(@email,@hash,@name,@role,1,1,0)',{email,hash,name:`SELLER012 ${key}`,role})).recordset[0];
  const login=await call('POST','/auth/login',undefined,{email,password});check(login.status===200,`${key} login`);return{id:Number(row.id),token:String(login.data.data.accessToken)};
}
async function shop(owner:number,key:string){return Number((await query<any>("INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system) OUTPUT INSERTED.id VALUES(@owner,@name,@slug,N'ACTIVE',1,0)",{owner,name:`Review Shop ${key}`,slug:`seller012-${key}-${stamp}`})).recordset[0].id);}
async function fixture(input:{buyer:number;shop:number;product:number;variant:number;key:string;delivered?:boolean;quantity?:number}){
  const delivered=input.delivered!==false,quantity=input.quantity??2,price=100000;
  const product=(await query<any>('SELECT p.product_name name,v.variant_name variantName,v.sku FROM dbo.Products p JOIN dbo.ProductVariants v ON v.id=@variant WHERE p.id=@product',{product:input.product,variant:input.variant})).recordset[0];
  const order=(await query<any>(`INSERT dbo.Orders(order_number,user_id,customer_name,customer_email,subtotal,total_amount,currency,order_status,payment_status,payment_provider,logistics_status,delivered_at,created_at,updated_at)
    VALUES(@number,@buyer,N'Buyer',N'buyer@example.test',@total,@total,N'VND',@orderStatus,N'PAID',N'BANK_TRANSFER',@logistics,CASE WHEN @delivered=1 THEN SYSUTCDATETIME() END,SYSUTCDATETIME(),SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS INT) id`,
    {number:`S012-${input.key}-${stamp}`,buyer:input.buyer,total:price*quantity,orderStatus:delivered?'DELIVERED':'PROCESSING',logistics:delivered?'DELIVERED':'WAITING_FOR_SHOPS',delivered})).recordset[0];
  const commission=price*quantity*0.05,net=price*quantity-commission;
  const child=(await query<any>(`INSERT dbo.ShopOrders(order_id,shop_id,status,subtotal,delivered_at,commission_rate_snapshot,commission_base_amount,commission_amount,seller_net_before_adjustment,commission_snapshotted_at,created_at,updated_at)
    VALUES(@order,@shop,@status,@total,CASE WHEN @delivered=1 THEN SYSUTCDATETIME() END,500,@total,@commission,@net,SYSUTCDATETIME(),SYSUTCDATETIME(),SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS INT) id`,
    {order:order.id,shop:input.shop,status:delivered?'HUB_CHECK_PASSED':'PREPARING',total:price*quantity,commission,net,delivered})).recordset[0];
  const item=(await query<any>(`INSERT dbo.OrderItems(order_id,shop_order_id,product_id,variant_id,product_name,variant_name,sku,quantity,unit_price,line_total,created_at)
    VALUES(@order,@child,@product,@variant,@name,@variantName,@sku,@quantity,@price,@total,SYSUTCDATETIME());SELECT CAST(SCOPE_IDENTITY() AS INT) id`,
    {order:order.id,child:child.id,product:input.product,variant:input.variant,name:product.name,variantName:product.variantName,sku:product.sku,quantity,price,total:price*quantity})).recordset[0];
  return{orderId:Number(order.id),shopOrderId:Number(child.id),itemId:Number(item.id)};
}
async function main(){
  const admin=await user('admin','admin'),sellerA=await user('seller','seller-a'),sellerB=await user('seller','seller-b'),buyer=await user('member','buyer'),other=await user('member','other');
  const shopA=await shop(sellerA.id,'a'),shopB=await shop(sellerB.id,'b');
  const catalog=(await query<any>('SELECT TOP 2 p.id productId,v.id variantId,p.slug FROM dbo.Products p JOIN dbo.ProductVariants v ON v.product_id=p.id ORDER BY CASE WHEN p.id=0 THEN 0 ELSE 1 END,p.id')).recordset;
  check(catalog[0].productId===0,'Product ID 0 fixture');
  await query('UPDATE dbo.Products SET shop_id=@shop WHERE id=@product',{shop:shopA,product:catalog[0].productId});
  await query('UPDATE dbo.Products SET shop_id=@shop WHERE id=@product',{shop:shopB,product:catalog[1].productId});
  const delivered=await fixture({buyer:buyer.id,shop:shopA,product:catalog[0].productId,variant:catalog[0].variantId,key:'delivered',quantity:3});
  const undelivered=await fixture({buyer:buyer.id,shop:shopA,product:catalog[0].productId,variant:catalog[0].variantId,key:'undelivered',delivered:false});
  check((await call('POST',`/reviews/products/order-items/${delivered.itemId}`,other.token,{rating:5})).status===404,'cross-buyer Product Review blocked');
  check((await call('POST',`/reviews/shops/shop-orders/${delivered.shopOrderId}`,other.token,{rating:5})).status===404,'cross-buyer Shop Review blocked');
  check((await call('POST',`/reviews/products/order-items/${undelivered.itemId}`,buyer.token,{rating:5})).status===409,'undelivered Product Review blocked');
  check((await call('POST',`/reviews/shops/shop-orders/${undelivered.shopOrderId}`,buyer.token,{rating:5})).status===409,'undelivered Shop Review blocked');
  check((await call('POST',`/reviews/products/order-items/${delivered.itemId}`,buyer.token,{rating:0})).status===400,'rating 0 blocked');
  check((await call('POST',`/reviews/products/order-items/${delivered.itemId}`,buyer.token,{rating:4.5})).status===400,'decimal rating blocked');
  check((await call('POST',`/reviews/products/order-items/${delivered.itemId}`,buyer.token,{rating:5,verified_purchase:false,status:'HIDDEN'})).status===400,'forged verified/status blocked');
  let result=await call('POST',`/reviews/products/order-items/${delivered.itemId}`,buyer.token,{rating:5,comment:'  Rất tốt  '});check(result.status===201,'Product Review created');
  const productReview=result.data.data;check(productReview.status==='PUBLISHED'&&productReview.verifiedPurchase===true&&productReview.comment==='Rất tốt','Product Review immediately published and trimmed');
  check(Boolean(productReview.publishedAt),'published_at returned');
  check((await call('POST',`/reviews/products/order-items/${delivered.itemId}`,buyer.token,{rating:1})).status===409,'duplicate Product Review blocked');
  result=await call('POST',`/reviews/shops/shop-orders/${delivered.shopOrderId}`,buyer.token,{rating:3,comment:''});check(result.status===201,'Shop Review created');
  const shopReview=result.data.data;check(shopReview.status==='PUBLISHED'&&shopReview.comment===null,'Shop Review published and empty comment normalized');
  check((await call('POST',`/reviews/shops/shop-orders/${delivered.shopOrderId}`,buyer.token,{rating:4})).status===409,'duplicate Shop Review blocked');
  result=await call('GET',`/products/${catalog[0].productId}/reviews?page=1&limit=20&sort=newest`);check(result.status===200&&result.data.data.total===1,'public Product list includes published Review');
  check(result.data.data.items[0].buyerName&&!('email' in result.data.data.items[0]),'public identity safe');
  result=await call('GET',`/products?sort=best_selling&page=1&pageSize=100`);const product=result.data.data.find((x:any)=>x.id===catalog[0].productId);check(product.soldCount===3&&product.reviewCount===1&&product.commentCount===1&&product.averageRating===5,'Product aggregate and sold count real');
  result=await call('GET',`/shops/${`seller012-a-${stamp}`}`);check(result.data.data.reviewCount===1&&result.data.data.averageRating===3&&result.data.data.completedOrderCount===1,'Shop aggregate real');
  check((await call('PATCH',`/reviews/products/${productReview.id}`,buyer.token,{rating:1})).status===404,'Buyer Product PATCH absent');
  check((await call('DELETE',`/reviews/products/${productReview.id}`,buyer.token)).status===404,'Buyer Product DELETE absent');
  check((await call('POST',`/admin/reviews/product/${productReview.id}/hide`,buyer.token,{reason:'Không đủ quyền'})).status===403,'Buyer moderation blocked');
  check((await call('POST',`/admin/reviews/product/${productReview.id}/hide`,sellerA.token,{reason:'Không đủ quyền'})).status===403,'Seller moderation blocked');
  check((await call('POST',`/admin/reviews/product/${productReview.id}/hide`,admin.token,{reason:''})).status===400,'hide reason required');
  result=await call('POST',`/admin/reviews/product/${productReview.id}/hide`,admin.token,{reason:'Tạm ẩn để kiểm tra'});check(result.status===200&&result.data.data.status==='HIDDEN','Admin hides Review');
  check((await call('POST',`/admin/reviews/product/${productReview.id}/hide`,admin.token,{reason:'Retry'})).status===200,'hide retry idempotent');
  check(Number((await query<any>("SELECT COUNT(*) count FROM dbo.ReviewModerationHistory WHERE review_type=N'PRODUCT' AND review_id=@id AND event_type=N'HIDDEN'",{id:productReview.id})).recordset[0].count)===1,'hide retry no duplicate history');
  result=await call('GET',`/products/${catalog[0].productId}/reviews?page=1&limit=20&sort=newest`);check(result.data.data.total===0,'hidden Review not public');
  result=await call('GET',`/products/${catalog[0].productId}`);check(result.data.data.reviewCount===0&&result.data.data.averageRating===null,'hidden Review excluded aggregate');
  result=await call('GET','/reviews/mine',buyer.token);check(result.data.data.productReviews[0].status==='HIDDEN'&&result.data.data.productReviews[0].moderationReason,'Buyer sees own moderated Review');
  result=await call('GET','/seller/reviews',sellerA.token);check(result.data.data.productReviews.length===0,'Seller sees published only');
  check((await call('GET','/seller/reviews',sellerB.token)).data.data.productReviews.length===0,'cross-Shop Seller scoped');
  result=await call('POST',`/admin/reviews/product/${productReview.id}/restore`,admin.token,{reason:'Khôi phục sau kiểm tra'});check(result.status===200&&result.data.data.status==='PUBLISHED','Admin restores hidden');
  result=await call('GET',`/products/${catalog[0].productId}`);check(result.data.data.reviewCount===1&&result.data.data.averageRating===5,'restore re-includes aggregate');
  result=await call('POST',`/admin/reviews/product/${productReview.id}/reject`,admin.token,{reason:'Nội dung vi phạm'});check(result.status===200&&result.data.data.status==='REJECTED','Admin rejects Review');
  check((await call('GET',`/products/${catalog[0].productId}/reviews?page=1&limit=20&sort=newest`)).data.data.total===0,'rejected Review not public');
  check((await call('POST',`/reviews/products/order-items/${delivered.itemId}`,buyer.token,{rating:1})).status===409,'no resubmit after reject');
  result=await call('POST',`/admin/reviews/shop/${shopReview.id}/hide`,admin.token,{reason:'Kiểm tra Shop Review'});check(result.status===200&&result.data.data.status==='HIDDEN','Admin hides Shop Review');
  result=await call('GET',`/shops/${`seller012-a-${stamp}`}`);check(result.data.data.reviewCount===0&&result.data.data.averageRating===null,'hidden Shop Review excluded aggregate');
  result=await call('POST',`/admin/reviews/shop/${shopReview.id}/restore`,admin.token,{reason:'Khôi phục Shop Review'});check(result.status===200,'Shop Review restore');
  result=await call('GET',`/admin/reviews/product/${productReview.id}/history`,admin.token);check(result.status===200&&result.data.data.length>=4,'Admin history visible');
  let immutable=false;try{await query("UPDATE dbo.ProductReviews SET comment=N'CHANGED' WHERE id=@id",{id:productReview.id});}catch{immutable=true;}check(immutable,'Product Review content immutable');
  immutable=false;try{await query('DELETE dbo.ReviewModerationHistory WHERE id=(SELECT MIN(id) FROM dbo.ReviewModerationHistory)');}catch{immutable=true;}check(immutable,'moderation history immutable');
  const concurrent=await fixture({buyer:buyer.id,shop:shopA,product:catalog[0].productId,variant:catalog[0].variantId,key:'concurrent'});
  const races=await Promise.all([call('POST',`/reviews/products/order-items/${concurrent.itemId}`,buyer.token,{rating:1}),call('POST',`/reviews/products/order-items/${concurrent.itemId}`,buyer.token,{rating:5})]);
  check(races.filter(x=>x.status===201).length===1&&races.filter(x=>x.status===409).length===1,'concurrent duplicate protected');
  check(Number((await query<any>('SELECT COUNT(*) count FROM dbo.ProductReviews WHERE order_item_id=@id',{id:concurrent.itemId})).recordset[0].count)===1,'one Product Review row after race');
  check(Number((await query<any>('SELECT COUNT(*) count FROM dbo.ComplaintReplacements')).recordset[0].count)===0,'Review flow creates no replacement');
  check(Number((await query<any>('SELECT COUNT(*) count FROM dbo.SettlementAdjustments')).recordset[0].count)===0,'Review flow has no settlement impact');
  console.log(`[SELLER-012 ACCEPTANCE PASS] assertions=${assertions} database=${config.db.database}`);
}
async function dropDatabase(){const pool=await new mssql.ConnectionPool({...config.db,database:'master'}).connect();try{await pool.request().batch(`IF DB_ID(N'${config.db.database}') IS NOT NULL BEGIN ALTER DATABASE [${config.db.database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;DROP DATABASE [${config.db.database}];END`);}finally{await pool.close();}}
async function run(){try{const{default:app}=await import('../app');server=app.listen(port,'127.0.0.1');await new Promise<void>((resolve,reject)=>{server!.once('listening',resolve);server!.once('error',reject);});await main();return 0;}catch(error){console.error('[SELLER-012 ACCEPTANCE FAIL]',error instanceof Error?error.message:error);return 1;}finally{if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()));}await closePool();await dropDatabase();}}
void run().then(code=>{process.exitCode=code;});
