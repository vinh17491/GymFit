import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import type { ConnectionPool } from 'mssql';
import { closePool, getPool, sql } from '../config/database';
import { config } from '../config/config';

type ProductRow = { id: number; slug: string | null; category_slug: string | null; product_name: string };
type ExistingImage = { product_id: number; image_url: string };
type LegacyFile = { relative: string; absolute: string; hash: string };
type Candidate = { product: ProductRow; file: LegacyFile; destination: string; url: string };
type ApplyAction = 'INSERT' | 'NO_OP';

const apply = process.argv.includes('--apply');
const legacyArg = process.argv.find((arg) => arg.startsWith('--legacy-root='))?.slice('--legacy-root='.length);
const legacyRoot = path.resolve(legacyArg || process.env.LEGACY_PRODUCT_IMAGE_DIR || '');
const uploadRoot = path.resolve(config.upload.dir);
const projectRoot = path.resolve(__dirname, '../../..');
const backupRoot = path.resolve(projectRoot, 'backend/backups/product-images');

function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function directoryExists(target: string): Promise<boolean> {
  try { return (await fs.stat(target)).isDirectory(); } catch { return false; }
}

async function walkWebp(root: string): Promise<LegacyFile[]> {
  const files: LegacyFile[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.webp') {
        const relative = path.relative(root, absolute).split(path.sep).join('/');
        const content = await fs.readFile(absolute);
        files.push({ relative, absolute, hash: createHash('sha256').update(content).digest('hex') });
      }
    }
  }
  await visit(root);
  return files.sort((a, b) => a.relative.localeCompare(b.relative));
}

function safeDestination(productId: number, hash: string): { path: string; url: string } {
  const filename = `product-${productId}-${hash}.webp`;
  const directory = path.resolve(uploadRoot, 'products', String(productId));
  const target = path.resolve(directory, filename);
  if (!inside(path.resolve(uploadRoot, 'products'), target)) throw new Error('Unsafe canonical destination');
  return { path: target, url: `/uploads/products/${productId}/${filename}` };
}

async function fileExists(target: string): Promise<boolean> {
  try { return (await fs.stat(target)).isFile(); } catch { return false; }
}

async function assertValidExistingDestination(plan: { destination_path: string; source_hash: string }): Promise<void> {
  const destinationHash = createHash('sha256').update(await fs.readFile(plan.destination_path)).digest('hex');
  if (destinationHash !== plan.source_hash) throw new Error('GUARDED_APPLY_ABORT destination exists with different content');
  await sharp(plan.destination_path, { failOn: 'error' }).metadata();
}

async function readCounts(pool: ConnectionPool) {
  return (await pool.request().query(`SELECT (SELECT COUNT(*) FROM dbo.Products) AS products,(SELECT COUNT(*) FROM dbo.ProductVariants) AS product_variants,(SELECT COUNT(*) FROM dbo.Inventory) AS inventory,(SELECT COUNT(*) FROM dbo.ProductImages) AS product_images,(SELECT COUNT(*) FROM dbo.Products p WHERE NOT EXISTS (SELECT 1 FROM dbo.ProductImages pi WHERE pi.product_id=p.id)) AS products_without_images,(SELECT COUNT(*) FROM dbo.ProductImages pi WHERE NOT EXISTS (SELECT 1 FROM dbo.Products p WHERE p.id=pi.product_id)) AS orphan_images,(SELECT COUNT(*) FROM (SELECT product_id FROM dbo.ProductImages WHERE is_primary=1 GROUP BY product_id HAVING COUNT(*)>1) x) AS multiple_primary,(SELECT COUNT(*) FROM dbo.ProductImages WHERE image_url LIKE '/media/%') AS media_records,(SELECT COUNT(*) FROM dbo.ProductImages WHERE image_url LIKE '/uploads/%') AS upload_records,(SELECT COUNT(*) FROM dbo.ProductImages WHERE image_url LIKE '/image/%') AS image_records`)).recordset[0];
}

