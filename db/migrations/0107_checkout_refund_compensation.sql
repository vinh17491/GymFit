SET NOCOUNT ON;
SET XACT_ABORT ON;

CREATE TABLE dbo.MarketplaceSettings (
  setting_key NVARCHAR(100) NOT NULL CONSTRAINT PK_MarketplaceSettings PRIMARY KEY,
  setting_value DECIMAL(18,2) NOT NULL,
  description NVARCHAR(500) NULL,
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_MarketplaceSettings_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_MarketplaceSettings_Value CHECK (setting_value >= 0)
);
GO

INSERT dbo.MarketplaceSettings(setting_key,setting_value,description) VALUES
 (N'compensation_voucher_amount',30000,N'Fixed VND amount for a new seller-unable compensation voucher'),
 (N'compensation_voucher_expiry_days',30,N'Calendar-day lifetime for a new compensation voucher'),
 (N'compensation_voucher_min_order_amount',200000,N'Minimum merchandise subtotal for redemption'),
 (N'compensation_voucher_max_per_parent_order',1,N'Maximum compensation vouchers issued for one Parent Order');
GO

ALTER TABLE dbo.OrderItems ADD
  reservation_released_at DATETIME2 NULL,
  reservation_release_reason NVARCHAR(100) NULL,
  reservation_released_by INT NULL;
GO

ALTER TABLE dbo.OrderItems ADD CONSTRAINT FK_OrderItems_ReservationReleasedBy
  FOREIGN KEY (reservation_released_by) REFERENCES dbo.Users(id);
ALTER TABLE dbo.OrderItems ADD CONSTRAINT CK_OrderItems_ReservationReleaseMarker
  CHECK (
    (reservation_released_at IS NULL AND reservation_release_reason IS NULL AND reservation_released_by IS NULL)
    OR (reservation_released_at IS NOT NULL AND reservation_release_reason IS NOT NULL)
  );
CREATE INDEX IX_OrderItems_UnreleasedReservation
  ON dbo.OrderItems(order_id,shop_order_id,variant_id)
  WHERE reservation_released_at IS NULL;
GO

CREATE TABLE dbo.Refunds (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Refunds PRIMARY KEY,
  order_id INT NOT NULL,
  shop_order_id INT NOT NULL,
  buyer_id INT NOT NULL,
  merchandise_amount DECIMAL(18,2) NOT NULL,
  shipping_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Refunds_Shipping DEFAULT 0,
  total_amount AS (merchandise_amount + shipping_amount) PERSISTED,
  currency CHAR(3) NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_Refunds_Status DEFAULT N'PENDING',
  reason NVARCHAR(500) NOT NULL,
  external_reference NVARCHAR(255) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Refunds_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_Refunds_UpdatedAt DEFAULT SYSUTCDATETIME(),
  completed_at DATETIME2 NULL,
  CONSTRAINT FK_Refunds_Order FOREIGN KEY (order_id) REFERENCES dbo.Orders(id),
  CONSTRAINT FK_Refunds_ShopOrder FOREIGN KEY (shop_order_id) REFERENCES dbo.ShopOrders(id),
  CONSTRAINT FK_Refunds_Buyer FOREIGN KEY (buyer_id) REFERENCES dbo.Users(id),
  CONSTRAINT UQ_Refunds_ShopOrder UNIQUE (shop_order_id),
  CONSTRAINT CK_Refunds_Amounts CHECK (merchandise_amount >= 0 AND shipping_amount >= 0 AND merchandise_amount + shipping_amount > 0),
  CONSTRAINT CK_Refunds_Status CHECK (status IN (N'PENDING',N'COMPLETED',N'FAILED')),
  CONSTRAINT CK_Refunds_Completed CHECK (
    (status=N'COMPLETED' AND completed_at IS NOT NULL) OR
    (status<>N'COMPLETED' AND completed_at IS NULL)
  )
);
GO

CREATE UNIQUE INDEX UX_Refunds_OneShippingRefundPerOrder
  ON dbo.Refunds(order_id) WHERE shipping_amount > 0;
CREATE INDEX IX_Refunds_StatusCreated ON dbo.Refunds(status,created_at DESC,id DESC);
CREATE INDEX IX_Refunds_BuyerCreated ON dbo.Refunds(buyer_id,created_at DESC,id DESC);
GO

