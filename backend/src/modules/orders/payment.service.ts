import type { Transaction } from "mssql";
import { getPool, sql } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { mailService } from "../mail/mail.service";
import {
  cancelParentShopOrders,
  insertOrderStatusHistory,
  releaseOrderReservation,
} from "./order-reservation.service";
import { orderReservationConfig } from "./order-reservation.config";
import { getBankTransferPublicConfig } from "./payment-configuration";
import type {
  AdminPaymentStatusInput,
  AdminPaymentStatusResult,
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

export async function notifyPayment(
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
}

export async function updatePaymentStatus(
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
    if (previous === input.status) {
      await tx.commit();
      started = false;
      return {
        orderId: order.id,
        orderNumber: order.order_number,
        previousPaymentStatus: previous,
        paymentStatus: input.status,
        emailSent: false,
      };
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
    if (input.status === "PAID") {
      const children = await tx
        .request()
        .input("paidParentOrderId", sql.Int, orderId)
        .query<{ id: number }>(
          "SELECT id FROM dbo.ShopOrders WITH (UPDLOCK,HOLDLOCK) WHERE order_id=@paidParentOrderId AND status=N'PENDING_PAYMENT' ORDER BY id",
        );
      for (const child of children.recordset)
        await tx
          .request()
          .input("paidShopOrderId", sql.Int, child.id)
          .input("paidChangedBy", sql.Int, adminId)
          .query(
            "UPDATE dbo.ShopOrders SET status=N'PENDING_STOCK_CHECK',updated_at=SYSUTCDATETIME() WHERE id=@paidShopOrderId; INSERT dbo.ShopOrderStatusHistory(shop_order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@paidShopOrderId,N'PENDING_PAYMENT',N'PENDING_STOCK_CHECK',@paidChangedBy,N'PARENT_PAYMENT_CONFIRMED',SYSUTCDATETIME())",
          );
    }
    if (input.status === "FAILED") {
      await releaseOrderReservation(tx, orderId, adminId, "PAYMENT_FAILED");
      await cancelParentShopOrders(tx, orderId, adminId, note || "PAYMENT_FAILED");
      if (order.order_status !== "CANCELLED") {
        await tx
          .request()
          .input("failedOrderId", sql.Int, orderId)
          .query(
            "UPDATE dbo.Orders SET order_status=N'CANCELLED',logistics_status=NULL,reservation_expires_at=NULL,updated_at=SYSUTCDATETIME() WHERE id=@failedOrderId",
          );
        await insertOrderStatusHistory(tx, {
          orderId,
          previousStatus: order.order_status,
          newStatus: "CANCELLED",
          changedBy: adminId,
          note: note || "PAYMENT_FAILED",
        });
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
          : `[GymFit] Refund confirmed - ${order.order_number}`,
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
}

