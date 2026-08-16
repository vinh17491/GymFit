SET NOCOUNT ON;
SET XACT_ABORT ON;

CREATE TABLE dbo.ShopOrders (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShopOrders PRIMARY KEY,
  order_id INT NOT NULL,
  shop_id INT NOT NULL,
  status NVARCHAR(30) NOT NULL CONSTRAINT DF_ShopOrders_Status DEFAULT N'PENDING_PAYMENT',
  subtotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_ShopOrders_Subtotal DEFAULT 0,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ShopOrders_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ShopOrders_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ShopOrders_Order FOREIGN KEY (order_id) REFERENCES dbo.Orders(id),
  CONSTRAINT FK_ShopOrders_Shop FOREIGN KEY (shop_id) REFERENCES dbo.Shops(id),
  CONSTRAINT UQ_ShopOrders_Order_Shop UNIQUE (order_id, shop_id),
  CONSTRAINT CK_ShopOrders_Status CHECK (status IN (
    N'PENDING_PAYMENT', N'PENDING_STOCK_CHECK', N'PREPARING',
    N'READY_FOR_PICKUP', N'UNABLE_TO_FULFILL', N'CANCELLED'
  )),
  CONSTRAINT CK_ShopOrders_Subtotal CHECK (subtotal >= 0)
);
GO

CREATE INDEX IX_ShopOrders_Order ON dbo.ShopOrders(order_id, id);
CREATE INDEX IX_ShopOrders_Shop_Status_Created
  ON dbo.ShopOrders(shop_id, status, created_at DESC, id DESC);
CREATE INDEX IX_ShopOrders_Status ON dbo.ShopOrders(status, created_at DESC, id DESC);
GO