CREATE TABLE dbo.RefundStatusHistory (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RefundStatusHistory PRIMARY KEY,
  refund_id BIGINT NOT NULL,
  previous_status NVARCHAR(20) NULL,
  new_status NVARCHAR(20) NOT NULL,
  changed_by INT NULL,
  reason NVARCHAR(500) NULL,
  external_reference NVARCHAR(255) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_RefundStatusHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_RefundStatusHistory_Refund FOREIGN KEY (refund_id) REFERENCES dbo.Refunds(id),
  CONSTRAINT FK_RefundStatusHistory_User FOREIGN KEY (changed_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_RefundStatusHistory_Previous CHECK (previous_status IS NULL OR previous_status IN (N'PENDING',N'COMPLETED',N'FAILED')),
  CONSTRAINT CK_RefundStatusHistory_New CHECK (new_status IN (N'PENDING',N'COMPLETED',N'FAILED')),
  CONSTRAINT CK_RefundStatusHistory_Changed CHECK (previous_status IS NULL OR previous_status<>new_status)
);
GO

CREATE INDEX IX_RefundStatusHistory_RefundCreated ON dbo.RefundStatusHistory(refund_id,created_at DESC,id DESC);
GO
CREATE OR ALTER TRIGGER dbo.TR_RefundStatusHistory_Immutable ON dbo.RefundStatusHistory
AFTER UPDATE,DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51007,'Refund status history is immutable.',1;
END;
GO

CREATE TABLE dbo.CompensationVouchers (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CompensationVouchers PRIMARY KEY,
  code NVARCHAR(64) NOT NULL,
  buyer_id INT NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  minimum_order_amount DECIMAL(18,2) NOT NULL,
  issued_at DATETIME2 NOT NULL CONSTRAINT DF_CompensationVouchers_IssuedAt DEFAULT SYSUTCDATETIME(),
  expires_at DATETIME2 NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_CompensationVouchers_Status DEFAULT N'AVAILABLE',
  used_at DATETIME2 NULL,
  used_order_id INT NULL,
  source_order_id INT NOT NULL,
  source_shop_order_id INT NOT NULL,
  compensation_type NVARCHAR(50) NOT NULL,
  is_stackable BIT NOT NULL CONSTRAINT DF_CompensationVouchers_Stackable DEFAULT 0,
  merchandise_only BIT NOT NULL CONSTRAINT DF_CompensationVouchers_Merchandise DEFAULT 1,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_CompensationVouchers_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_CompensationVouchers_Buyer FOREIGN KEY (buyer_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_CompensationVouchers_UsedOrder FOREIGN KEY (used_order_id) REFERENCES dbo.Orders(id),
  CONSTRAINT FK_CompensationVouchers_SourceOrder FOREIGN KEY (source_order_id) REFERENCES dbo.Orders(id),
  CONSTRAINT FK_CompensationVouchers_SourceShopOrder FOREIGN KEY (source_shop_order_id) REFERENCES dbo.ShopOrders(id),
  CONSTRAINT UQ_CompensationVouchers_Code UNIQUE (code),
  CONSTRAINT UQ_CompensationVouchers_Source UNIQUE (source_order_id,compensation_type),
  CONSTRAINT CK_CompensationVouchers_Amount CHECK (amount > 0 AND minimum_order_amount >= 0),
  CONSTRAINT CK_CompensationVouchers_Status CHECK (status IN (N'AVAILABLE',N'USED',N'EXPIRED')),
  CONSTRAINT CK_CompensationVouchers_Type CHECK (compensation_type=N'SELLER_UNABLE_TO_FULFILL'),
  CONSTRAINT CK_CompensationVouchers_Policy CHECK (is_stackable=0 AND merchandise_only=1),
  CONSTRAINT CK_CompensationVouchers_Usage CHECK (
    (status=N'USED' AND used_at IS NOT NULL AND used_order_id IS NOT NULL)
    OR (status<>N'USED' AND used_at IS NULL AND used_order_id IS NULL)
  ),
  CONSTRAINT CK_CompensationVouchers_Expiry CHECK (expires_at>issued_at)
);
GO

CREATE INDEX IX_CompensationVouchers_BuyerStatusExpiry
  ON dbo.CompensationVouchers(buyer_id,status,expires_at,id);
GO

ALTER TABLE dbo.Orders ADD compensation_voucher_id BIGINT NULL;
GO
ALTER TABLE dbo.Orders ADD CONSTRAINT FK_Orders_CompensationVoucher
  FOREIGN KEY (compensation_voucher_id) REFERENCES dbo.CompensationVouchers(id);
CREATE UNIQUE INDEX UX_Orders_CompensationVoucher
  ON dbo.Orders(compensation_voucher_id) WHERE compensation_voucher_id IS NOT NULL;
GO

CREATE TABLE dbo.MarketplaceNotifications (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MarketplaceNotifications PRIMARY KEY,
  buyer_id INT NOT NULL,
  event_key NVARCHAR(150) NOT NULL,
  notification_type NVARCHAR(50) NOT NULL,
  title NVARCHAR(255) NOT NULL,
  message NVARCHAR(2000) NOT NULL,
  order_id INT NULL,
  shop_order_id INT NULL,
  refund_id BIGINT NULL,
  voucher_id BIGINT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_MarketplaceNotifications_Created DEFAULT SYSUTCDATETIME(),
  read_at DATETIME2 NULL,
  CONSTRAINT FK_MarketplaceNotifications_Buyer FOREIGN KEY (buyer_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_MarketplaceNotifications_Order FOREIGN KEY (order_id) REFERENCES dbo.Orders(id),
  CONSTRAINT FK_MarketplaceNotifications_ShopOrder FOREIGN KEY (shop_order_id) REFERENCES dbo.ShopOrders(id),
  CONSTRAINT FK_MarketplaceNotifications_Refund FOREIGN KEY (refund_id) REFERENCES dbo.Refunds(id),
  CONSTRAINT FK_MarketplaceNotifications_Voucher FOREIGN KEY (voucher_id) REFERENCES dbo.CompensationVouchers(id),
  CONSTRAINT UQ_MarketplaceNotifications_Event UNIQUE (event_key)
);
GO

CREATE INDEX IX_MarketplaceNotifications_BuyerCreated
  ON dbo.MarketplaceNotifications(buyer_id,created_at DESC,id DESC);
GO
