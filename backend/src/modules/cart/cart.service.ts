import type { Request, Transaction } from "mssql";
import { getPool, sql } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import type {
  AddCartItemInput,
  Cart,
  CartItem,
  CartMutationInput,
  GuestCartItem,
  MergeCartResult,
  MergeItemReason,
  UpdateCartItemInput,
} from "./cart.types";

type DbCart = { id: number; version: number; updatedAt: Date };
type PurchaseRow = {
  productId: number;
  variantId: number;
  productName: string;
  variantName: string;
  sku: string;
  price: number;
  salePrice: number | null;
  productActive: boolean;
  moderationStatus: string;
  variantActive: boolean;
  shopId: number;
  shopName: string;
  shopSlug: string;
  shopStatus: string;
  onHand: number | null;
  reserved: number | null;
};

export class CartConflictError extends Error {
  constructor(
    public readonly code:
      | "CART_CONFLICT"
      | "CART_DELETE_CONFLICT"
      | "CART_CLEAR_CONFLICT",
    public readonly itemId?: number,
  ) {
    super("Giỏ hàng đã thay đổi ở nơi khác. Vui lòng kiểm tra lại.");
    this.name = "CartConflictError";
  }
}

const availableOf = (row: PurchaseRow): number =>
  Math.max(0, Number(row.onHand ?? 0) - Number(row.reserved ?? 0));
const currentPriceOf = (row: PurchaseRow): number =>
  Number(
    row.salePrice !== null && Number(row.salePrice) < Number(row.price)
      ? row.salePrice
      : row.price,
  );

function rejection(row: PurchaseRow | undefined): MergeItemReason | null {
  if (!row) return "VARIANT_NOT_FOUND";
  if (row.productId === null || row.productId === undefined)
    return "PRODUCT_NOT_FOUND";
  if (!row.productActive || row.moderationStatus !== "PUBLISHED")
    return "PRODUCT_NOT_PURCHASABLE";
  if (!row.variantActive) return "VARIANT_NOT_ACTIVE";
  if (row.shopStatus !== "ACTIVE") return "SHOP_NOT_ACTIVE";
  if (availableOf(row) <= 0) return "OUT_OF_STOCK";
  return null;
}

async function getOrCreateCart(
  request: Request,
  buyerId: number,
): Promise<DbCart> {
  const existing = await request
    .input("buyerId", sql.Int, buyerId)
    .query<DbCart>(
      "SELECT id,version,updated_at AS updatedAt FROM dbo.Carts WITH (UPDLOCK,HOLDLOCK) WHERE buyer_id=@buyerId",
    );
  if (existing.recordset[0]) return existing.recordset[0];
  const created = await request.query<DbCart>(
    "INSERT dbo.Carts(buyer_id,version,created_at,updated_at) OUTPUT INSERTED.id,INSERTED.version,INSERTED.updated_at AS updatedAt VALUES(@buyerId,1,SYSUTCDATETIME(),SYSUTCDATETIME())",
  );
  const cart = created.recordset[0];
  if (!cart) throw new AppError(409, "Cart creation failed");
  return cart;
}

async function resolvePurchase(
  request: Request,
  productId: number,
  variantId: number,
): Promise<PurchaseRow | undefined> {
  const result = await request
    .input("productId", sql.Int, productId)
    .input("variantId", sql.Int, variantId)
    .query<PurchaseRow>(
      "SELECT p.id AS productId,v.id AS variantId,p.product_name AS productName,v.variant_name AS variantName,v.sku,v.price,v.sale_price AS salePrice,p.is_active AS productActive,p.moderation_status AS moderationStatus,v.is_active AS variantActive,s.id AS shopId,s.name AS shopName,s.slug AS shopSlug,s.status AS shopStatus,i.on_hand AS onHand,i.reserved FROM dbo.ProductVariants v JOIN dbo.Products p ON p.id=v.product_id JOIN dbo.Shops s ON s.id=p.shop_id LEFT JOIN dbo.Inventory i ON i.variant_id=v.id WHERE v.id=@variantId",
    );
  return result.recordset[0];
}

