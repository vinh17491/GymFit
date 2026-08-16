SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.Products', N'U') IS NULL
   OR OBJECT_ID(N'dbo.ProductVariants', N'U') IS NULL
   OR OBJECT_ID(N'dbo.ProductImages', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Inventory', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Brands', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Categories', N'U') IS NULL
  THROW 50001, 'Required Commerce foundation table is missing.', 1;

/* Capture the pre-migration product/variant shape for deterministic inventory rules. */
CREATE TABLE #OriginalProductShape (
  product_id INT NOT NULL PRIMARY KEY,
  variant_count INT NOT NULL
);

INSERT INTO #OriginalProductShape (product_id, variant_count)
SELECT p.id, COUNT(v.id)
FROM dbo.Products p
LEFT JOIN dbo.ProductVariants v ON v.product_id = p.id
GROUP BY p.id;

/* Upgrade the existing ProductVariants table; do not replace IDs or rows. */
IF COL_LENGTH(N'dbo.ProductVariants', N'barcode') IS NULL
  ALTER TABLE dbo.ProductVariants ADD barcode NVARCHAR(50) NULL;
IF COL_LENGTH(N'dbo.ProductVariants', N'sale_price') IS NULL
  ALTER TABLE dbo.ProductVariants ADD sale_price DECIMAL(10,2) NULL;
IF COL_LENGTH(N'dbo.ProductVariants', N'weight') IS NULL
  ALTER TABLE dbo.ProductVariants ADD weight DECIMAL(8,2) NULL;
IF COL_LENGTH(N'dbo.ProductVariants', N'updated_at') IS NULL
  ALTER TABLE dbo.ProductVariants ADD updated_at DATETIME2 NULL;

GO

ALTER TABLE dbo.ProductVariants ALTER COLUMN sku NVARCHAR(100) NULL;

UPDATE v
SET sku = LEFT(CONCAT(p.sku, N'-V', v.id), 100),
    price = COALESCE(v.price, p.price),
    sale_price = COALESCE(v.sale_price, p.sale_price),
    barcode = COALESCE(v.barcode, p.barcode),
    weight = COALESCE(v.weight, p.weight),
    is_active = COALESCE(v.is_active, p.is_active, 1),
    created_at = COALESCE(v.created_at, SYSUTCDATETIME()),
    updated_at = COALESCE(v.updated_at, SYSUTCDATETIME())
FROM dbo.ProductVariants v
JOIN dbo.Products p ON p.id = v.product_id;

INSERT INTO dbo.ProductVariants
  (product_id, variant_name, sku, barcode, price, sale_price, weight, is_active, created_at, updated_at)
SELECT p.id, N'Default', p.sku, p.barcode, p.price, p.sale_price, p.weight,
       p.is_active, COALESCE(p.created_at, SYSUTCDATETIME()), SYSUTCDATETIME()
FROM dbo.Products p
JOIN #OriginalProductShape s ON s.product_id = p.id AND s.variant_count = 0;

IF EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE sku IS NULL OR LTRIM(RTRIM(sku)) = N'')
  THROW 50002, 'ProductVariant SKU backfill left a NULL or empty SKU.', 1;
IF EXISTS (
  SELECT LTRIM(RTRIM(sku)) FROM dbo.ProductVariants
  GROUP BY LTRIM(RTRIM(sku)) HAVING COUNT(*) > 1
)
  THROW 50003, 'Duplicate explicit ProductVariant SKU prevents unique enforcement.', 1;
IF EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE price IS NULL OR price <= 0)
  THROW 50004, 'ProductVariant price must be non-null and greater than zero.', 1;
IF EXISTS (
  SELECT 1 FROM dbo.ProductVariants
  WHERE sale_price IS NOT NULL AND (sale_price < 0 OR sale_price >= price)
)
  THROW 50005, 'ProductVariant sale price violates the canonical range.', 1;

