SET NOCOUNT ON;
SET XACT_ABORT ON;

CREATE TABLE dbo.Shops (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Shops PRIMARY KEY,
  owner_user_id INT NULL,
  system_key NVARCHAR(100) NULL,
  name NVARCHAR(200) NOT NULL,
  slug NVARCHAR(200) NOT NULL,
  logo_url NVARCHAR(500) NULL,
  banner_url NVARCHAR(500) NULL,
  description NVARCHAR(2000) NULL,
  pickup_address NVARCHAR(500) NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_Shops_Status DEFAULT N'ACTIVE',
  is_verified BIT NOT NULL CONSTRAINT DF_Shops_Verified DEFAULT 0,
  is_system BIT NOT NULL CONSTRAINT DF_Shops_System DEFAULT 0,
  average_rating DECIMAL(3,2) NOT NULL CONSTRAINT DF_Shops_AverageRating DEFAULT 0,
  review_count INT NOT NULL CONSTRAINT DF_Shops_ReviewCount DEFAULT 0,
  completed_order_count INT NOT NULL CONSTRAINT DF_Shops_CompletedOrderCount DEFAULT 0,
  sold_count INT NOT NULL CONSTRAINT DF_Shops_SoldCount DEFAULT 0,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Shops_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_Shops_UpdatedAt DEFAULT SYSUTCDATETIME(),
  row_version ROWVERSION NOT NULL,
  CONSTRAINT FK_Shops_Owner FOREIGN KEY (owner_user_id) REFERENCES dbo.Users(id),
  CONSTRAINT UQ_Shops_Slug UNIQUE (slug),
  CONSTRAINT CK_Shops_Status CHECK (status IN (N'ACTIVE',N'SUSPENDED')),
  CONSTRAINT CK_Shops_Aggregates CHECK (
    average_rating BETWEEN 0 AND 5 AND review_count >= 0
    AND completed_order_count >= 0 AND sold_count >= 0
  ),
  CONSTRAINT CK_Shops_SystemOwnership CHECK (
    (is_system=1 AND owner_user_id IS NULL AND system_key IS NOT NULL)
    OR (is_system=0 AND owner_user_id IS NOT NULL AND system_key IS NULL)
  )
);
GO

CREATE UNIQUE INDEX UX_Shops_Owner ON dbo.Shops(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE UNIQUE INDEX UX_Shops_SystemKey ON dbo.Shops(system_key) WHERE system_key IS NOT NULL;
CREATE INDEX IX_Shops_Status_Verified ON dbo.Shops(status,is_verified);
CREATE INDEX IX_Shops_CreatedAt ON dbo.Shops(created_at DESC,id DESC);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL')
  INSERT dbo.Shops(owner_user_id,system_key,name,slug,status,is_verified,is_system)
  VALUES(NULL,N'GYMFIT_OFFICIAL',N'GymFit Official',N'gymfit-official',N'ACTIVE',1,1);
GO

INSERT dbo.Shops(owner_user_id,system_key,name,slug,description,pickup_address,status,is_verified,is_system)
SELECT u.id,NULL,
  COALESCE(NULLIF(LTRIM(RTRIM(sa.business_name)),N''),N'Seller '+CONVERT(NVARCHAR(20),u.id)),
  N'seller-'+CONVERT(NVARCHAR(20),u.id),
  NULLIF(LTRIM(RTRIM(sa.description)),N''),
  NULLIF(LTRIM(RTRIM(sa.pickup_address)),N''),
  N'ACTIVE',0,0
FROM dbo.Users u
OUTER APPLY (
  SELECT TOP (1) a.business_name,a.description,a.pickup_address
  FROM dbo.SellerApplications a
  WHERE a.user_id=u.id AND a.status=N'APPROVED'
  ORDER BY a.reviewed_at DESC,a.id DESC
) sa
WHERE u.role=N'seller'
  AND NOT EXISTS (SELECT 1 FROM dbo.Shops s WHERE s.owner_user_id=u.id);
GO

ALTER TABLE dbo.Products ADD shop_id INT NULL;
GO

DECLARE @officialShopId INT =
  (SELECT id FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL');
IF @officialShopId IS NULL
  THROW 50201, 'GymFit Official shop is missing.', 1;
UPDATE dbo.Products SET shop_id=@officialShopId WHERE shop_id IS NULL;
IF EXISTS (SELECT 1 FROM dbo.Products WHERE shop_id IS NULL)
  THROW 50202, 'Product ownership backfill left orphan products.', 1;
GO

ALTER TABLE dbo.Products ALTER COLUMN shop_id INT NOT NULL;
ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT FK_Products_Shops
  FOREIGN KEY (shop_id) REFERENCES dbo.Shops(id);
ALTER TABLE dbo.Products CHECK CONSTRAINT FK_Products_Shops;
CREATE INDEX IX_Products_Shop_Active ON dbo.Products(shop_id,is_active,id);
GO
