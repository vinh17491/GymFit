import { randomUUID } from "crypto";
import type { Transaction } from "mssql";
import { getPool, sql } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { mailService } from "../mail/mail.service";
import {
  cancelParentShopOrders,
  insertOrderStatusHistory,
  releaseOrderReservation,
} from "./order-reservation.service";
import { getBankTransferPublicConfig } from "./payment-configuration";
import { orderReservationConfig } from "./order-reservation.config";
import {loadCommissionConfiguration} from "../marketplace-finance/marketplace-finance.service";
import type {
  AdminPaymentStatusInput,
  AdminPaymentStatusResult,
  CreateOrderInput,
  CreateOrderItemInput,
  CreateOrderResult,
  CustomerCancelOrderInput,
  CustomerCancelOrderResult,
  CustomerOrderDetail,
  CustomerOrderItem,
  CustomerShopOrder,
  CustomerOrderListFilters,
  CustomerOrderSummary,
  OrderCreationRow,
  PaginatedCustomerOrders,
  PaymentActorType,
  PaymentNotificationInput,
  PaymentNotificationResult,
  PaymentStatus,
} from "./orders.types";

type PaymentOrder = {
  id: number;
  order_number: string;
  user_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  total_amount: number;
  currency: string;
  payment_status: PaymentStatus;
  payment_provider: string | null;
  payment_reference: string | null;
  order_status: string;
  created_at: Date;
  reservation_expires_at: Date | null;
};
const transferContent = (orderNumber: string) => `GYMFIT ${orderNumber}`;
const mailSubject = (subject: string): string => {
  const prefix = process.env.TASK007_MAIL_SUBJECT_PREFIX?.trim();
  return prefix ? `${prefix} ${subject}` : subject;
};
function orderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `GYMFIT-${date}-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

function orderCurrency(): string {
  const currency = (process.env.ORDER_CURRENCY || "VND").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : "VND";
}

const moneyToMinor = (value: number): number => Math.round(Number(value) * 100);
const minorToMoney = (value: number): number => value / 100;

async function insertPaymentStatusHistory(
  transaction: Transaction,
  input: {
    orderId: number;
    previousStatus: PaymentStatus;
    newStatus: PaymentStatus;
    changedBy: number | null;
    actorType: PaymentActorType;
    note?: string | null;
    paymentReference?: string | null;
  },
): Promise<void> {
  if (input.previousStatus === input.newStatus) return;
  const note = input.note?.trim() || null;
  const paymentReference = input.paymentReference?.trim() || null;
  await transaction
    .request()
    .input("historyOrderId", sql.Int, input.orderId)
    .input("historyPreviousStatus", sql.NVarChar(30), input.previousStatus)
    .input("historyNewStatus", sql.NVarChar(30), input.newStatus)
    .input("historyChangedBy", sql.Int, input.changedBy)
    .input("historyActorType", sql.NVarChar(20), input.actorType)
    .input("historyNote", sql.NVarChar(500), note)
    .input("historyPaymentReference", sql.NVarChar(255), paymentReference)
    .query(
      "INSERT dbo.PaymentStatusHistory(order_id,previous_status,new_status,changed_by,actor_type,note,payment_reference,created_at) VALUES(@historyOrderId,@historyPreviousStatus,@historyNewStatus,@historyChangedBy,@historyActorType,@historyNote,@historyPaymentReference,SYSUTCDATETIME())",
    );
}

function adminNotice(order: PaymentOrder, reference: string | null) {
  return {
    to: process.env.ADMIN_NOTIFICATION_EMAIL || "",
    subject: mailSubject(`[GymFit] Customer transfer notification - ${order.order_number}`),
    text: `Order number: ${order.order_number}\nOrder ID: ${order.id}\nCustomer name: ${order.customer_name}\nCustomer email: ${order.customer_email}\nCustomer phone: ${order.customer_phone || "—"}\nTotal amount: ${order.total_amount}\nCurrency: ${order.currency}\nPayment reference: ${reference || "—"}\nTransfer content: ${transferContent(order.order_number)}\nCurrent payment status: PENDING\nCreated time: ${order.created_at.toISOString()}\n\nThis is only a customer-submitted notification. Please verify the bank account before confirming PAID.`,
  };
}
export const ordersService = {
  async createOrder(
    userId: number,
    input: CreateOrderInput,
  ): Promise<CreateOrderResult> {
    const pool = await getPool();
    const tx = pool.transaction();
    let started = false;
    try {
      await tx.begin();
      started = true;
      const user = (
        await tx
          .request()
          .input("userId", sql.Int, userId)
          .query<{ email: string }>(
            "SELECT email FROM dbo.Users WHERE id=@userId AND is_active=1",
          )
      ).recordset[0];
      if (!user) throw new AppError(404, "User not found");
      const cart = (
        await tx
          .request()
          .input("cartBuyerId", sql.Int, userId)
          .query<{ id: number; version: number }>(
            "SELECT id,version FROM dbo.Carts WITH (UPDLOCK,HOLDLOCK) WHERE buyer_id=@cartBuyerId",
          )
      ).recordset[0];
      if (!cart) throw new AppError(409, "Server Cart is empty");
      if (cart.version !== input.cartVersion)
        throw new AppError(409, "CART_CONFLICT: Cart changed before checkout");
      const checkoutItems = (
        await tx
          .request()
          .input("checkoutCartId", sql.Int, cart.id)
          .query<CreateOrderItemInput>(
            "SELECT id AS cartItemId,variant_id AS variantId,quantity FROM dbo.CartItems WITH (UPDLOCK,HOLDLOCK) WHERE cart_id=@checkoutCartId ORDER BY variant_id",
          )
      ).recordset;
      if (checkoutItems.length === 0) throw new AppError(409, "Server Cart is empty");
      if (checkoutItems.length > 50)
        throw new AppError(409, "Cart exceeds checkout item limit (50)");
      const rows: OrderCreationRow[] = [];
      for (const item of checkoutItems) {
        const result = await tx
          .request()
          .input("variantId", sql.Int, item.variantId)
          .query<OrderCreationRow>(
            "SELECT v.id AS variantId,v.product_id AS productId,p.shop_id AS shopId,s.name AS shopName,s.slug AS shopSlug,p.product_name AS productName,v.variant_name AS variantName,v.sku,v.price,v.sale_price AS salePrice,i.on_hand AS onHand,i.reserved FROM dbo.ProductVariants v WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Products p WITH (UPDLOCK,HOLDLOCK) ON p.id=v.product_id JOIN dbo.Shops s WITH (UPDLOCK,HOLDLOCK) ON s.id=p.shop_id JOIN dbo.Inventory i WITH (UPDLOCK,HOLDLOCK) ON i.variant_id=v.id WHERE v.id=@variantId AND p.is_active=1 AND p.moderation_status=N'PUBLISHED' AND s.status=N'ACTIVE' AND v.is_active=1",
          );
        const row = result.recordset[0];
        if (!row)
          throw new AppError(
            404,
            `Variant ${item.variantId} or Inventory not found`,
          );
        if (row.productId === null || row.productId === undefined)
          throw new AppError(404, "Product not found");
        if (row.onHand - row.reserved < item.quantity)
          throw new AppError(
            409,
            `Insufficient stock for variant ${item.variantId}`,
          );
        rows.push({
          ...row,
          price: Number(
            row.salePrice !== null && row.salePrice < row.price
              ? row.salePrice
              : row.price,
          ),
        });
      }
      const subtotalMinor = checkoutItems.reduce((sum, item) => {
        const row = rows.find(
          (candidate) => candidate.variantId === item.variantId,
        );
        if (!row) throw new AppError(409, "Order variant resolution failed");
        return sum + moneyToMinor(row.price) * item.quantity;
      }, 0);
      let voucher:{id:number;amount:number}|null=null;
      if(input.voucherCode){
        const voucherResult=await tx.request().input("voucherCode",sql.NVarChar(64),input.voucherCode.trim()).input("voucherBuyerId",sql.Int,userId).query<{id:number;amount:number;minimumOrderAmount:number;status:string;expiresAt:Date}>(
          "SELECT id,amount,minimum_order_amount AS minimumOrderAmount,status,expires_at AS expiresAt FROM dbo.CompensationVouchers WITH (UPDLOCK,HOLDLOCK) WHERE code=@voucherCode AND buyer_id=@voucherBuyerId",
        );
        const candidate=voucherResult.recordset[0];
        if(!candidate)throw new AppError(404,"Compensation voucher not found");
        if(candidate.status!=="AVAILABLE")throw new AppError(409,"Compensation voucher is not available");
        if(candidate.expiresAt<=new Date())throw new AppError(409,"Compensation voucher has expired");
        if(minorToMoney(subtotalMinor)<Number(candidate.minimumOrderAmount))throw new AppError(409,"Minimum merchandise subtotal for voucher is not met");
        voucher={id:candidate.id,amount:Number(candidate.amount)};
      }
      const pricing = {
        subtotal: minorToMoney(subtotalMinor),
        discountAmount: voucher?Math.min(voucher.amount,minorToMoney(subtotalMinor)):0,
        shippingAmount: 0,
        taxAmount: 0,
        currency: orderCurrency(),
      };
      const pricingTotal = pricing.subtotal-pricing.discountAmount+pricing.shippingAmount+pricing.taxAmount;
      const inserted = await tx
        .request()
        .input("orderNumber", sql.NVarChar(50), orderNumber())
        .input("userId", sql.Int, userId)
        .input("customerName", sql.NVarChar(200), input.customerName)
        .input("customerEmail", sql.NVarChar(255), user.email)
        .input("customerPhone", sql.NVarChar(50), input.customerPhone)
        .input("line1", sql.NVarChar(255), input.shippingAddressLine1)
        .input("line2", sql.NVarChar(255), input.shippingAddressLine2 || null)
        .input("city", sql.NVarChar(100), input.shippingCity)
        .input("state", sql.NVarChar(100), input.shippingState || null)
        .input("postal", sql.NVarChar(30), input.shippingPostalCode || null)
        .input("country", sql.NVarChar(100), input.shippingCountry)
        .input("subtotal", sql.Decimal(18, 2), pricing.subtotal)
        .input("discount", sql.Decimal(18, 2), pricing.discountAmount)
        .input("shipping", sql.Decimal(18, 2), pricing.shippingAmount)
        .input("tax", sql.Decimal(18, 2), pricing.taxAmount)
        .input("total", sql.Decimal(18, 2), pricingTotal)
        .input("currency", sql.Char(3), pricing.currency)
        .input(
          "reservationMinutes",
          sql.Int,
          orderReservationConfig.reservationMinutes,
        )
        .query<{ id: number; order_number: string; created_at: Date }>(
          "DECLARE @InsertedOrder TABLE(id INT,order_number NVARCHAR(50),created_at DATETIME2); INSERT dbo.Orders(order_number,user_id,customer_name,customer_email,customer_phone,shipping_address_line1,shipping_address_line2,shipping_city,shipping_state,shipping_postal_code,shipping_country,subtotal,discount_amount,shipping_amount,tax_amount,total_amount,currency,order_status,payment_status,payment_provider,reservation_expires_at,created_at,updated_at) OUTPUT INSERTED.id,INSERTED.order_number,INSERTED.created_at INTO @InsertedOrder VALUES(@orderNumber,@userId,@customerName,@customerEmail,@customerPhone,@line1,@line2,@city,@state,@postal,@country,@subtotal,@discount,@shipping,@tax,@total,@currency,N'PENDING',N'UNPAID',N'BANK_TRANSFER',DATEADD(MINUTE,@reservationMinutes,SYSUTCDATETIME()),SYSUTCDATETIME(),SYSUTCDATETIME()); SELECT id,order_number,created_at FROM @InsertedOrder;",
        );
      const order = inserted.recordset[0];
      await tx.request().input("logisticsHistoryOrderId",sql.Int,order.id).query(
        "INSERT dbo.OrderLogisticsStatusHistory(order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@logisticsHistoryOrderId,NULL,N'WAITING_FOR_SHOPS',NULL,N'CREATED_AT_CHECKOUT',SYSUTCDATETIME())",
      );
      if(voucher){
        await tx.request().input("usedVoucherId",sql.BigInt,voucher.id).input("usedOrderId",sql.Int,order.id).query(
          "UPDATE dbo.CompensationVouchers SET status=N'USED',used_at=SYSUTCDATETIME(),used_order_id=@usedOrderId WHERE id=@usedVoucherId AND status=N'AVAILABLE' AND expires_at>SYSUTCDATETIME(); IF @@ROWCOUNT<>1 THROW 50702,'Voucher is no longer available.',1; UPDATE dbo.Orders SET compensation_voucher_id=@usedVoucherId WHERE id=@usedOrderId",
        );
      }
      const shopGroups = new Map<number, {
        shopId:number;
        shopName:string;
        shopSlug:string;
        subtotalMinor:number;
      }>();
      const {rateBps:commissionRateBps}=await loadCommissionConfiguration(tx);
      for (const item of checkoutItems) {
        const row = rows.find(candidate => candidate.variantId === item.variantId);
        if (!row) throw new AppError(409, "Order variant resolution failed");
        const existing = shopGroups.get(row.shopId);
        const lineMinor = moneyToMinor(row.price) * item.quantity;
        if (existing) existing.subtotalMinor += lineMinor;
        else shopGroups.set(row.shopId, {
          shopId: row.shopId,
          shopName: row.shopName,
          shopSlug: row.shopSlug,
          subtotalMinor: lineMinor,
        });
      }
      const createdShopOrders = new Map<number, {
        id:number;
        shopId:number;
        shopName:string;
        shopSlug:string;
        subtotal:number;
      }>();
      for (const group of [...shopGroups.values()].sort((a,b)=>a.shopId-b.shopId)) {
        const shopOrderResult = await tx
          .request()
          .input("orderId", sql.Int, order.id)
          .input("shopId", sql.Int, group.shopId)
          .input("subtotal", sql.Decimal(18,2), minorToMoney(group.subtotalMinor))
          .input("commissionRate",sql.Int,commissionRateBps)
          .query<{id:number}>(
            "DECLARE @commission DECIMAL(18,2)=ROUND(@subtotal*@commissionRate/10000.0,2); INSERT dbo.ShopOrders(order_id,shop_id,status,subtotal,commission_rate_snapshot,commission_base_amount,commission_amount,seller_net_before_adjustment,commission_snapshotted_at,created_at,updated_at) OUTPUT INSERTED.id VALUES(@orderId,@shopId,N'PENDING_PAYMENT',@subtotal,@commissionRate,@subtotal,@commission,@subtotal-@commission,SYSUTCDATETIME(),SYSUTCDATETIME(),SYSUTCDATETIME())",
          );
        const shopOrderId = shopOrderResult.recordset[0]?.id;
        if (!shopOrderId) throw new AppError(409, "ShopOrder creation failed");
        await tx
          .request()
          .input("shopOrderId", sql.Int, shopOrderId)
          .query(
            "INSERT dbo.ShopOrderStatusHistory(shop_order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@shopOrderId,NULL,N'PENDING_PAYMENT',NULL,N'CREATED_AT_CHECKOUT',SYSUTCDATETIME())",
          );
        createdShopOrders.set(group.shopId, {
          id: shopOrderId,
          shopId: group.shopId,
          shopName: group.shopName,
          shopSlug: group.shopSlug,
          subtotal: minorToMoney(group.subtotalMinor),
        });
      }
      for (const item of checkoutItems) {
        const row = rows.find(
          (candidate) => candidate.variantId === item.variantId,
        ) as OrderCreationRow;
        const shopOrder = createdShopOrders.get(row.shopId);
        if (!shopOrder) throw new AppError(409, "ShopOrder resolution failed");
        await tx
          .request()
          .input("orderId", sql.Int, order.id)
          .input("shopOrderId", sql.Int, shopOrder.id)
          .input("productId", sql.Int, row.productId)
          .input("variantId", sql.Int, row.variantId)
          .input("productName", sql.NVarChar(200), row.productName)
          .input("variantName", sql.NVarChar(200), row.variantName)
          .input("sku", sql.NVarChar(200), row.sku)
          .input("quantity", sql.Int, item.quantity)
          .input("unitPrice", sql.Decimal(18, 2), row.price)
          .input(
            "lineTotal",
            sql.Decimal(18, 2),
            minorToMoney(moneyToMinor(row.price) * item.quantity),
          )
          .query(
            "INSERT dbo.OrderItems(order_id,shop_order_id,product_id,variant_id,product_name,variant_name,sku,quantity,unit_price,line_total,created_at) VALUES(@orderId,@shopOrderId,@productId,@variantId,@productName,@variantName,@sku,@quantity,@unitPrice,@lineTotal,SYSUTCDATETIME())",
          );
        const inventoryUpdate = await tx
          .request()
          .input("variantId", sql.Int, row.variantId)
          .input("quantity", sql.Int, item.quantity)
          .query(
            "UPDATE dbo.Inventory SET reserved=reserved+@quantity,updated_at=SYSUTCDATETIME() WHERE variant_id=@variantId AND reserved+@quantity<=on_hand",
          );
        if (inventoryUpdate.rowsAffected[0] !== 1) {
          throw new AppError(
            409,
            `Inventory reservation failed for variant ${item.variantId}`,
          );
        }
      }
      const cartCleanup = await tx
        .request()
        .input("cleanupCartId", sql.Int, cart.id)
        .input("cleanupVersion", sql.Int, cart.version)
        .input("expectedItems", sql.Int, checkoutItems.length)
        .query<{ version: number }>(
          "DELETE dbo.CartItems WHERE cart_id=@cleanupCartId; IF @@ROWCOUNT<>@expectedItems THROW 50801,'Cart cleanup count mismatch.',1; UPDATE dbo.Carts SET version=version+1,updated_at=SYSUTCDATETIME() OUTPUT INSERTED.version WHERE id=@cleanupCartId AND version=@cleanupVersion;",
        );
      if (cartCleanup.rowsAffected[1] !== 1 || !cartCleanup.recordset[0])
        throw new AppError(409, "CART_CONFLICT: Cart changed during checkout");
      await tx.commit();
      started = false;
      return {
        id: order.id,
        orderNumber: order.order_number,
        orderStatus: "PENDING",
        paymentStatus: "UNPAID",
        paymentProvider: "BANK_TRANSFER",
        subtotal: pricing.subtotal,
        totalAmount: pricingTotal,
        currency: pricing.currency,
        itemCount: checkoutItems.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: order.created_at,
        shopOrders: [...createdShopOrders.values()].map(shopOrder => ({
          id: shopOrder.id,
          shop: {
            id: shopOrder.shopId,
            name: shopOrder.shopName,
            slug: shopOrder.shopSlug,
          },
          status: "PENDING_PAYMENT",
          subtotal: shopOrder.subtotal,
        })),
        cartVersion: cartCleanup.recordset[0].version,
      };
    } catch (error: unknown) {
      if (started) await tx.rollback();
      throw error;
    }
  },
  async getCustomerOrder(
    orderId: number,
    userId: number,
  ): Promise<CustomerOrderDetail> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("orderId", sql.Int, orderId)
      .query<
        CustomerOrderDetail & {
          user_id: number;
          order_number: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          shipping_address_line1: string | null;
          shipping_address_line2: string | null;
          shipping_city: string | null;
          shipping_state: string | null;
          shipping_postal_code: string | null;
          shipping_country: string | null;
          payment_provider: string | null;
          payment_reference: string | null;
          subtotal: number;
          discount_amount: number;
          shipping_amount: number;
          tax_amount: number;
          total_amount: number;
          order_status: string;
          payment_status: string;
          logistics_status:CustomerOrderDetail["logisticsStatus"];
          ready_to_ship_at:Date|null;
          shipped_at:Date|null;
          delivered_at:Date|null;
          created_at: Date;
          updated_at: Date;
        }
      >(
        "SELECT id,order_number,user_id,order_status,logistics_status,ready_to_ship_at,shipped_at,delivered_at,payment_status,payment_provider,payment_reference,subtotal,discount_amount,shipping_amount,tax_amount,total_amount,currency,created_at,updated_at,customer_name,customer_email,customer_phone,shipping_address_line1,shipping_address_line2,shipping_city,shipping_state,shipping_postal_code,shipping_country FROM dbo.Orders WHERE id=@orderId",
      );
    const row = result.recordset[0];
    if (!row) throw new AppError(404, "Order not found");
    if (row.user_id !== userId)
      throw new AppError(403, "You are not allowed to view this order");
    const items = await pool
      .request()
      .input("orderId", sql.Int, orderId)
      .query<CustomerOrderItem>(
        "SELECT id,product_id AS productId,variant_id AS variantId,product_name AS productName,variant_name AS variantName,sku,quantity,unit_price AS unitPrice,line_total AS lineTotal FROM dbo.OrderItems WHERE order_id=@orderId ORDER BY id ASC",
      );
    const shopOrderRows = await pool
      .request()
      .input("shopOrderParentId", sql.Int, orderId)
      .query<CustomerShopOrder & CustomerOrderItem & {
        shopId:number;
        shopName:string;
        shopSlug:string;
        shopOrderId:number;
        shopOrderStatus:CustomerShopOrder["status"];
        shopOrderSubtotal:number;
        shopOrderCreatedAt:Date;
        shopOrderUpdatedAt:Date;
        readyForPickupAt:Date|null;
        pickedUpAt:Date|null;
        inTransitToHubAt:Date|null;
        receivedAtHubAt:Date|null;
        hubCheckedAt:Date|null;
        shopDeliveredAt:Date|null;
        itemId:number;
        refundId:number|null;
        merchandiseRefund:number|null;
        shippingRefund:number|null;
        totalRefund:number|null;
        refundStatus:string|null;
        refundReason:string|null;
        voucherId:number|null;
        voucherCode:string|null;
        voucherAmount:number|null;
        voucherMinimum:number|null;
        voucherExpiresAt:Date|null;
        voucherStatus:string|null;
      }>(
        "SELECT so.id AS shopOrderId,so.status AS shopOrderStatus,so.subtotal AS shopOrderSubtotal,so.ready_for_pickup_at AS readyForPickupAt,so.picked_up_at AS pickedUpAt,so.in_transit_to_hub_at AS inTransitToHubAt,so.received_at_hub_at AS receivedAtHubAt,so.hub_checked_at AS hubCheckedAt,so.delivered_at AS shopDeliveredAt,so.created_at AS shopOrderCreatedAt,so.updated_at AS shopOrderUpdatedAt,s.id AS shopId,s.name AS shopName,s.slug AS shopSlug,oi.id AS itemId,oi.product_id AS productId,oi.variant_id AS variantId,oi.product_name AS productName,oi.variant_name AS variantName,oi.sku,oi.quantity,oi.unit_price AS unitPrice,oi.line_total AS lineTotal,r.id AS refundId,r.merchandise_amount AS merchandiseRefund,r.shipping_amount AS shippingRefund,r.total_amount AS totalRefund,r.status AS refundStatus,r.reason AS refundReason,v.id AS voucherId,v.code AS voucherCode,v.amount AS voucherAmount,v.minimum_order_amount AS voucherMinimum,v.expires_at AS voucherExpiresAt,v.status AS voucherStatus FROM dbo.ShopOrders so JOIN dbo.Shops s ON s.id=so.shop_id JOIN dbo.OrderItems oi ON oi.shop_order_id=so.id LEFT JOIN dbo.Refunds r ON r.shop_order_id=so.id LEFT JOIN dbo.CompensationVouchers v ON v.source_order_id=so.order_id WHERE so.order_id=@shopOrderParentId ORDER BY so.id,oi.id",
      );
    const shopOrders = [...new Set(shopOrderRows.recordset.map(item=>item.shopOrderId))]
      .map(shopOrderId => {
        const rows = shopOrderRows.recordset.filter(item=>item.shopOrderId===shopOrderId);
        const first = rows[0];
        return {
          id: shopOrderId,
          shop: { id:first.shopId, name:first.shopName, slug:first.shopSlug },
          status:first.shopOrderStatus,
          subtotal:first.shopOrderSubtotal,
          createdAt:first.shopOrderCreatedAt,
          updatedAt:first.shopOrderUpdatedAt,
          readyForPickupAt:first.readyForPickupAt,
          pickedUpAt:first.pickedUpAt,
          inTransitToHubAt:first.inTransitToHubAt,
          receivedAtHubAt:first.receivedAtHubAt,
          hubCheckedAt:first.hubCheckedAt,
          deliveredAt:first.shopDeliveredAt,
          hubCheckFailed:first.shopOrderStatus==="HUB_CHECK_FAILED",
          refund:first.refundId?{id:first.refundId,merchandiseAmount:Number(first.merchandiseRefund),shippingAmount:Number(first.shippingRefund),totalAmount:Number(first.totalRefund),status:String(first.refundStatus),reason:String(first.refundReason)}:null,
          compensationVoucher:first.voucherId?{id:first.voucherId,code:String(first.voucherCode),amount:Number(first.voucherAmount),minimumOrderAmount:Number(first.voucherMinimum),expiresAt:first.voucherExpiresAt as Date,status:String(first.voucherStatus)}:null,
          items:rows.map(item=>({
            id:item.itemId,
            productId:item.productId,
            variantId:item.variantId,
            productName:item.productName,
            variantName:item.variantName,
            sku:item.sku,
            quantity:item.quantity,
            unitPrice:item.unitPrice,
            lineTotal:item.lineTotal,
          })),
        } satisfies CustomerShopOrder;
      });
    const bankTransfer = getBankTransferPublicConfig(row.order_number);
    return {
      id: row.id,
      orderNumber: row.order_number,
      userId: row.user_id,
      orderStatus: row.order_status,
      logisticsStatus:row.logistics_status,
      readyToShipAt:row.ready_to_ship_at,
      shippedAt:row.shipped_at,
      deliveredAt:row.delivered_at,
      paymentStatus: row.payment_status,
      paymentProvider: row.payment_provider,
      paymentReference: row.payment_reference,
      subtotal: row.subtotal,
      discountAmount: row.discount_amount,
      shippingAmount: row.shipping_amount,
      taxAmount: row.tax_amount,
      totalAmount: row.total_amount,
      currency: row.currency,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      addressLine1: row.shipping_address_line1,
      addressLine2: row.shipping_address_line2,
      city: row.shipping_city,
      state: row.shipping_state,
      postalCode: row.shipping_postal_code,
      country: row.shipping_country,
      items: items.recordset,
      shopOrders,
      bankTransfer,
    };
  },
  async notifyPayment(
    orderId: number,
    userId: number,
    input: PaymentNotificationInput,
  ): Promise<PaymentNotificationResult> {
    const pool = await getPool();
    const tx = pool.transaction();
    let started = false;
    try {
      await tx.begin();
      started = true;
      const result = await tx
        .request()
        .input("orderId", sql.Int, orderId)
        .query<PaymentOrder>(
          "SELECT id,order_number,user_id,customer_name,customer_email,customer_phone,total_amount,currency,payment_status,payment_provider,payment_reference,order_status,created_at,reservation_expires_at FROM dbo.Orders WITH (UPDLOCK,HOLDLOCK) WHERE id=@orderId",
        );
      const order = result.recordset[0];
      if (!order) throw new AppError(404, "Order not found");
      if (order.user_id !== userId)
        throw new AppError(403, "You may only update your own order");
      const mailStatus = mailService.configurationStatus();
      if (order.payment_status === "PENDING") {
        await tx.commit();
        started = false;
        return {
          orderId: order.id,
          orderNumber: order.order_number,
          paymentStatus: "PENDING",
          paymentProvider: "BANK_TRANSFER",
          paymentUpdated: false,
          notificationSkipped: true,
          reason: "ALREADY_PENDING",
          emailConfigured: mailStatus.configured,
          emailAttempted: false,
          emailSent: false,
        };
      }
      if (order.payment_status === "FAILED")
        throw new AppError(
          409,
          "Payment must be reset to UNPAID by Admin before it can be submitted again",
        );
      if (order.payment_status !== "UNPAID")
        throw new AppError(
          409,
          `Payment status ${order.payment_status} cannot be changed by customer notification`,
        );
      if (!getBankTransferPublicConfig(order.order_number).ready)
        throw new AppError(503, "Bank transfer configuration is incomplete");
      const reference = input.paymentReference?.trim() || null;
      await tx
        .request()
        .input("orderId", sql.Int, orderId)
        .input("reference", sql.NVarChar(255), reference)
        .query(
          "UPDATE dbo.Orders SET payment_provider=N'BANK_TRANSFER',payment_status=N'PENDING',payment_reference=@reference,reservation_expires_at=NULL,updated_at=SYSUTCDATETIME() WHERE id=@orderId",
        );
      await insertPaymentStatusHistory(tx, {
        orderId,
        previousStatus: "UNPAID",
        newStatus: "PENDING",
        changedBy: userId,
        actorType: "CUSTOMER",
        paymentReference: reference,
      });
      await tx.commit();
      started = false;
      const email = await mailService.send(
        adminNotice(
          {
            ...order,
            payment_status: "PENDING",
            payment_provider: "BANK_TRANSFER",
            payment_reference: reference,
          },
          reference,
        ),
      );
      const reason = email.sent
        ? "PAYMENT_UPDATED"
        : email.configured
          ? "MAIL_DELIVERY_FAILED"
          : "MAIL_NOT_CONFIGURED";
      return {
        orderId: order.id,
        orderNumber: order.order_number,
        paymentStatus: "PENDING",
        paymentProvider: "BANK_TRANSFER",
        paymentUpdated: true,
        notificationSkipped: false,
        reason,
        emailConfigured: email.configured,
        emailAttempted: email.attempted,
        emailSent: email.sent,
      };
    } catch (error: unknown) {
      if (started) await tx.rollback();
      throw error;
    }
  },
  async updatePaymentStatus(
    orderId: number,
    adminId: number,
    input: AdminPaymentStatusInput,
  ): Promise<AdminPaymentStatusResult> {
    const pool = await getPool();
    const tx = pool.transaction();
    let started = false;
    try {
      await tx.begin();
      started = true;
      const result = await tx
        .request()
        .input("orderId", sql.Int, orderId)
        .query<PaymentOrder>(
          "SELECT id,order_number,user_id,customer_name,customer_email,customer_phone,total_amount,currency,payment_status,payment_provider,payment_reference,order_status,created_at,reservation_expires_at FROM dbo.Orders WITH (UPDLOCK,HOLDLOCK) WHERE id=@orderId",
        );
      const order = result.recordset[0];
      if (!order) throw new AppError(404, "Order not found");
      const previous = order.payment_status;
      if (previous === input.status){
        await tx.commit();
        started=false;
        return {orderId:order.id,orderNumber:order.order_number,previousPaymentStatus:previous,paymentStatus:input.status,emailSent:false};
      }
      const allowed =
        (previous === "PENDING" &&
          (input.status === "PAID" || input.status === "FAILED")) ||
        (previous === "FAILED" && input.status === "UNPAID") ||
        (previous === "UNPAID" && input.status === "PAID") ||
        (previous === "PAID" && input.status === "REFUNDED");
      if (!allowed)
        throw new AppError(
          409,
          `Invalid payment status transition: ${previous} to ${input.status}`,
        );
      const note = input.note?.trim() || null;
      const noteRequired =
        input.status === "FAILED" ||
        input.status === "UNPAID" ||
        input.status === "REFUNDED" ||
        (previous === "UNPAID" && input.status === "PAID");
      if (noteRequired && !note)
        throw new AppError(
          400,
          `Note is required for payment status transition: ${previous} to ${input.status}`,
        );
      await tx
        .request()
        .input("orderId", sql.Int, orderId)
        .input("status", sql.NVarChar(30), input.status)
        .input(
          "reservationMinutes",
          sql.Int,
          orderReservationConfig.reservationMinutes,
        )
        .query(
          "UPDATE dbo.Orders SET payment_status=@status,reservation_expires_at=CASE WHEN @status=N'UNPAID' THEN DATEADD(MINUTE,@reservationMinutes,SYSUTCDATETIME()) ELSE NULL END,updated_at=SYSUTCDATETIME() WHERE id=@orderId",
        );
      await insertPaymentStatusHistory(tx, {
        orderId,
        previousStatus: previous,
        newStatus: input.status,
        changedBy: adminId,
        actorType: "ADMIN",
        note,
        paymentReference: order.payment_reference,
      });
      if(input.status==="PAID"){
        const children=await tx.request().input("paidParentOrderId",sql.Int,orderId).query<{id:number}>(
          "SELECT id FROM dbo.ShopOrders WITH (UPDLOCK,HOLDLOCK) WHERE order_id=@paidParentOrderId AND status=N'PENDING_PAYMENT' ORDER BY id",
        );
        for(const child of children.recordset)
          await tx.request().input("paidShopOrderId",sql.Int,child.id).input("paidChangedBy",sql.Int,adminId).query(
            "UPDATE dbo.ShopOrders SET status=N'PENDING_STOCK_CHECK',updated_at=SYSUTCDATETIME() WHERE id=@paidShopOrderId; INSERT dbo.ShopOrderStatusHistory(shop_order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@paidShopOrderId,N'PENDING_PAYMENT',N'PENDING_STOCK_CHECK',@paidChangedBy,N'PARENT_PAYMENT_CONFIRMED',SYSUTCDATETIME())",
          );
      }
      if(input.status==="FAILED"){
        await releaseOrderReservation(tx,orderId,adminId,"PAYMENT_FAILED");
        await cancelParentShopOrders(tx,orderId,adminId,note||"PAYMENT_FAILED");
        if(order.order_status!=="CANCELLED"){
          await tx.request().input("failedOrderId",sql.Int,orderId).query("UPDATE dbo.Orders SET order_status=N'CANCELLED',logistics_status=NULL,reservation_expires_at=NULL,updated_at=SYSUTCDATETIME() WHERE id=@failedOrderId");
          await insertOrderStatusHistory(tx,{orderId,previousStatus:order.order_status,newStatus:"CANCELLED",changedBy:adminId,note:note||"PAYMENT_FAILED"});
        }
      }
      await tx.commit();
      started = false;
      const shouldEmail =
        input.status === "PAID" ||
        input.status === "FAILED" ||
        input.status === "REFUNDED";
      const subject = mailSubject(
        input.status === "PAID"
          ? `[GymFit] Payment confirmed - ${order.order_number}`
          : input.status === "FAILED"
            ? `[GymFit] Payment could not be confirmed - ${order.order_number}`
            : `[GymFit] Refund confirmed - ${order.order_number}`
      );
      const text =
        input.status === "PAID"
          ? `Order number: ${order.order_number}\nTotal amount: ${order.total_amount} ${order.currency}\nPayment status: PAID\nOrder status: ${order.order_status}\nConfirmation time: ${new Date().toISOString()}`
          : input.status === "FAILED"
            ? `Order number: ${order.order_number}\nPayment status: FAILED\nPlease check the amount and transfer content, then contact Admin if needed.`
            : `Order number: ${order.order_number}\nPayment status: REFUNDED\nYour manual bank refund has been confirmed by Admin.`;
      const email = shouldEmail
        ? await mailService.send({ to: order.customer_email, subject, text })
        : { sent: false };
      return {
        orderId: order.id,
        orderNumber: order.order_number,
        previousPaymentStatus: previous,
        paymentStatus: input.status,
        emailSent: email.sent,
      };
    } catch (error: unknown) {
      if (started) await tx.rollback();
      throw error;
    }
  },
  async cancelCustomerOrder(
    orderId: number,
    userId: number,
    input: CustomerCancelOrderInput,
  ): Promise<CustomerCancelOrderResult> {
    const pool = await getPool();
    const tx = pool.transaction();
    let started = false;
    try {
      await tx.begin();
      started = true;
      const result = await tx
        .request()
        .input("orderId", sql.Int, orderId)
        .query<{
          id: number;
          order_number: string;
          user_id: number;
          order_status: string;
          payment_status: PaymentStatus;
        }>(
          "SELECT id,order_number,user_id,order_status,payment_status FROM dbo.Orders WITH (UPDLOCK,HOLDLOCK) WHERE id=@orderId",
        );
      const order = result.recordset[0];
      if (!order) throw new AppError(404, "Order not found");
      if (order.user_id !== userId)
        throw new AppError(403, "You may only cancel your own order");
      if (
        order.order_status !== "PENDING" ||
        (order.payment_status !== "UNPAID" && order.payment_status !== "FAILED")
      )
        throw new AppError(
          409,
          "Order cannot be cancelled in its current order/payment state",
        );
      const releasedItems = await releaseOrderReservation(tx, orderId);
      const note = input.note?.trim();
      await tx
        .request()
        .input("orderId", sql.Int, orderId)
        .query(
          "UPDATE dbo.Orders SET order_status=N'CANCELLED',logistics_status=NULL,reservation_expires_at=NULL,updated_at=SYSUTCDATETIME() WHERE id=@orderId",
        );
      await insertOrderStatusHistory(tx, {
        orderId,
        previousStatus: "PENDING",
        newStatus: "CANCELLED",
        changedBy: userId,
        note: note ? `CUSTOMER_CANCELLED: ${note}` : "CUSTOMER_CANCELLED",
      });
      await cancelParentShopOrders(
        tx,
        orderId,
        userId,
        note ? `CUSTOMER_CANCELLED: ${note}` : "CUSTOMER_CANCELLED",
      );
      await tx.commit();
      started = false;
      return {
        orderId,
        orderNumber: order.order_number,
        orderStatus: "CANCELLED",
        releasedItems,
      };
    } catch (error: unknown) {
      if (started) await tx.rollback();
      throw error;
    }
  },
  async getReservationMetadata(
    orderId: number,
  ): Promise<{
    reservationExpiresAt: Date | null;
    cancellationReason:
      "AUTO_EXPIRED" | "CUSTOMER_CANCELLED" | "ADMIN_CANCELLED" | null;
  }> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("metadataOrderId", sql.Int, orderId)
      .query<{
        reservation_expires_at: Date | null;
        order_status: string;
        cancellation_note: string | null;
      }>(
        "SELECT o.reservation_expires_at,o.order_status,(SELECT TOP 1 h.note FROM dbo.OrderStatusHistory h WHERE h.order_id=o.id AND h.new_status=N'CANCELLED' ORDER BY h.created_at DESC,h.id DESC) AS cancellation_note FROM dbo.Orders o WHERE o.id=@metadataOrderId",
      );
    const row = result.recordset[0];
    if (!row) throw new AppError(404, "Order not found");
    const cancellationReason =
      row.order_status !== "CANCELLED"
        ? null
        : row.cancellation_note === "AUTO_EXPIRED_RESERVATION"
          ? "AUTO_EXPIRED"
          : row.cancellation_note?.startsWith("CUSTOMER_CANCELLED")
            ? "CUSTOMER_CANCELLED"
            : "ADMIN_CANCELLED";
    return {
      reservationExpiresAt: row.reservation_expires_at,
      cancellationReason,
    };
  },
  async listCustomerOrders(
    userId: number,
    filters: CustomerOrderListFilters,
  ): Promise<PaginatedCustomerOrders> {
    const pool = await getPool();
    const request = pool
      .request()
      .input("userId", sql.Int, userId)
      .input("offset", sql.Int, (filters.page - 1) * filters.limit)
      .input("limit", sql.Int, filters.limit);
    const clauses = ["o.user_id=@userId"];
    if (filters.orderStatus) {
      request.input("orderStatus", sql.NVarChar(30), filters.orderStatus);
      clauses.push("o.order_status=@orderStatus");
    }
    if (filters.paymentStatus) {
      request.input("paymentStatus", sql.NVarChar(30), filters.paymentStatus);
      clauses.push("o.payment_status=@paymentStatus");
    }
    const direction = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const result = await request.query<
      CustomerOrderSummary & { totalCount: number }
    >(
      `SELECT o.id,o.order_number AS orderNumber,o.order_status AS orderStatus,o.payment_status AS paymentStatus,o.payment_provider AS paymentProvider,COUNT(oi.id) AS itemCount,o.subtotal,o.total_amount AS totalAmount,o.currency,o.reservation_expires_at AS reservationExpiresAt,o.created_at AS createdAt,o.updated_at AS updatedAt,COUNT_BIG(*) OVER() AS totalCount FROM dbo.Orders o LEFT JOIN dbo.OrderItems oi ON oi.order_id=o.id WHERE ${clauses.join(" AND ")} GROUP BY o.id,o.order_number,o.order_status,o.payment_status,o.payment_provider,o.subtotal,o.total_amount,o.currency,o.reservation_expires_at,o.created_at,o.updated_at ORDER BY o.created_at ${direction},o.id ${direction} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    );
    const total = Number(result.recordset[0]?.totalCount ?? 0);
    return {
      items: result.recordset.map(
        ({ totalCount: _totalCount, ...item }) => item,
      ),
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    };
  },
};
