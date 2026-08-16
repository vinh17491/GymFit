import { closePool, query } from "../config/database";

async function main() {
  const result = await query<any>(`
    SELECT
      (SELECT COUNT(*) FROM dbo.Carts) AS carts,
      (SELECT COUNT(*) FROM dbo.CartItems) AS cart_items,
      (SELECT COUNT(*) FROM (SELECT buyer_id FROM dbo.Carts GROUP BY buyer_id HAVING COUNT(*)>1) d) AS duplicate_buyer_carts,
      (SELECT COUNT(*) FROM (SELECT cart_id,product_id,variant_id FROM dbo.CartItems GROUP BY cart_id,product_id,variant_id HAVING COUNT(*)>1) d) AS duplicate_cart_items,
      (SELECT COUNT(*) FROM dbo.CartItems WHERE product_id<0 OR quantity NOT BETWEEN 1 AND 99) AS invalid_cart_items,
      (SELECT COUNT(*) FROM dbo.CartItems ci LEFT JOIN dbo.Carts c ON c.id=ci.cart_id LEFT JOIN dbo.Products p ON p.id=ci.product_id LEFT JOIN dbo.ProductVariants v ON v.id=ci.variant_id WHERE c.id IS NULL OR p.id IS NULL OR v.id IS NULL OR v.product_id<>ci.product_id) AS orphan_or_mismatched_items,
      (SELECT COUNT(*) FROM sys.foreign_keys WHERE parent_object_id IN(OBJECT_ID(N'dbo.Carts'),OBJECT_ID(N'dbo.CartItems'))) AS foreign_keys,
      (SELECT COUNT(*) FROM sys.indexes WHERE object_id IN(OBJECT_ID(N'dbo.Carts'),OBJECT_ID(N'dbo.CartItems')) AND name IS NOT NULL) AS named_indexes,
      (SELECT COUNT(*) FROM sys.check_constraints WHERE parent_object_id IN(OBJECT_ID(N'dbo.Carts'),OBJECT_ID(N'dbo.CartItems'))) AS check_constraints,
      (SELECT COUNT(*) FROM sys.triggers WHERE parent_id=OBJECT_ID(N'dbo.CartItems') AND name=N'TR_CartItems_ProductVariantInvariant') AS invariant_triggers,
      (SELECT COUNT(*) FROM dbo.Products WHERE id=0) AS product_zero_present,
      (SELECT COUNT(*) FROM dbo.SchemaMigrations WHERE version=N'0106') AS migration_applied
  `);
  const metrics = result.recordset[0];
  const valid =
    Number(metrics.duplicate_buyer_carts) === 0 &&
    Number(metrics.duplicate_cart_items) === 0 &&
    Number(metrics.invalid_cart_items) === 0 &&
    Number(metrics.orphan_or_mismatched_items) === 0 &&
    Number(metrics.foreign_keys) === 4 &&
    Number(metrics.named_indexes) >= 6 &&
    Number(metrics.check_constraints) === 3 &&
    Number(metrics.invariant_triggers) === 1 &&
    Number(metrics.product_zero_present) === 1 &&
    Number(metrics.migration_applied) === 1;
  console.log(
    `[SELLER-008A INTEGRITY ${valid ? "PASS" : "FAIL"}] ${JSON.stringify(metrics)}`,
  );
  if (!valid) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(
      "[SELLER-008A INTEGRITY FAIL]",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(closePool);