async function main(): Promise<void> {
  if (!legacyArg && !process.env.LEGACY_PRODUCT_IMAGE_DIR) throw new Error('Set LEGACY_PRODUCT_IMAGE_DIR or pass --legacy-root=<directory>');
  if (!await directoryExists(legacyRoot)) throw new Error(`Legacy image root does not exist: ${legacyRoot}`);

  const pool = await getPool();
  const products = (await pool.request().query<ProductRow>(`
    SELECT p.id,p.slug,c.slug AS category_slug,p.product_name
    FROM dbo.Products p JOIN dbo.Categories c ON c.id=p.category_id
    ORDER BY p.id
  `)).recordset;
  const existing = (await pool.request().query<ExistingImage>('SELECT product_id,image_url FROM dbo.ProductImages')).recordset;
  const existingKeys = new Set(existing.map((row) => `${row.product_id}|${row.image_url}`));
  const files = await walkWebp(legacyRoot);
  const filesByPath = new Map(files.map((file) => [file.relative, file]));
  const expected = new Map<string, ProductRow[]>();
  const missingProducts: ProductRow[] = [];

  for (const product of products) {
    const relative = product.category_slug && product.slug ? `${product.category_slug}/${product.slug}-main.webp` : '';
    if (!relative) { missingProducts.push(product); continue; }
    const group = expected.get(relative) || [];
    group.push(product);
    expected.set(relative, group);
  }

  const ambiguousPaths = new Set([...expected.entries()].filter(([, group]) => group.length > 1).map(([relative]) => relative));
  const candidates: Candidate[] = [];
  const ambiguousSamples: Array<{ relative: string; product_ids: number[]; reason: string }> = [];
  const verifiedSamples: Array<{ product_id: number; slug: string | null; category_slug: string | null; relative: string; source_hash: string }> = [];
  const used = new Set<string>();
  let collisionCount = 0;

  for (const [relative, group] of expected) {
    const file = filesByPath.get(relative);
    if (group.length > 1) {
      collisionCount += 1;
      if (ambiguousSamples.length < 10) ambiguousSamples.push({ relative, product_ids: group.map((product) => product.id), reason: 'one exact legacy path maps to multiple Products' });
      continue;
    }
    if (!file) { missingProducts.push(group[0]); continue; }
    try { await sharp(file.absolute, { failOn: 'error' }).metadata(); }
    catch { missingProducts.push(group[0]); continue; }
    used.add(relative);
    const product = group[0];
    const destination = safeDestination(product.id, file.hash);
    candidates.push({ product, file, destination: destination.path, url: destination.url });
    if (verifiedSamples.length < 10) verifiedSamples.push({ product_id: product.id, slug: product.slug, category_slug: product.category_slug, relative, source_hash: file.hash });
  }

  const plans = candidates.map((candidate) => ({
    action: 'INSERT_PRODUCT_IMAGE' as const,
    product_id: candidate.product.id,
    product_name: candidate.product.product_name,
    source_path: candidate.file.absolute,
    source_relative: candidate.file.relative,
    source_hash: candidate.file.hash,
    destination_path: candidate.destination,
    destination_url: candidate.url,
    sort_order: 0,
    is_primary: true,
    reason: 'exact category slug + product slug filename match',
    already_present: existingKeys.has(`${candidate.product.id}|${candidate.url}`),
  }));
  const pendingPlans = plans.filter((plan) => !plan.already_present);
  const plannedCopies = (await Promise.all(pendingPlans.map(async (plan) => !(await fileExists(plan.destination_path))))).filter(Boolean).length;
  const unusedFiles = files.filter((file) => !used.has(file.relative) && !ambiguousPaths.has(file.relative));
  const expectedPlan = (plan: typeof plans[number]) => collisionCount === 0
    && plan.product_id === 37
    && plan.source_relative === 'running-shoes/hoka-clifton-9-main.webp'
    && plan.source_hash === '96c3a8e8abb78182779732edf0ed63c096d9825c5724ff5c1949f90954003d84';
  const insertPlan = pendingPlans.length === 1 ? pendingPlans[0] : undefined;
  const noOpPlan = pendingPlans.length === 0 && plans.length === 1 && plans[0].already_present ? plans[0] : undefined;
  const noOpRecords = noOpPlan ? existing.filter((row) => row.product_id === noOpPlan.product_id) : [];
  let applyAction: ApplyAction | null = null;
  if (insertPlan && expectedPlan(insertPlan) && (plannedCopies === 0 || plannedCopies === 1)) applyAction = 'INSERT';
  if (noOpPlan && expectedPlan(noOpPlan) && noOpRecords.length === 1 && noOpRecords[0].image_url === noOpPlan.destination_url) applyAction = 'NO_OP';
  if (apply) {
    const source = filesByPath.get('running-shoes/hoka-clifton-9-main.webp');

    if (applyAction === 'INSERT' && insertPlan) {
      if (plannedCopies === 0) await assertValidExistingDestination(insertPlan);
      if (!source || createHash('sha256').update(await fs.readFile(source.absolute)).digest('hex') !== insertPlan.source_hash) throw new Error('GUARDED_APPLY_ABORT source SHA-256 changed');
    } else if (applyAction === 'NO_OP' && noOpPlan) {
      await assertValidExistingDestination(noOpPlan);
      if (!source || createHash('sha256').update(await fs.readFile(source.absolute)).digest('hex') !== noOpPlan.source_hash) throw new Error('GUARDED_APPLY_ABORT source SHA-256 changed');
    } else {
      throw new Error(`GUARDED_APPLY_ABORT expected verified=1, ambiguous=0, and either one guarded insert with planned_copies=0|1 or one valid no-op for Product 37; got verified=${candidates.length} planned_inserts=${pendingPlans.length} planned_copies=${plannedCopies} already_present=${plans.length - pendingPlans.length} ambiguous=${collisionCount}`);
    }
  }
  const pendingMutation = applyAction === 'INSERT' ? 1 : applyAction === 'NO_OP' ? 0 : pendingPlans.length;
  const printReport = (counts: Awaited<ReturnType<typeof readCounts>>, backupPath: string | null) => console.log(`PRODUCT_IMAGE_BOOTSTRAP ${JSON.stringify({
    mode: apply ? 'apply' : 'dry-run', apply_action: applyAction, pending_mutation: pendingMutation,
    products_total: products.length, legacy_files_total: files.length, verified: candidates.length, ambiguous: collisionCount,
    missing_products: missingProducts.length, unused_files: unusedFiles.length, collision_count: collisionCount,
    planned_inserts: pendingPlans.length, planned_copies: plannedCopies, already_present: plans.length - pendingPlans.length,
    backup_path: backupPath, sample_verified_mappings: verifiedSamples, sample_ambiguous_mappings: ambiguousSamples, final_counts: counts,
  })}`);

  if (!apply || applyAction === 'NO_OP') {
    printReport(await readCounts(pool), null);
    return;
  }
  if (applyAction !== 'INSERT' || !insertPlan || pendingPlans.length !== 1) throw new Error('GUARDED_APPLY_ABORT invalid guarded apply state');

  let backupPath: string | null = null;
  backupPath = path.join(backupRoot, `bootstrap-plan-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.mkdir(backupRoot, { recursive: true });
  await fs.writeFile(backupPath, JSON.stringify({ created_at: new Date().toISOString(), mode: 'apply', legacy_root: legacyRoot, insert_plan: pendingPlans, verified: candidates.length, ambiguous: collisionCount, missing_products: missingProducts.length, unused_files: unusedFiles.map((file) => file.relative) }, null, 2), 'utf8');

  {
    const plan = insertPlan;
    const destinationExisted = await fileExists(plan.destination_path);
    if (destinationExisted) {
      await assertValidExistingDestination(plan);
    } else {
      await fs.mkdir(path.dirname(plan.destination_path), { recursive: true });
      await fs.copyFile(plan.source_path, plan.destination_path);
      await sharp(plan.destination_path, { failOn: 'error' }).metadata();
    }
    try {
      const tx = pool.transaction();
      await tx.begin();
      try {
        await tx.request().input('productId', sql.Int, plan.product_id).input('url', sql.NVarChar(500), plan.destination_url).input('alt', sql.NVarChar(200), plan.product_name).query(`INSERT dbo.ProductImages(product_id,image_url,alt_text,sort_order,is_primary,created_at) SELECT @productId,@url,@alt,0,1,SYSUTCDATETIME() WHERE NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE product_id=@productId AND image_url=@url)`);
        await tx.commit();
      } catch (error) { await tx.rollback(); throw error; }
    } catch (error) {
      if (!destinationExisted) await fs.unlink(plan.destination_path).catch(() => undefined);
      throw error;
    }
  }

  printReport(await readCounts(pool), backupPath);
}

main().catch((error: unknown) => { console.error('PRODUCT_IMAGE_BOOTSTRAP_FAILED', error instanceof Error ? error.message : String(error)); process.exitCode = 1; }).finally(closePool);