ALTER TABLE dbo.ProductVariants ALTER COLUMN sku NVARCHAR(100) NOT NULL;
ALTER TABLE dbo.ProductVariants ALTER COLUMN price DECIMAL(10,2) NOT NULL;
ALTER TABLE dbo.ProductVariants ALTER COLUMN is_active BIT NOT NULL;
ALTER TABLE dbo.ProductVariants ALTER COLUMN created_at DATETIME2 NOT NULL;
ALTER TABLE dbo.ProductVariants ALTER COLUMN updated_at DATETIME2 NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ProductVariants') AND name = N'UX_ProductVariants_SKU')
  CREATE UNIQUE INDEX UX_ProductVariants_SKU ON dbo.ProductVariants(sku);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.ProductVariants') AND name = N'CK_ProductVariants_Price_Positive')
  ALTER TABLE dbo.ProductVariants ADD CONSTRAINT CK_ProductVariants_Price_Positive CHECK (price > 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.ProductVariants') AND name = N'CK_ProductVariants_SalePrice')
  ALTER TABLE dbo.ProductVariants ADD CONSTRAINT CK_ProductVariants_SalePrice
    CHECK (sale_price IS NULL OR (sale_price >= 0 AND sale_price < price));

/* Normalized Option B model. */
CREATE TABLE dbo.ProductOptions (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProductOptions PRIMARY KEY,
  product_id INT NOT NULL,
  name NVARCHAR(100) NOT NULL,
  sort_order INT NOT NULL CONSTRAINT DF_ProductOptions_SortOrder DEFAULT 0,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ProductOptions_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ProductOptions_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ProductOptions_Products FOREIGN KEY (product_id) REFERENCES dbo.Products(id),
  CONSTRAINT UQ_ProductOptions_Product_Name UNIQUE (product_id, name)
);

CREATE TABLE dbo.ProductOptionValues (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProductOptionValues PRIMARY KEY,
  product_option_id INT NOT NULL,
  value NVARCHAR(255) NOT NULL,
  sort_order INT NOT NULL CONSTRAINT DF_ProductOptionValues_SortOrder DEFAULT 0,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ProductOptionValues_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ProductOptionValues_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ProductOptionValues_ProductOptions FOREIGN KEY (product_option_id) REFERENCES dbo.ProductOptions(id),
  CONSTRAINT UQ_ProductOptionValues_Option_Value UNIQUE (product_option_id, value),
  CONSTRAINT UQ_ProductOptionValues_Option_Id UNIQUE (product_option_id, id)
);

CREATE TABLE dbo.VariantOptionValues (
  variant_id INT NOT NULL,
  product_option_id INT NOT NULL,
  product_option_value_id INT NOT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_VariantOptionValues_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_VariantOptionValues PRIMARY KEY (variant_id, product_option_id),
  CONSTRAINT FK_VariantOptionValues_Variants FOREIGN KEY (variant_id) REFERENCES dbo.ProductVariants(id),
  CONSTRAINT FK_VariantOptionValues_Options FOREIGN KEY (product_option_id) REFERENCES dbo.ProductOptions(id),
  CONSTRAINT FK_VariantOptionValues_OptionValuePair
    FOREIGN KEY (product_option_id, product_option_value_id)
    REFERENCES dbo.ProductOptionValues(product_option_id, id)
);

INSERT INTO dbo.ProductOptions (product_id, name, sort_order)
SELECT id, N'Flavor', 10 FROM dbo.Products WHERE NULLIF(LTRIM(RTRIM(flavor)), N'') IS NOT NULL
UNION ALL
SELECT id, N'Color', 20 FROM dbo.Products WHERE NULLIF(LTRIM(RTRIM(color)), N'') IS NOT NULL
UNION ALL
SELECT id, N'Size', 30 FROM dbo.Products WHERE NULLIF(LTRIM(RTRIM(size)), N'') IS NOT NULL;

INSERT INTO dbo.ProductOptionValues (product_option_id, value, sort_order)
SELECT po.id,
       CASE po.name WHEN N'Flavor' THEN LTRIM(RTRIM(p.flavor)) WHEN N'Color' THEN LTRIM(RTRIM(p.color)) ELSE LTRIM(RTRIM(p.size)) END,
       0
FROM dbo.ProductOptions po
JOIN dbo.Products p ON p.id = po.product_id;

INSERT INTO dbo.VariantOptionValues (variant_id, product_option_id, product_option_value_id)
SELECT v.id, po.id, pov.id
FROM dbo.ProductVariants v
JOIN dbo.ProductOptions po ON po.product_id = v.product_id
JOIN dbo.ProductOptionValues pov ON pov.product_option_id = po.id;

/* Normalize ProductImages and migrate safe legacy media values. */
UPDATE dbo.ProductImages
SET sort_order = COALESCE(sort_order, 0),
    is_primary = COALESCE(is_primary, 0),
    created_at = COALESCE(created_at, SYSUTCDATETIME());

;WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id, image_url ORDER BY id) AS row_number
  FROM dbo.ProductImages
)
DELETE FROM duplicates WHERE row_number > 1;

