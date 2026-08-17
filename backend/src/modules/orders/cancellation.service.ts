import { getPool, sql } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import {
  cancelParentShopOrders,
  insertOrderStatusHistory,
  releaseOrderReservation,
} from "./order-reservation.service";
import type {
  CustomerCancelOrderInput,
  CustomerCancelOrderResult,
  PaymentStatus,
} from "./orders.types";

/** Customer cancellation orchestration; reservation release remains idempotent in the shared service. */
export async function cancelCustomerOrder(
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
}

