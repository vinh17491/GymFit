SET NOCOUNT ON;
SET XACT_ABORT ON;

ALTER TABLE dbo.Brands ADD
  normalized_name NVARCHAR(200) NULL,
  is_generic BIT NOT NULL CONSTRAINT DF_Brands_IsGeneric DEFAULT 0;
GO

UPDATE dbo.Brands SET normalized_name=LOWER(LTRIM(RTRIM(name)));
WHILE EXISTS(SELECT 1 FROM dbo.Brands WHERE normalized_name LIKE N'%  %')
  UPDATE dbo.Brands SET normalized_name=REPLACE(normalized_name,N'  ',N' ') WHERE normalized_name LIKE N'%  %';
IF EXISTS(SELECT 1 FROM dbo.Brands WHERE normalized_name IS NULL OR normalized_name=N'')
  THROW 50300,'Brand normalization produced an empty value.',1;
IF EXISTS(SELECT normalized_name FROM dbo.Brands GROUP BY normalized_name HAVING COUNT(*)>1)
  THROW 50301,'Duplicate normalized Brand names require manual resolution.',1;
ALTER TABLE dbo.Brands ALTER COLUMN normalized_name NVARCHAR(200) NOT NULL;
CREATE UNIQUE INDEX UX_Brands_NormalizedName ON dbo.Brands(normalized_name);
CREATE UNIQUE INDEX UX_Brands_OneGeneric ON dbo.Brands(is_generic) WHERE is_generic=1;
CREATE INDEX IX_Brands_Active_Name ON dbo.Brands(is_active,name,id);
GO

DECLARE @genericNormalized NVARCHAR(200)=LOWER(N'Không có thương hiệu');
IF EXISTS(SELECT 1 FROM dbo.Brands WHERE normalized_name=@genericNormalized)
  UPDATE dbo.Brands SET is_generic=1,is_active=1,updated_at=SYSUTCDATETIME() WHERE normalized_name=@genericNormalized;
ELSE
  INSERT dbo.Brands(name,slug,logo_url,description,is_active,normalized_name,is_generic,created_at,updated_at)
  VALUES(N'Không có thương hiệu',N'khong-co-thuong-hieu',NULL,N'Generic platform Brand',1,@genericNormalized,1,SYSUTCDATETIME(),SYSUTCDATETIME());
GO

CREATE TABLE dbo.BrandRequests(
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BrandRequests PRIMARY KEY,
  requester_user_id INT NOT NULL,
  shop_id INT NOT NULL,
  requested_name NVARCHAR(200) NOT NULL,
  normalized_name NVARCHAR(200) NOT NULL,
  website_url NVARCHAR(500) NULL,
  description NVARCHAR(2000) NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_BrandRequests_Status DEFAULT N'PENDING',
  resolved_brand_id INT NULL,
  review_reason NVARCHAR(1000) NULL,
  reviewed_by_user_id INT NULL,
  reviewed_at DATETIME2 NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_BrandRequests_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_BrandRequests_UpdatedAt DEFAULT SYSUTCDATETIME(),
  row_version ROWVERSION NOT NULL,
  CONSTRAINT FK_BrandRequests_Requester FOREIGN KEY(requester_user_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_BrandRequests_Shop FOREIGN KEY(shop_id) REFERENCES dbo.Shops(id),
  CONSTRAINT FK_BrandRequests_ResolvedBrand FOREIGN KEY(resolved_brand_id) REFERENCES dbo.Brands(id),
  CONSTRAINT FK_BrandRequests_Reviewer FOREIGN KEY(reviewed_by_user_id) REFERENCES dbo.Users(id),
  CONSTRAINT CK_BrandRequests_Status CHECK(status IN(N'PENDING',N'APPROVED',N'REJECTED')),
  CONSTRAINT CK_BrandRequests_Names CHECK(LEN(LTRIM(RTRIM(requested_name)))>0 AND LEN(LTRIM(RTRIM(normalized_name)))>0),
  CONSTRAINT CK_BrandRequests_State CHECK(
    (status=N'PENDING' AND resolved_brand_id IS NULL AND reviewed_by_user_id IS NULL AND reviewed_at IS NULL AND review_reason IS NULL)
    OR (status=N'APPROVED' AND resolved_brand_id IS NOT NULL AND reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL)
    OR (status=N'REJECTED' AND resolved_brand_id IS NULL AND reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL AND LEN(LTRIM(RTRIM(review_reason)))>0)
  )
);
GO
CREATE UNIQUE INDEX UX_BrandRequests_PendingNormalized ON dbo.BrandRequests(normalized_name) WHERE status=N'PENDING';
CREATE INDEX IX_BrandRequests_Shop_Status_Created ON dbo.BrandRequests(shop_id,status,created_at DESC,id DESC);
CREATE INDEX IX_BrandRequests_Requester_Created ON dbo.BrandRequests(requester_user_id,created_at DESC,id DESC);
CREATE INDEX IX_BrandRequests_Status_Created ON dbo.BrandRequests(status,created_at DESC,id DESC);
GO

CREATE TABLE dbo.BrandRequestStatusHistory(
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BrandRequestStatusHistory PRIMARY KEY,
  brand_request_id INT NOT NULL,
  from_status NVARCHAR(20) NULL,
  to_status NVARCHAR(20) NOT NULL,
  actor_user_id INT NULL,
  reason NVARCHAR(1000) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_BrandRequestStatusHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_BrandRequestStatusHistory_Request FOREIGN KEY(brand_request_id) REFERENCES dbo.BrandRequests(id),
  CONSTRAINT FK_BrandRequestStatusHistory_Actor FOREIGN KEY(actor_user_id) REFERENCES dbo.Users(id),
  CONSTRAINT CK_BrandRequestStatusHistory_From CHECK(from_status IS NULL OR from_status IN(N'PENDING',N'APPROVED',N'REJECTED')),
  CONSTRAINT CK_BrandRequestStatusHistory_To CHECK(to_status IN(N'PENDING',N'APPROVED',N'REJECTED')),
  CONSTRAINT CK_BrandRequestStatusHistory_Changed CHECK(from_status IS NULL OR from_status<>to_status)
);
CREATE INDEX IX_BrandRequestStatusHistory_Request ON dbo.BrandRequestStatusHistory(brand_request_id,created_at,id);
GO
CREATE OR ALTER TRIGGER dbo.TR_BrandRequestStatusHistory_Immutable ON dbo.BrandRequestStatusHistory
AFTER UPDATE,DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51300,'Brand request status history is immutable.',1;
END;
GO