INSERT INTO dbo.ProductImages (product_id, image_url, alt_text, sort_order, is_primary, created_at)
SELECT p.id, LTRIM(RTRIM(p.main_image)), p.product_name, 0, 1, SYSUTCDATETIME()
FROM dbo.Products p
WHERE NULLIF(LTRIM(RTRIM(p.main_image)), N'') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM dbo.ProductImages pi
    WHERE pi.product_id = p.id AND pi.image_url = LTRIM(RTRIM(p.main_image))
  );

INSERT INTO dbo.ProductImages (product_id, image_url, alt_text, sort_order, is_primary, created_at)
SELECT p.id, CONVERT(NVARCHAR(500), gallery.[value]), p.product_name,
       CONVERT(INT, gallery.[key]) + 1, 0, SYSUTCDATETIME()
FROM dbo.Products p
CROSS APPLY OPENJSON(p.gallery_images) gallery
WHERE NULLIF(LTRIM(RTRIM(p.gallery_images)), N'') IS NOT NULL
  AND ISJSON(p.gallery_images) = 1
  AND LEFT(LTRIM(p.gallery_images), 1) = N'['
  AND gallery.[type] = 1
  AND NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(500), gallery.[value]))), N'') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM dbo.ProductImages pi
    WHERE pi.product_id = p.id AND pi.image_url = CONVERT(NVARCHAR(500), gallery.[value])
  );

;WITH primary_choice AS (
  SELECT pi.id,
    ROW_NUMBER() OVER (
      PARTITION BY pi.product_id
      ORDER BY CASE WHEN NULLIF(LTRIM(RTRIM(p.main_image)), N'') IS NOT NULL AND pi.image_url = LTRIM(RTRIM(p.main_image)) THEN 0 ELSE 1 END,
               pi.sort_order, pi.id
    ) AS primary_rank
  FROM dbo.ProductImages pi
  JOIN dbo.Products p ON p.id = pi.product_id
)
UPDATE pi SET is_primary = CASE WHEN choice.primary_rank = 1 THEN 1 ELSE 0 END
FROM dbo.ProductImages pi
JOIN primary_choice choice ON choice.id = pi.id;

ALTER TABLE dbo.ProductImages ALTER COLUMN sort_order INT NOT NULL;
ALTER TABLE dbo.ProductImages ALTER COLUMN is_primary BIT NOT NULL;
ALTER TABLE dbo.ProductImages ALTER COLUMN created_at DATETIME2 NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ProductImages') AND name = N'UX_ProductImages_Product_Url')
  CREATE UNIQUE INDEX UX_ProductImages_Product_Url ON dbo.ProductImages(product_id, image_url);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ProductImages') AND name = N'UX_ProductImages_OnePrimary')
  CREATE UNIQUE INDEX UX_ProductImages_OnePrimary ON dbo.ProductImages(product_id) WHERE is_primary = 1;

/* Build one canonical Inventory row per variant using the preflight-approved source priority. */
IF COL_LENGTH(N'dbo.Inventory', N'on_hand') IS NULL
  ALTER TABLE dbo.Inventory ADD on_hand INT NULL;

GO

CREATE TABLE #InventoryPlan (
  variant_id INT NOT NULL PRIMARY KEY,
  product_id INT NOT NULL,
  selected_inventory_id INT NULL,
  on_hand INT NOT NULL,
  reserved INT NOT NULL,
  source_name NVARCHAR(50) NOT NULL
);

/* Case A: product originally had no variant; Products.stock is the source. */
INSERT INTO #InventoryPlan (variant_id, product_id, selected_inventory_id, on_hand, reserved, source_name)
SELECT v.id, p.id,
       CASE WHEN product_rows.row_count = 1 THEN product_rows.selected_id ELSE NULL END,
       ISNULL(p.stock, 0), 0, N'PRODUCTS_STOCK_DEFAULT_VARIANT'
FROM dbo.Products p
JOIN #OriginalProductShape shape ON shape.product_id = p.id AND shape.variant_count = 0
JOIN dbo.ProductVariants v ON v.product_id = p.id
OUTER APPLY (
  SELECT COUNT(*) row_count, MIN(i.id) selected_id
  FROM dbo.Inventory i WHERE i.product_id = p.id AND i.variant_id IS NULL
) product_rows;

