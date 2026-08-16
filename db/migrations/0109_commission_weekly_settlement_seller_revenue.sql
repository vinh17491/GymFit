SET NOCOUNT ON;
SET XACT_ABORT ON;

INSERT dbo.MarketplaceSettings(setting_key,setting_value,description)
VALUES(N'default_commission_rate_bps',500,N'Default marketplace merchandise commission in basis points (500 = 5%)');
GO

ALTER TABLE dbo.ShopOrders ADD
  commission_rate_snapshot INT NULL,
  commission_base_amount DECIMAL(18,2) NULL,
  commission_amount DECIMAL(18,2) NULL,
  seller_net_before_adjustment DECIMAL(18,2) NULL,
  commission_snapshotted_at DATETIME2 NULL;
GO

UPDATE dbo.ShopOrders SET
  commission_rate_snapshot=500,
  commission_base_amount=subtotal,
  commission_amount=ROUND(subtotal*500/10000.0,2),
  seller_net_before_adjustment=subtotal-ROUND(subtotal*500/10000.0,2),
  commission_snapshotted_at=created_at;
GO

ALTER TABLE dbo.ShopOrders ALTER COLUMN commission_rate_snapshot INT NOT NULL;
ALTER TABLE dbo.ShopOrders ALTER COLUMN commission_base_amount DECIMAL(18,2) NOT NULL;
ALTER TABLE dbo.ShopOrders ALTER COLUMN commission_amount DECIMAL(18,2) NOT NULL;
ALTER TABLE dbo.ShopOrders ALTER COLUMN seller_net_before_adjustment DECIMAL(18,2) NOT NULL;
ALTER TABLE dbo.ShopOrders ALTER COLUMN commission_snapshotted_at DATETIME2 NOT NULL;
ALTER TABLE dbo.ShopOrders ADD
  CONSTRAINT CK_ShopOrders_CommissionRate CHECK (commission_rate_snapshot BETWEEN 0 AND 10000),
  CONSTRAINT CK_ShopOrders_CommissionAmounts CHECK (
    commission_base_amount>=0 AND commission_amount>=0
    AND commission_amount<=commission_base_amount
    AND seller_net_before_adjustment=commission_base_amount-commission_amount
  );
GO

