import crypto from 'crypto';
import net from 'net';
import type { Server } from 'http';
import * as mssql from 'mssql';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { closePool, query } from '../config/database';

if (process.env.SELLER007_VERIFICATION !== '1') throw new Error('SELLER007_VERIFICATION=1 is required');
const database = config.db.database;
if (!/^GYMFIT_REGRESSION_07_[A-Za-z0-9_]+$/.test(database)) throw new Error('Refusing non-SELLER-007 regression database');

const suffix = crypto.randomBytes(5).toString('hex');
const port = Number(process.env.VERIFICATION_PORT || 5577);
const base = `http://127.0.0.1:${port}/api`;
const requestAbort = new AbortController();
let server: Server | undefined;
let assertions = 0;
let expected4xx = 0;
let unexpected500 = 0;
let lastStatus = 0;
const startedAt = Date.now();

type Json = Record<string, any>;
const check = (value: unknown, message: string) => {
  assertions++;
  if (!value) throw new Error(`Assertion ${assertions} failed: ${message}; last status=${lastStatus}`);
};
async function call(path: string, token?: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  const stop = () => controller.abort();
  requestAbort.signal.addEventListener('abort', stop, { once: true });
  try {
    const response = await fetch(base + path, {
      signal: controller.signal,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    lastStatus = response.status;
    if (response.status >= 400 && response.status < 500) expected4xx++;
    if (response.status >= 500) unexpected500++;
    let data: Json = {};
    try { data = await response.json() as Json; } catch { /* JSON is asserted by callers where required. */ }
    return { status: response.status, data };
  } finally {
    clearTimeout(timer);
    requestAbort.signal.removeEventListener('abort', stop);
  }
}
function token(userId: number, role: 'member' | 'seller' | 'admin') {
  return jwt.sign({ userId, role, type: 'access', tokenVersion: 0 }, config.jwt.accessSecret, {
    expiresIn: '5m', issuer: config.jwt.issuer, audience: config.jwt.audience,
  });
}
async function addUser(role: string, label: string) {
  const result = await query<{ id: number }>(`INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version)
    OUTPUT INSERTED.id VALUES(@email,N'not-used',@name,@role,1,1,0)`,
  { email: `seller007-verification-${label}-${suffix}@example.test`, name: `SELLER007 ${label}`, role });
  return Number(result.recordset[0].id);
}
async function addShop(owner: number, key: string, status: 'ACTIVE' | 'SUSPENDED') {
  const slug = `seller007-${key}-${suffix}`;
  const result = await query<{ id: number }>(`INSERT dbo.Shops(owner_user_id,name,slug,status,is_verified,is_system,description,logo_url,banner_url)
    OUTPUT INSERTED.id VALUES(@owner,@name,@slug,@status,1,0,N'Safe public description',N'/uploads/shop-logo.webp',NULL)`,
  { owner, name: `SELLER007 ${key} Shop`, slug, status });
  return { id: Number(result.recordset[0].id), slug };
}
async function addProduct(input: {
  shopId: number; key: string; status: 'PUBLISHED' | 'DRAFT' | 'PENDING_REVIEW' | 'REJECTED' | 'SUSPENDED';
  active: boolean; categoryId: number; brandId: number; activeVariant?: boolean; image?: 'primary' | 'none';
}) {
  const slug = `seller007-${input.key}-${suffix}`;
  const sku = `SELLER007-VERIFY-${input.key}-${suffix}`;
  const product = await query<{ id: number }>(`INSERT dbo.Products(product_name,slug,description,sku,price,stock,brand_id,category_id,is_active,shop_id,moderation_status,submitted_at,created_at,updated_at)
    OUTPUT INSERTED.id VALUES(@name,@slug,N'Safe product text',@sku,100000,7,@brand,@category,@active,@shop,@status,
      CASE WHEN @status=N'PENDING_REVIEW' THEN SYSUTCDATETIME() ELSE NULL END,SYSUTCDATETIME(),SYSUTCDATETIME())`,
  { name: `SELLER007 ${input.key}`, slug, sku, brand: input.brandId, category: input.categoryId, active: input.active, shop: input.shopId, status: input.status });
  const productId = Number(product.recordset[0].id);
  const variant = await query<{ id: number }>(`INSERT dbo.ProductVariants(product_id,variant_name,sku,price,sale_price,is_active,is_default,created_at,updated_at)
    OUTPUT INSERTED.id VALUES(@product,N'Default',@sku,100000,90000,@active,1,SYSUTCDATETIME(),SYSUTCDATETIME())`,
  { product: productId, sku: `${sku}-V`, active: input.activeVariant === false ? 0 : 1 });
  await query(`INSERT dbo.Inventory(variant_id,on_hand,reserved,low_stock_threshold,updated_at) VALUES(@variant,7,0,2,SYSUTCDATETIME())`, { variant: variant.recordset[0].id });
  if (input.image === 'primary') {
    await query(`INSERT dbo.ProductImages(product_id,image_url,alt_text,sort_order,is_primary,created_at)
      VALUES(@product,@url,N'SELLER007 image',0,1,SYSUTCDATETIME())`, { product: productId, url: `/uploads/products/seller007-${suffix}.webp` });
  }
  return { id: productId, slug };
}
async function portReleased() {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(true));
    socket.setTimeout(2000, () => { socket.destroy(); resolve(true); });
  });
}
async function dropDatabase() {
  if (!/^GYMFIT_REGRESSION_07_[A-Za-z0-9_]+$/.test(database)) throw new Error('Unsafe database cleanup target');
  const master = await new mssql.ConnectionPool({ ...config.db, database: 'master' }).connect();
  try {
    await master.request().batch(`IF DB_ID(N'${database}') IS NOT NULL BEGIN ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]; END`);
    const result = await master.request().query(`SELECT DB_ID(N'${database}') id`);
    return result.recordset[0].id == null;
  } finally { await master.close(); }
}

