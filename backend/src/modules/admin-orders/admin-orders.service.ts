import { getPool, sql } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import type {
  AdminOrderDetail,
  AdminOrderFilters,
  AdminOrderItem,
  AdminShopOrder,
  AdminOrderListItem,
  OrderStatus,
  OrderStatusHistoryItem,
  PaginatedAdminOrders,
  PaymentStatusHistoryItem,
  UpdateOrderStatusInput,
} from "./admin-orders.types";
import { cancelParentShopOrders } from "../orders/order-reservation.service";

type CountedOrder = AdminOrderListItem & { total_count: number };
type OrderDetailRow = {
  id: number;
  orderNumber: string;
  userId: number;
  orderStatus: OrderStatus;
  logisticsStatus:AdminOrderDetail["logisticsStatus"];
  readyToShipAt:Date|null;
  shippedAt:Date|null;
  deliveredAt:Date|null;
  paymentStatus: AdminOrderDetail["paymentStatus"];
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  paymentProvider: string | null;
  paymentReference: string | null;
};
const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["CANCELLED"],
  SHIPPED: [],
  DELIVERED: [],
  CANCELLED: [],
};
const sortColumns: Record<AdminOrderFilters["sortBy"], string> = {
  order_number: "o.order_number",
  customer_name: "o.customer_name",
  total_amount: "o.total_amount",
  order_status: "o.order_status",
  payment_status: "o.payment_status",
  created_at: "o.created_at",
  updated_at: "o.updated_at",
};

function bindFilters(
  request: sql.Request,
  filters: AdminOrderFilters,
): string[] {
  const clauses: string[] = [];
  if (filters.search) {
    request.input("search", sql.NVarChar(255), `%${filters.search}%`);
    clauses.push(
      `(o.order_number LIKE @search OR o.customer_name LIKE @search OR o.customer_email LIKE @search OR o.customer_phone LIKE @search OR o.payment_reference LIKE @search)`,
    );
  }
  if (filters.orderStatus) {
    request.input("orderStatus", sql.NVarChar(30), filters.orderStatus);
    clauses.push("o.order_status=@orderStatus");
  }
  if (filters.paymentStatus) {
    request.input("paymentStatus", sql.NVarChar(30), filters.paymentStatus);
    clauses.push("o.payment_status=@paymentStatus");
  }
  if (filters.userId) {
    request.input("userId", sql.Int, filters.userId);
    clauses.push("o.user_id=@userId");
  }
  if (filters.dateFrom) {
    request.input("dateFrom", sql.DateTime2, filters.dateFrom);
    clauses.push("o.created_at>=@dateFrom");
  }
  if (filters.dateTo) {
    request.input("dateTo", sql.DateTime2, filters.dateTo);
    clauses.push("o.created_at<=@dateTo");
  }
  return clauses;
}

