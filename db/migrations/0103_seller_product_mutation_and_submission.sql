SET NOCOUNT ON;
SET XACT_ABORT ON;

IF COL_LENGTH(N'dbo.Products',N'moderation_status') IS NOT NULL
  THROW 50400,'Products.moderation_status already exists; refusing ambiguous SELLER-005 migration.',1;

IF EXISTS(SELECT 1 FROM dbo.Products WHERE brand_id IS NULL)
  THROW 50401,'Existing Products with no Brand require manual resolution before SELLER-005.',1;

ALTER TABLE dbo.Products ADD
  moderation_status NVARCHAR(20) NULL,
  submitted_at DATETIME2 NULL,
  review_reason NVARCHAR(1000) NULL,
  brand_request_id INT NULL;
GO

UPDATE dbo.Products
SET moderation_status=N'PUBLISHED'
WHERE moderation_status IS NULL;

ALTER TABLE dbo.Products ALTER COLUMN moderation_status NVARCHAR(20) NOT NULL;
ALTER TABLE dbo.Products ADD CONSTRAINT DF_Products_ModerationStatus DEFAULT N'DRAFT' FOR moderation_status;
ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT FK_Products_BrandRequest
  FOREIGN KEY(brand_request_id) REFERENCES dbo.BrandRequests(id);
ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT CK_Products_ModerationStatus
  CHECK(moderation_status IN(N'DRAFT',N'PENDING_REVIEW',N'PUBLISHED',N'REJECTED',N'SUSPENDED'));
ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT CK_Products_BrandSource
  CHECK((brand_id IS NOT NULL AND brand_request_id IS NULL) OR (brand_id IS NULL AND brand_request_id IS NOT NULL));
ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT CK_Products_ModerationState
  CHECK(
    (moderation_status=N'DRAFT' AND submitted_at IS NULL AND is_active=0)
    OR (moderation_status=N'PENDING_REVIEW' AND submitted_at IS NOT NULL AND review_reason IS NULL AND is_active=0)
    OR (moderation_status=N'PUBLISHED' AND brand_id IS NOT NULL AND brand_request_id IS NULL)
    OR (moderation_status=N'REJECTED' AND is_active=0)
    OR (moderation_status=N'SUSPENDED' AND is_active=0)
  );
GO

CREATE INDEX IX_Products_Shop_Moderation
  ON dbo.Products(shop_id,moderation_status,updated_at DESC,id DESC);
CREATE INDEX IX_Products_Moderation_Submitted
  ON dbo.Products(moderation_status,submitted_at,id)
  INCLUDE(shop_id,is_active,brand_id,category_id);
GO

IF EXISTS(SELECT 1 FROM dbo.Products WHERE moderation_status<>N'PUBLISHED')
  THROW 50402,'Legacy Product moderation backfill failed.',1;
IF EXISTS(SELECT 1 FROM dbo.Products WHERE id=0 AND moderation_status<>N'PUBLISHED')
  THROW 50403,'Product ID 0 moderation backfill failed.',1;