CREATE TABLE dbo.ShopOrderStatusHistory (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShopOrderStatusHistory PRIMARY KEY,
  shop_order_id INT NOT NULL,
  previous_status NVARCHAR(30) NULL,
  new_status NVARCHAR(30) NOT NULL,
  changed_by INT NULL,
  note NVARCHAR(500) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ShopOrderStatusHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ShopOrderStatusHistory_ShopOrder FOREIGN KEY (shop_order_id) REFERENCES dbo.ShopOrders(id),
  CONSTRAINT FK_ShopOrderStatusHistory_ChangedBy FOREIGN KEY (changed_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_ShopOrderStatusHistory_Previous CHECK (previous_status IS NULL OR previous_status IN (
    N'PENDING_PAYMENT', N'PENDING_STOCK_CHECK', N'PREPARING',
    N'READY_FOR_PICKUP', N'UNABLE_TO_FULFILL', N'CANCELLED'
  )),
  CONSTRAINT CK_ShopOrderStatusHistory_New CHECK (new_status IN (
    N'PENDING_PAYMENT', N'PENDING_STOCK_CHECK', N'PREPARING',
    N'READY_FOR_PICKUP', N'UNABLE_TO_FULFILL', N'CANCELLED'
  )),
  CONSTRAINT CK_ShopOrderStatusHistory_Changed CHECK (previous_status IS NULL OR previous_status <> new_status),
  CONSTRAINT CK_ShopOrderStatusHistory_Note CHECK (note IS NULL OR LEN(LTRIM(RTRIM(note))) > 0)
);
GO

CREATE INDEX IX_ShopOrderStatusHistory_ShopOrder_Created
  ON dbo.ShopOrderStatusHistory(shop_order_id, created_at DESC, id DESC);
GO

CREATE OR ALTER TRIGGER dbo.TR_ShopOrderStatusHistory_Immutable
ON dbo.ShopOrderStatusHistory
AFTER UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  THROW 51005, 'Shop order status history is immutable.', 1;
END;
GO

ALTER TABLE dbo.OrderItems ADD shop_order_id INT NULL;
GO

IF EXISTS (
  SELECT 1
  FROM dbo.Orders o
  WHERE NOT EXISTS (SELECT 1 FROM dbo.OrderItems oi WHERE oi.order_id=o.id)
)
  THROW 50501, 'Cannot infer a Shop for an existing Order without OrderItems.', 1;
GO

IF EXISTS (
  SELECT 1
  FROM dbo.OrderItems oi
  LEFT JOIN dbo.Products p ON p.id=oi.product_id
  LEFT JOIN dbo.Shops s ON s.id=p.shop_id
  WHERE p.id IS NULL OR s.id IS NULL
)
  THROW 50502, 'Cannot infer Shop ownership for one or more existing OrderItems.', 1;
GO

INSERT dbo.ShopOrders(order_id, shop_id, status, subtotal, created_at, updated_at)
SELECT
  o.id,
  p.shop_id,
  CASE
    WHEN o.order_status=N'CANCELLED' THEN N'CANCELLED'
    WHEN o.order_status IN (N'SHIPPED',N'DELIVERED') THEN N'READY_FOR_PICKUP'
    WHEN o.order_status IN (N'CONFIRMED',N'PROCESSING') THEN N'PREPARING'
    ELSE N'PENDING_PAYMENT'
  END,
  SUM(oi.line_total),
  o.created_at,
  o.updated_at
FROM dbo.Orders o
JOIN dbo.OrderItems oi ON oi.order_id=o.id
JOIN dbo.Products p ON p.id=oi.product_id
GROUP BY o.id,p.shop_id,o.order_status,o.created_at,o.updated_at;
GO

UPDATE oi
SET shop_order_id=so.id
FROM dbo.OrderItems oi
JOIN dbo.Products p ON p.id=oi.product_id
JOIN dbo.ShopOrders so ON so.order_id=oi.order_id AND so.shop_id=p.shop_id;
GO

IF EXISTS (SELECT 1 FROM dbo.OrderItems WHERE shop_order_id IS NULL)
  THROW 50503, 'ShopOrder backfill left orphan OrderItems.', 1;

IF EXISTS (
  SELECT 1
  FROM dbo.OrderItems oi
  JOIN dbo.ShopOrders so ON so.id=oi.shop_order_id
  JOIN dbo.Products p ON p.id=oi.product_id
  WHERE oi.order_id<>so.order_id OR p.shop_id<>so.shop_id
)
  THROW 50504, 'ShopOrder backfill violated Parent or Shop ownership.', 1;

IF EXISTS (
  SELECT 1
  FROM dbo.ShopOrders so
  OUTER APPLY (
    SELECT SUM(oi.line_total) AS item_subtotal
    FROM dbo.OrderItems oi
    WHERE oi.shop_order_id=so.id
  ) totals
  WHERE so.subtotal<>COALESCE(totals.item_subtotal,0)
)
  THROW 50505, 'ShopOrder subtotal does not match its OrderItems.', 1;
GO

INSERT dbo.ShopOrderStatusHistory(shop_order_id, previous_status, new_status, changed_by, note, created_at)
SELECT id,NULL,status,NULL,N'BACKFILLED_FROM_PARENT_ORDER',created_at
FROM dbo.ShopOrders;
GO

ALTER TABLE dbo.OrderItems ALTER COLUMN shop_order_id INT NOT NULL;
ALTER TABLE dbo.OrderItems WITH CHECK ADD CONSTRAINT FK_OrderItems_ShopOrder
  FOREIGN KEY (shop_order_id) REFERENCES dbo.ShopOrders(id);
ALTER TABLE dbo.OrderItems CHECK CONSTRAINT FK_OrderItems_ShopOrder;
CREATE INDEX IX_OrderItems_ShopOrderId ON dbo.OrderItems(shop_order_id, id);
GO

CREATE OR ALTER TRIGGER dbo.TR_OrderItems_ShopOrderInvariant
ON dbo.OrderItems
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (
    SELECT 1
    FROM inserted i
    JOIN dbo.ShopOrders so ON so.id=i.shop_order_id
    JOIN dbo.Products p ON p.id=i.product_id
    JOIN dbo.ProductVariants v ON v.id=i.variant_id
    WHERE i.order_id<>so.order_id
       OR p.shop_id<>so.shop_id
       OR v.product_id<>i.product_id
  )
    THROW 50506, 'OrderItem Parent, ShopOrder, Product, or Variant ownership mismatch.', 1;
END;
GO