CREATE TABLE dbo.ShopOrderSettlements (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShopOrderSettlements PRIMARY KEY,
  shop_order_id INT NOT NULL,
  shop_id INT NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_ShopOrderSettlements_Status DEFAULT N'PENDING',
  commission_rate_snapshot INT NOT NULL,
  gross_merchandise_amount DECIMAL(18,2) NOT NULL,
  commission_amount DECIMAL(18,2) NOT NULL,
  net_before_adjustment DECIMAL(18,2) NOT NULL,
  applied_adjustment_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_ShopOrderSettlements_Adjustments DEFAULT 0,
  payable_amount DECIMAL(18,2) NOT NULL,
  earned_at DATETIME2 NOT NULL,
  eligible_at DATETIME2 NOT NULL,
  held_at DATETIME2 NULL,
  hold_reason NVARCHAR(500) NULL,
  hold_source_type NVARCHAR(50) NULL,
  hold_source_id NVARCHAR(100) NULL,
  paid_at DATETIME2 NULL,
  paid_by INT NULL,
  external_payment_reference NVARCHAR(255) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ShopOrderSettlements_Created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ShopOrderSettlements_Updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_ShopOrderSettlements_ShopOrder UNIQUE(shop_order_id),
  CONSTRAINT FK_ShopOrderSettlements_ShopOrder FOREIGN KEY(shop_order_id) REFERENCES dbo.ShopOrders(id),
  CONSTRAINT FK_ShopOrderSettlements_Shop FOREIGN KEY(shop_id) REFERENCES dbo.Shops(id),
  CONSTRAINT FK_ShopOrderSettlements_PaidBy FOREIGN KEY(paid_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_ShopOrderSettlements_Status CHECK(status IN(N'PENDING',N'HELD',N'ELIGIBLE',N'PAID')),
  CONSTRAINT CK_ShopOrderSettlements_Rate CHECK(commission_rate_snapshot BETWEEN 0 AND 10000),
  CONSTRAINT CK_ShopOrderSettlements_Amounts CHECK(
    gross_merchandise_amount>=0 AND commission_amount>=0
    AND commission_amount<=gross_merchandise_amount
    AND net_before_adjustment=gross_merchandise_amount-commission_amount
    AND payable_amount=net_before_adjustment+applied_adjustment_amount
    AND payable_amount>=0
  ),
  CONSTRAINT CK_ShopOrderSettlements_Times CHECK(eligible_at=DATEADD(DAY,7,earned_at)),
  CONSTRAINT CK_ShopOrderSettlements_Hold CHECK(
    (status=N'HELD' AND held_at IS NOT NULL AND hold_reason IS NOT NULL)
    OR (status<>N'HELD' AND held_at IS NULL AND hold_reason IS NULL AND hold_source_type IS NULL AND hold_source_id IS NULL)
  ),
  CONSTRAINT CK_ShopOrderSettlements_Paid CHECK(
    (status=N'PAID' AND paid_at IS NOT NULL AND paid_by IS NOT NULL)
    OR (status<>N'PAID' AND paid_at IS NULL AND paid_by IS NULL AND external_payment_reference IS NULL)
  )
);
GO
CREATE INDEX IX_ShopOrderSettlements_StatusEligible ON dbo.ShopOrderSettlements(status,eligible_at,id);
CREATE INDEX IX_ShopOrderSettlements_ShopEarned ON dbo.ShopOrderSettlements(shop_id,earned_at DESC,id DESC);
GO

CREATE TABLE dbo.SettlementStatusHistory (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SettlementStatusHistory PRIMARY KEY,
  settlement_id BIGINT NOT NULL,
  previous_status NVARCHAR(20) NULL,
  new_status NVARCHAR(20) NOT NULL,
  changed_by INT NULL,
  reason NVARCHAR(500) NULL,
  batch_id BIGINT NULL,
  external_reference NVARCHAR(255) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_SettlementStatusHistory_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_SettlementStatusHistory_Settlement FOREIGN KEY(settlement_id) REFERENCES dbo.ShopOrderSettlements(id),
  CONSTRAINT FK_SettlementStatusHistory_User FOREIGN KEY(changed_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_SettlementStatusHistory_Previous CHECK(previous_status IS NULL OR previous_status IN(N'PENDING',N'HELD',N'ELIGIBLE',N'PAID')),
  CONSTRAINT CK_SettlementStatusHistory_New CHECK(new_status IN(N'PENDING',N'HELD',N'ELIGIBLE',N'PAID')),
  CONSTRAINT CK_SettlementStatusHistory_Changed CHECK(previous_status IS NULL OR previous_status<>new_status)
);
GO
CREATE INDEX IX_SettlementStatusHistory_Settlement ON dbo.SettlementStatusHistory(settlement_id,created_at DESC,id DESC);
GO

CREATE TABLE dbo.SettlementAdjustments (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SettlementAdjustments PRIMARY KEY,
  shop_id INT NOT NULL,
  source_shop_order_id INT NULL,
  source_settlement_id BIGINT NULL,
  source_paid_settlement_id BIGINT NULL,
  source_refund_id BIGINT NULL,
  source_reference NVARCHAR(255) NULL,
  applied_settlement_id BIGINT NULL,
  signed_amount DECIMAL(18,2) NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_SettlementAdjustments_Status DEFAULT N'PENDING',
  reason NVARCHAR(500) NOT NULL,
  internal_note NVARCHAR(1000) NULL,
  created_by INT NOT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_SettlementAdjustments_Created DEFAULT SYSUTCDATETIME(),
  applied_by INT NULL,
  applied_at DATETIME2 NULL,
  voided_by INT NULL,
  voided_at DATETIME2 NULL,
  void_reason NVARCHAR(500) NULL,
  CONSTRAINT FK_SettlementAdjustments_Shop FOREIGN KEY(shop_id) REFERENCES dbo.Shops(id),
  CONSTRAINT FK_SettlementAdjustments_ShopOrder FOREIGN KEY(source_shop_order_id) REFERENCES dbo.ShopOrders(id),
  CONSTRAINT FK_SettlementAdjustments_SourceSettlement FOREIGN KEY(source_settlement_id) REFERENCES dbo.ShopOrderSettlements(id),
  CONSTRAINT FK_SettlementAdjustments_SourcePaid FOREIGN KEY(source_paid_settlement_id) REFERENCES dbo.ShopOrderSettlements(id),
  CONSTRAINT FK_SettlementAdjustments_Refund FOREIGN KEY(source_refund_id) REFERENCES dbo.Refunds(id),
  CONSTRAINT FK_SettlementAdjustments_AppliedSettlement FOREIGN KEY(applied_settlement_id) REFERENCES dbo.ShopOrderSettlements(id),
  CONSTRAINT FK_SettlementAdjustments_CreatedBy FOREIGN KEY(created_by) REFERENCES dbo.Users(id),
  CONSTRAINT FK_SettlementAdjustments_AppliedBy FOREIGN KEY(applied_by) REFERENCES dbo.Users(id),
  CONSTRAINT FK_SettlementAdjustments_VoidedBy FOREIGN KEY(voided_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_SettlementAdjustments_Amount CHECK(signed_amount<>0),
  CONSTRAINT CK_SettlementAdjustments_Status CHECK(status IN(N'PENDING',N'APPLIED',N'VOIDED')),
  CONSTRAINT CK_SettlementAdjustments_State CHECK(
    (status=N'PENDING' AND applied_settlement_id IS NULL AND applied_by IS NULL AND applied_at IS NULL AND voided_by IS NULL AND voided_at IS NULL AND void_reason IS NULL)
    OR (status=N'APPLIED' AND applied_settlement_id IS NOT NULL AND applied_by IS NOT NULL AND applied_at IS NOT NULL AND voided_by IS NULL AND voided_at IS NULL AND void_reason IS NULL)
    OR (status=N'VOIDED' AND applied_settlement_id IS NULL AND applied_by IS NULL AND applied_at IS NULL AND voided_by IS NOT NULL AND voided_at IS NOT NULL AND void_reason IS NOT NULL)
  )
);
GO
CREATE INDEX IX_SettlementAdjustments_ShopStatus ON dbo.SettlementAdjustments(shop_id,status,created_at DESC,id DESC);
CREATE INDEX IX_SettlementAdjustments_Target ON dbo.SettlementAdjustments(applied_settlement_id) WHERE applied_settlement_id IS NOT NULL;
GO

CREATE TABLE dbo.SettlementAdjustmentHistory (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SettlementAdjustmentHistory PRIMARY KEY,
  adjustment_id BIGINT NOT NULL,
  action NVARCHAR(20) NOT NULL,
  actor_id INT NOT NULL,
  settlement_id BIGINT NULL,
  reason NVARCHAR(500) NOT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_SettlementAdjustmentHistory_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_SettlementAdjustmentHistory_Adjustment FOREIGN KEY(adjustment_id) REFERENCES dbo.SettlementAdjustments(id),
  CONSTRAINT FK_SettlementAdjustmentHistory_Actor FOREIGN KEY(actor_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_SettlementAdjustmentHistory_Settlement FOREIGN KEY(settlement_id) REFERENCES dbo.ShopOrderSettlements(id),
  CONSTRAINT CK_SettlementAdjustmentHistory_Action CHECK(action IN(N'CREATED',N'APPLIED',N'VOIDED'))
);
GO

CREATE TABLE dbo.SettlementBatches (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SettlementBatches PRIMARY KEY,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_SettlementBatches_Status DEFAULT N'DRAFT',
  settlement_count INT NOT NULL,
  total_payable_amount DECIMAL(18,2) NOT NULL,
  created_by INT NOT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_SettlementBatches_Created DEFAULT SYSUTCDATETIME(),
  paid_at DATETIME2 NULL,
  paid_by INT NULL,
  paid_reason NVARCHAR(500) NULL,
  external_payment_reference NVARCHAR(255) NULL,
  CONSTRAINT FK_SettlementBatches_CreatedBy FOREIGN KEY(created_by) REFERENCES dbo.Users(id),
  CONSTRAINT FK_SettlementBatches_PaidBy FOREIGN KEY(paid_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_SettlementBatches_Period CHECK(period_start<=period_end),
  CONSTRAINT CK_SettlementBatches_Status CHECK(status IN(N'DRAFT',N'PAID')),
  CONSTRAINT CK_SettlementBatches_Total CHECK(settlement_count>0 AND total_payable_amount>=0),
  CONSTRAINT CK_SettlementBatches_Paid CHECK(
    (status=N'PAID' AND paid_at IS NOT NULL AND paid_by IS NOT NULL AND paid_reason IS NOT NULL)
    OR (status=N'DRAFT' AND paid_at IS NULL AND paid_by IS NULL AND paid_reason IS NULL AND external_payment_reference IS NULL)
  )
);
GO

CREATE TABLE dbo.SettlementBatchItems (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SettlementBatchItems PRIMARY KEY,
  batch_id BIGINT NOT NULL,
  settlement_id BIGINT NOT NULL,
  shop_id INT NOT NULL,
  payable_amount_snapshot DECIMAL(18,2) NOT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_SettlementBatchItems_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_SettlementBatchItems_Batch FOREIGN KEY(batch_id) REFERENCES dbo.SettlementBatches(id),
  CONSTRAINT FK_SettlementBatchItems_Settlement FOREIGN KEY(settlement_id) REFERENCES dbo.ShopOrderSettlements(id),
  CONSTRAINT FK_SettlementBatchItems_Shop FOREIGN KEY(shop_id) REFERENCES dbo.Shops(id),
  CONSTRAINT UQ_SettlementBatchItems_Settlement UNIQUE(settlement_id),
  CONSTRAINT CK_SettlementBatchItems_Amount CHECK(payable_amount_snapshot>=0)
);
GO
CREATE INDEX IX_SettlementBatchItems_BatchShop ON dbo.SettlementBatchItems(batch_id,shop_id);
GO

ALTER TABLE dbo.SettlementStatusHistory ADD CONSTRAINT FK_SettlementStatusHistory_Batch
  FOREIGN KEY(batch_id) REFERENCES dbo.SettlementBatches(id);
GO

CREATE OR ALTER TRIGGER dbo.TR_SettlementStatusHistory_Immutable ON dbo.SettlementStatusHistory
AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON; THROW 51009,'Settlement status history is immutable.',1; END;
GO
CREATE OR ALTER TRIGGER dbo.TR_SettlementAdjustmentHistory_Immutable ON dbo.SettlementAdjustmentHistory
AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON; THROW 51010,'Settlement adjustment history is immutable.',1; END;
GO
CREATE OR ALTER TRIGGER dbo.TR_SettlementBatchItems_Immutable ON dbo.SettlementBatchItems
AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON; THROW 51011,'Settlement batch items are immutable.',1; END;
GO

INSERT dbo.ShopOrderSettlements(
  shop_order_id,shop_id,status,commission_rate_snapshot,gross_merchandise_amount,commission_amount,
  net_before_adjustment,applied_adjustment_amount,payable_amount,earned_at,eligible_at,held_at,hold_reason,hold_source_type,created_at,updated_at
)
SELECT so.id,so.shop_id,N'HELD',so.commission_rate_snapshot,so.commission_base_amount,so.commission_amount,
  so.seller_net_before_adjustment,0,so.seller_net_before_adjustment,so.delivered_at,DATEADD(DAY,7,so.delivered_at),
  SYSUTCDATETIME(),N'Legacy delivered ShopOrder requires administrator review',N'MIGRATION_BACKFILL',SYSUTCDATETIME(),SYSUTCDATETIME()
FROM dbo.ShopOrders so
WHERE so.delivered_at IS NOT NULL AND so.status=N'HUB_CHECK_PASSED';
GO

INSERT dbo.SettlementStatusHistory(settlement_id,previous_status,new_status,changed_by,reason,created_at)
SELECT id,NULL,N'HELD',NULL,N'Legacy delivered ShopOrder backfill; administrator review required',SYSUTCDATETIME()
FROM dbo.ShopOrderSettlements;
GO
