import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import api from "../../api/axios";
import { useProductsStore } from "../../stores/productsStore";
import type {
  ProductDetailResponse,
  ProductVariant,
} from "../../types/product";
import type { CheckoutFormErrors, CheckoutFormValues } from "../../types/orders";
import { ordersApi } from "../../services/ordersApi";

const initial: CheckoutFormValues = {
  customerName: "",
  customerPhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Vietnam",
};
interface Resolved {
  productId: number;
  variantId: number;
  quantity: number;
  name: string;
  shop: { id: number; name: string; slug: string } | null;
  variant: ProductVariant | null;
}
const errorMessage = (error: unknown) =>
  error instanceof AxiosError &&
  typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : "Không thể tạo đơn hàng. Hãy tải lại giá và tồn kho.";

export default function CheckoutPage() {
  const {
    cartItems,
    serverCart,
    completeCheckout,
    migratePersistedCart,
    isCartLoading,
  } = useProductsStore();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<CheckoutFormErrors>({});
  const [items, setItems] = useState<Resolved[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [voucherCode,setVoucherCode]=useState("");
  const [vouchers,setVouchers]=useState<Array<{code:string;amount:number;minimumOrderAmount:number;expiresAt:string;status:string}>>([]);

  useEffect(() => {
    void migratePersistedCart();
    void api.get<{data:Array<{code:string;amount:number;minimumOrderAmount:number;expiresAt:string;status:string}>}>("/marketplace/vouchers").then(response=>setVouchers(response.data.data.filter(voucher=>voucher.status==="AVAILABLE"))).catch(()=>setVouchers([]));
  }, [migratePersistedCart]);
  useEffect(() => {
    let active = true;
    void (async () => {
      setLoadingItems(true);
      setError("");
      try {
        const products = new Map<number, ProductDetailResponse["data"]>();
        await Promise.all(
          [...new Set(cartItems.map((item) => item.productId))].map(
            async (id) => {
              const response = await api.get<ProductDetailResponse>(
                `/products/${id}`,
              );
              products.set(id, response.data.data);
            },
          ),
        );
        const resolved = cartItems.map((item) => {
          const product = products.get(item.productId);
          return {
            ...item,
            name: product?.product_name || "Không còn khả dụng",
            shop: product?.shop ?? null,
            variant:
              product?.variants?.find(
                (variant) => variant.id === item.variantId,
              ) ?? null,
          };
        });
        if (active) setItems(resolved);
      } catch {
        if (active)
          setError("Không thể tải giá, Shop và tồn kho hiện tại.");
      } finally {
        if (active) setLoadingItems(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [cartItems]);

  const invalid =
    items.some(
      (item) =>
        !item.shop ||
        !item.variant ||
        !Number.isSafeInteger(item.productId) ||
        item.productId < 0 ||
        !Number.isSafeInteger(item.variantId) ||
        item.variantId <= 0 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > item.variant.available,
    ) ||
    new Set(items.map((item) => `${item.productId}:${item.variantId}`)).size !==
      items.length;
  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + (item.variant?.effective_price ?? 0) * item.quantity,
        0,
      ),
    [items],
  );
  const groups = useMemo(() => {
    const grouped = new Map<number, {
      shop: NonNullable<Resolved["shop"]>;
      items: Resolved[];
      subtotal: number;
    }>();
    for (const item of items) {
      if (!item.shop) continue;
      const existing = grouped.get(item.shop.id);
      const lineTotal =
        (item.variant?.effective_price ?? 0) * item.quantity;
      if (existing) {
        existing.items.push(item);
        existing.subtotal += lineTotal;
      } else
        grouped.set(item.shop.id, {
          shop: item.shop,
          items: [item],
          subtotal: lineTotal,
        });
    }
    return [...grouped.values()];
  }, [items]);

  const update = (key: keyof CheckoutFormValues, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const validate = () => {
    const next: CheckoutFormErrors = {};
    if (!form.customerName.trim()) next.customerName = "Name is required.";
    if (!form.customerPhone.trim()) next.customerPhone = "Phone is required.";
    if (!form.addressLine1.trim()) next.addressLine1 = "Address is required.";
    if (!form.city.trim()) next.city = "City is required.";
    if (!form.country.trim()) next.country = "Country is required.";
    if (!items.length) next.items = "Your cart is empty.";
    else if (invalid)
      next.items =
        "Giỏ hàng có Product, Variant, Shop hoặc số lượng không còn khả dụng.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || !validate()) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await ordersApi.createOrder({
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        shippingAddressLine1: form.addressLine1.trim(),
        shippingAddressLine2: form.addressLine2.trim() || undefined,
        shippingCity: form.city.trim(),
        shippingState: form.state.trim() || undefined,
        shippingPostalCode: form.postalCode.trim() || undefined,
        shippingCountry: form.country.trim(),
        cartVersion: serverCart?.version ?? 0,
        voucherCode:voucherCode||undefined,
      });
      completeCheckout(response.data.data.cartVersion);
      navigate(`/orders/${response.data.data.id}`);
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  if (isCartLoading)
    return <main className="p-8">Đang tải giỏ hàng máy chủ…</main>;
  if (!cartItems.length)
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <p>Giỏ hàng đang trống.</p>
        <Link className="text-emerald-400" to="/cart">
          Quay lại giỏ hàng
        </Link>
      </main>
    );
  const fields: [keyof CheckoutFormValues, string][] = [
    ["customerName", "Name"],
    ["customerPhone", "Phone"],
    ["addressLine1", "Address"],
    ["addressLine2", "Address line 2"],
    ["city", "City"],
    ["state", "State"],
    ["postalCode", "Postal code"],
    ["country", "Country"],
  ];
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Checkout</h1>
      {error && (
        <p role="alert" className="mb-4 rounded bg-red-500/15 p-3 text-red-300">
          {error}
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={submit} className="space-y-4">
          {fields.map(([key, label]) => (
            <label key={key} className="block">
              {label}
              <input
                value={form[key]}
                onChange={(event) => update(key, event.target.value)}
                className="input-field mt-1 w-full"
              />
              {errors[key] && (
                <span className="text-red-300">{errors[key]}</span>
              )}
            </label>
          ))}
          {errors.items && (
            <p className="text-red-300">
              {errors.items}{" "}
              <Link className="underline" to="/cart">
                Sửa giỏ hàng
              </Link>
            </p>
          )}
          <label className="block">Voucher bồi thường
            <select className="input-field mt-1 w-full" value={voucherCode} onChange={event=>setVoucherCode(event.target.value)}>
              <option value="">Không dùng voucher</option>
              {vouchers.map(voucher=><option key={voucher.code} value={voucher.code}>{voucher.code} · {voucher.amount.toLocaleString()} VND · tối thiểu {voucher.minimumOrderAmount.toLocaleString()} VND</option>)}
            </select>
            <span className="text-xs text-white/60">Chỉ trừ tiền hàng, không trừ phí vận chuyển và không cộng dồn voucher.</span>
          </label>
          <button
            className="btn-primary"
            disabled={submitting || loadingItems || invalid || !serverCart}
          >
            {submitting ? "Đang tạo đơn…" : "Đặt hàng"}
          </button>
        </form>
        <section>
          <h2 className="text-xl font-semibold">Tóm tắt đơn hàng</h2>
          {loadingItems ? (
            <p>Đang tải…</p>
          ) : (
            groups.map((group) => (
              <section
                key={group.shop.id}
                className="mt-4 rounded-xl border border-emerald-400/20 p-4"
              >
                <div className="flex justify-between gap-3">
                  <Link
                    className="font-semibold text-emerald-400"
                    to={`/shops/${group.shop.slug}`}
                  >
                    {group.shop.name}
                  </Link>
                  <strong>
                    Shop subtotal: {group.subtotal.toLocaleString()} VND
                  </strong>
                </div>
                {group.items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="border-b border-white/10 py-3"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p>{item.name}</p>
                        <p className="text-sm text-white/60">
                          {item.variant?.variant_name || "Không còn khả dụng"} ·{" "}
                          {item.variant?.sku || "—"} × {item.quantity}
                        </p>
                      </div>
                      <span>
                        {(
                          (item.variant?.effective_price ?? 0) * item.quantity
                        ).toLocaleString()}{" "}
                        VND
                      </span>
                    </div>
                  </div>
                ))}
              </section>
            ))
          )}
          <p className="mt-5 text-xl font-bold">
            Parent subtotal: {total.toLocaleString()} VND
          </p>
          <p className="text-sm text-white/60">
            Discount: 0 VND · Tax: 0 VND · Outbound shipping: 0 VND
          </p>
          <p className="text-xl font-bold">
            Parent total: {total.toLocaleString()} VND
          </p>
          <p className="mt-3 text-sm text-white/60">
            Backend sẽ xác nhận lại Product, Variant, Shop, giá và tồn kho. Kết
            quả server là kết quả chính thức.
          </p>
        </section>
      </div>
    </main>
  );
}
