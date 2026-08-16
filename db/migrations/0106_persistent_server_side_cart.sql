SET NOCOUNT ON;
SET XACT_ABORT ON;

CREATE TABLE dbo.Carts (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Carts PRIMARY KEY,
  buyer_id INT NOT NULL,
  version INT NOT NULL CONSTRAINT DF_Carts_Version DEFAULT 1,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Carts_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_Carts_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Carts_Buyer FOREIGN KEY (buyer_id) REFERENCES dbo.Users(id),
  CONSTRAINT UQ_Carts_Buyer UNIQUE (buyer_id),
  CONSTRAINT CK_Carts_Version CHECK (version > 0)
);
GO

CREATE INDEX IX_Carts_Buyer_Updated ON dbo.Carts(buyer_id, updated_at DESC);
GO

CREATE TABLE dbo.CartItems (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CartItems PRIMARY KEY,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NOT NULL,
  quantity INT NOT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_CartItems_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_CartItems_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_CartItems_Cart FOREIGN KEY (cart_id) REFERENCES dbo.Carts(id) ON DELETE CASCADE,
  CONSTRAINT FK_CartItems_Product FOREIGN KEY (product_id) REFERENCES dbo.Products(id),
  CONSTRAINT FK_CartItems_Variant FOREIGN KEY (variant_id) REFERENCES dbo.ProductVariants(id),
  CONSTRAINT UQ_CartItems_Cart_Product_Variant UNIQUE (cart_id, product_id, variant_id),
  CONSTRAINT CK_CartItems_ProductId CHECK (product_id >= 0),
  CONSTRAINT CK_CartItems_Quantity CHECK (quantity BETWEEN 1 AND 99)
);
GO

CREATE INDEX IX_CartItems_Cart ON dbo.CartItems(cart_id, id);
CREATE INDEX IX_CartItems_Variant ON dbo.CartItems(variant_id, cart_id);
GO

CREATE OR ALTER TRIGGER dbo.TR_CartItems_ProductVariantInvariant
ON dbo.CartItems
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (
    SELECT 1
    FROM inserted i
    JOIN dbo.ProductVariants v ON v.id=i.variant_id
    WHERE v.product_id<>i.product_id
  )
    THROW 50601, 'CartItem Variant does not belong to Product.', 1;
END;
GO
