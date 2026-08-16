export interface ServerCartItem {
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
  shop: { id: number; name: string; slug: string };
}

export interface ServerCart {
  id: number;
  version: number;
  items: ServerCartItem[];
  subtotal: number;
  itemCount: number;
  updatedAt: string;
}

export interface MergeItemResult {
  productId: number;
  variantId: number;
  quantity: number;
  cartItemId?: number;
  appliedQuantity?: number;
  serverQuantity?: number;
  reason?: string;
}

export interface MergeCartResult {
  cart: ServerCart;
  added: MergeItemResult[];
  preserved: MergeItemResult[];
  adjusted: MergeItemResult[];
  rejected: MergeItemResult[];
}

export interface CartConflictResponse {
  success: false;
  code: string;
  message: string;
  conflict?: { cartItemId: number | null };
  data?: { cart?: ServerCart };
}
