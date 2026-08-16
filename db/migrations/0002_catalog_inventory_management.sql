SET NOCOUNT ON;
SET XACT_ABORT ON;

CREATE TABLE #Migration0002Counts (
  product_count INT NOT NULL,
  variant_count INT NOT NULL,
  inventory_count INT NOT NULL,
  image_count INT NOT NULL
);
INSERT INTO #Migration0002Counts(product_count, variant_count, inventory_count, image_count)
SELECT (SELECT COUNT(*) FROM dbo.Products), (SELECT COUNT(*) FROM dbo.ProductVariants),
       (SELECT COUNT(*) FROM dbo.Inventory), (SELECT COUNT(*) FROM dbo.ProductImages);

IF COL_LENGTH(N'dbo.ProductVariants', N'is_default') IS NULL
  ALTER TABLE dbo.ProductVariants ADD is_default BIT NOT NULL CONSTRAINT DF_ProductVariants_IsDefault DEFAULT 0;
GO

;WITH ranked AS (
  SELECT v.id, v.product_id,
    ROW_NUMBER() OVER (
      PARTITION BY v.product_id
      ORDER BY CASE WHEN v.is_active = 1 AND v.variant_name = N'Default' THEN 0
                    WHEN v.is_active = 1 THEN 1 ELSE 2 END, v.id
    ) AS default_rank
  FROM dbo.ProductVariants v
)
UPDATE v SET is_default = CASE WHEN ranked.default_rank = 1 THEN 1 ELSE 0 END
FROM dbo.ProductVariants v
JOIN ranked ON ranked.id = v.id;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ProductVariants') AND name = N'UX_ProductVariants_OneDefaultPerProduct')
  CREATE UNIQUE INDEX UX_ProductVariants_OneDefaultPerProduct ON dbo.ProductVariants(product_id) WHERE is_default = 1 AND is_active = 1;
GO

IF COL_LENGTH(N'dbo.Inventory', N'low_stock_threshold') IS NULL
  ALTER TABLE dbo.Inventory ADD low_stock_threshold INT NOT NULL CONSTRAINT DF_Inventory_LowStockThreshold DEFAULT 10;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.Inventory') AND name = N'CK_Inventory_LowStockThreshold')
  ALTER TABLE dbo.Inventory ADD CONSTRAINT CK_Inventory_LowStockThreshold CHECK (low_stock_threshold >= 0);
GO

IF OBJECT_ID(N'dbo.InventoryAdjustments', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.InventoryAdjustments (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_InventoryAdjustments PRIMARY KEY,
    inventory_id INT NOT NULL,
    variant_id INT NOT NULL,
    adjustment_type NVARCHAR(30) NOT NULL,
    quantity_delta INT NOT NULL,
    previous_on_hand INT NOT NULL,
    new_on_hand INT NOT NULL,
    reason NVARCHAR(500) NOT NULL,
    reference_type NVARCHAR(50) NULL,
    reference_id NVARCHAR(100) NULL,
    performed_by INT NOT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_InventoryAdjustments_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_InventoryAdjustments_Inventory FOREIGN KEY (inventory_id) REFERENCES dbo.Inventory(id),
    CONSTRAINT FK_InventoryAdjustments_Variant FOREIGN KEY (variant_id) REFERENCES dbo.ProductVariants(id),
    CONSTRAINT FK_InventoryAdjustments_PerformedBy FOREIGN KEY (performed_by) REFERENCES dbo.Users(id),
    CONSTRAINT CK_InventoryAdjustments_Delta CHECK (quantity_delta <> 0),
    CONSTRAINT CK_InventoryAdjustments_PreviousOnHand CHECK (previous_on_hand >= 0),
    CONSTRAINT CK_InventoryAdjustments_NewOnHand CHECK (new_on_hand >= 0),
    CONSTRAINT CK_InventoryAdjustments_Reason CHECK (LEN(LTRIM(RTRIM(reason))) > 0),
    CONSTRAINT CK_InventoryAdjustments_Type CHECK (adjustment_type IN (N'RESTOCK', N'MANUAL_CORRECTION'))
  );
  CREATE INDEX IX_InventoryAdjustments_Inventory_CreatedAt ON dbo.InventoryAdjustments(inventory_id, created_at DESC);
  CREATE INDEX IX_InventoryAdjustments_Variant_CreatedAt ON dbo.InventoryAdjustments(variant_id, created_at DESC);
  CREATE INDEX IX_InventoryAdjustments_PerformedBy_CreatedAt ON dbo.InventoryAdjustments(performed_by, created_at DESC);
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_InventoryAdjustments_Immutable
ON dbo.InventoryAdjustments
AFTER UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  THROW 51000, 'Inventory adjustment history is immutable.', 1;
END;
GO

IF (SELECT COUNT(*) FROM dbo.Products) <> (SELECT product_count FROM #Migration0002Counts)
  THROW 50021, 'Product count changed during migration.', 1;
IF (SELECT COUNT(*) FROM dbo.ProductVariants) <> (SELECT variant_count FROM #Migration0002Counts)
  THROW 50022, 'Variant count changed during migration.', 1;
IF (SELECT COUNT(*) FROM dbo.Inventory) <> (SELECT inventory_count FROM #Migration0002Counts)
  THROW 50023, 'Inventory count changed during migration.', 1;
IF (SELECT COUNT(*) FROM dbo.ProductImages) <> (SELECT image_count FROM #Migration0002Counts)
  THROW 50024, 'ProductImage count changed during migration.', 1;
IF EXISTS (SELECT 1 FROM dbo.Inventory WHERE on_hand < 0 OR reserved < 0 OR reserved > on_hand OR available <> on_hand - reserved)
  THROW 50025, 'Inventory invariants are invalid.', 1;
IF EXISTS (SELECT 1 FROM dbo.Products p WHERE p.is_active = 1 AND NOT EXISTS (SELECT 1 FROM dbo.ProductVariants v WHERE v.product_id = p.id AND v.is_active = 1 AND v.is_default = 1))
  THROW 50026, 'Active Product lacks an active default Variant.', 1;
IF EXISTS (SELECT product_id FROM dbo.ProductVariants WHERE is_active = 1 AND is_default = 1 GROUP BY product_id HAVING COUNT(*) > 1)
  THROW 50027, 'Product has multiple active default Variants.', 1;