async function verifyApi() {
  const dbName = await query<{ name: string }>('SELECT DB_NAME() name');
  check(dbName.recordset[0].name === database, 'DB_NAME() must match isolated database');
  check(dbName.recordset[0].name.startsWith('GYMFIT_REGRESSION_'), 'database prefix gate');
  const migrationCount = await query<{ count: number }>('SELECT COUNT(*) count FROM dbo.SchemaMigrations');
  check(Number(migrationCount.recordset[0].count) === 11, 'all 11 migrations applied');

  const member = await addUser('member', 'member');
  const sellerA = await addUser('seller', 'seller-a');
  const sellerB = await addUser('seller', 'seller-b');
  const sellerC = await addUser('seller', 'seller-c');
  const sellerEmpty = await addUser('seller', 'seller-empty');
  const admin = await addUser('admin', 'admin');
  const shopA = await addShop(sellerA, 'alpha', 'ACTIVE');
  const shopB = await addShop(sellerB, 'beta', 'ACTIVE');
  const shopC = await addShop(sellerC, 'suspended', 'SUSPENDED');
  const emptyShop = await addShop(sellerEmpty, 'empty', 'ACTIVE');
  const refs = await query<{ categoryId: number; brandId: number }>(`SELECT
    (SELECT TOP 1 id FROM dbo.Categories WHERE is_active=1 ORDER BY id) categoryId,
    (SELECT TOP 1 id FROM dbo.Brands WHERE is_active=1 ORDER BY id) brandId`);
  const { categoryId, brandId } = refs.recordset[0];
  const published = await addProduct({ shopId: shopA.id, key: 'published', status: 'PUBLISHED', active: true, categoryId, brandId, image: 'primary' });
  const noImage = await addProduct({ shopId: shopA.id, key: 'no-image', status: 'PUBLISHED', active: true, categoryId, brandId, image: 'none' });
  const draft = await addProduct({ shopId: shopA.id, key: 'draft', status: 'DRAFT', active: false, categoryId, brandId });
  const pending = await addProduct({ shopId: shopA.id, key: 'pending', status: 'PENDING_REVIEW', active: false, categoryId, brandId });
  const rejected = await addProduct({ shopId: shopA.id, key: 'rejected', status: 'REJECTED', active: false, categoryId, brandId });
  const suspended = await addProduct({ shopId: shopA.id, key: 'product-suspended', status: 'SUSPENDED', active: false, categoryId, brandId });
  const inactive = await addProduct({ shopId: shopA.id, key: 'inactive', status: 'PUBLISHED', active: false, categoryId, brandId });
  const noActiveVariant = await addProduct({ shopId: shopA.id, key: 'no-active-variant', status: 'PUBLISHED', active: true, categoryId, brandId, activeVariant: false });
  const shopBProduct = await addProduct({ shopId: shopB.id, key: 'beta-product', status: 'PUBLISHED', active: true, categoryId, brandId });
  const shopCProduct = await addProduct({ shopId: shopC.id, key: 'hidden-shop-product', status: 'PUBLISHED', active: true, categoryId, brandId });
  const fixtureBefore = await query<{ products: number; shops: number }>(`SELECT
    (SELECT COUNT(*) FROM dbo.Products WHERE sku LIKE N'SELLER007-VERIFY-%') products,
    (SELECT COUNT(*) FROM dbo.Shops WHERE slug LIKE N'seller007-%-${suffix}') shops`);

  const authCases: Array<[string, string | undefined]> = [
    ['anonymous', undefined], ['member', token(member, 'member')], ['seller', token(sellerA, 'seller')], ['admin', token(admin, 'admin')],
  ];
  for (const [role, auth] of authCases) {
    const response = await call(`/shops/${shopA.slug}?pageSize=100`, auth);
    check(response.status === 200, `${role} can read ACTIVE Shop`);
    check(response.data.data.slug === shopA.slug, `${role} receives requested Shop`);
  }
  let response = await call(`/shops/${shopC.slug}`);
  check(response.status === 404, 'SUSPENDED Shop is hidden');
  response = await call(`/shops/seller007-missing-${suffix}`);
  check(response.status === 404, 'missing Shop is 404');
  response = await call('/shops/1');
  check(response.status === 400, 'numeric ID route is not supported');
  response = await call('/shops/999999');
  check(response.status === 404, 'numeric-looking valid-length value is treated as slug');
  response = await call(`/shops/${shopA.slug}`, 'invalid-token');
  check(response.status === 200, 'invalid token does not break public route');
  response = await call(`/shops/${emptyShop.slug}`);
  check(response.status === 200 && response.data.products.length === 0 && response.data.pagination.total === 0, 'empty ACTIVE Shop contract');

  response = await call(`/shops/${shopA.slug}?pageSize=100`);
  check(response.status === 200, 'Shop A detail succeeds');
  const ids = response.data.products.map((product: Json) => product.id);
  check(ids.includes(published.id) && ids.includes(noImage.id), 'valid published Products appear');
  check(!ids.includes(draft.id), 'DRAFT hidden');
  check(!ids.includes(pending.id), 'PENDING_REVIEW hidden');
  check(!ids.includes(rejected.id), 'REJECTED hidden');
  check(!ids.includes(suspended.id), 'SUSPENDED Product hidden');
  check(!ids.includes(inactive.id), 'inactive Product hidden');
  check(!ids.includes(noActiveVariant.id), 'Product without active Variant hidden');
  check(!ids.includes(shopBProduct.id), 'Shop B Product excluded from Shop A');
  check(!ids.includes(shopCProduct.id), 'suspended Shop Product excluded');
  check(response.data.products.every((product: Json) => product.shop.slug === shopA.slug), 'all Products belong to path Shop');
  check(new Set(ids).size === ids.length, 'Product joins do not duplicate rows');
  const primary = response.data.products.find((product: Json) => product.id === published.id);
  const missingImage = response.data.products.find((product: Json) => product.id === noImage.id);
  check(primary.primary_image?.is_primary === true && primary.primary_image.image_url.includes('seller007-'), 'primary image contract');
  check(missingImage.primary_image === null && missingImage.main_image === null, 'no-image contract is null');
  check(response.data.pagination.total === 2 && response.data.pagination.pages === 1, 'Shop pagination metadata');

  const safe = JSON.stringify(response.data).toLowerCase();
  for (const field of ['owner_user_id', 'owneruserid', 'owneremail', 'pickup_address', 'pickupaddress', 'systemkey', 'review_reason', 'reviewed_by', 'moderation_status', 'password']) {
    check(!safe.includes(field), `public Shop omits ${field}`);
  }
  check(!/[a-z]:\\\\|\/users\/|\/home\//i.test(safe), 'response omits absolute filesystem paths');

  response = await call(`/shops/${shopA.slug}?q=published`);
  check(response.status === 200 && response.data.products.some((product: Json) => product.id === published.id), 'Shop search');
  response = await call(`/shops/${shopA.slug}?categoryId=${categoryId}`);
  check(response.status === 200 && response.data.pagination.total === 2, 'Shop category filter');
  response = await call(`/shops/${shopA.slug}?brandId=${brandId}`);
  check(response.status === 200 && response.data.pagination.total === 2, 'Shop brand filter');
  response = await call(`/shops/${shopA.slug}?sort=name_asc&page=1&pageSize=1`);
  check(response.status === 200 && response.data.products.length === 1 && response.data.pagination.pages === 2, 'Shop sort and pagination');
  response = await call(`/shops/${shopA.slug}?minPrice=80000&maxPrice=95000&inStock=true`);
  check(response.status === 200 && response.data.pagination.total === 2, 'Shop price and stock filters');
  response = await call(`/shops/${shopA.slug}?shopSlug=${shopB.slug}`);
  check(response.status === 400, 'query cannot override path Shop');
  response = await call(`/shops/${shopA.slug}?unknown=1`);
  check(response.status === 400, 'unknown query rejected');
  response = await call(`/shops/${shopA.slug}?page=0`);
  check(response.status === 400, 'invalid page rejected');
  response = await call(`/shops/${shopA.slug}?pageSize=101`);
  check(response.status === 400, 'page size limit enforced');
  response = await call(`/shops/${shopA.slug}?sort=drop_table`);
  check(response.status === 400, 'sort allowlist enforced');
  response = await call(`/shops/${shopA.slug}?q=${encodeURIComponent("x%' OR 1=1--")}`);
  check(response.status === 200 && response.data.pagination.total === 0, 'search is parameterized');

  response = await call(`/products?q=SELLER007&pageSize=100`);
  check(response.status === 200, 'Marketplace public Product API');
  check(response.data.data.some((product: Json) => product.id === published.id), 'Marketplace includes valid Product');
  check(!response.data.data.some((product: Json) => [draft.id, pending.id, rejected.id, suspended.id, inactive.id, noActiveVariant.id, shopCProduct.id].includes(product.id)), 'Marketplace visibility scope');
  const marketplaceProduct = response.data.data.find((product: Json) => product.id === published.id);
  check(marketplaceProduct.shop.slug === shopA.slug && marketplaceProduct.shop.name.includes('alpha'), 'Product Card safe Shop summary');
  response = await call(`/products/${published.slug}`);
  check(response.status === 200 && response.data.data.shop.slug === shopA.slug, 'Product detail by slug links to Shop');
  response = await call(`/products/${published.id}`);
  check(response.status === 200 && response.data.data.shop.slug === shopA.slug, 'Product detail by ID links to Shop');
  response = await call('/products/0');
  check(response.status === 200 && response.data.data.id === 0 && response.data.data.shop.slug === 'gymfit-official', 'Product ID 0 and Official Shop');
  response = await call('/shops/gymfit-official?pageSize=100');
  check(response.status === 200 && response.data.data.slug === 'gymfit-official', 'Official Shop public route');

  const fixtureAfter = await query<{ products: number; shops: number }>(`SELECT
    (SELECT COUNT(*) FROM dbo.Products WHERE sku LIKE N'SELLER007-VERIFY-%') products,
    (SELECT COUNT(*) FROM dbo.Shops WHERE slug LIKE N'seller007-%-${suffix}') shops`);
  check(Number(fixtureAfter.recordset[0].products) === Number(fixtureBefore.recordset[0].products), 'HTTP requests create no Product side effect');
  check(Number(fixtureAfter.recordset[0].shops) === Number(fixtureBefore.recordset[0].shops), 'HTTP requests create no Shop side effect');
  check(unexpected500 === 0, 'no unexpected 500 responses');
  check(assertions >= 65, 'focused assertion floor');
}

async function run() {
  let suiteTimer: NodeJS.Timeout | undefined;
  let startupTimer: NodeJS.Timeout | undefined;
  let dropped = false;
  let released = false;
  try {
    const { default: app } = await import('../app');
    server = app.listen(port, '127.0.0.1');
    await Promise.race([
      new Promise<void>((resolve, reject) => { server!.once('listening', resolve); server!.once('error', reject); }),
      new Promise<never>((_, reject) => { startupTimer = setTimeout(() => reject(new Error('Backend startup exceeded 60000ms')), 60000); }),
    ]);
    if (startupTimer) clearTimeout(startupTimer);
    await Promise.race([
      verifyApi(),
      new Promise<never>((_, reject) => { suiteTimer = setTimeout(() => { requestAbort.abort(); reject(new Error('Suite exceeded 120000ms')); }, 120000); }),
    ]);
    console.log(`[SELLER-007 VERIFICATION PASS] assertions=${assertions} expected4xx=${expected4xx} unexpected500=${unexpected500} database=${database} durationMs=${Date.now() - startedAt}`);
    return 0;
  } catch (error) {
    console.error('[SELLER-007 VERIFICATION FAIL]', error instanceof Error ? error.message : String(error));
    return 1;
  } finally {
    if (startupTimer) clearTimeout(startupTimer);
    if (suiteTimer) clearTimeout(suiteTimer);
    requestAbort.abort();
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await closePool();
    dropped = await dropDatabase();
    released = await portReleased();
    console.log(`[SELLER-007 CLEANUP] databaseDropped=${dropped} portReleased=${released}`);
    if (!dropped || !released) process.exitCode = 1;
  }
}

void run().then((code) => { if (process.exitCode !== 1) process.exitCode = code; });
