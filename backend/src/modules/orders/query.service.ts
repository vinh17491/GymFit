import { getPool, sql } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { getBankTransferPublicConfig } from "./payment-configuration";
import type {
  CustomerOrderDetail,
  CustomerOrderItem,
  CustomerShopOrder,
  CustomerOrderListFilters,
  CustomerOrderSummary,
  PaginatedCustomerOrders,
} from "./orders.types";

export async function getCustomerOrder(
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
        logistics_status: CustomerOrderDetail["logisticsStatus"];
        ready_to_ship_at: Date | null;
        shipped_at: Date | null;
        delivered_at: Date | null;
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
    .query<
      CustomerShopOrder &
        CustomerOrderItem & {
          shopId: number;
          shopName: string;
          shopSlug: string;
          shopOrderId: number;
          shopOrderStatus: CustomerShopOrder["status"];
          shopOrderSubtotal: number;
          shopOrderCreatedAt: Date;
          shopOrderUpdatedAt: Date;
          readyForPickupAt: Date | null;
          pickedUpAt: Date | null;
          inTransitToHubAt: Date | null;
          receivedAtHubAt: Date | null;
          hubCheckedAt: Date | null;
          shopDeliveredAt: Date | null;
          itemId: number;
          refundId: number | null;
          merchandiseRefund: number | null;
          shippingRefund: number | null;
          totalRefund: number | null;
          refundStatus: string | null;
          refundReason: string | null;
          voucherId: number | null;
          voucherCode: string | null;
          voucherAmount: number | null;
          voucherMinimum: number | null;
          voucherExpiresAt: Date | null;
          voucherStatus: string | null;
        }
    >(
      "SELECT so.id AS shopOrderId,so.status AS shopOrderStatus,so.subtotal AS shopOrderSubtotal,so.ready_for_pickup_at AS readyForPickupAt,so.picked_up_at AS pickedUpAt,so.in_transit_to_hub_at AS inTransitToHubAt,so.received_at_hub_at AS receivedAtHubAt,so.hub_checked_at AS hubCheckedAt,so.delivered_at AS shopDeliveredAt,so.created_at AS shopOrderCreatedAt,so.updated_at AS shopOrderUpdatedAt,s.id AS shopId,s.name AS shopName,s.slug AS shopSlug,oi.id AS itemId,oi.product_id AS productId,oi.variant_id AS variantId,oi.product_name AS productName,oi.variant_name AS variantName,oi.sku,oi.quantity,oi.unit_price AS unitPrice,oi.line_total AS lineTotal,r.id AS refundId,r.merchandise_amount AS merchandiseRefund,r.shipping_amount AS shippingRefund,r.total_amount AS totalRefund,r.status AS refundStatus,r.reason AS refundReason,v.id AS voucherId,v.code AS voucherCode,v.amount AS voucherAmount,v.minimum_order_amount AS voucherMinimum,v.expires_at AS voucherExpiresAt,v.status AS voucherStatus FROM dbo.ShopOrders so JOIN dbo.Shops s ON s.id=so.shop_id JOIN dbo.OrderItems oi ON oi.shop_order_id=so.id LEFT JOIN dbo.Refunds r ON r.shop_order_id=so.id LEFT JOIN dbo.CompensationVouchers v ON v.source_order_id=so.order_id WHERE so.order_id=@shopOrderParentId ORDER BY so.id,oi.id",
    );
  const shopOrders = [...new Set(shopOrderRows.recordset.map((item) => item.shopOrderId))]
    .map((shopOrderId) => {
      const rows = shopOrderRows.recordset.filter(
        (item) => item.shopOrderId === shopOrderId,
      );
      const first = rows[0];
      return {
        id: shopOrderId,
        shop: { id: first.shopId, name: first.shopName, slug: first.shopSlug },
        status: first.shopOrderStatus,
        subtotal: first.shopOrderSubtotal,
        createdAt: first.shopOrderCreatedAt,
        updatedAt: first.shopOrderUpdatedAt,
        readyForPickupAt: first.readyForPickupAt,
        pickedUpAt: first.pickedUpAt,
        inTransitToHubAt: first.inTransitToHubAt,
        receivedAtHubAt: first.receivedAtHubAt,
        hubCheckedAt: first.hubCheckedAt,
        deliveredAt: first.shopDeliveredAt,
        hubCheckFailed: first.shopOrderStatus === "HUB_CHECK_FAILED",
        refund: first.refundId
          ? {
              id: first.refundId,
              merchandiseAmount: Number(first.merchandiseRefund),
              shippingAmount: Number(first.shippingRefund),
              totalAmount: Number(first.totalRefund),
              status: String(first.refundStatus),
              reason: String(first.refundReason),
            }
          : null,
        compensationVoucher: first.voucherId
          ? {
              id: first.voucherId,
              code: String(first.voucherCode),
              amount: Number(first.voucherAmount),
              minimumOrderAmount: Number(first.voucherMinimum),
              expiresAt: first.voucherExpiresAt as Date,
              status: String(first.voucherStatus),
            }
          : null,
        items: rows.map((item) => ({
          id: item.itemId,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      } satisfies CustomerShopOrder;
    });
  const bankTransfer = getBankTransferPublicConfig(row.order_number);
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    orderStatus: row.order_status,
    logisticsStatus: row.logistics_status,
    readyToShipAt: row.ready_to_ship_at,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
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
}

export async function getReservationMetadata(orderId: number): Promise<{
  reservationExpiresAt: Date | null;
  cancellationReason:
    | "AUTO_EXPIRED"
    | "CUSTOMER_CANCELLED"
    | "ADMIN_CANCELLED"
    | null;
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
}

export async function listCustomerOrders(
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
}

