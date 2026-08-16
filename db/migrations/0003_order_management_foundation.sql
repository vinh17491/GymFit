SET NOCOUNT ON;
SET XACT_ABORT ON;

-- Product-order foundation only. Checkout, Stripe processing, and inventory reservation are intentionally out of scope.
-- Customer, shipping, and item fields are immutable-at-purchase snapshots so later catalog/user changes do not rewrite history.
CREATE TABLE dbo.Orders (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Orders PRIMARY KEY,
  order_number NVARCHAR(50) NOT NULL,
  user_id INT NOT NULL,
  customer_name NVARCHAR(200) NOT NULL,
  customer_email NVARCHAR(255) NOT NULL,
  customer_phone NVARCHAR(50) NULL,
  shipping_address_line1 NVARCHAR(255) NULL,
  shipping_address_line2 NVARCHAR(255) NULL,
  shipping_city NVARCHAR(100) NULL,
  shipping_state NVARCHAR(100) NULL,
  shipping_postal_code NVARCHAR(30) NULL,
  shipping_country NVARCHAR(100) NULL,
  subtotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_Orders_Subtotal DEFAULT 0,
  discount_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Orders_DiscountAmount DEFAULT 0,
  shipping_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Orders_ShippingAmount DEFAULT 0,
  tax_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Orders_TaxAmount DEFAULT 0,
  total_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Orders_TotalAmount DEFAULT 0,
  currency CHAR(3) NOT NULL CONSTRAINT DF_Orders_Currency DEFAULT 'USD',
  order_status NVARCHAR(30) NOT NULL CONSTRAINT DF_Orders_OrderStatus DEFAULT N'PENDING',
  payment_status NVARCHAR(30) NOT NULL CONSTRAINT DF_Orders_PaymentStatus DEFAULT N'UNPAID',
  -- References only: never store payment secrets, card data, access tokens, or raw webhook payloads.
  payment_provider NVARCHAR(50) NULL,
  payment_reference NVARCHAR(255) NULL,
  stripe_checkout_session_id NVARCHAR(255) NULL,
  stripe_payment_intent_id NVARCHAR(255) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Orders_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_Orders_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_Orders_OrderNumber UNIQUE (order_number),
  CONSTRAINT FK_Orders_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
  CONSTRAINT CK_Orders_OrderNumber CHECK (LEN(LTRIM(RTRIM(order_number))) > 0),
  CONSTRAINT CK_Orders_CustomerName CHECK (LEN(LTRIM(RTRIM(customer_name))) > 0),
  CONSTRAINT CK_Orders_CustomerEmail CHECK (LEN(LTRIM(RTRIM(customer_email))) > 0),
  CONSTRAINT CK_Orders_MonetaryValues CHECK (subtotal >= 0 AND discount_amount >= 0 AND shipping_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0),
  CONSTRAINT CK_Orders_DiscountAmount CHECK (discount_amount <= subtotal),
  CONSTRAINT CK_Orders_TotalAmount CHECK (total_amount = subtotal - discount_amount + shipping_amount + tax_amount),
  CONSTRAINT CK_Orders_Currency CHECK (LEN(currency) = 3 AND currency = UPPER(currency)),
  CONSTRAINT CK_Orders_OrderStatus CHECK (order_status IN (N'PENDING', N'CONFIRMED', N'PROCESSING', N'SHIPPED', N'DELIVERED', N'CANCELLED')),
  CONSTRAINT CK_Orders_PaymentStatus CHECK (payment_status IN (N'UNPAID', N'PENDING', N'PAID', N'FAILED', N'PARTIALLY_REFUNDED', N'REFUNDED'))
);
GO

-- Product and Variant FKs deliberately use NO ACTION (the SQL Server default), preserving order history.
-- Order rows are likewise protected from deletion while item/history rows exist.
CREATE TABLE dbo.OrderItems (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderItems PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NOT NULL,
  product_name NVARCHAR(200) NOT NULL,
  variant_name NVARCHAR(200) NOT NULL,
  sku NVARCHAR(200) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(18,2) NOT NULL,
  line_total DECIMAL(18,2) NOT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_OrderItems_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_OrderItems_Order FOREIGN KEY (order_id) REFERENCES dbo.Orders(id),
  CONSTRAINT FK_OrderItems_Product FOREIGN KEY (product_id) REFERENCES dbo.Products(id),
  CONSTRAINT FK_OrderItems_Variant FOREIGN KEY (variant_id) REFERENCES dbo.ProductVariants(id),
  CONSTRAINT CK_OrderItems_ProductName CHECK (LEN(LTRIM(RTRIM(product_name))) > 0),
  CONSTRAINT CK_OrderItems_VariantName CHECK (LEN(LTRIM(RTRIM(variant_name))) > 0),
  CONSTRAINT CK_OrderItems_SKU CHECK (LEN(LTRIM(RTRIM(sku))) > 0),
  CONSTRAINT CK_OrderItems_Quantity CHECK (quantity > 0),
  CONSTRAINT CK_OrderItems_UnitPrice CHECK (unit_price >= 0),
  CONSTRAINT CK_OrderItems_LineTotal CHECK (line_total >= 0 AND line_total = quantity * unit_price)
);
GO

-- Immutable order-status audit. changed_by is nullable for future trusted system transitions.
CREATE TABLE dbo.OrderStatusHistory (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderStatusHistory PRIMARY KEY,
  order_id INT NOT NULL,
  previous_status NVARCHAR(30) NULL,
  new_status NVARCHAR(30) NOT NULL,
  changed_by INT NULL,
  note NVARCHAR(500) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_OrderStatusHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_OrderStatusHistory_Order FOREIGN KEY (order_id) REFERENCES dbo.Orders(id),
  CONSTRAINT FK_OrderStatusHistory_ChangedBy FOREIGN KEY (changed_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_OrderStatusHistory_PreviousStatus CHECK (previous_status IS NULL OR previous_status IN (N'PENDING', N'CONFIRMED', N'PROCESSING', N'SHIPPED', N'DELIVERED', N'CANCELLED')),
  CONSTRAINT CK_OrderStatusHistory_NewStatus CHECK (new_status IN (N'PENDING', N'CONFIRMED', N'PROCESSING', N'SHIPPED', N'DELIVERED', N'CANCELLED')),
  CONSTRAINT CK_OrderStatusHistory_Note CHECK (note IS NULL OR LEN(LTRIM(RTRIM(note))) > 0)
);
GO

CREATE INDEX IX_Orders_UserId ON dbo.Orders(user_id);
CREATE INDEX IX_Orders_OrderStatus ON dbo.Orders(order_status);
CREATE INDEX IX_Orders_PaymentStatus ON dbo.Orders(payment_status);
CREATE INDEX IX_Orders_CreatedAt ON dbo.Orders(created_at DESC);
CREATE INDEX IX_Orders_CustomerEmail ON dbo.Orders(customer_email);
CREATE INDEX IX_OrderItems_OrderId ON dbo.OrderItems(order_id);
CREATE INDEX IX_OrderItems_ProductId ON dbo.OrderItems(product_id);
CREATE INDEX IX_OrderItems_VariantId ON dbo.OrderItems(variant_id);
CREATE INDEX IX_OrderStatusHistory_OrderId_CreatedAt ON dbo.OrderStatusHistory(order_id, created_at DESC);
GO

CREATE OR ALTER TRIGGER dbo.TR_OrderStatusHistory_Immutable
ON dbo.OrderStatusHistory
AFTER UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, 'Order status history is immutable.', 1;
END;
GO
