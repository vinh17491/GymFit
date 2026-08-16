import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import api from "../../api/axios";
import { useAuthStore } from "../../stores/authStore";
import {
  useProductsStore,
  type VariantAwareCartItem,
} from "../../stores/productsStore";
import type {
  ProductDetail,
  ProductDetailResponse,
  ProductVariant,
} from "../../types/product";
import SafeProductImage from "../../components/products/ProductImage";
import { getPrimaryProductImage } from "../../lib/productImages";

interface ResolvedCartItem extends VariantAwareCartItem {
  product: ProductDetail | null;
  variant: ProductVariant | null;
}
export default function CartPage() {
  const {
    cartItems,
    cartWarning,
    cartConflict,
    mergeSummary,
    mergeRetryAvailable,
    retryGuestMerge,
    isCartLoading,
    isCartMutating,
    migratePersistedCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    getCartItemCount,
  } = useProductsStore();
  const { isAuthenticated } = useAuthStore(),
    navigate = useNavigate();
  const [resolved, setResolved] = useState<ResolvedCartItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [clearDialog, setClearDialog] = useState(false);
  useEffect(() => {
    void migratePersistedCart();
  }, [migratePersistedCart]);
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      const products = new Map<number, ProductDetail | null>();
      await Promise.all(
        [...new Set(cartItems.map((item) => item.productId))].map(
          async (productId) => {
            try {
              const response = await api.get<ProductDetailResponse>(
                `/products/${productId}`,
              );
              products.set(productId, response.data.data);
            } catch {
              products.set(productId, null);
            }
          },
        ),
      );
      if (active)
        setResolved(
          cartItems.map((item) => {
            const product = products.get(item.productId) ?? null;
            return {
              ...item,
              product,
              variant:
                product?.variants?.find(
                  (variant) => variant.id === item.variantId,
                ) ?? null,
            };
          }),
        );
      if (active) setLoading(false);
    })().catch(() => {
      if (active) {
        setError("Không thể tải dữ liệu giỏ hàng hiện tại.");
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [cartItems]);
  const invalid = resolved.some(
    (item) =>
      !item.product ||
      !item.variant ||
      item.variant.available <= 0 ||
      item.quantity > item.variant.available,
  );
  const subtotal = useMemo(
    () =>
      resolved.reduce(
        (sum, item) =>
          sum + (item.variant?.effective_price ?? 0) * item.quantity,
        0,
      ),
    [resolved],
  );
  const shopGroups = useMemo(() => {
    const groups = new Map<string, {
      shop: { id: number; name: string; slug: string } | null;
      items: ResolvedCartItem[];
      subtotal: number;
    }>();
    for (const item of resolved) {
      const shop = item.product?.shop ?? null;
      const key = shop ? String(shop.id) : "unavailable";
      const existing = groups.get(key);
      const lineTotal =
        (item.variant?.effective_price ?? 0) * item.quantity;
      if (existing) {
        existing.items.push(item);
        existing.subtotal += lineTotal;
      } else groups.set(key, { shop, items: [item], subtotal: lineTotal });
    }
    return [...groups.values()];
  }, [resolved]);
  const checkout = () =>
    navigate(isAuthenticated ? "/checkout" : "/login", {
      state: { from: { pathname: "/checkout" } },
    });
  if (loading || isCartLoading)
    return (
      <main className="mx-auto max-w-6xl p-6 text-white">
        Đang tải giỏ hàng…
      </main>
    );
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-6 text-white">
      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold">Giỏ hàng</h1>
          <p>{getCartItemCount()} sản phẩm</p>
        </div>
        {cartItems.length > 0 && (
          <button
            className="btn-secondary"
            onClick={() => setClearDialog(true)}
          >
            Xóa giỏ hàng
          </button>
        )}
      </div>
      {(cartWarning || error || cartConflict || mergeSummary) && (
        <p role="alert" className="rounded bg-amber-500/10 p-4 text-amber-300">
          {cartConflict || mergeSummary || cartWarning || error}
          {mergeRetryAvailable && (
            <button
              className="ml-3 underline"
              disabled={isCartMutating}
              onClick={() => void retryGuestMerge()}
            >
              Thử đồng bộ lại
            </button>
          )}
        </p>
      )}
      {resolved.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-8 text-center">
          <p>Giỏ hàng đang trống.</p>
          <Link className="mt-4 inline-block text-emerald-400" to="/products">
            Tiếp tục mua hàng
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {shopGroups.map((group) => (
              <section
                key={group.shop?.id ?? "unavailable"}
                className="rounded-xl border border-emerald-400/20 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold">
                    {group.shop ? (
                      <Link
                        className="text-emerald-400"
                        to={`/shops/${group.shop.slug}`}
                      >
                        {group.shop.name}
                      </Link>
                    ) : (
                      "Sản phẩm không còn khả dụng"
                    )}
                  </h2>
                  <span>
                    Shop subtotal: {group.subtotal.toLocaleString()} VND
                  </span>
                </div>
                <div className="space-y-3">
            {group.items.map((item) => (
              <article
                key={`${item.productId}-${item.variantId}`}
                className="grid gap-4 rounded-xl border border-white/10 p-4 sm:grid-cols-[96px_1fr_auto]"
              >
                <SafeProductImage
                  src={item.product ? getPrimaryProductImage(item.product) : ""}
                  alt=""
                  className="h-24 w-24 rounded object-cover"
                />
                <div>
                  <h2>{item.product?.product_name || "Không còn khả dụng"}</h2>
                  <p className="text-sm text-white/60">
                    {item.variant?.variant_name || "Không còn khả dụng"} ·{" "}
                    {item.variant?.sku || "—"}
                  </p>
                  <p className="text-sm text-white/60">
                    {item.variant?.options
                      .map((option) => `${option.option_name}: ${option.value}`)
                      .join(" · ") || "—"}
                  </p>
                  {item.variant && (
                    <p>
                      {item.variant.effective_price.toLocaleString()} VND · Còn{" "}
                      {item.variant.available}
                    </p>
                  )}
                  {(!item.variant || item.variant.available <= 0) && (
                    <p className="text-red-300">Không còn khả dụng</p>
                  )}
                  {item.variant && item.quantity > item.variant.available && (
                    <p className="text-amber-300">
                      Số lượng vượt tồn kho hiện tại.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateCartQuantity(
                        item.productId,
                        item.variantId,
                        Math.max(1, item.quantity - 1),
                      )
                    }
                  >
                    −
                  </button>
                  <input
                    aria-label="Số lượng"
                    className="w-16 rounded bg-white/5 p-2 text-center"
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isSafeInteger(value) && value > 0)
                        updateCartQuantity(
                          item.productId,
                          item.variantId,
                          value,
                        );
                    }}
                  />
                  <button
                    onClick={() =>
                      updateCartQuantity(
                        item.productId,
                        item.variantId,
                        item.quantity + 1,
                      )
                    }
                  >
                    +
                  </button>
                  <button
                    aria-label="Xóa sản phẩm"
                    onClick={() =>
                      removeFromCart(item.productId, item.variantId)
                    }
                  >
                    <X />
                  </button>
                </div>
              </article>
            ))}
                </div>
              </section>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 p-5 text-right">
            <p className="text-xl font-bold">
              Tạm tính: {subtotal.toLocaleString()} VND
            </p>
            <p className="text-sm text-white/60">
              Discount: 0 VND · Tax: 0 VND · Outbound shipping: 0 VND
            </p>
            <p className="text-xl font-bold">
              Total: {subtotal.toLocaleString()} VND
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Link className="btn-secondary" to="/products">
                Tiếp tục mua hàng
              </Link>
              <button
                className="btn-primary"
                disabled={invalid}
                onClick={checkout}
              >
                Tiến hành thanh toán
              </button>
            </div>
          </div>
        </>
      )}
      {clearDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-slate-950 p-6">
            <h2 className="text-xl font-bold">Xóa toàn bộ giỏ hàng?</h2>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => setClearDialog(false)}
              >
                Đóng
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  clearCart();
                  setClearDialog(false);
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
