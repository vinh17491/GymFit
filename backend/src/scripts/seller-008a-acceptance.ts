import crypto from "crypto";
import bcrypt from "bcryptjs";
import * as mssql from "mssql";
import type { Server } from "http";
import { config } from "../config/config";
import { closePool, query } from "../config/database";

if (process.env.SELLER008A_ACCEPTANCE !== "1")
  throw new Error("SELLER008A_ACCEPTANCE=1 is required");
if (
  config.db.database === "GYMFIT_DB" ||
  !config.db.database.startsWith("GYMFIT_DB_SELLER008A_ACCEPTANCE_")
)
  throw new Error("Refusing canonical database");

const stamp = Date.now();
const port = Number(process.env.ACCEPTANCE_PORT || 5529);
const base = `http://127.0.0.1:${port}/api`;
let server: Server | undefined;
let assertions = 0;
let lastStatus = 0;
const verify = (value: boolean, message: string) => {
  assertions += 1;
  if (!value)
    throw new Error(`Assertion ${assertions}: ${message}; status=${lastStatus}`);
};
async function call(
  path: string,
  method = "GET",
  token?: string,
  body?: unknown,
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  lastStatus = response.status;
  let data: any = {};
  try {
    data = await response.json();
  } catch {}
  return { status: response.status, data };
}
async function seedUser(role: string, key: string) {
  const email = `seller008a-${key}-${stamp}@example.test`;
  const password = `Aa1!${crypto.randomBytes(10).toString("hex")}`;
  const hash = await bcrypt.hash(password, 12);
  const result = await query<any>(
    "INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version) OUTPUT INSERTED.id VALUES(@email,@hash,@name,@role,1,1,0)",
    { email, hash, name: `SELLER008A ${key}`, role },
  );
  return {
    id: Number(result.recordset[0].id),
    email,
    password,
    token: "",
  };
}
async function login(user: {
  email: string;
  password: string;
  token: string;
}) {
  const response = await call("/auth/login", "POST", undefined, {
    email: user.email,
    password: user.password,
  });
  if (response.status !== 200) throw new Error(`Login failed: ${user.email}`);
  user.token = String(response.data.data.accessToken);
}
async function seedProduct(
  shopId: number,
  key: string,
  price: number,
  onHand: number,
  refs: { brand: number; category: number },
) {
  const sku = `SELLER008A-${key}-${stamp}`;
  const product = (
    await query<any>(
      "INSERT dbo.Products(product_name,slug,description,sku,price,stock,brand_id,category_id,is_active,shop_id,moderation_status,created_at,updated_at) OUTPUT INSERTED.id VALUES(@name,@slug,N'SELLER008A',@sku,@price,@stock,@brand,@category,1,@shop,N'PUBLISHED',SYSUTCDATETIME(),SYSUTCDATETIME())",
      {
        name: `SELLER008A ${key}`,
        slug: `seller008a-${key.toLowerCase()}-${stamp}`,
        sku,
        price,
        stock: onHand,
        brand: refs.brand,
        category: refs.category,
        shop: shopId,
      },
    )
  ).recordset[0];
  const variant = (
    await query<any>(
      "INSERT dbo.ProductVariants(product_id,variant_name,sku,price,is_active,is_default,created_at,updated_at) OUTPUT INSERTED.id VALUES(@product,N'Default',@sku,@price,1,1,SYSUTCDATETIME(),SYSUTCDATETIME())",
      { product: product.id, sku: `${sku}-V`, price },
    )
  ).recordset[0];
  await query(
    "INSERT dbo.Inventory(variant_id,on_hand,reserved,low_stock_threshold,updated_at) VALUES(@variant,@stock,0,2,SYSUTCDATETIME())",
    { variant: variant.id, stock: onHand },
  );
  return { productId: Number(product.id), variantId: Number(variant.id) };
}
async function dropDatabase() {
  const name = config.db.database;
  if (!/^GYMFIT_DB_SELLER008A_ACCEPTANCE_[A-Za-z0-9_]+$/.test(name))
    throw new Error("Unsafe drop target");
  const pool = await new mssql.ConnectionPool({
    ...config.db,
    database: "master",
  }).connect();
  try {
    await pool.request().batch(
      `IF DB_ID(N'${name}') IS NOT NULL BEGIN ALTER DATABASE [${name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${name}]; END`,
    );
  } finally {
    await pool.close();
  }
}