/* Case B: product originally had one variant. */
INSERT INTO #InventoryPlan (variant_id, product_id, selected_inventory_id, on_hand, reserved, source_name)
SELECT v.id, p.id,
       CASE WHEN variant_rows.row_count = 1 THEN variant_rows.selected_id
            WHEN variant_rows.row_count = 0 AND product_rows.row_count = 1 THEN product_rows.selected_id
            ELSE NULL END,
       CASE WHEN variant_rows.row_count = 1 THEN variant_rows.quantity
            WHEN variant_rows.row_count = 0 AND product_rows.row_count = 1 THEN product_rows.quantity
            WHEN variant_rows.row_count = 0 AND product_rows.row_count = 0 AND (ISNULL(v.stock, 0) > 0 OR ISNULL(p.stock, 0) = 0) THEN ISNULL(v.stock, 0)
            ELSE ISNULL(p.stock, 0) END,
       CASE WHEN variant_rows.row_count = 1 THEN ISNULL(variant_rows.reserved, 0)
            WHEN variant_rows.row_count = 0 AND product_rows.row_count = 1 THEN ISNULL(product_rows.reserved, 0)
            ELSE 0 END,
       CASE WHEN variant_rows.row_count = 1 THEN N'VARIANT_INVENTORY_QUANTITY'
            WHEN variant_rows.row_count = 0 AND product_rows.row_count = 1 THEN N'PRODUCT_INVENTORY_QUANTITY'
            WHEN variant_rows.row_count = 0 AND product_rows.row_count = 0 AND (ISNULL(v.stock, 0) > 0 OR ISNULL(p.stock, 0) = 0) THEN N'PRODUCT_VARIANT_STOCK'
            ELSE N'PRODUCTS_STOCK_COMPATIBILITY' END
FROM dbo.Products p
JOIN #OriginalProductShape shape ON shape.product_id = p.id AND shape.variant_count = 1
JOIN dbo.ProductVariants v ON v.product_id = p.id
OUTER APPLY (
  SELECT COUNT(*) row_count, MIN(i.id) selected_id, MAX(i.quantity) quantity, MAX(i.reserved) reserved
  FROM dbo.Inventory i WHERE i.variant_id = v.id
) variant_rows
OUTER APPLY (
  SELECT COUNT(*) row_count, MIN(i.id) selected_id, MAX(i.quantity) quantity, MAX(i.reserved) reserved
  FROM dbo.Inventory i WHERE i.product_id = p.id AND i.variant_id IS NULL
) product_rows;

/* Case C1: every variant has exactly one explicit Inventory row. */
INSERT INTO #InventoryPlan (variant_id, product_id, selected_inventory_id, on_hand, reserved, source_name)
SELECT v.id, p.id, MIN(i.id), MAX(i.quantity), ISNULL(MAX(i.reserved), 0), N'VARIANT_INVENTORY_QUANTITY'
FROM dbo.Products p
JOIN #OriginalProductShape shape ON shape.product_id = p.id AND shape.variant_count > 1
JOIN dbo.ProductVariants v ON v.product_id = p.id
JOIN dbo.Inventory i ON i.variant_id = v.id
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.ProductVariants vx
  OUTER APPLY (SELECT COUNT(*) row_count, SUM(CASE WHEN ix.quantity IS NULL THEN 1 ELSE 0 END) null_count FROM dbo.Inventory ix WHERE ix.variant_id = vx.id) coverage
  WHERE vx.product_id = p.id AND (coverage.row_count <> 1 OR coverage.null_count <> 0)
)
GROUP BY v.id, p.id;

/* Case C2: no Inventory coverage and meaningful explicit variant stock. */
INSERT INTO #InventoryPlan (variant_id, product_id, selected_inventory_id, on_hand, reserved, source_name)
SELECT v.id, p.id, NULL, ISNULL(v.stock, 0), 0, N'PRODUCT_VARIANT_STOCK'
FROM dbo.Products p
JOIN #OriginalProductShape shape ON shape.product_id = p.id AND shape.variant_count > 1
JOIN dbo.ProductVariants v ON v.product_id = p.id
WHERE NOT EXISTS (SELECT 1 FROM dbo.Inventory i JOIN dbo.ProductVariants vx ON vx.id = i.variant_id WHERE vx.product_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM dbo.Inventory i WHERE i.product_id = p.id AND i.variant_id IS NULL)
  AND NOT (NOT EXISTS (SELECT 1 FROM dbo.ProductVariants vz WHERE vz.product_id = p.id AND ISNULL(vz.stock, 0) <> 0) AND ISNULL(p.stock, 0) > 0);

