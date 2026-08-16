export interface CartShop {
  id: number;
  name: string;
  slug: string;
}

export interface CartItem {
  id: number;
  productId: number;
  variantId: number;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  currentPrice: number;
  available: number;
  isAvailable: boolean;
  unavailableReason: string | null;
  subtotal: number;
  shop: CartShop;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cart {
  id: number;
  version: number;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  updatedAt: Date;
}

export interface CartMutationInput {
  cartVersion: number;
}

export interface AddCartItemInput extends CartMutationInput {
  productId: number;
  variantId: number;
  quantity: number;
}

export interface UpdateCartItemInput extends CartMutationInput {
  quantity: number;
}

export interface GuestCartItem {
  productId: number;
  variantId: number;
  quantity: number;
}

export type MergeItemReason =
  | "SERVER_QUANTITY_PRESERVED"
  | "QUANTITY_ADJUSTED_TO_AVAILABILITY"
  | "PRODUCT_NOT_FOUND"
  | "VARIANT_NOT_FOUND"
  | "VARIANT_PRODUCT_MISMATCH"
  | "PRODUCT_NOT_PURCHASABLE"
  | "VARIANT_NOT_ACTIVE"
  | "SHOP_NOT_ACTIVE"
  | "OUT_OF_STOCK";

export interface MergeItemResult extends GuestCartItem {
  cartItemId?: number;
  appliedQuantity?: number;
  serverQuantity?: number;
  reason?: MergeItemReason;
}

export interface MergeCartResult {
  cart: Cart;
  added: MergeItemResult[];
  preserved: MergeItemResult[];
  adjusted: MergeItemResult[];
  rejected: MergeItemResult[];
}
