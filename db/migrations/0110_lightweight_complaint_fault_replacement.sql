SET NOCOUNT ON;
SET XACT_ABORT ON;

CREATE TABLE dbo.MarketplaceComplaints (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MarketplaceComplaints PRIMARY KEY,
  buyer_id INT NOT NULL,
  order_id INT NOT NULL,
  shop_order_id INT NOT NULL,
  order_item_id INT NOT NULL,
  shop_id INT NOT NULL,
  settlement_id BIGINT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NOT NULL,
  product_name_snapshot NVARCHAR(200) NOT NULL,
  variant_name_snapshot NVARCHAR(200) NOT NULL,
  unit_price_snapshot DECIMAL(18,2) NOT NULL,
  affected_quantity INT NOT NULL,
  category NVARCHAR(30) NOT NULL,
  description NVARCHAR(2000) NOT NULL,
  status NVARCHAR(30) NOT NULL CONSTRAINT DF_MarketplaceComplaints_Status DEFAULT N'OPEN',
  fault_party NVARCHAR(30) NOT NULL CONSTRAINT DF_MarketplaceComplaints_Fault DEFAULT N'UNDETERMINED',
  admin_decision_reason NVARCHAR(1000) NULL,
  resolution_type NVARCHAR(30) NULL,
  reviewed_at DATETIME2 NULL,
  resolved_at DATETIME2 NULL,
  rejected_at DATETIME2 NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_MarketplaceComplaints_Created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_MarketplaceComplaints_Updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_MarketplaceComplaints_Buyer FOREIGN KEY(buyer_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_MarketplaceComplaints_Order FOREIGN KEY(order_id) REFERENCES dbo.Orders(id),
  CONSTRAINT FK_MarketplaceComplaints_ShopOrder FOREIGN KEY(shop_order_id) REFERENCES dbo.ShopOrders(id),
  CONSTRAINT FK_MarketplaceComplaints_OrderItem FOREIGN KEY(order_item_id) REFERENCES dbo.OrderItems(id),
  CONSTRAINT FK_MarketplaceComplaints_Shop FOREIGN KEY(shop_id) REFERENCES dbo.Shops(id),
  CONSTRAINT FK_MarketplaceComplaints_Settlement FOREIGN KEY(settlement_id) REFERENCES dbo.ShopOrderSettlements(id),
  CONSTRAINT FK_MarketplaceComplaints_Product FOREIGN KEY(product_id) REFERENCES dbo.Products(id),
  CONSTRAINT FK_MarketplaceComplaints_Variant FOREIGN KEY(variant_id) REFERENCES dbo.ProductVariants(id),
  CONSTRAINT UQ_MarketplaceComplaints_OrderItem UNIQUE(order_item_id),
  CONSTRAINT CK_MarketplaceComplaints_Quantity CHECK(affected_quantity>0),
  CONSTRAINT CK_MarketplaceComplaints_Price CHECK(unit_price_snapshot>=0),
  CONSTRAINT CK_MarketplaceComplaints_Category CHECK(category IN(N'DAMAGED',N'WRONG_ITEM',N'MISSING_QUANTITY',N'QUALITY_ISSUE',N'OTHER')),
  CONSTRAINT CK_MarketplaceComplaints_Status CHECK(status IN(N'OPEN',N'UNDER_REVIEW',N'REPLACEMENT_REQUIRED',N'RESOLVED',N'REJECTED')),
  CONSTRAINT CK_MarketplaceComplaints_Fault CHECK(fault_party IN(N'SELLER_FAULT',N'BUYER_FAULT',N'GYMFIT_OR_CARRIER',N'UNDETERMINED')),
  CONSTRAINT CK_MarketplaceComplaints_Description CHECK(LEN(LTRIM(RTRIM(description))) BETWEEN 10 AND 2000),
  CONSTRAINT CK_MarketplaceComplaints_Resolution CHECK(resolution_type IS NULL OR resolution_type IN(N'REPLACEMENT',N'REFUND',N'MANUAL_SUPPORT',N'REJECTED'))
);
GO
CREATE INDEX IX_MarketplaceComplaints_BuyerCreated ON dbo.MarketplaceComplaints(buyer_id,created_at DESC,id DESC);
CREATE INDEX IX_MarketplaceComplaints_ShopStatus ON dbo.MarketplaceComplaints(shop_id,status,created_at DESC,id DESC);
CREATE INDEX IX_MarketplaceComplaints_SettlementFault ON dbo.MarketplaceComplaints(settlement_id,fault_party,status);
GO

CREATE TABLE dbo.ComplaintEventHistory (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ComplaintEventHistory PRIMARY KEY,
  complaint_id BIGINT NOT NULL,
  event_type NVARCHAR(40) NOT NULL,
  previous_status NVARCHAR(30) NULL,
  new_status NVARCHAR(30) NULL,
  previous_fault_party NVARCHAR(30) NULL,
  new_fault_party NVARCHAR(30) NULL,
  actor_id INT NOT NULL,
  actor_role NVARCHAR(20) NOT NULL,
  reason NVARCHAR(1000) NOT NULL,
  settlement_id BIGINT NULL,
  replacement_id BIGINT NULL,
  refund_id BIGINT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ComplaintEventHistory_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ComplaintEventHistory_Complaint FOREIGN KEY(complaint_id) REFERENCES dbo.MarketplaceComplaints(id),
  CONSTRAINT FK_ComplaintEventHistory_Actor FOREIGN KEY(actor_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_ComplaintEventHistory_Settlement FOREIGN KEY(settlement_id) REFERENCES dbo.ShopOrderSettlements(id),
  CONSTRAINT CK_ComplaintEventHistory_Type CHECK(event_type IN(N'CREATED',N'REVIEW_STARTED',N'FAULT_DECIDED',N'REPLACEMENT_APPROVED',N'REPLACEMENT_STATUS',N'REFUND_CREATED',N'RESOLVED',N'REJECTED')),
  CONSTRAINT CK_ComplaintEventHistory_Role CHECK(actor_role IN(N'member',N'seller',N'admin')),
  CONSTRAINT CK_ComplaintEventHistory_Reason CHECK(LEN(LTRIM(RTRIM(reason)))>0)
);
GO
CREATE INDEX IX_ComplaintEventHistory_Complaint ON dbo.ComplaintEventHistory(complaint_id,created_at,id);
GO

CREATE TABLE dbo.ComplaintReplacements (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ComplaintReplacements PRIMARY KEY,
  complaint_id BIGINT NOT NULL,
  order_item_id INT NOT NULL,
  shop_order_id INT NOT NULL,
  shop_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NOT NULL,
  replacement_quantity INT NOT NULL,
  status NVARCHAR(30) NOT NULL CONSTRAINT DF_ComplaintReplacements_Status DEFAULT N'REQUIRED',
  approved_by INT NOT NULL,
  approved_at DATETIME2 NOT NULL,
  inventory_consumed_at DATETIME2 NULL,
  inventory_adjustment_id BIGINT NULL,
  ready_for_pickup_at DATETIME2 NULL,
  picked_up_at DATETIME2 NULL,
  in_transit_to_hub_at DATETIME2 NULL,
  received_at_hub_at DATETIME2 NULL,
  hub_checked_at DATETIME2 NULL,
  shipped_at DATETIME2 NULL,
  delivered_at DATETIME2 NULL,
  failed_at DATETIME2 NULL,
  failure_reason NVARCHAR(1000) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ComplaintReplacements_Created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ComplaintReplacements_Updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_ComplaintReplacements_Complaint UNIQUE(complaint_id),
  CONSTRAINT FK_ComplaintReplacements_Complaint FOREIGN KEY(complaint_id) REFERENCES dbo.MarketplaceComplaints(id),
  CONSTRAINT FK_ComplaintReplacements_OrderItem FOREIGN KEY(order_item_id) REFERENCES dbo.OrderItems(id),
  CONSTRAINT FK_ComplaintReplacements_ShopOrder FOREIGN KEY(shop_order_id) REFERENCES dbo.ShopOrders(id),
  CONSTRAINT FK_ComplaintReplacements_Shop FOREIGN KEY(shop_id) REFERENCES dbo.Shops(id),
  CONSTRAINT FK_ComplaintReplacements_Product FOREIGN KEY(product_id) REFERENCES dbo.Products(id),
  CONSTRAINT FK_ComplaintReplacements_Variant FOREIGN KEY(variant_id) REFERENCES dbo.ProductVariants(id),
  CONSTRAINT FK_ComplaintReplacements_ApprovedBy FOREIGN KEY(approved_by) REFERENCES dbo.Users(id),
  CONSTRAINT FK_ComplaintReplacements_InventoryAdjustment FOREIGN KEY(inventory_adjustment_id) REFERENCES dbo.InventoryAdjustments(id),
  CONSTRAINT CK_ComplaintReplacements_Quantity CHECK(replacement_quantity>0),
  CONSTRAINT CK_ComplaintReplacements_Status CHECK(status IN(N'REQUIRED',N'READY_FOR_PICKUP',N'PICKED_UP',N'IN_TRANSIT_TO_HUB',N'RECEIVED_AT_HUB',N'HUB_CHECK_PASSED',N'HUB_CHECK_FAILED',N'SHIPPED',N'DELIVERED',N'FAILED')),
  CONSTRAINT CK_ComplaintReplacements_InventoryMarker CHECK(
    (inventory_consumed_at IS NULL AND inventory_adjustment_id IS NULL)
    OR (inventory_consumed_at IS NOT NULL AND inventory_adjustment_id IS NOT NULL)
  ),
  CONSTRAINT CK_ComplaintReplacements_Failure CHECK(
    (status=N'FAILED' AND failed_at IS NOT NULL AND failure_reason IS NOT NULL)
    OR (status<>N'FAILED' AND failed_at IS NULL AND failure_reason IS NULL)
  )
);
GO
CREATE INDEX IX_ComplaintReplacements_ShopStatus ON dbo.ComplaintReplacements(shop_id,status,created_at DESC,id DESC);
GO

CREATE TABLE dbo.ReplacementStatusHistory (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ReplacementStatusHistory PRIMARY KEY,
  replacement_id BIGINT NOT NULL,
  previous_status NVARCHAR(30) NULL,
  new_status NVARCHAR(30) NOT NULL,
  changed_by INT NOT NULL,
  actor_role NVARCHAR(20) NOT NULL,
  reason NVARCHAR(1000) NOT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ReplacementStatusHistory_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ReplacementStatusHistory_Replacement FOREIGN KEY(replacement_id) REFERENCES dbo.ComplaintReplacements(id),
  CONSTRAINT FK_ReplacementStatusHistory_User FOREIGN KEY(changed_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_ReplacementStatusHistory_Role CHECK(actor_role IN(N'seller',N'admin')),
  CONSTRAINT CK_ReplacementStatusHistory_Changed CHECK(previous_status IS NULL OR previous_status<>new_status)
);
GO
CREATE INDEX IX_ReplacementStatusHistory_Replacement ON dbo.ReplacementStatusHistory(replacement_id,created_at,id);
GO

ALTER TABLE dbo.ComplaintEventHistory ADD
  CONSTRAINT FK_ComplaintEventHistory_Replacement FOREIGN KEY(replacement_id) REFERENCES dbo.ComplaintReplacements(id);
GO

ALTER TABLE dbo.Refunds DROP CONSTRAINT UQ_Refunds_ShopOrder;
ALTER TABLE dbo.Refunds ADD
  complaint_id BIGINT NULL,
  refund_source_type NVARCHAR(40) NOT NULL CONSTRAINT DF_Refunds_SourceType DEFAULT N'SHOP_ORDER_CANCELLATION',
  CONSTRAINT FK_Refunds_Complaint FOREIGN KEY(complaint_id) REFERENCES dbo.MarketplaceComplaints(id),
  CONSTRAINT CK_Refunds_SourceType CHECK(refund_source_type IN(N'SHOP_ORDER_CANCELLATION',N'COMPLAINT_RESOLUTION')),
  CONSTRAINT CK_Refunds_SourceLink CHECK(
    (refund_source_type=N'SHOP_ORDER_CANCELLATION' AND complaint_id IS NULL)
    OR (refund_source_type=N'COMPLAINT_RESOLUTION' AND complaint_id IS NOT NULL AND shipping_amount=0)
  );
GO
CREATE UNIQUE INDEX UX_Refunds_CancellationShopOrder ON dbo.Refunds(shop_order_id) WHERE refund_source_type=N'SHOP_ORDER_CANCELLATION';
CREATE UNIQUE INDEX UX_Refunds_Complaint ON dbo.Refunds(complaint_id) WHERE complaint_id IS NOT NULL;
GO
ALTER TABLE dbo.ComplaintEventHistory ADD
  CONSTRAINT FK_ComplaintEventHistory_Refund FOREIGN KEY(refund_id) REFERENCES dbo.Refunds(id);
GO

ALTER TABLE dbo.MarketplaceNotifications ADD
  complaint_id BIGINT NULL,
  replacement_id BIGINT NULL,
  CONSTRAINT FK_MarketplaceNotifications_Complaint FOREIGN KEY(complaint_id) REFERENCES dbo.MarketplaceComplaints(id),
  CONSTRAINT FK_MarketplaceNotifications_Replacement FOREIGN KEY(replacement_id) REFERENCES dbo.ComplaintReplacements(id);
GO
CREATE INDEX IX_MarketplaceNotifications_Complaint ON dbo.MarketplaceNotifications(complaint_id,created_at DESC) WHERE complaint_id IS NOT NULL;
GO

ALTER TABLE dbo.InventoryAdjustments DROP CONSTRAINT CK_InventoryAdjustments_Type;
ALTER TABLE dbo.InventoryAdjustments ADD CONSTRAINT CK_InventoryAdjustments_Type
  CHECK(adjustment_type IN(N'RESTOCK',N'MANUAL_CORRECTION',N'COMPLAINT_REPLACEMENT'));
GO

CREATE OR ALTER TRIGGER dbo.TR_ComplaintEventHistory_Immutable ON dbo.ComplaintEventHistory
AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON; THROW 51020,'Complaint event history is immutable.',1; END;
GO
CREATE OR ALTER TRIGGER dbo.TR_ReplacementStatusHistory_Immutable ON dbo.ReplacementStatusHistory
AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON; THROW 51021,'Replacement status history is immutable.',1; END;
GO
