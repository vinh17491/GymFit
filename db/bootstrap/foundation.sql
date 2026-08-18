-- GYMFIT FOUNDATION BOOTSTRAP
--
-- This file is executed only by the guarded `db:bootstrap` command.
-- It intentionally contains foundation DDL only: no demo data, no numbered
-- migration-owned objects, no SchemaMigrations ledger, and no destructive SQL.

SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Users (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
  email NVARCHAR(255) NOT NULL CONSTRAINT UQ_Users_Email UNIQUE,
  password NVARCHAR(255) NOT NULL,
  name NVARCHAR(100) NOT NULL,
  phone NVARCHAR(20) NULL,
  role NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_Role DEFAULT N'member',
  referral_code NVARCHAR(10) NULL,
  referred_by INT NULL,
  avatar_url NVARCHAR(500) NULL,
  is_active BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
  email_verified BIT NOT NULL CONSTRAINT DF_Users_EmailVerified DEFAULT 0,
  last_login_at DATETIME2 NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_Users_Role CHECK (role IN (N'member', N'coach', N'admin')),
  CONSTRAINT FK_Users_ReferredBy FOREIGN KEY (referred_by) REFERENCES dbo.Users(id)
);
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Users', N'U') AND name = N'IX_Users_Email')
  CREATE INDEX IX_Users_Email ON dbo.Users(email);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Users', N'U') AND name = N'IX_Users_Role')
  CREATE INDEX IX_Users_Role ON dbo.Users(role);

