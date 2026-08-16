SET XACT_ABORT ON;

IF COL_LENGTH(N'dbo.Products',N'moderation_status') IS NULL
  THROW 50410,'SELLER-005 lifecycle foundation is required before SELLER-006.',1;
IF COL_LENGTH(N'dbo.Products',N'reviewed_at') IS NOT NULL
  THROW 50411,'Products.reviewed_at already exists; refusing ambiguous SELLER-006 migration.',1;
IF OBJECT_ID(N'dbo.ProductModerationHistory',N'U') IS NOT NULL
  THROW 50412,'ProductModerationHistory already exists; refusing ambiguous SELLER-006 migration.',1;

ALTER TABLE dbo.Products ADD
  reviewed_at DATETIME2 NULL,
  published_at DATETIME2 NULL,
  reviewed_by_user_id INT NULL,
  CONSTRAINT FK_Products_ReviewedBy FOREIGN KEY(reviewed_by_user_id) REFERENCES dbo.Users(id);

CREATE TABLE dbo.ProductModerationHistory(
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProductModerationHistory PRIMARY KEY,
  product_id INT NOT NULL,
  from_status NVARCHAR(20) NULL,
  to_status NVARCHAR(20) NOT NULL,
  actor_user_id INT NULL,
  reason NVARCHAR(1000) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ProductModerationHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ProductModerationHistory_Product FOREIGN KEY(product_id) REFERENCES dbo.Products(id),
  CONSTRAINT FK_ProductModerationHistory_Actor FOREIGN KEY(actor_user_id) REFERENCES dbo.Users(id),
  CONSTRAINT CK_ProductModerationHistory_FromStatus CHECK(from_status IS NULL OR from_status IN(N'DRAFT',N'PENDING_REVIEW',N'PUBLISHED',N'REJECTED',N'SUSPENDED')),
  CONSTRAINT CK_ProductModerationHistory_ToStatus CHECK(to_status IN(N'DRAFT',N'PENDING_REVIEW',N'PUBLISHED',N'REJECTED',N'SUSPENDED')),
  CONSTRAINT CK_ProductModerationHistory_Reason CHECK(to_status NOT IN(N'REJECTED',N'SUSPENDED') OR LEN(LTRIM(RTRIM(reason)))>0)
);

CREATE INDEX IX_ProductModerationHistory_Product_Created
  ON dbo.ProductModerationHistory(product_id,created_at DESC,id DESC);
CREATE INDEX IX_ProductModerationHistory_Status_Created
  ON dbo.ProductModerationHistory(to_status,created_at DESC,id DESC);
CREATE INDEX IX_Products_Moderation_Reviewed
  ON dbo.Products(moderation_status,reviewed_at DESC,id DESC)
  INCLUDE(shop_id,is_active,submitted_at,published_at);
GO

CREATE OR ALTER TRIGGER dbo.TR_ProductModerationHistory_Immutable
ON dbo.ProductModerationHistory
AFTER UPDATE,DELETE
AS
BEGIN
  SET NOCOUNT ON;
  THROW 51400,'Product moderation history is immutable.',1;
END;
GO

IF EXISTS(SELECT 1 FROM dbo.ProductModerationHistory)
  THROW 50413,'SELLER-006 must not fabricate legacy Product moderation history.',1;
IF EXISTS(SELECT 1 FROM dbo.Products WHERE reviewed_at IS NOT NULL OR published_at IS NOT NULL OR reviewed_by_user_id IS NOT NULL)
  THROW 50414,'SELLER-006 must not fabricate legacy moderation timestamps or reviewers.',1;
IF EXISTS(SELECT 1 FROM dbo.Products WHERE moderation_status<>N'PUBLISHED')
  THROW 50415,'Unexpected non-PUBLISHED canonical Product during SELLER-006 migration.',1;
