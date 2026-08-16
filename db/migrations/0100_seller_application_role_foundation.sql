SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @roleColumnId INT = COLUMNPROPERTY(OBJECT_ID(N'dbo.Users'), N'role', 'ColumnId');
IF @roleColumnId IS NULL
  THROW 50100, 'dbo.Users.role was not found.', 1;

IF EXISTS (
  SELECT 1
  FROM dbo.Users
  WHERE role NOT IN (N'member', N'coach', N'admin', N'seller')
)
  THROW 50101, 'dbo.Users contains an unsupported role value.', 1;

DECLARE @roleConstraintCount INT;
SELECT @roleConstraintCount = COUNT(*)
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID(N'dbo.Users')
  AND (
    cc.parent_column_id = @roleColumnId
    OR LOWER(REPLACE(REPLACE(cc.definition, N'[', N''), N']', N'')) LIKE N'%role%in%'
  );

IF @roleConstraintCount <> 1
  THROW 50102, 'Unable to identify exactly one CHECK constraint governing dbo.Users.role.', 1;

DECLARE @roleConstraintName SYSNAME;
SELECT @roleConstraintName = cc.name
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID(N'dbo.Users')
  AND (
    cc.parent_column_id = @roleColumnId
    OR LOWER(REPLACE(REPLACE(cc.definition, N'[', N''), N']', N'')) LIKE N'%role%in%'
  );

DECLARE @dropRoleConstraintSql NVARCHAR(1000) =
  N'ALTER TABLE dbo.Users DROP CONSTRAINT ' + QUOTENAME(@roleConstraintName) + N';';
EXEC sys.sp_executesql @dropRoleConstraintSql;
ALTER TABLE dbo.Users WITH CHECK ADD CONSTRAINT CK_Users_Role
  CHECK (role IN (N'member', N'coach', N'admin', N'seller'));
ALTER TABLE dbo.Users CHECK CONSTRAINT CK_Users_Role;
GO

CREATE TABLE dbo.SellerApplications (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SellerApplications PRIMARY KEY,
  user_id INT NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_SellerApplications_Status DEFAULT N'DRAFT',
  business_name NVARCHAR(200) NULL,
  business_type NVARCHAR(30) NULL,
  contact_name NVARCHAR(200) NULL,
  contact_email NVARCHAR(255) NULL,
  contact_phone NVARCHAR(50) NULL,
  business_address NVARCHAR(500) NULL,
  pickup_address NVARCHAR(500) NULL,
  tax_code NVARCHAR(50) NULL,
  website_url NVARCHAR(500) NULL,
  social_url NVARCHAR(500) NULL,
  description NVARCHAR(2000) NULL,
  review_reason NVARCHAR(1000) NULL,
  submitted_at DATETIME2 NULL,
  reviewed_at DATETIME2 NULL,
  reviewed_by_user_id INT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_SellerApplications_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_SellerApplications_UpdatedAt DEFAULT SYSUTCDATETIME(),
  row_version ROWVERSION NOT NULL,
  CONSTRAINT UQ_SellerApplications_User UNIQUE (user_id),
  CONSTRAINT FK_SellerApplications_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_SellerApplications_ReviewedBy FOREIGN KEY (reviewed_by_user_id) REFERENCES dbo.Users(id),
  CONSTRAINT CK_SellerApplications_Status CHECK (status IN (N'DRAFT', N'PENDING', N'APPROVED', N'REJECTED', N'WITHDRAWN')),
  CONSTRAINT CK_SellerApplications_BusinessType CHECK (business_type IS NULL OR business_type IN (N'BRAND', N'SPORTS_STORE', N'SMALL_BUSINESS', N'OTHER')),
  CONSTRAINT CK_SellerApplications_ContactEmail CHECK (contact_email IS NULL OR LEN(LTRIM(RTRIM(contact_email))) BETWEEN 3 AND 255),
  CONSTRAINT CK_SellerApplications_ReviewFields CHECK (
    (status IN (N'APPROVED', N'REJECTED') AND reviewed_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL)
    OR
    (status NOT IN (N'APPROVED', N'REJECTED'))
  ),
  CONSTRAINT CK_SellerApplications_SubmittedAt CHECK (
    status = N'DRAFT' OR submitted_at IS NOT NULL
  )
);
GO

CREATE INDEX IX_SellerApplications_Status_SubmittedAt
ON dbo.SellerApplications(status, submitted_at DESC, id DESC);
GO

CREATE TABLE dbo.SellerApplicationStatusHistory (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SellerApplicationStatusHistory PRIMARY KEY,
  seller_application_id INT NOT NULL,
  from_status NVARCHAR(20) NULL,
  to_status NVARCHAR(20) NOT NULL,
  actor_user_id INT NULL,
  reason NVARCHAR(1000) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_SellerApplicationStatusHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_SellerApplicationStatusHistory_Application FOREIGN KEY (seller_application_id) REFERENCES dbo.SellerApplications(id),
  CONSTRAINT FK_SellerApplicationStatusHistory_Actor FOREIGN KEY (actor_user_id) REFERENCES dbo.Users(id),
  CONSTRAINT CK_SellerApplicationStatusHistory_FromStatus CHECK (from_status IS NULL OR from_status IN (N'DRAFT', N'PENDING', N'APPROVED', N'REJECTED', N'WITHDRAWN')),
  CONSTRAINT CK_SellerApplicationStatusHistory_ToStatus CHECK (to_status IN (N'DRAFT', N'PENDING', N'APPROVED', N'REJECTED', N'WITHDRAWN')),
  CONSTRAINT CK_SellerApplicationStatusHistory_Changed CHECK (from_status IS NULL OR from_status <> to_status),
  CONSTRAINT CK_SellerApplicationStatusHistory_Reason CHECK (reason IS NULL OR LEN(LTRIM(RTRIM(reason))) > 0)
);
GO

CREATE INDEX IX_SellerApplicationStatusHistory_Application_CreatedAt
ON dbo.SellerApplicationStatusHistory(seller_application_id, created_at ASC, id ASC);
GO

CREATE OR ALTER TRIGGER dbo.TR_SellerApplicationStatusHistory_Immutable
ON dbo.SellerApplicationStatusHistory
AFTER UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  THROW 51100, 'Seller application status history is immutable.', 1;
END;
GO