IF OBJECT_ID(N'dbo.Plans', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Plans (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Plans PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  description NVARCHAR(500) NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_days INT NOT NULL,
  type NVARCHAR(20) NOT NULL,
  features NVARCHAR(MAX) NULL,
  is_active BIT NOT NULL CONSTRAINT DF_Plans_IsActive DEFAULT 1,
  sort_order INT NOT NULL CONSTRAINT DF_Plans_SortOrder DEFAULT 0,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Plans_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_Plans_Type CHECK (type IN (N'monthly', N'quarterly', N'yearly', N'custom'))
);
END;

IF OBJECT_ID(N'dbo.Brands', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Brands (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Brands PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  slug NVARCHAR(100) NOT NULL CONSTRAINT UQ_Brands_Slug UNIQUE,
  logo_url NVARCHAR(500) NULL,
  description NVARCHAR(500) NULL,
  is_active BIT NOT NULL CONSTRAINT DF_Brands_IsActive DEFAULT 1,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Brands_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_Brands_UpdatedAt DEFAULT SYSUTCDATETIME()
);
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Brands', N'U') AND name = N'IX_Brands_Slug')
  CREATE INDEX IX_Brands_Slug ON dbo.Brands(slug);

IF OBJECT_ID(N'dbo.Categories', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Categories (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Categories PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  slug NVARCHAR(100) NOT NULL CONSTRAINT UQ_Categories_Slug UNIQUE,
  description NVARCHAR(500) NULL,
  image_url NVARCHAR(500) NULL,
  is_active BIT NOT NULL CONSTRAINT DF_Categories_IsActive DEFAULT 1,
  sort_order INT NOT NULL CONSTRAINT DF_Categories_SortOrder DEFAULT 0,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Categories_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_Categories_UpdatedAt DEFAULT SYSUTCDATETIME()
);
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Categories', N'U') AND name = N'IX_Categories_Slug')
  CREATE INDEX IX_Categories_Slug ON dbo.Categories(slug);

IF OBJECT_ID(N'dbo.Products', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Products (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Products PRIMARY KEY,
  product_name NVARCHAR(200) NOT NULL,
  slug NVARCHAR(200) NOT NULL CONSTRAINT UQ_Products_Slug UNIQUE,
  description NVARCHAR(MAX) NULL,
  specifications NVARCHAR(MAX) NULL,
  features NVARCHAR(MAX) NULL,
  sku NVARCHAR(100) NOT NULL CONSTRAINT UQ_Products_SKU UNIQUE,
  barcode NVARCHAR(50) NULL,
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2) NULL,
  stock INT NOT NULL CONSTRAINT DF_Products_Stock DEFAULT 0,
  weight DECIMAL(8,2) NULL,
  flavor NVARCHAR(100) NULL,
  color NVARCHAR(50) NULL,
  size NVARCHAR(50) NULL,
  target_users NVARCHAR(200) NULL,
  rating DECIMAL(3,1) NOT NULL CONSTRAINT DF_Products_Rating DEFAULT 0,
  review_count INT NOT NULL CONSTRAINT DF_Products_ReviewCount DEFAULT 0,
  main_image NVARCHAR(500) NULL,
  gallery_images NVARCHAR(MAX) NULL,
  brand_id INT NULL,
  category_id INT NULL,
  sub_category NVARCHAR(100) NULL,
  is_active BIT NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT 1,
  is_featured BIT NOT NULL CONSTRAINT DF_Products_IsFeatured DEFAULT 0,
  is_on_sale BIT NOT NULL CONSTRAINT DF_Products_IsOnSale DEFAULT 0,
  is_new_arrival BIT NOT NULL CONSTRAINT DF_Products_IsNewArrival DEFAULT 0,
  is_best_seller BIT NOT NULL CONSTRAINT DF_Products_IsBestSeller DEFAULT 0,
  is_new BIT NOT NULL CONSTRAINT DF_Products_IsNew DEFAULT 0,
  is_bestseller BIT NOT NULL CONSTRAINT DF_Products_IsBestseller DEFAULT 0,
  tags NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Products_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_Products_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Products_Brand FOREIGN KEY (brand_id) REFERENCES dbo.Brands(id),
  CONSTRAINT FK_Products_Category FOREIGN KEY (category_id) REFERENCES dbo.Categories(id)
);
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Products', N'U') AND name = N'IX_Products_Slug')
  CREATE INDEX IX_Products_Slug ON dbo.Products(slug);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Products', N'U') AND name = N'IX_Products_Brand')
  CREATE INDEX IX_Products_Brand ON dbo.Products(brand_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Products', N'U') AND name = N'IX_Products_Category')
  CREATE INDEX IX_Products_Category ON dbo.Products(category_id);

IF OBJECT_ID(N'dbo.ProductVariants', N'U') IS NULL
BEGIN
CREATE TABLE dbo.ProductVariants (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProductVariants PRIMARY KEY,
  product_id INT NOT NULL,
  variant_name NVARCHAR(100) NOT NULL,
  sku NVARCHAR(50) NULL,
  price DECIMAL(10,2) NULL,
  stock INT NULL CONSTRAINT DF_ProductVariants_Stock DEFAULT 0,
  is_active BIT NULL CONSTRAINT DF_ProductVariants_IsActive DEFAULT 1,
  created_at DATETIME2 NULL CONSTRAINT DF_ProductVariants_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ProductVariants_Product FOREIGN KEY (product_id) REFERENCES dbo.Products(id)
);
END;

IF OBJECT_ID(N'dbo.ProductImages', N'U') IS NULL
BEGIN
CREATE TABLE dbo.ProductImages (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProductImages PRIMARY KEY,
  product_id INT NOT NULL,
  image_url NVARCHAR(500) NOT NULL,
  alt_text NVARCHAR(200) NULL,
  sort_order INT NULL CONSTRAINT DF_ProductImages_SortOrder DEFAULT 0,
  is_primary BIT NULL CONSTRAINT DF_ProductImages_IsPrimary DEFAULT 0,
  created_at DATETIME2 NULL CONSTRAINT DF_ProductImages_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ProductImages_Product FOREIGN KEY (product_id) REFERENCES dbo.Products(id)
);
END;

IF OBJECT_ID(N'dbo.Inventory', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Inventory (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Inventory PRIMARY KEY,
  product_id INT NOT NULL,
  variant_id INT NULL,
  quantity INT NULL CONSTRAINT DF_Inventory_Quantity DEFAULT 0,
  reserved INT NULL CONSTRAINT DF_Inventory_Reserved DEFAULT 0,
  warehouse NVARCHAR(100) NULL,
  last_restocked DATETIME2 NULL CONSTRAINT DF_Inventory_LastRestocked DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NULL CONSTRAINT DF_Inventory_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Inventory_Product FOREIGN KEY (product_id) REFERENCES dbo.Products(id),
  CONSTRAINT FK_Inventory_Variant FOREIGN KEY (variant_id) REFERENCES dbo.ProductVariants(id)
);
END;

IF OBJECT_ID(N'dbo.Exercises', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Exercises (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Exercises PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  slug NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX) NULL,
  instructions NVARCHAR(MAX) NULL,
  muscle_group NVARCHAR(100) NULL,
  equipment NVARCHAR(100) NULL,
  difficulty NVARCHAR(20) NULL,
  video_url NVARCHAR(500) NULL,
  thumbnail_url NVARCHAR(500) NULL,
  is_active BIT NOT NULL CONSTRAINT DF_Exercises_IsActive DEFAULT 1,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Exercises_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_Exercises_UpdatedAt DEFAULT SYSUTCDATETIME()
);
END;

IF OBJECT_ID(N'dbo.Bookings', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Bookings (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Bookings PRIMARY KEY,
  coach_id INT NOT NULL,
  member_id INT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_Bookings_Status DEFAULT N'pending',
  notes NVARCHAR(500) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Bookings_CreatedAt DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_Bookings_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Bookings_Coach FOREIGN KEY (coach_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_Bookings_Member FOREIGN KEY (member_id) REFERENCES dbo.Users(id),
  CONSTRAINT CK_Bookings_Status CHECK (status IN (N'pending', N'confirmed', N'cancelled', N'completed', N'no_show'))
);
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Bookings', N'U') AND name = N'IX_Bookings_Coach')
  CREATE INDEX IX_Bookings_Coach ON dbo.Bookings(coach_id, booking_date);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Bookings', N'U') AND name = N'IX_Bookings_Member')
  CREATE INDEX IX_Bookings_Member ON dbo.Bookings(member_id, booking_date);

IF OBJECT_ID(N'dbo.Notifications', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Notifications (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Notifications PRIMARY KEY,
  user_id INT NOT NULL,
  title NVARCHAR(200) NOT NULL,
  message NVARCHAR(MAX) NOT NULL,
  type NVARCHAR(50) NOT NULL,
  is_read BIT NOT NULL CONSTRAINT DF_Notifications_IsRead DEFAULT 0,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Notifications_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id)
);
END;

IF OBJECT_ID(N'dbo.CRMCustomers', N'U') IS NULL
BEGIN
CREATE TABLE dbo.CRMCustomers (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CRMCustomers PRIMARY KEY,
  user_id INT NOT NULL CONSTRAINT UQ_CRMCustomers_User UNIQUE,
  tags NVARCHAR(500) NULL,
  last_contact_at DATETIME2 NULL,
  assigned_coach_id INT NULL,
  lifetime_value DECIMAL(12,2) NOT NULL CONSTRAINT DF_CRMCustomers_LifetimeValue DEFAULT 0,
  risk_score INT NOT NULL CONSTRAINT DF_CRMCustomers_RiskScore DEFAULT 0,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_CRMCustomers_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_CRMCustomers_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_CRMCustomers_AssignedCoach FOREIGN KEY (assigned_coach_id) REFERENCES dbo.Users(id)
);
END;

IF OBJECT_ID(N'dbo.Memberships', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Memberships (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Memberships PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  start_date DATETIME2 NOT NULL,
  end_date DATETIME2 NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_Memberships_Status DEFAULT N'active',
  payment_id INT NULL,
  auto_renew BIT NOT NULL CONSTRAINT DF_Memberships_AutoRenew DEFAULT 0,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_Memberships_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Memberships_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_Memberships_Plan FOREIGN KEY (plan_id) REFERENCES dbo.Plans(id),
  CONSTRAINT CK_Memberships_Status CHECK (status IN (N'active', N'expired', N'cancelled', N'suspended'))
);
END;
