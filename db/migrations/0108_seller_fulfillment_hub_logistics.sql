SET NOCOUNT ON;
SET XACT_ABORT ON;

ALTER TABLE dbo.ShopOrders DROP CONSTRAINT CK_ShopOrders_Status;
ALTER TABLE dbo.ShopOrderStatusHistory DROP CONSTRAINT CK_ShopOrderStatusHistory_Previous;
ALTER TABLE dbo.ShopOrderStatusHistory DROP CONSTRAINT CK_ShopOrderStatusHistory_New;
GO

ALTER TABLE dbo.ShopOrders ADD
  ready_for_pickup_at DATETIME2 NULL,
  picked_up_at DATETIME2 NULL,
  in_transit_to_hub_at DATETIME2 NULL,
  received_at_hub_at DATETIME2 NULL,
  hub_checked_at DATETIME2 NULL,
  delivered_at DATETIME2 NULL;
GO

ALTER TABLE dbo.ShopOrders WITH CHECK ADD CONSTRAINT CK_ShopOrders_Status CHECK (status IN (
  N'PENDING_PAYMENT',N'PENDING_STOCK_CHECK',N'PREPARING',N'READY_FOR_PICKUP',
  N'PICKED_UP',N'IN_TRANSIT_TO_HUB',N'RECEIVED_AT_HUB',
  N'HUB_CHECK_PASSED',N'HUB_CHECK_FAILED',N'UNABLE_TO_FULFILL',N'CANCELLED'
));
ALTER TABLE dbo.ShopOrderStatusHistory WITH CHECK ADD CONSTRAINT CK_ShopOrderStatusHistory_Previous CHECK (
  previous_status IS NULL OR previous_status IN (
    N'PENDING_PAYMENT',N'PENDING_STOCK_CHECK',N'PREPARING',N'READY_FOR_PICKUP',
    N'PICKED_UP',N'IN_TRANSIT_TO_HUB',N'RECEIVED_AT_HUB',
    N'HUB_CHECK_PASSED',N'HUB_CHECK_FAILED',N'UNABLE_TO_FULFILL',N'CANCELLED'
  )
);
ALTER TABLE dbo.ShopOrderStatusHistory WITH CHECK ADD CONSTRAINT CK_ShopOrderStatusHistory_New CHECK (new_status IN (
  N'PENDING_PAYMENT',N'PENDING_STOCK_CHECK',N'PREPARING',N'READY_FOR_PICKUP',
  N'PICKED_UP',N'IN_TRANSIT_TO_HUB',N'RECEIVED_AT_HUB',
  N'HUB_CHECK_PASSED',N'HUB_CHECK_FAILED',N'UNABLE_TO_FULFILL',N'CANCELLED'
));
GO

ALTER TABLE dbo.Orders ADD
  logistics_status NVARCHAR(30) NULL CONSTRAINT DF_Orders_LogisticsStatus DEFAULT N'WAITING_FOR_SHOPS',
  ready_to_ship_at DATETIME2 NULL,
  shipped_at DATETIME2 NULL,
  delivered_at DATETIME2 NULL;
GO

UPDATE dbo.Orders
SET logistics_status=CASE
  WHEN order_status=N'CANCELLED' THEN NULL
  WHEN order_status=N'DELIVERED' THEN N'DELIVERED'
  WHEN order_status=N'SHIPPED' THEN N'SHIPPED'
  ELSE N'WAITING_FOR_SHOPS'
END;
GO

ALTER TABLE dbo.Orders WITH CHECK ADD CONSTRAINT CK_Orders_LogisticsStatus CHECK (
  (order_status=N'CANCELLED' AND logistics_status IS NULL)
  OR logistics_status IN (N'WAITING_FOR_SHOPS',N'READY_TO_SHIP',N'SHIPPED',N'DELIVERED')
);
CREATE INDEX IX_Orders_LogisticsStatus ON dbo.Orders(logistics_status,updated_at DESC,id DESC);
GO

CREATE TABLE dbo.OrderLogisticsStatusHistory (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderLogisticsStatusHistory PRIMARY KEY,
  order_id INT NOT NULL,
  previous_status NVARCHAR(30) NULL,
  new_status NVARCHAR(30) NOT NULL,
  changed_by INT NULL,
  note NVARCHAR(500) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_OrderLogisticsStatusHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_OrderLogisticsStatusHistory_Order FOREIGN KEY (order_id) REFERENCES dbo.Orders(id),
  CONSTRAINT FK_OrderLogisticsStatusHistory_User FOREIGN KEY (changed_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_OrderLogisticsStatusHistory_Previous CHECK (
    previous_status IS NULL OR previous_status IN (N'WAITING_FOR_SHOPS',N'READY_TO_SHIP',N'SHIPPED',N'DELIVERED')
  ),
  CONSTRAINT CK_OrderLogisticsStatusHistory_New CHECK (
    new_status IN (N'WAITING_FOR_SHOPS',N'READY_TO_SHIP',N'SHIPPED',N'DELIVERED')
  ),
  CONSTRAINT CK_OrderLogisticsStatusHistory_Changed CHECK (
    previous_status IS NULL OR previous_status<>new_status
  ),
  CONSTRAINT CK_OrderLogisticsStatusHistory_Note CHECK (
    note IS NULL OR LEN(LTRIM(RTRIM(note)))>0
  )
);
GO

CREATE INDEX IX_OrderLogisticsStatusHistory_OrderCreated
  ON dbo.OrderLogisticsStatusHistory(order_id,created_at DESC,id DESC);
GO

CREATE OR ALTER TRIGGER dbo.TR_OrderLogisticsStatusHistory_Immutable
ON dbo.OrderLogisticsStatusHistory
AFTER UPDATE,DELETE
AS
BEGIN
  SET NOCOUNT ON;
  THROW 50801,'Order logistics status history is immutable.',1;
END;
GO

INSERT dbo.OrderLogisticsStatusHistory(order_id,previous_status,new_status,changed_by,note,created_at)
SELECT id,NULL,logistics_status,NULL,N'BACKFILLED_FROM_LEGACY_ORDER_STATUS',created_at
FROM dbo.Orders
WHERE logistics_status IS NOT NULL;
GO