function assertPurchasable(
  row: PurchaseRow | undefined,
  productId: number,
  variantId: number,
  quantity: number,
): asserts row is PurchaseRow {
  if (!row) throw new AppError(404, `Product ${productId} or Variant ${variantId} not found`);
  if (row.productId !== productId)
    throw new AppError(422, "VARIANT_PRODUCT_MISMATCH");
  const reason = rejection(row);
  if (reason) {
    const status = reason === "OUT_OF_STOCK" ? 409 : 422;
    throw new AppError(status, reason);
  }
  if (quantity > availableOf(row))
    throw new AppError(409, `Quantity exceeds current availability (${availableOf(row)})`);
}

async function readCartWith(
  request: Request,
  cart: DbCart,
): Promise<Cart> {
  const result = await request
    .input("readCartId", sql.Int, cart.id)
    .query<
      CartItem & {
        price: number;
        salePrice: number | null;
        productActive: boolean;
        moderationStatus: string;
        variantActive: boolean;
        shopStatus: string;
        onHand: number | null;
        reserved: number | null;
        shopId: number;
        shopName: string;
        shopSlug: string;
      }
    >(
      "SELECT ci.id,ci.product_id AS productId,ci.variant_id AS variantId,p.product_name AS productName,v.variant_name AS variantName,v.sku,ci.quantity,v.price,v.sale_price AS salePrice,p.is_active AS productActive,p.moderation_status AS moderationStatus,v.is_active AS variantActive,s.status AS shopStatus,i.on_hand AS onHand,i.reserved,s.id AS shopId,s.name AS shopName,s.slug AS shopSlug,ci.created_at AS createdAt,ci.updated_at AS updatedAt FROM dbo.CartItems ci JOIN dbo.Products p ON p.id=ci.product_id JOIN dbo.ProductVariants v ON v.id=ci.variant_id JOIN dbo.Shops s ON s.id=p.shop_id LEFT JOIN dbo.Inventory i ON i.variant_id=v.id WHERE ci.cart_id=@readCartId ORDER BY s.id,ci.id",
    );
  const items = result.recordset.map((row) => {
    const purchase = row as unknown as PurchaseRow;
    const reason = rejection(purchase);
    const currentPrice = currentPriceOf(purchase);
    return {
      id: row.id,
      productId: row.productId,
      variantId: row.variantId,
      productName: row.productName,
      variantName: row.variantName,
      sku: row.sku,
      quantity: row.quantity,
      currentPrice,
      available: availableOf(purchase),
      isAvailable: reason === null && row.quantity <= availableOf(purchase),
      unavailableReason:
        reason ?? (row.quantity > availableOf(purchase) ? "QUANTITY_EXCEEDS_AVAILABILITY" : null),
      subtotal: currentPrice * row.quantity,
      shop: { id: row.shopId, name: row.shopName, slug: row.shopSlug },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
  return {
    id: cart.id,
    version: cart.version,
    items,
    subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    updatedAt: cart.updatedAt,
  };
}

async function bumpCart(
  request: Request,
  cartId: number,
  expectedVersion: number,
): Promise<DbCart | undefined> {
  return (
    await request
      .input("bumpCartId", sql.Int, cartId)
      .input("expectedVersion", sql.Int, expectedVersion)
      .query<DbCart>(
        "UPDATE dbo.Carts SET version=version+1,updated_at=SYSUTCDATETIME() OUTPUT INSERTED.id,INSERTED.version,INSERTED.updated_at AS updatedAt WHERE id=@bumpCartId AND version=@expectedVersion",
      )
  ).recordset[0];
}

async function inTransaction<T>(
  work: (transaction: Transaction) => Promise<T>,
): Promise<T> {
  const pool = await getPool();
  const transaction = pool.transaction();
  let started = false;
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    started = true;
    const result = await work(transaction);
    await transaction.commit();
    started = false;
    return result;
  } catch (error) {
    if (started) await transaction.rollback();
    throw error;
  }
}

export const cartService = {
  async getCart(buyerId: number): Promise<Cart> {
    return inTransaction(async (transaction) => {
      const cart = await getOrCreateCart(transaction.request(), buyerId);
      return readCartWith(transaction.request(), cart);
    });
  },

  async addItem(buyerId: number, input: AddCartItemInput): Promise<Cart> {
    return inTransaction(async (transaction) => {
      const cart = await getOrCreateCart(transaction.request(), buyerId);
      if (cart.version !== input.cartVersion) throw new CartConflictError("CART_CONFLICT");
      const product = await resolvePurchase(
        transaction.request(),
        input.productId,
        input.variantId,
      );
      const existing = (
        await transaction
          .request()
          .input("cartId", sql.Int, cart.id)
          .input("variantId", sql.Int, input.variantId)
          .input("productId", sql.Int, input.productId)
          .query<{ id: number; quantity: number }>(
            "SELECT id,quantity FROM dbo.CartItems WITH (UPDLOCK,HOLDLOCK) WHERE cart_id=@cartId AND product_id=@productId AND variant_id=@variantId",
          )
      ).recordset[0];
      const quantity = (existing?.quantity ?? 0) + input.quantity;
      if (quantity > 99) throw new AppError(409, "Quantity exceeds system maximum (99)");
      assertPurchasable(product, input.productId, input.variantId, quantity);
      if (existing)
        await transaction
          .request()
          .input("itemId", sql.Int, existing.id)
          .input("quantity", sql.Int, quantity)
          .query("UPDATE dbo.CartItems SET quantity=@quantity,updated_at=SYSUTCDATETIME() WHERE id=@itemId");
      else
        await transaction
          .request()
          .input("cartId", sql.Int, cart.id)
          .input("productId", sql.Int, input.productId)
          .input("variantId", sql.Int, input.variantId)
          .input("quantity", sql.Int, quantity)
          .query("INSERT dbo.CartItems(cart_id,product_id,variant_id,quantity,created_at,updated_at) VALUES(@cartId,@productId,@variantId,@quantity,SYSUTCDATETIME(),SYSUTCDATETIME())");
      const bumped = await bumpCart(transaction.request(), cart.id, cart.version);
      if (!bumped) throw new CartConflictError("CART_CONFLICT");
      return readCartWith(transaction.request(), bumped);
    });
  },

  async updateItem(
    buyerId: number,
    cartItemId: number,
    input: UpdateCartItemInput,
  ): Promise<Cart> {
    return inTransaction(async (transaction) => {
      const cart = await getOrCreateCart(transaction.request(), buyerId);
      if (cart.version !== input.cartVersion)
        throw new CartConflictError("CART_CONFLICT", cartItemId);
      const item = (
        await transaction
          .request()
          .input("cartId", sql.Int, cart.id)
          .input("itemId", sql.Int, cartItemId)
          .query<{ id: number; productId: number; variantId: number; quantity: number }>(
            "SELECT id,product_id AS productId,variant_id AS variantId,quantity FROM dbo.CartItems WITH (UPDLOCK,HOLDLOCK) WHERE id=@itemId AND cart_id=@cartId",
          )
      ).recordset[0];
      if (!item) throw new AppError(404, "Cart item not found");
      const product = await resolvePurchase(
        transaction.request(),
        item.productId,
        item.variantId,
      );
      assertPurchasable(product, item.productId, item.variantId, input.quantity);
      if (item.quantity === input.quantity)
        return readCartWith(transaction.request(), cart);
      await transaction
        .request()
        .input("itemId", sql.Int, item.id)
        .input("quantity", sql.Int, input.quantity)
        .query("UPDATE dbo.CartItems SET quantity=@quantity,updated_at=SYSUTCDATETIME() WHERE id=@itemId");
      const bumped = await bumpCart(transaction.request(), cart.id, cart.version);
      if (!bumped) throw new CartConflictError("CART_CONFLICT", cartItemId);
      return readCartWith(transaction.request(), bumped);
    });
  },

  async removeItem(
    buyerId: number,
    cartItemId: number,
    input: CartMutationInput,
  ): Promise<Cart> {
    return inTransaction(async (transaction) => {
      const cart = await getOrCreateCart(transaction.request(), buyerId);
      if (cart.version !== input.cartVersion)
        throw new CartConflictError("CART_DELETE_CONFLICT", cartItemId);
      const removed = await transaction
        .request()
        .input("cartId", sql.Int, cart.id)
        .input("itemId", sql.Int, cartItemId)
        .query("DELETE dbo.CartItems WHERE id=@itemId AND cart_id=@cartId");
      if (removed.rowsAffected[0] !== 1) throw new AppError(404, "Cart item not found");
      const bumped = await bumpCart(transaction.request(), cart.id, cart.version);
      if (!bumped) throw new CartConflictError("CART_DELETE_CONFLICT", cartItemId);
      return readCartWith(transaction.request(), bumped);
    });
  },

  async clearCart(buyerId: number, input: CartMutationInput): Promise<Cart> {
    return inTransaction(async (transaction) => {
      const cart = await getOrCreateCart(transaction.request(), buyerId);
      if (cart.version !== input.cartVersion)
        throw new CartConflictError("CART_CLEAR_CONFLICT");
      const removed = await transaction
        .request()
        .input("cartId", sql.Int, cart.id)
        .query("DELETE dbo.CartItems WHERE cart_id=@cartId");
      if (removed.rowsAffected[0] === 0)
        return readCartWith(transaction.request(), cart);
      const bumped = await bumpCart(transaction.request(), cart.id, cart.version);
      if (!bumped) throw new CartConflictError("CART_CLEAR_CONFLICT");
      return readCartWith(transaction.request(), bumped);
    });
  },

  async mergeGuestCart(
    buyerId: number,
    guestItems: GuestCartItem[],
  ): Promise<MergeCartResult> {
    return inTransaction(async (transaction) => {
      let cart = await getOrCreateCart(transaction.request(), buyerId);
      const added: MergeCartResult["added"] = [];
      const preserved: MergeCartResult["preserved"] = [];
      const adjusted: MergeCartResult["adjusted"] = [];
      const rejected: MergeCartResult["rejected"] = [];
      let changed = false;
      for (const item of [...guestItems].sort(
        (a, b) => a.productId - b.productId || a.variantId - b.variantId,
      )) {
        const existing = (
          await transaction
            .request()
            .input("mergeCartId", sql.Int, cart.id)
            .input("mergeProductId", sql.Int, item.productId)
            .input("mergeVariantId", sql.Int, item.variantId)
            .query<{ id: number; quantity: number }>(
              "SELECT id,quantity FROM dbo.CartItems WITH (UPDLOCK,HOLDLOCK) WHERE cart_id=@mergeCartId AND product_id=@mergeProductId AND variant_id=@mergeVariantId",
            )
        ).recordset[0];
        if (existing) {
          if (existing.quantity !== item.quantity)
            preserved.push({
              ...item,
              cartItemId: existing.id,
              serverQuantity: existing.quantity,
              appliedQuantity: existing.quantity,
              reason: "SERVER_QUANTITY_PRESERVED",
            });
          continue;
        }
        const product = await resolvePurchase(
          transaction.request(),
          item.productId,
          item.variantId,
        );
        if (product && product.productId !== item.productId) {
          rejected.push({ ...item, reason: "VARIANT_PRODUCT_MISMATCH" });
          continue;
        }
        const invalid = rejection(product);
        if (invalid) {
          rejected.push({ ...item, reason: invalid });
          continue;
        }
        if (!product) continue;
        const appliedQuantity = Math.min(item.quantity, availableOf(product), 99);
        if (appliedQuantity <= 0) {
          rejected.push({ ...item, reason: "OUT_OF_STOCK" });
          continue;
        }
        const inserted = await transaction
          .request()
          .input("cartId", sql.Int, cart.id)
          .input("productId", sql.Int, item.productId)
          .input("variantId", sql.Int, item.variantId)
          .input("quantity", sql.Int, appliedQuantity)
          .query<{ id: number }>(
            "DECLARE @InsertedCartItem TABLE(id INT); INSERT dbo.CartItems(cart_id,product_id,variant_id,quantity,created_at,updated_at) OUTPUT INSERTED.id INTO @InsertedCartItem VALUES(@cartId,@productId,@variantId,@quantity,SYSUTCDATETIME(),SYSUTCDATETIME()); SELECT id FROM @InsertedCartItem;",
          );
        const result = {
          ...item,
          cartItemId: inserted.recordset[0]?.id,
          appliedQuantity,
        };
        added.push(result);
        if (appliedQuantity !== item.quantity)
          adjusted.push({
            ...result,
            reason: "QUANTITY_ADJUSTED_TO_AVAILABILITY",
          });
        changed = true;
      }
      if (changed) {
        const bumped = await bumpCart(transaction.request(), cart.id, cart.version);
        if (!bumped) throw new CartConflictError("CART_CONFLICT");
        cart = bumped;
      }
      return {
        cart: await readCartWith(transaction.request(), cart),
        added,
        preserved,
        adjusted,
        rejected,
      };
    });
  },
};