IF (SELECT COUNT(*) FROM #InventoryPlan) <> (SELECT COUNT(*) FROM dbo.ProductVariants)
  THROW 50006, 'Inventory plan does not cover every ProductVariant; preflight classification is incomplete.', 1;
IF EXISTS (SELECT 1 FROM #InventoryPlan WHERE on_hand < 0 OR reserved < 0 OR reserved > on_hand)
  THROW 50007, 'Inventory plan violates quantity invariants.', 1;

UPDATE i
SET variant_id = ip.variant_id,
    on_hand = ip.on_hand,
    reserved = ip.reserved,
    last_restocked = COALESCE(i.last_restocked, SYSUTCDATETIME()),
    updated_at = SYSUTCDATETIME()
FROM dbo.Inventory i
JOIN #InventoryPlan ip ON ip.selected_inventory_id = i.id;

INSERT INTO dbo.Inventory (product_id, variant_id, on_hand, reserved, last_restocked, updated_at)
SELECT ip.product_id, ip.variant_id, ip.on_hand, ip.reserved, SYSUTCDATETIME(), SYSUTCDATETIME()
FROM #InventoryPlan ip
WHERE ip.selected_inventory_id IS NULL;

UPDATE ip
SET selected_inventory_id = i.id
FROM #InventoryPlan ip
JOIN dbo.Inventory i ON i.variant_id = ip.variant_id
WHERE ip.selected_inventory_id IS NULL;

DELETE i
FROM dbo.Inventory i
WHERE NOT EXISTS (SELECT 1 FROM #InventoryPlan ip WHERE ip.selected_inventory_id = i.id);

UPDATE dbo.Inventory
SET on_hand = COALESCE(on_hand, 0),
    reserved = COALESCE(reserved, 0),
    updated_at = COALESCE(updated_at, SYSUTCDATETIME());

ALTER TABLE dbo.Inventory ALTER COLUMN variant_id INT NOT NULL;
ALTER TABLE dbo.Inventory ALTER COLUMN on_hand INT NOT NULL;
ALTER TABLE dbo.Inventory ALTER COLUMN reserved INT NOT NULL;

IF COL_LENGTH(N'dbo.Inventory', N'available') IS NULL
  ALTER TABLE dbo.Inventory ADD available AS (on_hand - reserved) PERSISTED;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Inventory') AND name = N'UX_Inventory_Variant')
  CREATE UNIQUE INDEX UX_Inventory_Variant ON dbo.Inventory(variant_id);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.Inventory') AND name = N'CK_Inventory_OnHand')
  ALTER TABLE dbo.Inventory ADD CONSTRAINT CK_Inventory_OnHand CHECK (on_hand >= 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.Inventory') AND name = N'CK_Inventory_Reserved')
  ALTER TABLE dbo.Inventory ADD CONSTRAINT CK_Inventory_Reserved CHECK (reserved >= 0 AND reserved <= on_hand);

/* Runtime audit found no active references to these legacy columns. Remove dependencies then columns. */
DECLARE @dropSql NVARCHAR(MAX) = N'';
SELECT @dropSql += N'ALTER TABLE dbo.ProductVariants DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';'
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID(N'dbo.ProductVariants') AND c.name = N'stock';
IF @dropSql <> N'' EXEC sys.sp_executesql @dropSql;
IF COL_LENGTH(N'dbo.ProductVariants', N'stock') IS NOT NULL
  ALTER TABLE dbo.ProductVariants DROP COLUMN stock;

SET @dropSql = N'';
SELECT @dropSql += N'ALTER TABLE dbo.Inventory DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
WHERE fk.parent_object_id = OBJECT_ID(N'dbo.Inventory') AND c.name = N'product_id';
IF @dropSql <> N'' EXEC sys.sp_executesql @dropSql;

SET @dropSql = N'';
SELECT @dropSql += N'ALTER TABLE dbo.Inventory DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';'
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID(N'dbo.Inventory') AND c.name IN (N'quantity', N'product_id', N'warehouse');
IF @dropSql <> N'' EXEC sys.sp_executesql @dropSql;

IF COL_LENGTH(N'dbo.Inventory', N'quantity') IS NOT NULL ALTER TABLE dbo.Inventory DROP COLUMN quantity;
IF COL_LENGTH(N'dbo.Inventory', N'product_id') IS NOT NULL ALTER TABLE dbo.Inventory DROP COLUMN product_id;
IF COL_LENGTH(N'dbo.Inventory', N'warehouse') IS NOT NULL ALTER TABLE dbo.Inventory DROP COLUMN warehouse;

IF EXISTS (SELECT 1 FROM dbo.Products p WHERE NOT EXISTS (SELECT 1 FROM dbo.ProductVariants v WHERE v.product_id = p.id))
  THROW 50008, 'ProductVariant coverage invariant failed.', 1;
IF EXISTS (SELECT 1 FROM dbo.ProductVariants v WHERE NOT EXISTS (SELECT 1 FROM dbo.Inventory i WHERE i.variant_id = v.id))
  THROW 50009, 'Inventory coverage invariant failed.', 1;
