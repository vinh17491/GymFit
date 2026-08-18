SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL OR OBJECT_ID(N'dbo.Plans', N'U') IS NULL
  THROW 50130, 'dbo.Users and dbo.Plans are required before coupon runtime migration.', 1;

IF OBJECT_ID(N'dbo.Coupons', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Coupons (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Coupons PRIMARY KEY,
    code NVARCHAR(50) NOT NULL,
    type NVARCHAR(20) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    min_purchase DECIMAL(10,2) NOT NULL CONSTRAINT DF_Coupons_MinPurchase DEFAULT 0,
    start_date DATETIME2 NOT NULL,
    end_date DATETIME2 NOT NULL,
    usage_limit INT NULL,
    user_limit INT NOT NULL CONSTRAINT DF_Coupons_UserLimit DEFAULT 1,
    applicable_plans NVARCHAR(500) NULL,
    is_active BIT NOT NULL CONSTRAINT DF_Coupons_IsActive DEFAULT 1,
    created_by INT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_Coupons_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Coupons_Code UNIQUE (code),
    CONSTRAINT FK_Coupons_CreatedBy FOREIGN KEY (created_by) REFERENCES dbo.Users(id),
    CONSTRAINT CK_Coupons_Type CHECK (type IN (N'fixed',N'percentage',N'free_trial',N'first_purchase',N'referral',N'flash_sale')),
    CONSTRAINT CK_Coupons_Value CHECK (value >= 0),
    CONSTRAINT CK_Coupons_MinPurchase CHECK (min_purchase >= 0),
    CONSTRAINT CK_Coupons_DateRange CHECK (end_date >= start_date),
    CONSTRAINT CK_Coupons_UsageLimit CHECK (usage_limit IS NULL OR usage_limit > 0),
    CONSTRAINT CK_Coupons_UserLimit CHECK (user_limit > 0),
    CONSTRAINT CK_Coupons_Code CHECK (LEN(LTRIM(RTRIM(code))) >= 3)
  );
END
ELSE IF COL_LENGTH(N'dbo.Coupons', N'code') IS NULL
     OR COL_LENGTH(N'dbo.Coupons', N'type') IS NULL
     OR COL_LENGTH(N'dbo.Coupons', N'value') IS NULL
     OR COL_LENGTH(N'dbo.Coupons', N'min_purchase') IS NULL
     OR COL_LENGTH(N'dbo.Coupons', N'start_date') IS NULL
     OR COL_LENGTH(N'dbo.Coupons', N'end_date') IS NULL
     OR COL_LENGTH(N'dbo.Coupons', N'usage_limit') IS NULL
     OR COL_LENGTH(N'dbo.Coupons', N'user_limit') IS NULL
     OR COL_LENGTH(N'dbo.Coupons', N'applicable_plans') IS NULL
     OR COL_LENGTH(N'dbo.Coupons', N'is_active') IS NULL
     OR COL_LENGTH(N'dbo.Coupons', N'created_by') IS NULL
     OR COL_LENGTH(N'dbo.Coupons', N'created_at') IS NULL
  THROW 50131, 'Existing dbo.Coupons does not satisfy the active runtime contract.', 1;

IF OBJECT_ID(N'dbo.CouponUsages', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CouponUsages (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CouponUsages PRIMARY KEY,
    coupon_id INT NOT NULL,
    user_id INT NOT NULL,
    order_id INT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at DATETIME2 NOT NULL CONSTRAINT DF_CouponUsages_UsedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_CouponUsages_Coupon FOREIGN KEY (coupon_id) REFERENCES dbo.Coupons(id),
    CONSTRAINT FK_CouponUsages_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
    CONSTRAINT CK_CouponUsages_Discount CHECK (discount_amount >= 0)
  );
END
ELSE IF COL_LENGTH(N'dbo.CouponUsages', N'coupon_id') IS NULL
     OR COL_LENGTH(N'dbo.CouponUsages', N'user_id') IS NULL
     OR COL_LENGTH(N'dbo.CouponUsages', N'order_id') IS NULL
     OR COL_LENGTH(N'dbo.CouponUsages', N'discount_amount') IS NULL
     OR COL_LENGTH(N'dbo.CouponUsages', N'used_at') IS NULL
  THROW 50132, 'Existing dbo.CouponUsages does not satisfy the active runtime contract.', 1;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.CouponUsages') AND name=N'IX_CouponUsages_Coupon'
)
  CREATE INDEX IX_CouponUsages_Coupon
    ON dbo.CouponUsages(coupon_id,used_at DESC,id DESC);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.CouponUsages') AND name=N'IX_CouponUsages_CouponUser'
)
  CREATE INDEX IX_CouponUsages_CouponUser
    ON dbo.CouponUsages(coupon_id,user_id,used_at DESC,id DESC);
