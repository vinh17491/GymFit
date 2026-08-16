import axios from "axios";
import { create } from "zustand";
import api from "../api/axios";
import { cartApi } from "../services/cartApi";
import type { CartConflictResponse, MergeCartResult, ServerCart } from "../types/cart";
import type { Product, ProductDetailResponse } from "../types/product";

export interface VariantAwareCartItem {
  productId: number;
  variantId: number;
  quantity: number;
}
interface LegacyCartItem {
  productId?: unknown;
  variantId?: unknown;
  quantity?: unknown;
}
type CartMode = "guest" | "server" | "disabled";
interface CartUser {
  id: number;
  role: string;
}
interface ProductsState {
  products: Product[];
  featuredProducts: Product[];
  newProducts: Product[];
  saleProducts: Product[];
  cartItems: VariantAwareCartItem[];
  serverCart: ServerCart | null;
  cartMode: CartMode;
  wishlistItems: number[];
  isLoading: boolean;
  isCartLoading: boolean;
  isCartMutating: boolean;
  error: string | null;
  cartWarning: string | null;
  cartConflict: string | null;
  mergeSummary: string | null;
  mergeRetryAvailable: boolean;
  fetchProducts: () => Promise<void>;
  fetchFeaturedProducts: () => Promise<void>;
  fetchNewProducts: () => Promise<void>;
  fetchSaleProducts: () => Promise<void>;
  migratePersistedCart: () => Promise<void>;
  initializeForUser: (user: CartUser | null) => Promise<void>;
  retryGuestMerge: () => Promise<void>;
  addToCart: (productId: number, variantId: number, quantity: number) => Promise<void>;
  removeFromCart: (productId: number, variantId: number) => Promise<void>;
  updateCartQuantity: (productId: number, variantId: number, quantity: number) => Promise<void>;
  updateCartItemQuantity: (productId: number, variantId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  completeCheckout: (cartVersion: number) => void;
  getCartItemCount: () => number;
  cartCount: () => number;
  toggleWishlist: (productId: number) => void;
  isInWishlist: (productId: number) => boolean;
}

const CART_KEY = "gymer_cart";
const WISHLIST_KEY = "gymer_wishlist";
const readUnknown = (key: string): unknown => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown): void =>
  localStorage.setItem(key, JSON.stringify(value));
const validId = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0;
const validProductId = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;
const validQuantity = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= 99;
const readGuestCart = (): VariantAwareCartItem[] => {
  const raw = readUnknown(CART_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: LegacyCartItem) =>
    validProductId(item.productId) &&
    validId(item.variantId) &&
    validQuantity(item.quantity)
      ? [{ productId: item.productId, variantId: item.variantId, quantity: item.quantity }]
      : [],
  );
};
const initialWishlist = (): number[] => {
  const raw = readUnknown(WISHLIST_KEY);
  return Array.isArray(raw) ? raw.filter(validId) : [];
};
const message = (error: unknown): string => {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string")
    return error.response.data.message;
  return error instanceof Error ? error.message : "Request failed";
};
const minimalItems = (cart: ServerCart): VariantAwareCartItem[] =>
  cart.items.map(({ productId, variantId, quantity }) => ({
    productId,
    variantId,
    quantity,
  }));
const mergeMessage = (result: MergeCartResult): string | null => {
  const parts: string[] = [];
  if (result.added.length) parts.push(`Đã thêm ${result.added.length} sản phẩm`);
  if (result.preserved.length)
    parts.push(
      `Giữ số lượng máy chủ: ${result.preserved
        .map((item) => `Product ${item.productId}/Variant ${item.variantId}`)
        .join(", ")}`,
    );
  if (result.adjusted.length)
    parts.push(
      `Điều chỉnh theo tồn kho: ${result.adjusted
        .map(
          (item) =>
            `Product ${item.productId}/Variant ${item.variantId} → ${item.appliedQuantity}`,
        )
        .join(", ")}`,
    );
  if (result.rejected.length)
    parts.push(
      `Không thể thêm: ${result.rejected
        .map(
          (item) =>
            `Product ${item.productId}/Variant ${item.variantId} (${item.reason})`,
        )
        .join(", ")}`,
    );
  return parts.length ? `${parts.join("; ")}.` : null;
};

let initializedBuyerId: number | null = null;
let initialization: Promise<void> | null = null;

