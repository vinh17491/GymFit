import { getPool,sql } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { mailService } from "../mail/mail.service";
import { issueCompensationVoucher } from "../marketplace-compensation/marketplace-compensation.service";
import { releaseReservationForShopOrder } from "../orders/order-reservation.service";
import type {
  PaginatedSellerShopOrders,
  SellerShopOrderDetail,
  SellerShopOrderFilters,
  SellerShopOrderItem,
  SellerShopOrderSummary,
  SellerStockCheckInput,
} from "./seller-orders.types";

async function ownShopId(userId:number):Promise<number> {
  const result=await (await getPool()).request()
    .input("userId",sql.Int,userId)
    .query<{id:number}>("SELECT id FROM dbo.Shops WHERE owner_user_id=@userId");
  const shop=result.recordset[0];
  if(!shop) throw new AppError(404,"Seller Shop not found");
  return shop.id;
}

export const sellerOrdersService={
  async list(userId:number,filters:SellerShopOrderFilters):Promise<PaginatedSellerShopOrders>{
    const shopId=await ownShopId(userId);
    const request=(await getPool()).request()
      .input("shopId",sql.Int,shopId)
      .input("offset",sql.Int,(filters.page-1)*filters.limit)
      .input("limit",sql.Int,filters.limit);
    const clauses=["so.shop_id=@shopId"];
    if(filters.status){
      request.input("status",sql.NVarChar(30),filters.status);
      clauses.push("so.status=@status");
    }
    const direction=filters.sortOrder==="asc"?"ASC":"DESC";
    const result=await request.query<SellerShopOrderSummary&{totalCount:number}>(
      `SELECT so.id,o.id AS parentOrderId,o.order_number AS parentOrderNumber,so.status,so.subtotal,o.currency,COUNT(oi.id) AS itemCount,so.ready_for_pickup_at AS readyForPickupAt,so.picked_up_at AS pickedUpAt,so.in_transit_to_hub_at AS inTransitToHubAt,so.received_at_hub_at AS receivedAtHubAt,so.hub_checked_at AS hubCheckedAt,so.delivered_at AS deliveredAt,so.created_at AS createdAt,so.updated_at AS updatedAt,COUNT_BIG(*) OVER() AS totalCount FROM dbo.ShopOrders so JOIN dbo.Orders o ON o.id=so.order_id LEFT JOIN dbo.OrderItems oi ON oi.shop_order_id=so.id WHERE ${clauses.join(" AND ")} GROUP BY so.id,o.id,o.order_number,so.status,so.subtotal,o.currency,so.ready_for_pickup_at,so.picked_up_at,so.in_transit_to_hub_at,so.received_at_hub_at,so.hub_checked_at,so.delivered_at,so.created_at,so.updated_at ORDER BY so.created_at ${direction},so.id ${direction} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    );
    const total=Number(result.recordset[0]?.totalCount??0);
    return {
      items:result.recordset.map(({totalCount:_totalCount,...item})=>item),
      page:filters.page,
      limit:filters.limit,
      total,
      totalPages:Math.ceil(total/filters.limit),
    };
  },

  async detail(userId:number,shopOrderId:number):Promise<SellerShopOrderDetail>{
    const shopId=await ownShopId(userId);
    const pool=await getPool();
    const result=await pool.request()
      .input("shopId",sql.Int,shopId)
      .input("shopOrderId",sql.Int,shopOrderId)
      .query<SellerShopOrderDetail&{
        customerName:string;
        customerPhone:string|null;
        addressLine1:string|null;
        addressLine2:string|null;
        city:string|null;
        state:string|null;
        postalCode:string|null;
        country:string|null;
      }>(
        "SELECT so.id,o.id AS parentOrderId,o.order_number AS parentOrderNumber,so.status,so.subtotal,o.currency,(SELECT COUNT(*) FROM dbo.OrderItems oi WHERE oi.shop_order_id=so.id) AS itemCount,so.ready_for_pickup_at AS readyForPickupAt,so.picked_up_at AS pickedUpAt,so.in_transit_to_hub_at AS inTransitToHubAt,so.received_at_hub_at AS receivedAtHubAt,so.hub_checked_at AS hubCheckedAt,so.delivered_at AS deliveredAt,so.created_at AS createdAt,so.updated_at AS updatedAt,o.customer_name AS customerName,o.customer_phone AS customerPhone,o.shipping_address_line1 AS addressLine1,o.shipping_address_line2 AS addressLine2,o.shipping_city AS city,o.shipping_state AS state,o.shipping_postal_code AS postalCode,o.shipping_country AS country FROM dbo.ShopOrders so JOIN dbo.Orders o ON o.id=so.order_id WHERE so.id=@shopOrderId AND so.shop_id=@shopId",
      );
    const row=result.recordset[0];
    if(!row) throw new AppError(404,"ShopOrder not found");
    const items=await pool.request()
      .input("itemShopOrderId",sql.Int,shopOrderId)
      .input("itemShopId",sql.Int,shopId)
      .query<SellerShopOrderItem>(
        "SELECT oi.id,oi.product_id AS productId,oi.variant_id AS variantId,oi.product_name AS productName,oi.variant_name AS variantName,oi.sku,oi.quantity,oi.unit_price AS unitPrice,oi.line_total AS lineTotal FROM dbo.OrderItems oi JOIN dbo.ShopOrders so ON so.id=oi.shop_order_id WHERE oi.shop_order_id=@itemShopOrderId AND so.shop_id=@itemShopId ORDER BY oi.id",
      );
    const financial=await pool.request().input("financialShopOrderId",sql.Int,shopOrderId).query<{
      refundId:number|null;merchandiseAmount:number|null;shippingAmount:number|null;totalAmount:number|null;refundStatus:"PENDING"|"COMPLETED"|"FAILED"|null;
      voucherId:number|null;voucherCode:string|null;voucherAmount:number|null;minimumOrderAmount:number|null;voucherExpiresAt:Date|null;voucherStatus:string|null;
    }>("SELECT r.id AS refundId,r.merchandise_amount AS merchandiseAmount,r.shipping_amount AS shippingAmount,r.total_amount AS totalAmount,r.status AS refundStatus,v.id AS voucherId,v.code AS voucherCode,v.amount AS voucherAmount,v.minimum_order_amount AS minimumOrderAmount,v.expires_at AS voucherExpiresAt,v.status AS voucherStatus FROM dbo.ShopOrders so LEFT JOIN dbo.Refunds r ON r.shop_order_id=so.id LEFT JOIN dbo.CompensationVouchers v ON v.source_order_id=so.order_id WHERE so.id=@financialShopOrderId");
    const finance=financial.recordset[0];
    return {
      id:row.id,
      parentOrderId:row.parentOrderId,
      parentOrderNumber:row.parentOrderNumber,
      status:row.status,
      subtotal:row.subtotal,
      currency:row.currency,
      itemCount:row.itemCount,
      createdAt:row.createdAt,
      updatedAt:row.updatedAt,
      readyForPickupAt:row.readyForPickupAt,
      pickedUpAt:row.pickedUpAt,
      inTransitToHubAt:row.inTransitToHubAt,
      receivedAtHubAt:row.receivedAtHubAt,
      hubCheckedAt:row.hubCheckedAt,
      deliveredAt:row.deliveredAt,
      refund:finance?.refundId?{id:finance.refundId,merchandiseAmount:Number(finance.merchandiseAmount),shippingAmount:Number(finance.shippingAmount),totalAmount:Number(finance.totalAmount),status:finance.refundStatus as "PENDING"|"COMPLETED"|"FAILED"}:null,
      compensationVoucher:finance?.voucherId?{id:finance.voucherId,code:String(finance.voucherCode),amount:Number(finance.voucherAmount),minimumOrderAmount:Number(finance.minimumOrderAmount),expiresAt:finance.voucherExpiresAt as Date,status:String(finance.voucherStatus)}:null,
      shipping:{
        name:row.customerName,
        phone:row.customerPhone,
        addressLine1:row.addressLine1,
        addressLine2:row.addressLine2,
        city:row.city,
        state:row.state,
        postalCode:row.postalCode,
        country:row.country,
      },
      items:items.recordset,
    };
  },

  async readyForPickup(userId:number,shopOrderId:number){
    const shopId=await ownShopId(userId);
    const pool=await getPool(),tx=pool.transaction();let started=false;
    try{
      await tx.begin();started=true;
      const row=(await tx.request().input("readyShopOrderId",sql.Int,shopOrderId).input("readyShopId",sql.Int,shopId).query<{status:string;paymentStatus:string}>(
        "SELECT so.status,o.payment_status AS paymentStatus FROM dbo.ShopOrders so WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Orders o WITH (UPDLOCK,HOLDLOCK) ON o.id=so.order_id WHERE so.id=@readyShopOrderId AND so.shop_id=@readyShopId",
      )).recordset[0];
      if(!row)throw new AppError(404,"ShopOrder not found");
      if(row.paymentStatus!=="PAID")throw new AppError(409,"Parent payment must be PAID");
      if(row.status==="READY_FOR_PICKUP"){await tx.commit();started=false;return this.detail(userId,shopOrderId);}
      if(row.status!=="PREPARING")throw new AppError(409,"ShopOrder is not PREPARING");
      await tx.request().input("readyUpdateId",sql.Int,shopOrderId).query(
        "UPDATE dbo.ShopOrders SET status=N'READY_FOR_PICKUP',ready_for_pickup_at=COALESCE(ready_for_pickup_at,SYSUTCDATETIME()),updated_at=SYSUTCDATETIME() WHERE id=@readyUpdateId",
      );
      await tx.request().input("readyHistoryId",sql.Int,shopOrderId).input("readyActor",sql.Int,userId).query(
        "INSERT dbo.ShopOrderStatusHistory(shop_order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@readyHistoryId,N'PREPARING',N'READY_FOR_PICKUP',@readyActor,N'SELLER_READY_FOR_PICKUP',SYSUTCDATETIME())",
      );
      await tx.commit();started=false;return this.detail(userId,shopOrderId);
    }catch(error){if(started)await tx.rollback();throw error;}
  },

  async stockCheck(userId:number,shopOrderId:number,input:SellerStockCheckInput){
    const shopId=await ownShopId(userId);
    const pool=await getPool();
    const tx=pool.transaction();
    let started=false;
    let email:{to:string;orderNumber:string;shopName:string;refund:number;voucher:number}|null=null;
    try{
      await tx.begin();started=true;
      const locked=await tx.request().input("shopOrderId",sql.Int,shopOrderId).input("shopId",sql.Int,shopId).query<{
        id:number;orderId:number;status:string;subtotal:number;shopName:string;buyerId:number;orderNumber:string;paymentStatus:string;parentOrderStatus:string;shippingAmount:number;currency:string;customerEmail:string;
      }>("SELECT so.id,so.order_id AS orderId,so.status,so.subtotal,s.name AS shopName,o.user_id AS buyerId,o.order_number AS orderNumber,o.payment_status AS paymentStatus,o.order_status AS parentOrderStatus,o.shipping_amount AS shippingAmount,o.currency,o.customer_email AS customerEmail FROM dbo.ShopOrders so WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Orders o WITH (UPDLOCK,HOLDLOCK) ON o.id=so.order_id JOIN dbo.Shops s ON s.id=so.shop_id WHERE so.id=@shopOrderId AND so.shop_id=@shopId");
      const order=locked.recordset[0];
      if(!order)throw new AppError(404,"ShopOrder not found");
      if(order.paymentStatus!=="PAID")throw new AppError(409,"Parent payment must be PAID");
      if(input.action==="SUFFICIENT"){
        if(order.status==="PREPARING"){await tx.commit();started=false;return this.detail(userId,shopOrderId);}
        if(order.status!=="PENDING_STOCK_CHECK")throw new AppError(409,"ShopOrder is not pending stock check");
        await tx.request().input("shopOrderId",sql.Int,shopOrderId).query("UPDATE dbo.ShopOrders SET status=N'PREPARING',updated_at=SYSUTCDATETIME() WHERE id=@shopOrderId");
        await tx.request().input("shopOrderId",sql.Int,shopOrderId).input("changedBy",sql.Int,userId).query("INSERT dbo.ShopOrderStatusHistory(shop_order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@shopOrderId,N'PENDING_STOCK_CHECK',N'PREPARING',@changedBy,N'SELLER_CONFIRMED_STOCK',SYSUTCDATETIME())");
        await tx.commit();started=false;
        return this.detail(userId,shopOrderId);
      }
      if(order.status==="CANCELLED"){await tx.commit();started=false;return this.detail(userId,shopOrderId);}
      if(order.status!=="PENDING_STOCK_CHECK")throw new AppError(409,"ShopOrder is not pending stock check");
      const reason=input.reason?.trim();
      if(!reason)throw new AppError(400,"Reason is required");
      await tx.request().input("shopOrderId",sql.Int,shopOrderId).input("changedBy",sql.Int,userId).input("reason",sql.NVarChar(500),reason).query("UPDATE dbo.ShopOrders SET status=N'UNABLE_TO_FULFILL',updated_at=SYSUTCDATETIME() WHERE id=@shopOrderId; INSERT dbo.ShopOrderStatusHistory(shop_order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@shopOrderId,N'PENDING_STOCK_CHECK',N'UNABLE_TO_FULFILL',@changedBy,@reason,SYSUTCDATETIME())");
      await releaseReservationForShopOrder(tx,shopOrderId,userId,"SELLER_UNABLE_TO_FULFILL");
      const remaining=await tx.request().input("parentId",sql.Int,order.orderId).input("currentShopOrderId",sql.Int,shopOrderId).query<{count:number}>("SELECT COUNT(*) AS count FROM dbo.ShopOrders WITH (UPDLOCK,HOLDLOCK) WHERE order_id=@parentId AND id<>@currentShopOrderId AND status<>N'CANCELLED'");
      const shippingRefund=Number(remaining.recordset[0]?.count??0)===0?Number(order.shippingAmount):0;
      const refund=await tx.request().input("orderId",sql.Int,order.orderId).input("shopOrderId",sql.Int,shopOrderId).input("buyerId",sql.Int,order.buyerId).input("merchandise",sql.Decimal(18,2),order.subtotal).input("shipping",sql.Decimal(18,2),shippingRefund).input("currency",sql.Char(3),order.currency).input("reason",sql.NVarChar(500),`SELLER_UNABLE_TO_FULFILL: ${reason}`).query<{id:number}>("INSERT dbo.Refunds(order_id,shop_order_id,buyer_id,merchandise_amount,shipping_amount,currency,status,reason,created_at,updated_at) OUTPUT INSERTED.id VALUES(@orderId,@shopOrderId,@buyerId,@merchandise,@shipping,@currency,N'PENDING',@reason,SYSUTCDATETIME(),SYSUTCDATETIME())");
      const refundId=refund.recordset[0].id;
      await tx.request().input("refundId",sql.BigInt,refundId).input("changedBy",sql.Int,userId).input("reason",sql.NVarChar(500),reason).query("INSERT dbo.RefundStatusHistory(refund_id,previous_status,new_status,changed_by,reason,created_at) VALUES(@refundId,NULL,N'PENDING',@changedBy,@reason,SYSUTCDATETIME())");
      const voucher=await issueCompensationVoucher(tx,{buyerId:order.buyerId,orderId:order.orderId,shopOrderId});
      await tx.request().input("buyerId",sql.Int,order.buyerId).input("eventKey",sql.NVarChar(150),`SHOP_ORDER_UNABLE:${shopOrderId}`).input("title",sql.NVarChar(255),"GymFit xin lỗi về đơn hàng không thể thực hiện").input("message",sql.NVarChar(2000),`Shop ${order.shopName} không thể thực hiện ShopOrder #${shopOrderId}. Hoàn hàng hóa ${Number(order.subtotal)} ${order.currency}, hoàn vận chuyển ${shippingRefund} ${order.currency}, trạng thái PENDING. Voucher ${voucher.amount} ${order.currency}, hạn ${voucher.expiresAt.toISOString()}.`).input("orderId",sql.Int,order.orderId).input("shopOrderId",sql.Int,shopOrderId).input("refundId",sql.BigInt,refundId).input("voucherId",sql.BigInt,voucher.id).query("INSERT dbo.MarketplaceNotifications(buyer_id,event_key,notification_type,title,message,order_id,shop_order_id,refund_id,voucher_id,created_at) VALUES(@buyerId,@eventKey,N'SELLER_UNABLE_TO_FULFILL',@title,@message,@orderId,@shopOrderId,@refundId,@voucherId,SYSUTCDATETIME())");
      await tx.request().input("shopOrderId",sql.Int,shopOrderId).input("changedBy",sql.Int,userId).input("reason",sql.NVarChar(500),reason).query("UPDATE dbo.ShopOrders SET status=N'CANCELLED',updated_at=SYSUTCDATETIME() WHERE id=@shopOrderId; INSERT dbo.ShopOrderStatusHistory(shop_order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@shopOrderId,N'UNABLE_TO_FULFILL',N'CANCELLED',@changedBy,@reason,SYSUTCDATETIME())");
      if(Number(remaining.recordset[0]?.count??0)===0){
        if(order.parentOrderStatus!=="CANCELLED")
          await tx.request().input("orderId",sql.Int,order.orderId).input("changedBy",sql.Int,userId).input("previousStatus",sql.NVarChar(30),order.parentOrderStatus).query("UPDATE dbo.Orders SET order_status=N'CANCELLED',logistics_status=NULL,updated_at=SYSUTCDATETIME() WHERE id=@orderId; INSERT dbo.OrderStatusHistory(order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@orderId,@previousStatus,N'CANCELLED',@changedBy,N'ALL_SHOP_ORDERS_CANCELLED',SYSUTCDATETIME())");
      }
      email={to:order.customerEmail,orderNumber:order.orderNumber,shopName:order.shopName,refund:Number(order.subtotal)+shippingRefund,voucher:voucher.amount};
      await tx.commit();started=false;
    }catch(error){if(started)await tx.rollback();throw error;}
    if(email)await mailService.send({to:email.to,subject:`[GymFit] Cập nhật đơn ${email.orderNumber}`,text:`GymFit xin lỗi: ${email.shopName} không thể thực hiện một phần đơn hàng. Khoản hoàn ${email.refund} đang PENDING. Voucher bồi thường ${email.voucher} đã được cấp cho lần mua sau.`});
    return this.detail(userId,shopOrderId);
  },
};
