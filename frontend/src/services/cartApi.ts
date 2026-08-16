import api from "../api/axios";
import type { MergeCartResult, ServerCart } from "../types/cart";
import type { VariantAwareCartItem } from "../stores/productsStore";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const cartApi = {
  get: () => api.get<ApiResponse<ServerCart>>("/cart"),
  add: (input: VariantAwareCartItem & { cartVersion: number }) =>
    api.post<ApiResponse<ServerCart>>("/cart/items", input),
  update: (cartItemId: number, quantity: number, cartVersion: number) =>
    api.patch<ApiResponse<ServerCart>>(`/cart/items/${cartItemId}`, {
      quantity,
      cartVersion,
    }),
  remove: (cartItemId: number, cartVersion: number) =>
    api.delete<ApiResponse<ServerCart>>(`/cart/items/${cartItemId}`, {
      data: { cartVersion },
    }),
  clear: (cartVersion: number) =>
    api.delete<ApiResponse<ServerCart>>("/cart", { data: { cartVersion } }),
  merge: (items: VariantAwareCartItem[]) =>
    api.post<ApiResponse<MergeCartResult>>("/cart/merge", { items }),
};
