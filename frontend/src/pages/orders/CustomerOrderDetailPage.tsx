import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { Copy, RefreshCw, X } from "lucide-react";
import { ordersApi } from "../../services/ordersApi";
import OrderReviewActions from "../../components/reviews/OrderReviewActions";
import type {
  CustomerOrderDetail,
  PaymentNotificationResult,
  PaymentStatus,
} from "../../types/orders";
const labels: Record<PaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PENDING: "Chờ xác nhận",
  PAID: "Đã thanh toán",
  FAILED: "Chưa xác nhận được",
  PARTIALLY_REFUNDED: "Hoàn tiền một phần",
  REFUNDED: "Đã hoàn tiền",
};
const errorMessage = (error: unknown) =>
  error instanceof AxiosError &&
  typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : "Unable to load order";
const money = (value: number, currency: string) =>
  `${value.toFixed(2)} ${currency}`;
const copy = async (value: string, label: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Unable to copy. Please copy it manually.");
  }
};
export default function CustomerOrderDetailPage() {
  const id = Number(useParams().orderId),
    [order, setOrder] = useState<CustomerOrderDetail | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reference, setReference] = useState(""),
    [saving, setSaving] = useState(false),
    [cancelDialog, setCancelDialog] = useState(false),
    [cancelNote, setCancelNote] = useState(""),
    [remainingMs, setRemainingMs] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrder((await ordersApi.getCustomerOrder(id)).data.data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (
      !order?.reservationExpiresAt ||
      order.orderStatus !== "PENDING" ||
      order.paymentStatus !== "UNPAID"
    ) {
      setRemainingMs(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(
        0,
        new Date(order.reservationExpiresAt as string).getTime() - Date.now(),
      );
      setRemainingMs(remaining);
      if (remaining === 0) void load();
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [
    order?.reservationExpiresAt,
    order?.orderStatus,
    order?.paymentStatus,
    load,
  ]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!order || saving || order.bankTransfer?.ready !== true) return;
    const value = reference.trim();
    if (value.length > 255) {
      setError("Payment reference must be 255 characters or fewer");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result: PaymentNotificationResult = (
        await ordersApi.notifyOrderPayment(
          order.id,
          value ? { paymentReference: value } : {},
        )
      ).data.data;
      await load();
      if (result.reason === "PAYMENT_UPDATED" && result.emailSent)
        toast.success(
          "Đã ghi nhận thông báo chuyển khoản và gửi thông báo cho Admin.",
        );
      else if (result.reason === "MAIL_NOT_CONFIGURED")
        toast.error(
          "Thanh toán đã được ghi nhận ở trạng thái chờ xác nhận, nhưng hệ thống email chưa được cấu hình. Admin vẫn có thể kiểm tra đơn hàng trong hệ thống.",
        );
      else if (result.reason === "MAIL_DELIVERY_FAILED")
        toast.error(
          "Thanh toán đã được ghi nhận ở trạng thái chờ xác nhận, nhưng email thông báo gửi không thành công.",
        );
      else if (result.reason === "ALREADY_PENDING")
        toast.success(
          "Đơn hàng đã ở trạng thái chờ Admin xác nhận. Không gửi thông báo trùng.",
        );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return <div className="p-8 text-center text-slate-400">Loading order…</div>;
  if (error && !order)
    return (
      <div className="space-y-4 p-8">
        <Link className="text-blue-400" to="/orders">
          Back to Orders
        </Link>
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300"
        >
          {error}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  const cancelOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!order || saving) return;
    setSaving(true);
    setError("");
    try {
      await ordersApi.cancelOrder(
        order.id,
        cancelNote.trim() ? { note: cancelNote.trim() } : {},
      );
      setCancelDialog(false);
      setCancelNote("");
      await load();
      toast.success("Đã hủy đơn hàng.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  if (!order) return null;
  const status = order.paymentStatus,
    bank = order.bankTransfer,
    bankReady = bank?.ready === true,
    showQr =
      order.orderStatus !== "CANCELLED" &&
      bankReady &&
      (status === "UNPAID" || status === "PENDING" || status === "FAILED"),
    showBankWarning =
      order.orderStatus !== "CANCELLED" &&
      !bankReady &&
      (status === "UNPAID" || status === "PENDING" || status === "FAILED"),
    canCancel =
      order.orderStatus === "PENDING" &&
      (status === "UNPAID" || status === "FAILED");
  const totalSeconds = Math.ceil(remainingMs / 1000),
    countdown = `${Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0")}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
  return (
    <div className="space-y-5 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="text-blue-400" to="/orders">
            Back to Orders
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-slate-400">Order ID: {order.id}</p>
        </div>
        <button
          type="button"
          className="btn-secondary flex items-center gap-2"
          aria-label="Refresh order"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </div>
      <section className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <p>
            Order status: <strong>{order.orderStatus}</strong>
          </p>
          <p>
            Logistics: <strong>{order.logisticsStatus || "Đơn đã hủy"}</strong>
          </p>
          <p>
            Payment status: <strong>{labels[status]}</strong>
          </p>
          <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(order.updatedAt).toLocaleString()}</p>
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <h2 className="mb-3 text-lg font-semibold">Customer</h2>
          <p>{order.customerName}</p>
          <p>{order.customerEmail}</p>
          <p>{order.customerPhone || "—"}</p>
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <h2 className="mb-3 text-lg font-semibold">Shipping</h2>
          <p>{order.addressLine1 || "—"}</p>
          <p>{order.addressLine2 || "—"}</p>
          <p>
            {[order.city, order.state, order.postalCode]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
          <p>{order.country || "—"}</p>
        </section>
      </div>
      <section className="space-y-4 rounded-xl border border-emerald-400/20 p-5">
        <h2 className="text-lg font-semibold">Shop orders</h2>
        {order.shopOrders.map((shopOrder) => (
          <article key={shopOrder.id} className="rounded-lg border border-white/10 p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <Link className="text-emerald-400" to={`/shops/${shopOrder.shop.slug}`}>
                {shopOrder.shop.name}
              </Link>
              <span>{shopOrder.status}</span>
              <strong>{money(shopOrder.subtotal, order.currency)}</strong>
            </div>
            {shopOrder.hubCheckFailed&&<p className="mt-3 rounded bg-amber-500/10 p-3 text-amber-200">Kiện hàng đang được GymFit xử lý thêm tại hub. Đơn tổng vẫn đang chờ các ShopOrder hoàn tất.</p>}
            <div className="mt-3 grid gap-1 text-sm text-white/60 sm:grid-cols-2">
              {shopOrder.pickedUpAt&&<span>Đã lấy: {new Date(shopOrder.pickedUpAt).toLocaleString()}</span>}
              {shopOrder.inTransitToHubAt&&<span>Đang về hub: {new Date(shopOrder.inTransitToHubAt).toLocaleString()}</span>}
              {shopOrder.receivedAtHubAt&&<span>Hub đã nhận: {new Date(shopOrder.receivedAtHubAt).toLocaleString()}</span>}
              {shopOrder.hubCheckedAt&&<span>Đã kiểm tra hub: {new Date(shopOrder.hubCheckedAt).toLocaleString()}</span>}
              {shopOrder.deliveredAt&&<span>Đã giao: {new Date(shopOrder.deliveredAt).toLocaleString()}</span>}
            </div>
            <ul className="mt-3 space-y-1 text-sm text-white/70">
              {shopOrder.items.map((item) => (
                <li key={item.id}>
                  {item.productName} · {item.variantName} × {item.quantity}
                </li>
              ))}
            </ul>
            {shopOrder.refund&&<div className="mt-3 rounded bg-amber-500/10 p-3 text-sm text-amber-200"><p>Hoàn hàng hóa: {money(shopOrder.refund.merchandiseAmount,order.currency)}</p><p>Hoàn vận chuyển: {money(shopOrder.refund.shippingAmount,order.currency)}</p><p>Trạng thái hoàn tiền: {shopOrder.refund.status}</p></div>}
            {shopOrder.compensationVoucher&&<div className="mt-3 rounded bg-emerald-500/10 p-3 text-sm text-emerald-200"><p>Voucher: {shopOrder.compensationVoucher.code} · {money(shopOrder.compensationVoucher.amount,order.currency)}</p><p>Đơn hàng hóa tối thiểu: {money(shopOrder.compensationVoucher.minimumOrderAmount,order.currency)}</p><p>Hạn dùng: {new Date(shopOrder.compensationVoucher.expiresAt).toLocaleString()} · Không áp dụng phí vận chuyển, không cộng dồn.</p></div>}
          </article>
        ))}
      </section>
      <OrderReviewActions order={order} />
      <section className="overflow-x-auto rounded-xl border border-slate-800">
        <h2 className="p-5 text-lg font-semibold">Items</h2>
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Line total</th>
              <th>Support</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-800">
                <td className="p-3">{item.productName}</td>
                <td>{item.variantName}</td>
                <td>{item.sku}</td>
                <td>{item.quantity}</td>
                <td>{money(item.unitPrice, order.currency)}</td>
                <td>{money(item.lineTotal, order.currency)}</td>
                <td>
                  {order.logisticsStatus === "DELIVERED" ? (
                    <Link className="text-blue-400 underline" to={`/complaints?orderItemId=${item.id}`}>
                      Khiếu nại sản phẩm
                    </Link>
                  ) : (
                    <span className="text-slate-500">Có sau khi giao</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <h2 className="mb-3 text-lg font-semibold">Pricing</h2>
        <div className="grid max-w-md gap-2 sm:grid-cols-2">
          <span>Subtotal</span>
          <span>{money(order.subtotal, order.currency)}</span>
          <span>Discount</span>
          <span>{money(order.discountAmount, order.currency)}</span>
          <span>Shipping</span>
          <span>{money(order.shippingAmount, order.currency)}</span>
          <span>Tax</span>
          <span>{money(order.taxAmount, order.currency)}</span>
          <strong>Total</strong>
          <strong>{money(order.totalAmount, order.currency)}</strong>
          <span>Currency</span>
          <span>{order.currency}</span>
        </div>
      </section>
      {showQr && (
        <section className="grid gap-5 rounded-xl border border-blue-500/30 bg-slate-950 p-5 lg:grid-cols-[240px_1fr]">
          <div>
            <h2 className="mb-3 text-lg font-semibold">
              Thanh toán chuyển khoản
            </h2>
            <img
              className="h-auto w-full rounded-lg bg-white p-2"
              src={bank?.qrImageUrl ?? undefined}
              alt="Mã QR thanh toán chuyển khoản GymFit"
            />
          </div>
          <div className="space-y-3">
            <p>Bank name: {bank?.bankName || "—"}</p>
            <p>Account name: {bank?.accountName || "—"}</p>
            <div className="flex items-center gap-2">
              <span>Account number: {bank?.accountNumber || "—"}</span>
              {bank?.accountNumber && (
                <button
                  type="button"
                  title="Copy account number"
                  aria-label="Copy account number"
                  onClick={() =>
                    void copy(bank.accountNumber || "", "Account number")
                  }
                >
                  <Copy size={16} aria-hidden="true" />
                </button>
              )}
            </div>
            <p>Amount: {money(order.totalAmount, order.currency)}</p>
            <p>
              Transfer content:{" "}
              {bank?.transferContent || `GYMFIT ${order.orderNumber}`}
            </p>
            {bank?.transferContent && (
              <button
                type="button"
                className="btn-secondary"
                title="Copy transfer content"
                aria-label="Copy transfer content"
                onClick={() =>
                  void copy(bank.transferContent, "Transfer content")
                }
              >
                <Copy size={16} aria-hidden="true" /> Copy transfer content
              </button>
            )}
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
              <li>Quét mã QR hoặc chuyển khoản vào tài khoản hiển thị.</li>
              <li>Chuyển đúng số tiền của đơn hàng.</li>
              <li>Ghi đúng nội dung chuyển khoản.</li>
              <li>Sau khi chuyển khoản, bấm “Tôi đã chuyển khoản”.</li>
              <li>Admin sẽ kiểm tra tài khoản và xác nhận thanh toán.</li>
            </ol>
            <p className="text-sm text-amber-300">
              Hệ thống không tự động kiểm tra giao dịch ngân hàng.
            </p>
            {status === "FAILED" && (
              <p className="text-amber-300">
                Chưa xác nhận được thanh toán. Vui lòng kiểm tra số tiền và nội
                dung chuyển khoản.
              </p>
            )}
            {status === "PENDING" && (
              <p className="text-amber-300">
                Đang chờ Admin xác nhận thanh toán.
              </p>
            )}
            {status === "UNPAID" && (
              <form className="space-y-3" onSubmit={submit}>
                <label>
                  Mã giao dịch hoặc ghi chú thanh toán — không bắt buộc
                  <input
                    aria-label="Payment reference"
                    maxLength={255}
                    className="input-field mt-1 w-full"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </label>
                {error && (
                  <p role="alert" className="text-sm text-red-400">
                    {error}
                  </p>
                )}
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Sending…" : "Tôi đã chuyển khoản"}
                </button>
              </form>
            )}
          </div>
        </section>
      )}
      {order.orderStatus === "PENDING" &&
        status === "UNPAID" &&
        order.reservationExpiresAt && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h2 className="font-semibold">Thời hạn thanh toán</h2>
            <p className="mt-2 text-2xl font-bold">{countdown}</p>
            <p className="mt-2 text-sm">
              Đơn hàng và số lượng giữ chỗ sẽ tự động hủy nếu chưa báo chuyển
              khoản trước thời hạn.
            </p>
          </section>
        )}
      {order.cancellationReason === "AUTO_EXPIRED" && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          Đơn hàng đã tự động hủy vì quá thời hạn thanh toán.
        </p>
      )}
      {canCancel && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setCancelDialog(true);
            setError("");
          }}
        >
          Hủy đơn hàng
        </button>
      )}
      {cancelDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <form
            className="w-full max-w-lg space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-6"
            onSubmit={cancelOrder}
          >
            <div className="flex justify-between">
              <h2 className="text-xl font-bold">Xác nhận hủy đơn hàng</h2>
              <button
                type="button"
                aria-label="Đóng"
                disabled={saving}
                onClick={() => setCancelDialog(false)}
              >
                <X />
              </button>
            </div>
            <p>Thao tác này sẽ giải phóng số lượng sản phẩm đang giữ chỗ.</p>
            <label>
              Lý do (không bắt buộc)
              <textarea
                className="input-field mt-1 w-full"
                maxLength={500}
                rows={3}
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => setCancelDialog(false)}
              >
                Đóng
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Đang hủy…" : "Xác nhận hủy"}
              </button>
            </div>
          </form>
        </div>
      )}
      {showBankWarning && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p>
            Thanh toán chuyển khoản hiện chưa được cấu hình đầy đủ. Vui lòng
            liên hệ Admin.
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {bank?.missingFields.map((field) => (
              <li key={field}>
                {
                  {
                    BANK_NAME: "Tên ngân hàng",
                    BANK_ACCOUNT_NAME: "Tên chủ tài khoản",
                    BANK_ACCOUNT_NUMBER: "Số tài khoản",
                    BANK_QR_IMAGE_URL: "Mã QR",
                  }[field]
                }
              </li>
            ))}
          </ul>
        </section>
      )}
      {status === "FAILED" && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          Admin chưa xác nhận được giao dịch. Vui lòng chờ Admin đặt lại trạng
          thái thanh toán trước khi gửi lại.
        </p>
      )}
    </div>
  );
}