export const useProductsStore = create<ProductsState>((set, get) => {
  const applyServerCart = (cart: ServerCart) =>
    set({
      serverCart: cart,
      cartItems: minimalItems(cart),
      cartMode: "server",
      isCartLoading: false,
    });
  const applyConflict = (error: unknown): boolean => {
    if (!axios.isAxiosError<CartConflictResponse>(error) || error.response?.status !== 409)
      return false;
    const payload = error.response.data;
    const cart = payload.data?.cart;
    if (cart) applyServerCart(cart);
    set({
      cartConflict:
        `${payload.message || "Giỏ hàng đã thay đổi ở nơi khác."} ` +
        `[${payload.code}${
          payload.conflict?.cartItemId
            ? `, CartItem ${payload.conflict.cartItemId}`
            : ""
        }] Dữ liệu mới nhất đã được tải; thao tác chưa được tự động thử lại.`,
      isCartMutating: false,
    });
    return true;
  };
  const mergeGuest = async (): Promise<void> => {
    const guest = readGuestCart();
    if (!guest.length) {
      const response = await cartApi.get();
      applyServerCart(response.data.data);
      set({ mergeRetryAvailable: false, mergeSummary: null });
      return;
    }
    try {
      const response = await cartApi.merge(guest);
      const result = response.data.data;
      applyServerCart(result.cart);
      write(CART_KEY, []);
      set({
        mergeSummary: mergeMessage(result),
        mergeRetryAvailable: false,
        cartWarning: null,
      });
    } catch (error) {
      set({
        mergeRetryAvailable: true,
        cartWarning:
          "Chưa thể đồng bộ giỏ hàng khách. Dữ liệu trên thiết bị vẫn được giữ để thử lại.",
      });
      try {
        const response = await cartApi.get();
        applyServerCart(response.data.data);
      } catch {
        set({ cartMode: "server", cartItems: [], serverCart: null });
      }
      throw error;
    }
  };
  return {
    products: [],
    featuredProducts: [],
    newProducts: [],
    saleProducts: [],
    cartItems: readGuestCart(),
    serverCart: null,
    cartMode: "guest",
    wishlistItems: initialWishlist(),
    isLoading: false,
    isCartLoading: false,
    isCartMutating: false,
    error: null,
    cartWarning: null,
    cartConflict: null,
    mergeSummary: null,
    mergeRetryAvailable: false,
    fetchProducts: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.get<{ data: Product[] }>("/products");
        set({ products: response.data.data || [] });
      } catch (error) {
        set({ error: message(error) });
      } finally {
        set({ isLoading: false });
      }
    },
    fetchFeaturedProducts: async () => {
      try {
        const response = await api.get<{ data: Product[] }>("/products/featured");
        set({ featuredProducts: response.data.data || [] });
      } catch {}
    },
    fetchNewProducts: async () => {
      try {
        const response = await api.get<{ data: Product[] }>("/products/new");
        set({ newProducts: response.data.data || [] });
      } catch {}
    },
    fetchSaleProducts: async () => {
      try {
        const response = await api.get<{ data: Product[] }>("/products/sale");
        set({ saleProducts: response.data.data || [] });
      } catch {}
    },
    migratePersistedCart: async () => {
      if (get().cartMode !== "guest") return;
      const raw = readUnknown(CART_KEY);
      if (!Array.isArray(raw)) {
        write(CART_KEY, []);
        set({ cartItems: [] });
        return;
      }
      const migrated: VariantAwareCartItem[] = [];
      let removed = false;
      for (const item of raw as LegacyCartItem[]) {
        if (!validProductId(item.productId) || !validQuantity(item.quantity)) {
          removed = true;
          continue;
        }
        let variantId = validId(item.variantId) ? item.variantId : null;
        if (variantId === null) {
          try {
            const response = await api.get<ProductDetailResponse>(`/products/${item.productId}`);
            variantId = response.data.data.display_variant?.id ?? null;
          } catch {
            variantId = null;
          }
        }
        if (!validId(variantId)) {
          removed = true;
          continue;
        }
        const existing = migrated.find(
          (candidate) =>
            candidate.productId === item.productId &&
            candidate.variantId === variantId,
        );
        if (existing) {
          const combined = existing.quantity + item.quantity;
          if (!validQuantity(combined)) {
            removed = true;
            continue;
          }
          existing.quantity = combined;
        } else
          migrated.push({ productId: item.productId, variantId, quantity: item.quantity });
      }
      write(CART_KEY, migrated);
      set({
        cartItems: migrated,
        cartWarning: removed
          ? "Một số sản phẩm cũ không còn khả dụng và đã được xóa khỏi giỏ hàng."
          : null,
      });
    },
    initializeForUser: async (user) => {
      if (!user) {
        initializedBuyerId = null;
        initialization = null;
        set({
          cartMode: "guest",
          cartItems: readGuestCart(),
          serverCart: null,
          isCartLoading: false,
          isCartMutating: false,
          cartConflict: null,
          mergeSummary: null,
        });
        return;
      }
      if (!["member", "coach"].includes(user.role)) {
        initializedBuyerId = null;
        set({
          cartMode: "disabled",
          cartItems: [],
          serverCart: null,
          isCartLoading: false,
          cartWarning: "Vai trò hiện tại không được sử dụng giỏ hàng Buyer.",
        });
        return;
      }
      if (initializedBuyerId === user.id && get().serverCart) return;
      if (initialization) return initialization;
      set({
        cartMode: "server",
        cartItems: [],
        serverCart: null,
        isCartLoading: true,
        cartWarning: null,
      });
      initialization = mergeGuest()
        .then(() => {
          initializedBuyerId = user.id;
        })
        .catch((error) => {
          set({ cartWarning: message(error) });
        })
        .finally(() => {
          initialization = null;
          set({ isCartLoading: false });
        });
      return initialization;
    },
    retryGuestMerge: async () => {
      if (get().cartMode !== "server" || get().isCartMutating) return;
      set({ isCartMutating: true, cartWarning: null });
      try {
        await mergeGuest();
      } catch (error) {
        set({ cartWarning: message(error) });
      } finally {
        set({ isCartMutating: false });
      }
    },
    addToCart: async (productId, variantId, quantity) => {
      if (!validProductId(productId) || !validId(variantId) || !validQuantity(quantity))
        return;
      if (get().cartMode === "disabled") return;
      if (get().cartMode === "guest") {
        const current = get().cartItems;
        const existing = current.find(
          (item) => item.productId === productId && item.variantId === variantId,
        );
        const combined = (existing?.quantity ?? 0) + quantity;
        if (!validQuantity(combined)) return;
        const items = existing
          ? current.map((item) =>
              item.productId === productId && item.variantId === variantId
                ? { ...item, quantity: combined }
                : item,
            )
          : [...current, { productId, variantId, quantity }];
        write(CART_KEY, items);
        set({ cartItems: items });
        return;
      }
      const cart = get().serverCart;
      if (!cart || get().isCartMutating) return;
      set({ isCartMutating: true, cartConflict: null, cartWarning: null });
      try {
        applyServerCart(
          (await cartApi.add({ productId, variantId, quantity, cartVersion: cart.version }))
            .data.data,
        );
      } catch (error) {
        if (!applyConflict(error)) set({ cartWarning: message(error) });
      } finally {
        set({ isCartMutating: false });
      }
    },
    updateCartQuantity: async (productId, variantId, quantity) => {
      if (!validQuantity(quantity) || get().isCartMutating) return;
      if (get().cartMode === "guest") {
        const items = get().cartItems.map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity }
            : item,
        );
        write(CART_KEY, items);
        set({ cartItems: items });
        return;
      }
      const cart = get().serverCart;
      const item = cart?.items.find(
        (candidate) =>
          candidate.productId === productId && candidate.variantId === variantId,
      );
      if (!cart || !item) return;
      set({ isCartMutating: true, cartConflict: null, cartWarning: null });
      try {
        applyServerCart((await cartApi.update(item.id, quantity, cart.version)).data.data);
      } catch (error) {
        if (!applyConflict(error)) set({ cartWarning: message(error) });
      } finally {
        set({ isCartMutating: false });
      }
    },
    updateCartItemQuantity: async (productId, variantId, quantity) =>
      get().updateCartQuantity(productId, variantId, quantity),
    removeFromCart: async (productId, variantId) => {
      if (get().isCartMutating) return;
      if (get().cartMode === "guest") {
        const items = get().cartItems.filter(
          (item) => item.productId !== productId || item.variantId !== variantId,
        );
        write(CART_KEY, items);
        set({ cartItems: items });
        return;
      }
      const cart = get().serverCart;
      const item = cart?.items.find(
        (candidate) =>
          candidate.productId === productId && candidate.variantId === variantId,
      );
      if (!cart || !item) return;
      set({ isCartMutating: true, cartConflict: null, cartWarning: null });
      try {
        applyServerCart((await cartApi.remove(item.id, cart.version)).data.data);
      } catch (error) {
        if (!applyConflict(error)) set({ cartWarning: message(error) });
      } finally {
        set({ isCartMutating: false });
      }
    },
    clearCart: async () => {
      if (get().isCartMutating) return;
      if (get().cartMode === "guest") {
        write(CART_KEY, []);
        set({ cartItems: [] });
        return;
      }
      const cart = get().serverCart;
      if (!cart) return;
      set({ isCartMutating: true, cartConflict: null, cartWarning: null });
      try {
        applyServerCart((await cartApi.clear(cart.version)).data.data);
      } catch (error) {
        if (!applyConflict(error)) set({ cartWarning: message(error) });
      } finally {
        set({ isCartMutating: false });
      }
    },
    completeCheckout: (cartVersion) => {
      const cart = get().serverCart;
      if (!cart) return;
      applyServerCart({
        ...cart,
        version: cartVersion,
        items: [],
        subtotal: 0,
        itemCount: 0,
        updatedAt: new Date().toISOString(),
      });
    },
    getCartItemCount: () =>
      get().cartItems.reduce((sum, item) => {
        const next = sum + item.quantity;
        return Number.isSafeInteger(next) ? next : Number.MAX_SAFE_INTEGER;
      }, 0),
    cartCount: () => get().getCartItemCount(),
    toggleWishlist: (productId) => {
      const items = get().wishlistItems.includes(productId)
        ? get().wishlistItems.filter((id) => id !== productId)
        : [...get().wishlistItems, productId];
      write(WISHLIST_KEY, items);
      set({ wishlistItems: items });
    },
    isInWishlist: (productId) => get().wishlistItems.includes(productId),
  };
});
