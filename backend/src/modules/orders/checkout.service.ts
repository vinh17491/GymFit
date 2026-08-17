import { randomUUID } from "crypto";
import { getPool, sql } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { loadCommissionConfiguration } from "../marketplace-finance/marketplace-finance.service";
import { orderReservationConfig } from "./order-reservation.config";
import { reserveInventory } from "./order-reservation.service";
import type {
  CreateOrderInput,
  CreateOrderItemInput,
  CreateOrderResult,
  OrderCreationRow,
} from "./orders.types";

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

/** Checkout orchestration boundary; payment and later order flows remain in orders.service.ts. */
export async function createOrder(
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
    let voucher: { id: number; amount: number } | null = null;
    if (input.voucherCode) {
      const voucherResult = await tx
        .request()
        .input("voucherCode", sql.NVarChar(64), input.voucherCode.trim())
        .input("voucherBuyerId", sql.Int, userId)
        .query<{
          id: number;
          amount: number;
          minimumOrderAmount: number;
          status: string;
          expiresAt: Date;
        }>(
          "SELECT id,amount,minimum_order_amount AS minimumOrderAmount,status,expires_at AS expiresAt FROM dbo.CompensationVouchers WITH (UPDLOCK,HOLDLOCK) WHERE code=@voucherCode AND buyer_id=@voucherBuyerId",
        );
      const candidate = voucherResult.recordset[0];
      if (!candidate) throw new AppError(404, "Compensation voucher not found");
      if (candidate.status !== "AVAILABLE")
        throw new AppError(409, "Compensation voucher is not available");
      if (candidate.expiresAt <= new Date())
        throw new AppError(409, "Compensation voucher has expired");
      if (minorToMoney(subtotalMinor) < Number(candidate.minimumOrderAmount))
        throw new AppError(409, "Minimum merchandise subtotal for voucher is not met");
      voucher = { id: candidate.id, amount: Number(candidate.amount) };
    }
    const pricing = {
      subtotal: minorToMoney(subtotalMinor),
      discountAmount: voucher ? Math.min(voucher.amount, minorToMoney(subtotalMinor)) : 0,
      shippingAmount: 0,
      taxAmount: 0,
      currency: orderCurrency(),
    };
    const pricingTotal = pricing.subtotal - pricing.discountAmount + pricing.shippingAmount + pricing.taxAmount;
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
      .input("reservationMinutes", sql.Int, orderReservationConfig.reservationMinutes)
      .query<{ id: number; order_number: string; created_at: Date }>(
        "DECLARE @InsertedOrder TABLE(id INT,order_number NVARCHAR(50),created_at DATETIME2); INSERT dbo.Orders(order_number,user_id,customer_name,customer_email,customer_phone,shipping_address_line1,shipping_address_line2,shipping_city,shipping_state,shipping_postal_code,shipping_country,subtotal,discount_amount,shipping_amount,tax_amount,total_amount,currency,order_status,payment_status,payment_provider,reservation_expires_at,created_at,updated_at) OUTPUT INSERTED.id,INSERTED.order_number,INSERTED.created_at INTO @InsertedOrder VALUES(@orderNumber,@userId,@customerName,@customerEmail,@customerPhone,@line1,@line2,@city,@state,@postal,@country,@subtotal,@discount,@shipping,@tax,@total,@currency,N'PENDING',N'UNPAID',N'BANK_TRANSFER',DATEADD(MINUTE,@reservationMinutes,SYSUTCDATETIME()),SYSUTCDATETIME(),SYSUTCDATETIME()); SELECT id,order_number,created_at FROM @InsertedOrder;",
      );
    const order = inserted.recordset[0];
    await tx.request().input("logisticsHistoryOrderId", sql.Int, order.id).query(
      "INSERT dbo.OrderLogisticsStatusHistory(order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@logisticsHistoryOrderId,NULL,N'WAITING_FOR_SHOPS',NULL,N'CREATED_AT_CHECKOUT',SYSUTCDATETIME())",
    );
    if (voucher) {
      await tx
        .request()
        .input("usedVoucherId", sql.BigInt, voucher.id)
        .input("usedOrderId", sql.Int, order.id)
        .query(
          "UPDATE dbo.CompensationVouchers SET status=N'USED',used_at=SYSUTCDATETIME(),used_order_id=@usedOrderId WHERE id=@usedVoucherId AND status=N'AVAILABLE' AND expires_at>SYSUTCDATETIME(); IF @@ROWCOUNT<>1 THROW 50702,'Voucher is no longer available.',1; UPDATE dbo.Orders SET compensation_voucher_id=@usedVoucherId WHERE id=@usedOrderId",
        );
    }
    const shopGroups = new Map<number, { shopId: number; shopName: string; shopSlug: string; subtotalMinor: number }>();
    const { rateBps: commissionRateBps } = await loadCommissionConfiguration(tx);
    for (const item of checkoutItems) {
      const row = rows.find((candidate) => candidate.variantId === item.variantId);
      if (!row) throw new AppError(409, "Order variant resolution failed");
      const existing = shopGroups.get(row.shopId);
      const lineMinor = moneyToMinor(row.price) * item.quantity;
      if (existing) existing.subtotalMinor += lineMinor;
      else shopGroups.set(row.shopId, { shopId: row.shopId, shopName: row.shopName, shopSlug: row.shopSlug, subtotalMinor: lineMinor });
    }
    const createdShopOrders = new Map<number, { id: number; shopId: number; shopName: string; shopSlug: string; subtotal: number }>();
    for (const group of [...shopGroups.values()].sort((a, b) => a.shopId - b.shopId)) {
      const shopOrderResult = await tx
        .request()
        .input("orderId", sql.Int, order.id)
        .input("shopId", sql.Int, group.shopId)
        .input("subtotal", sql.Decimal(18, 2), minorToMoney(group.subtotalMinor))
        .input("commissionRate", sql.Int, commissionRateBps)
        .query<{ id: number }>(
          "DECLARE @commission DECIMAL(18,2)=ROUND(@subtotal*@commissionRate/10000.0,2); INSERT dbo.ShopOrders(order_id,shop_id,status,subtotal,commission_rate_snapshot,commission_base_amount,commission_amount,seller_net_before_adjustment,commission_snapshotted_at,created_at,updated_at) OUTPUT INSERTED.id VALUES(@orderId,@shopId,N'PENDING_PAYMENT',@subtotal,@commissionRate,@subtotal,@commission,@subtotal-@commission,SYSUTCDATETIME(),SYSUTCDATETIME(),SYSUTCDATETIME())",
        );
      const shopOrderId = shopOrderResult.recordset[0]?.id;
      if (!shopOrderId) throw new AppError(409, "ShopOrder creation failed");
      await tx.request().input("shopOrderId", sql.Int, shopOrderId).query(
        "INSERT dbo.ShopOrderStatusHistory(shop_order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@shopOrderId,NULL,N'PENDING_PAYMENT',NULL,N'CREATED_AT_CHECKOUT',SYSUTCDATETIME())",
      );
      createdShopOrders.set(group.shopId, { id: shopOrderId, shopId: group.shopId, shopName: group.shopName, shopSlug: group.shopSlug, subtotal: minorToMoney(group.subtotalMinor) });
    }
    for (const item of checkoutItems) {
      const row = rows.find((candidate) => candidate.variantId === item.variantId) as OrderCreationRow;
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
        .input("lineTotal", sql.Decimal(18, 2), minorToMoney(moneyToMinor(row.price) * item.quantity))
        .query(
          "INSERT dbo.OrderItems(order_id,shop_order_id,product_id,variant_id,product_name,variant_name,sku,quantity,unit_price,line_total,created_at) VALUES(@orderId,@shopOrderId,@productId,@variantId,@productName,@variantName,@sku,@quantity,@unitPrice,@lineTotal,SYSUTCDATETIME())",
        );
      await reserveInventory(tx, row.variantId, item.quantity);
    }
    const cartCleanup = await tx
      .request()
      .input("cleanupCartId", sql.Int, cart.id)
      .input("cleanupVersion", sql.Int, cart.version)
      .input("expectedItems", sql.Int, checkoutItems.length)
      .query<{ version: number }>(
        "DELETE dbo.CartItems WHERE cart_id=@cleanupCartId; IF @@ROWCOUNT<>@expectedItems THROW 50801,'Cart cleanup count mismatch.',1; UPDATE dbo.Carts SET version=version+1,updated_at=SYSUTCDATETIME() OUTPUT INSERTED.version WHERE id=@cleanupCartId AND version=@cleanupVersion;",
      );
    if (cartCleanup.rowsAffected[1] !== 1 || !cartCleanup.recordset[0]) throw new AppError(409, "CART_CONFLICT: Cart changed during checkout");
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
      shopOrders: [...createdShopOrders.values()].map((shopOrder) => ({
        id: shopOrder.id,
        shop: { id: shopOrder.shopId, name: shopOrder.shopName, slug: shopOrder.shopSlug },
        status: "PENDING_PAYMENT" as const,
        subtotal: shopOrder.subtotal,
      })),
      cartVersion: cartCleanup.recordset[0].version,
    };
  } catch (error: unknown) {
    if (started) await tx.rollback();
    throw error;
  }
}