export const adminOrdersService = {
  async list(filters: AdminOrderFilters): Promise<PaginatedAdminOrders> {
    const request = (await getPool())
      .request()
      .input("offset", sql.Int, (filters.page - 1) * filters.limit)
      .input("limit", sql.Int, filters.limit);
    const clauses = bindFilters(request, filters);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const direction = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const result = await request.query<CountedOrder>(
      `SELECT o.id AS id,o.order_number AS orderNumber,o.user_id AS userId,o.customer_name AS customerName,o.customer_email AS customerEmail,o.customer_phone AS customerPhone,COUNT(oi.id) AS itemCount,o.subtotal AS subtotal,o.discount_amount AS discountAmount,o.shipping_amount AS shippingAmount,o.tax_amount AS taxAmount,o.total_amount AS totalAmount,o.currency AS currency,o.order_status AS orderStatus,o.payment_status AS paymentStatus,o.payment_provider AS paymentProvider,o.created_at AS createdAt,o.updated_at AS updatedAt,COUNT_BIG(*) OVER() AS total_count FROM dbo.Orders o LEFT JOIN dbo.OrderItems oi ON oi.order_id=o.id ${where} GROUP BY o.id,o.order_number,o.user_id,o.customer_name,o.customer_email,o.customer_phone,o.subtotal,o.discount_amount,o.shipping_amount,o.tax_amount,o.total_amount,o.currency,o.order_status,o.payment_status,o.payment_provider,o.created_at,o.updated_at ORDER BY ${sortColumns[filters.sortBy]} ${direction},o.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    );
    const total = Number(result.recordset[0]?.total_count ?? 0);
    return {
      items: result.recordset.map(
        ({ total_count: _totalCount, ...item }) => item,
      ),
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    };
  },

  async detail(orderId: number): Promise<AdminOrderDetail> {
    const pool = await getPool();
    const orderResult = await pool
      .request()
      .input("orderId", sql.Int, orderId)
      .query<OrderDetailRow>(
        `SELECT id AS id,order_number AS orderNumber,user_id AS userId,order_status AS orderStatus,logistics_status AS logisticsStatus,ready_to_ship_at AS readyToShipAt,shipped_at AS shippedAt,delivered_at AS deliveredAt,payment_status AS paymentStatus,subtotal AS subtotal,discount_amount AS discountAmount,shipping_amount AS shippingAmount,tax_amount AS taxAmount,total_amount AS totalAmount,currency AS currency,created_at AS createdAt,updated_at AS updatedAt,customer_name AS customerName,customer_email AS customerEmail,customer_phone AS customerPhone,shipping_address_line1 AS addressLine1,shipping_address_line2 AS addressLine2,shipping_city AS city,shipping_state AS state,shipping_postal_code AS postalCode,shipping_country AS country,payment_provider AS paymentProvider,payment_reference AS paymentReference FROM dbo.Orders WHERE id=@orderId`,
      );
    const order = orderResult.recordset[0];
    if (!order) throw new AppError(404, "Order not found");
    const [itemsResult, shopOrderResult, historyResult, paymentHistoryResult,shopHistoryResult,logisticsHistoryResult] =
      await Promise.all([
        pool
          .request()
          .input("orderId", sql.Int, orderId)
          .query<AdminOrderItem>(
            "SELECT id AS id,product_id AS productId,variant_id AS variantId,product_name AS productName,variant_name AS variantName,sku AS sku,quantity AS quantity,unit_price AS unitPrice,line_total AS lineTotal,created_at AS createdAt FROM dbo.OrderItems WHERE order_id=@orderId ORDER BY id ASC",
          ),
        pool
          .request()
          .input("shopOrderParentId", sql.Int, orderId)
          .query<{
            shopOrderId:number;
            shopOrderStatus:AdminShopOrder["status"];
            shopOrderSubtotal:number;
            shopOrderCreatedAt:Date;
            shopOrderUpdatedAt:Date;
            shopId:number;
            shopName:string;
            shopSlug:string;
            itemId:number;
            productId:number;
            variantId:number;
            productName:string;
            variantName:string;
            sku:string;
            quantity:number;
            unitPrice:number;
            lineTotal:number;
            itemCreatedAt:Date;
            readyForPickupAt:Date|null;
            pickedUpAt:Date|null;
            inTransitToHubAt:Date|null;
            receivedAtHubAt:Date|null;
            hubCheckedAt:Date|null;
            shopDeliveredAt:Date|null;
            hubCheckReason:string|null;
          }>(
            "SELECT so.id AS shopOrderId,so.status AS shopOrderStatus,so.subtotal AS shopOrderSubtotal,so.ready_for_pickup_at AS readyForPickupAt,so.picked_up_at AS pickedUpAt,so.in_transit_to_hub_at AS inTransitToHubAt,so.received_at_hub_at AS receivedAtHubAt,so.hub_checked_at AS hubCheckedAt,so.delivered_at AS shopDeliveredAt,fail.note AS hubCheckReason,so.created_at AS shopOrderCreatedAt,so.updated_at AS shopOrderUpdatedAt,s.id AS shopId,s.name AS shopName,s.slug AS shopSlug,oi.id AS itemId,oi.product_id AS productId,oi.variant_id AS variantId,oi.product_name AS productName,oi.variant_name AS variantName,oi.sku,oi.quantity,oi.unit_price AS unitPrice,oi.line_total AS lineTotal,oi.created_at AS itemCreatedAt FROM dbo.ShopOrders so JOIN dbo.Shops s ON s.id=so.shop_id JOIN dbo.OrderItems oi ON oi.shop_order_id=so.id OUTER APPLY (SELECT TOP 1 h.note FROM dbo.ShopOrderStatusHistory h WHERE h.shop_order_id=so.id AND h.new_status=N'HUB_CHECK_FAILED' ORDER BY h.created_at DESC,h.id DESC) fail WHERE so.order_id=@shopOrderParentId ORDER BY so.id,oi.id",
          ),
        pool
          .request()
          .input("orderId", sql.Int, orderId)
          .query<OrderStatusHistoryItem>(
            "SELECT h.id AS id,h.previous_status AS previousStatus,h.new_status AS newStatus,h.changed_by AS changedBy,u.name AS changedByName,u.email AS changedByEmail,h.note AS note,h.created_at AS createdAt FROM dbo.OrderStatusHistory h LEFT JOIN dbo.Users u ON u.id=h.changed_by WHERE h.order_id=@orderId ORDER BY h.created_at DESC,h.id DESC",
          ),
        pool
          .request()
          .input("orderId", sql.Int, orderId)
          .query<PaymentStatusHistoryItem>(
            "SELECT h.id AS id,h.order_id AS orderId,h.previous_status AS previousStatus,h.new_status AS newStatus,h.changed_by AS changedBy,u.name AS changedByName,u.email AS changedByEmail,h.actor_type AS actorType,h.note AS note,h.payment_reference AS paymentReference,h.created_at AS createdAt FROM dbo.PaymentStatusHistory h LEFT JOIN dbo.Users u ON u.id=h.changed_by WHERE h.order_id=@orderId ORDER BY h.created_at DESC,h.id DESC",
          ),
        pool.request().input("shopHistoryOrderId",sql.Int,orderId).query<{
          id:number;shopOrderId:number;previousStatus:string|null;newStatus:string;changedBy:number|null;changedByName:string|null;note:string|null;createdAt:Date;
        }>("SELECT h.id,h.shop_order_id AS shopOrderId,h.previous_status AS previousStatus,h.new_status AS newStatus,h.changed_by AS changedBy,u.name AS changedByName,h.note,h.created_at AS createdAt FROM dbo.ShopOrderStatusHistory h JOIN dbo.ShopOrders so ON so.id=h.shop_order_id LEFT JOIN dbo.Users u ON u.id=h.changed_by WHERE so.order_id=@shopHistoryOrderId ORDER BY h.created_at DESC,h.id DESC"),
        pool.request().input("logisticsHistoryOrderId",sql.Int,orderId).query<{
          id:number;previousStatus:string|null;newStatus:string;changedBy:number|null;changedByName:string|null;note:string|null;createdAt:Date;
        }>("SELECT h.id,h.previous_status AS previousStatus,h.new_status AS newStatus,h.changed_by AS changedBy,u.name AS changedByName,h.note,h.created_at AS createdAt FROM dbo.OrderLogisticsStatusHistory h LEFT JOIN dbo.Users u ON u.id=h.changed_by WHERE h.order_id=@logisticsHistoryOrderId ORDER BY h.created_at DESC,h.id DESC"),
      ]);
    const shopOrders:AdminShopOrder[] = [...new Set(shopOrderResult.recordset.map(row=>row.shopOrderId))]
      .map(shopOrderId=>{
        const rows=shopOrderResult.recordset.filter(row=>row.shopOrderId===shopOrderId);
        const first=rows[0];
        return {
          id:shopOrderId,
          shop:{id:first.shopId,name:first.shopName,slug:first.shopSlug},
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
          hubCheckReason:first.hubCheckReason,
          statusHistory:shopHistoryResult.recordset.filter(item=>item.shopOrderId===shopOrderId),
          items:rows.map(row=>({
            id:row.itemId,
            productId:row.productId,
            variantId:row.variantId,
            productName:row.productName,
            variantName:row.variantName,
            sku:row.sku,
            quantity:row.quantity,
            unitPrice:row.unitPrice,
            lineTotal:row.lineTotal,
            createdAt:row.itemCreatedAt,
          })),
        };
      });
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      orderStatus: order.orderStatus,
      logisticsStatus:order.logisticsStatus,
      readyToShipAt:order.readyToShipAt,
      shippedAt:order.shippedAt,
      deliveredAt:order.deliveredAt,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      shippingAmount: order.shippingAmount,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      currency: order.currency,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
      },
      shipping: {
        addressLine1: order.addressLine1,
        addressLine2: order.addressLine2,
        city: order.city,
        state: order.state,
        postalCode: order.postalCode,
        country: order.country,
      },
      payment: {
        provider: order.paymentProvider,
        reference: order.paymentReference,
      },
      items: itemsResult.recordset,
      shopOrders,
      statusHistory: historyResult.recordset,
      paymentHistory: paymentHistoryResult.recordset,
      logisticsHistory:logisticsHistoryResult.recordset,
      activeShopOrderCount:shopOrders.filter(item=>item.status!=="CANCELLED").length,
      cancelledShopOrderCount:shopOrders.filter(item=>item.status==="CANCELLED").length,
      blockingShopOrders:shopOrders.filter(item=>item.status!=="CANCELLED"&&item.status!=="HUB_CHECK_PASSED").map(item=>({id:item.id,status:item.status})),
    };
  },

  async updateStatus(
    orderId: number,
    input: UpdateOrderStatusInput,
    adminId: number,
  ): Promise<AdminOrderDetail> {
    const pool = await getPool();
    const transaction = pool.transaction();
    let started = false;
    try {
      await transaction.begin();
      started = true;
      const locked = await transaction
        .request()
        .input("orderId", sql.Int, orderId)
        .query<{
          id: number;
          order_status: OrderStatus;
          payment_status: AdminOrderDetail["paymentStatus"];
        }>(
          "SELECT id,order_status,payment_status FROM dbo.Orders WITH (UPDLOCK,HOLDLOCK) WHERE id=@orderId",
        );
      const current = locked.recordset[0];
      if (!current) throw new AppError(404, "Order not found");
      if (current.order_status === input.status)
        throw new AppError(409, `Order is already ${input.status}`);
      if (!transitions[current.order_status].includes(input.status))
        throw new AppError(
          409,
          `Invalid order status transition: ${current.order_status} to ${input.status}`,
        );
      if (input.status === "CANCELLED") {
        if (current.payment_status === "PENDING")
          throw new AppError(
            409,
            "Payment verification must be resolved before cancelling the order",
          );
        if (current.payment_status === "PAID")
          throw new AppError(
            409,
            "Paid orders must be refunded before cancellation",
          );
        if (current.payment_status === "PARTIALLY_REFUNDED")
          throw new AppError(
            409,
            "Partially refunded orders cannot be fully cancelled",
          );
      }
      if (current.order_status === "PENDING" && input.status === "CONFIRMED") {
        const payment = await transaction
          .request()
          .input("paymentOrderId", sql.Int, orderId)
          .query<{ payment_status: string }>(
            "SELECT payment_status FROM dbo.Orders WITH (UPDLOCK,HOLDLOCK) WHERE id=@paymentOrderId",
          );
        if (payment.recordset[0]?.payment_status !== "PAID")
          throw new AppError(
            409,
            "Payment must be confirmed before the order can be confirmed",
          );
      }
      const lifecycle =
        input.status === "CANCELLED" || input.status === "DELIVERED";
      if (lifecycle) {
        const orderItems = await transaction
          .request()
          .input("itemsOrderId", sql.Int, orderId)
          .query<{ itemId:number;variantId: number; quantity: number }>(
            "SELECT id AS itemId,variant_id AS variantId,quantity FROM dbo.OrderItems WITH (UPDLOCK,HOLDLOCK) WHERE order_id=@itemsOrderId AND reservation_released_at IS NULL ORDER BY variant_id ASC,id ASC",
          );
        if (!orderItems.recordset.length && input.status==="DELIVERED")
          throw new AppError(404, "Order items not found");
        const adjustmentRows: Array<{
          variantId: number;
          inventoryId: number;
          previousOnHand: number;
          quantityDelta: number;
          newOnHand: number;
        }> = [];
        for (const item of orderItems.recordset) {
          const inventory = await transaction
            .request()
            .input("variantId", sql.Int, item.variantId)
            .query<{ id: number; on_hand: number; reserved: number }>(
              "SELECT id,on_hand,reserved FROM dbo.Inventory WITH (UPDLOCK,HOLDLOCK) WHERE variant_id=@variantId",
            );
          const row = inventory.recordset[0];
          if (!row) throw new AppError(404, "Inventory not found");
          if (row.reserved < item.quantity)
            throw new AppError(
              409,
              "Inventory reservation is no longer available",
            );
          if (input.status === "DELIVERED" && row.on_hand < item.quantity)
            throw new AppError(409, "Insufficient stock to deliver this order");
          const newOnHand =
            input.status === "DELIVERED"
              ? row.on_hand - item.quantity
              : row.on_hand;
          await transaction
            .request()
            .input("inventoryId", sql.Int, row.id)
            .input("quantity", sql.Int, item.quantity)
            .input("newOnHand", sql.Int, newOnHand)
            .query(
              "UPDATE dbo.Inventory SET on_hand=@newOnHand,reserved=reserved-@quantity,updated_at=SYSUTCDATETIME() WHERE id=@inventoryId",
            );
          await transaction.request()
            .input("releasedItemId",sql.Int,item.itemId)
            .input("releasedBy",sql.Int,adminId)
            .input("releaseReason",sql.NVarChar(100),input.status==="DELIVERED"?"ORDER_DELIVERED":"ADMIN_PARENT_CANCELLED")
            .query("UPDATE dbo.OrderItems SET reservation_released_at=SYSUTCDATETIME(),reservation_released_by=@releasedBy,reservation_release_reason=@releaseReason WHERE id=@releasedItemId AND reservation_released_at IS NULL");
          if (input.status === "DELIVERED")
            adjustmentRows.push({
              variantId: item.variantId,
              inventoryId: row.id,
              previousOnHand: row.on_hand,
              quantityDelta: -item.quantity,
              newOnHand,
            });
        }
        if (adjustmentRows.length) {
          const order = await transaction
            .request()
            .input("orderNumberId", sql.Int, orderId)
            .query<{ orderNumber: string }>(
              "SELECT order_number AS orderNumber FROM dbo.Orders WHERE id=@orderNumberId",
            );
          for (const adjustment of adjustmentRows)
            await transaction
              .request()
              .input("inventoryId", sql.Int, adjustment.inventoryId)
              .input("variantId", sql.Int, adjustment.variantId)
              .input("delta", sql.Int, adjustment.quantityDelta)
              .input("previous", sql.Int, adjustment.previousOnHand)
              .input("next", sql.Int, adjustment.newOnHand)
              .input(
                "reason",
                sql.NVarChar(500),
                `Order fulfillment: ${order.recordset[0]?.orderNumber ?? orderId}`,
              )
              .input(
                "referenceId",
                sql.NVarChar(100),
                String(order.recordset[0]?.orderNumber ?? orderId),
              )
              .input("adminId", sql.Int, adminId)
              .query(
                "INSERT dbo.InventoryAdjustments(inventory_id,variant_id,adjustment_type,quantity_delta,previous_on_hand,new_on_hand,reason,reference_type,reference_id,performed_by,created_at) VALUES(@inventoryId,@variantId,N'MANUAL_CORRECTION',@delta,@previous,@next,@reason,N'ORDER_FULFILLMENT',@referenceId,@adminId,SYSUTCDATETIME())",
              );
        }
      }
      await transaction
        .request()
        .input("orderId", sql.Int, orderId)
        .input("status", sql.NVarChar(30), input.status)
        .query(
          "UPDATE dbo.Orders SET order_status=@status,logistics_status=CASE WHEN @status=N'CANCELLED' THEN NULL ELSE logistics_status END,reservation_expires_at=CASE WHEN @status IN (N'CANCELLED',N'DELIVERED') THEN NULL ELSE reservation_expires_at END,updated_at=SYSUTCDATETIME() WHERE id=@orderId",
        );
      await transaction
        .request()
        .input("orderId", sql.Int, orderId)
        .input("previousStatus", sql.NVarChar(30), current.order_status)
        .input("newStatus", sql.NVarChar(30), input.status)
        .input("changedBy", sql.Int, adminId)
        .input("note", sql.NVarChar(500), input.note ?? null)
        .query(
          "INSERT dbo.OrderStatusHistory(order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@orderId,@previousStatus,@newStatus,@changedBy,@note,SYSUTCDATETIME())",
        );
      if (input.status === "CANCELLED")
        await cancelParentShopOrders(
          transaction,
          orderId,
          adminId,
          input.note?.trim() || "ADMIN_CANCELLED",
        );
      await transaction.commit();
      started = false;
      return this.detail(orderId);
    } catch (error: unknown) {
      if (started) await transaction.rollback();
      throw error;
    }
  },
};