async function main() {
  const member = await seedUser("member", "member");
  const other = await seedUser("member", "other");
  const coach = await seedUser("coach", "coach");
  const seller = await seedUser("seller", "seller");
  const admin = await seedUser("admin", "admin");
  await Promise.all(
    [member, other, coach, seller, admin].map((user) => login(user)),
  );
  const official = (
    await query<any>(
      "SELECT TOP 1 id FROM dbo.Shops WHERE status=N'ACTIVE' ORDER BY is_system DESC,id",
    )
  ).recordset[0];
  const refs = (
    await query<any>(
      "SELECT (SELECT TOP 1 id FROM dbo.Brands WHERE is_active=1 ORDER BY id) brand,(SELECT TOP 1 id FROM dbo.Categories WHERE is_active=1 ORDER BY id) category",
    )
  ).recordset[0];
  await query(
    "INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system) VALUES(@owner,N'SELLER008A Shop',@slug,N'ACTIVE',1,0)",
    { owner: seller.id, slug: `seller008a-${stamp}` },
  );
  const secondShop = (
    await query<any>("SELECT id FROM dbo.Shops WHERE owner_user_id=@owner", {
      owner: seller.id,
    })
  ).recordset[0];
  const a = await seedProduct(Number(official.id), "A", 10000, 10, refs);
  const b = await seedProduct(Number(secondShop.id), "B", 20000, 3, refs);
  const c = await seedProduct(Number(official.id), "C", 30000, 5, refs);
  const zero = (
    await query<any>(
      "SELECT TOP 1 p.id productId,v.id variantId FROM dbo.Products p JOIN dbo.ProductVariants v ON v.product_id=p.id JOIN dbo.Inventory i ON i.variant_id=v.id WHERE p.id=0 AND p.is_active=1 AND p.moderation_status=N'PUBLISHED' AND v.is_active=1 AND i.available>0",
    )
  ).recordset[0];
  verify(Boolean(zero), "Product ID 0 fixture exists");

  let result = await call("/cart", "GET", member.token);
  verify(result.status === 200 && result.data.data.version === 1, "MEMBER active Cart");
  const memberCartId = Number(result.data.data.id);
  let version = Number(result.data.data.version);
  result = await call("/cart", "GET", coach.token);
  verify(result.status === 200, "COACH active Cart");
  verify(Number(result.data.data.id) !== memberCartId, "Buyer carts isolated");
  verify((await call("/cart", "GET", seller.token)).status === 403, "Seller blocked");
  verify((await call("/cart", "GET", admin.token)).status === 403, "Admin blocked");

  result = await call("/cart/items", "POST", member.token, {
    ...a,
    quantity: 2,
    cartVersion: version,
    price: 1,
    shopId: secondShop.id,
  });
  verify(result.status === 400, "forged price/Shop rejected");
  result = await call("/cart/items", "POST", member.token, {
    ...a,
    quantity: 2,
    cartVersion: version,
  });
  verify(result.status === 201 && result.data.data.items.length === 1, "add valid item");
  version = Number(result.data.data.version);
  const aItem = result.data.data.items[0];
  const reservedBefore = Number(
    (
      await query<any>("SELECT reserved FROM dbo.Inventory WHERE variant_id=@id", {
        id: a.variantId,
      })
    ).recordset[0].reserved,
  );
  verify(reservedBefore === 0, "add does not reserve");
  result = await call("/cart/items", "POST", member.token, {
    productId: 0,
    variantId: Number(zero.variantId),
    quantity: 1,
    cartVersion: version,
  });
  verify(result.status === 201, "add Product ID 0");
  version = Number(result.data.data.version);
  verify(
    (await call("/cart/items", "POST", member.token, { ...a, quantity: 0, cartVersion: version })).status === 400 &&
      (await call("/cart/items", "POST", member.token, { ...a, quantity: -1, cartVersion: version })).status === 400 &&
      (await call("/cart/items", "POST", member.token, { ...a, quantity: 1.5, cartVersion: version })).status === 400,
    "invalid quantities blocked",
  );
  verify(
    (await call("/cart/items", "POST", member.token, { ...b, quantity: 4, cartVersion: version })).status === 409,
    "quantity over inventory blocked",
  );
  verify(
    (await call("/cart/items", "POST", member.token, { productId: b.productId, variantId: a.variantId, quantity: 1, cartVersion: version })).status === 422,
    "Variant/Product mismatch blocked",
  );

  await query("UPDATE dbo.Products SET is_active=0 WHERE id=@id", { id: c.productId });
  verify(
    (await call("/cart/items", "POST", member.token, { ...c, quantity: 1, cartVersion: version })).status === 422,
    "inactive Product blocked",
  );
  await query("UPDATE dbo.Products SET is_active=1 WHERE id=@id", { id: c.productId });
  await query("UPDATE dbo.ProductVariants SET is_active=0 WHERE id=@id", { id: c.variantId });
  verify(
    (await call("/cart/items", "POST", member.token, { ...c, quantity: 1, cartVersion: version })).status === 422,
    "inactive Variant blocked",
  );
  await query("UPDATE dbo.ProductVariants SET is_active=1 WHERE id=@id", { id: c.variantId });
  await query("UPDATE dbo.Shops SET status=N'SUSPENDED' WHERE id=@id", { id: secondShop.id });
  verify(
    (await call("/cart/items", "POST", member.token, { ...b, quantity: 1, cartVersion: version })).status === 422,
    "inactive Shop blocked",
  );
  await query("UPDATE dbo.Shops SET status=N'ACTIVE' WHERE id=@id", { id: secondShop.id });

  result = await call(`/cart/items/${aItem.id}`, "PATCH", member.token, {
    quantity: 3,
    cartVersion: version,
  });
  verify(result.status === 200 && result.data.data.items.find((x: any) => x.id === aItem.id).quantity === 3, "update quantity");
  const staleVersion = version;
  version = Number(result.data.data.version);
  result = await call(`/cart/items/${aItem.id}`, "PATCH", member.token, {
    quantity: 4,
    cartVersion: staleVersion,
  });
  verify(result.status === 409 && result.data.code === "CART_CONFLICT" && result.data.data.cart.version === version, "stale update canonical conflict");
  verify(
    (await call(`/cart/items/${aItem.id}`, "DELETE", other.token, { cartVersion: 1 })).status === 404,
    "cross-user CartItem mutation blocked",
  );
  result = await call(`/cart/items/${aItem.id}`, "DELETE", member.token, {
    cartVersion: staleVersion,
  });
  verify(result.status === 409 && result.data.code === "CART_DELETE_CONFLICT", "stale delete conflict");
  result = await call(`/cart/items/${aItem.id}`, "DELETE", member.token, {
    cartVersion: version,
  });
  verify(result.status === 200, "remove item");
  version = Number(result.data.data.version);

  const duplicateConstraint = await query<any>(
    "SELECT TOP 1 id,product_id productId,variant_id variantId,quantity FROM dbo.CartItems WHERE cart_id=@cart",
    { cart: memberCartId },
  );
  let duplicateBlocked = false;
  try {
    const item = duplicateConstraint.recordset[0];
    await query(
      "INSERT dbo.CartItems(cart_id,product_id,variant_id,quantity) VALUES(@cart,@product,@variant,@quantity)",
      { cart: memberCartId, product: item.productId, variant: item.variantId, quantity: item.quantity },
    );
  } catch {
    duplicateBlocked = true;
  }
  verify(duplicateBlocked, "database duplicate item constraint");

  result = await call("/cart/merge", "POST", member.token, {
    items: [
      { ...b, quantity: 9 },
      { ...c, quantity: 2 },
      { productId: 999999, variantId: 999999, quantity: 1 },
    ],
  });
  verify(result.status === 200, "merge succeeds with per-item outcomes");
  verify(result.data.data.adjusted.some((x: any) => x.productId === b.productId && x.appliedQuantity === 3), "merge quantity adjustment reported");
  verify(result.data.data.rejected.length === 1, "merge invalid item rejected");
  verify(result.data.data.added.length === 2, "merge guest-only items");
  version = Number(result.data.data.cart.version);
  const mergeCount = result.data.data.cart.items.length;
  result = await call("/cart/merge", "POST", member.token, {
    items: [
      { ...b, quantity: 1 },
      { ...c, quantity: 4 },
    ],
  });
  verify(result.status === 200 && result.data.data.cart.items.length === mergeCount, "merge retry idempotent");
  verify(
    result.data.data.preserved.length === 2 &&
      result.data.data.preserved.every((x: any) => x.reason === "SERVER_QUANTITY_PRESERVED"),
    "merge duplicates preserve server quantity without addition",
  );
  verify(result.data.data.cart.items.some((x: any) => x.productId === 0), "guest absence does not delete server item");
  verify(new Set(result.data.data.cart.items.map((x: any) => x.shop.id)).size === 2, "multi-Shop Cart metadata");
  version = Number(result.data.data.cart.version);

  const persisted = await call("/cart", "GET", member.token);
  verify(persisted.status === 200 && persisted.data.data.items.length === mergeCount, "Cart persists across requests/session");
  const inventoryBeforeCheckout = (
    await query<any>("SELECT reserved FROM dbo.Inventory WHERE variant_id=@id", { id: b.variantId })
  ).recordset[0];
  verify(Number(inventoryBeforeCheckout.reserved) === 0, "merge does not reserve");

  const checkoutBody = {
    customerName: "Buyer",
    customerPhone: "0900000000",
    shippingAddressLine1: "1 Test",
    shippingCity: "HCM",
    shippingCountry: "VN",
    cartVersion: version,
  };
  result = await call("/orders", "POST", member.token, checkoutBody);
  verify(result.status === 201 && result.data.data.shopOrders.length === 2, "Server Cart multi-Shop checkout");
  verify(
    Number((await query<any>("SELECT COUNT(*) count FROM dbo.CartItems WHERE cart_id=@cart", { cart: memberCartId })).recordset[0].count) === 0,
    "successful checkout removes purchased CartItems",
  );
  verify(result.data.data.cartVersion === version + 1, "checkout advances Cart version");

  let coachCart = (await call("/cart", "GET", coach.token)).data.data;
  result = await call("/cart/items", "POST", coach.token, {
    ...c,
    quantity: 2,
    cartVersion: coachCart.version,
  });
  coachCart = result.data.data;
  await query("UPDATE dbo.Inventory SET on_hand=reserved WHERE variant_id=@id", { id: c.variantId });
  result = await call("/orders", "POST", coach.token, {
    ...checkoutBody,
    cartVersion: coachCart.version,
  });
  verify(result.status === 409, "checkout inventory rollback triggered");
  verify(
    Number((await query<any>("SELECT COUNT(*) count FROM dbo.CartItems WHERE cart_id=@cart", { cart: coachCart.id })).recordset[0].count) === 1,
    "checkout rollback retains CartItem",
  );
  await query("UPDATE dbo.Inventory SET on_hand=reserved+5 WHERE variant_id=@id", { id: c.variantId });

  const fresh = (await call("/cart", "GET", coach.token)).data.data;
  result = await call("/cart", "DELETE", coach.token, { cartVersion: fresh.version });
  verify(result.status === 200 && result.data.data.items.length === 0, "clear Cart");
  verify(
    (await call("/cart", "DELETE", coach.token, { cartVersion: fresh.version })).status === 409,
    "stale clear conflict",
  );
  const carts = (
    await query<any>("SELECT buyer_id,COUNT(*) count FROM dbo.Carts GROUP BY buyer_id HAVING COUNT(*)>1")
  ).recordset;
  verify(carts.length === 0, "one Cart per Buyer database invariant");
  verify(
    Number((await query<any>("SELECT COUNT(*) count FROM dbo.CartItems WHERE product_id<0 OR quantity NOT BETWEEN 1 AND 99")).recordset[0].count) === 0,
    "CartItem integrity checks",
  );
  console.log(
    `[SELLER-008A ACCEPTANCE PASS] assertions=${assertions} database=${config.db.database}`,
  );
}

async function run() {
  try {
    const { default: app } = await import("../app");
    server = app.listen(port, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server!.once("listening", resolve);
      server!.once("error", reject);
    });
    await main();
    return 0;
  } catch (error) {
    console.error(
      "[SELLER-008A ACCEPTANCE FAIL]",
      error instanceof Error ? error.message : error,
    );
    return 1;
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await closePool();
    await dropDatabase();
  }
}
void run().then((code) => {
  process.exitCode = code;
});
