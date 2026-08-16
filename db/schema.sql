-- ============================================
-- GYMER DATABASE — Full Schema + Procs + Demo Data
-- 1 file duy nhất. Mở SSMS, F5 là chạy.
-- ============================================

USE master;
GO
IF DB_ID('GYMFIT_DB') IS NOT NULL
BEGIN
  ALTER DATABASE GYMFIT_DB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
  DROP DATABASE GYMFIT_DB;
END
GO
CREATE DATABASE GYMFIT_DB;
GO
USE GYMFIT_DB;
GO
-- ============================================
-- DROP stored procedures first (avoid dependency errors)
-- ============================================
DROP PROCEDURE IF EXISTS sp_GetDAU;
DROP PROCEDURE IF EXISTS sp_GetRevenueByPeriod;
DROP PROCEDURE IF EXISTS sp_GetRetentionCohort;
DROP PROCEDURE IF EXISTS sp_CalculateChurnRate;
DROP PROCEDURE IF EXISTS sp_AddPoints;
DROP PROCEDURE IF EXISTS sp_SpendPoints;
DROP PROCEDURE IF EXISTS sp_ProcessReferralCommission;
DROP PROCEDURE IF EXISTS sp_GenerateInvoice;
GO
-- ============================================
-- DROP TABLES (order matters for FK)
-- ============================================
DROP TABLE IF EXISTS TicketAttachments;
DROP TABLE IF EXISTS TicketMessages;
DROP TABLE IF EXISTS Tickets;
DROP TABLE IF EXISTS NutritionEntries;
DROP TABLE IF EXISTS NutritionPlans;
DROP TABLE IF EXISTS WorkoutSessions;
DROP TABLE IF EXISTS WorkoutExercises;
DROP TABLE IF EXISTS Workouts;
DROP TABLE IF EXISTS CRMTasks;
DROP TABLE IF EXISTS CRMNotes;
DROP TABLE IF EXISTS CRMCustomers;
DROP TABLE IF EXISTS Invoices;
DROP TABLE IF EXISTS BackupLogs;
DROP TABLE IF EXISTS AuditLogs;
DROP TABLE IF EXISTS RewardRedemptions;
DROP TABLE IF EXISTS RewardsCatalog;
DROP TABLE IF EXISTS PointTransactions;
DROP TABLE IF EXISTS Points;
DROP TABLE IF EXISTS Promotions;
DROP TABLE IF EXISTS CouponUsages;
DROP TABLE IF EXISTS Coupons;
DROP TABLE IF EXISTS AffiliatePayouts;
DROP TABLE IF EXISTS Affiliates;
DROP TABLE IF EXISTS ReferralRewards;
DROP TABLE IF EXISTS ReferralClicks;
DROP TABLE IF EXISTS ReferralTransactions;
DROP TABLE IF EXISTS ReferralCodes;
DROP TABLE IF EXISTS Notifications;
DROP TABLE IF EXISTS Payments;
DROP TABLE IF EXISTS Memberships;
DROP TABLE IF EXISTS Plans;
DROP TABLE IF EXISTS SellerApplicationStatusHistory;
DROP TABLE IF EXISTS SellerApplications;
DROP TABLE IF EXISTS AnalyticsRetention;
DROP TABLE IF EXISTS AnalyticsDaily;
DROP TABLE IF EXISTS CoachProfiles;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Inventory;
DROP TABLE IF EXISTS Bookings;
DROP TABLE IF EXISTS ProductTags;
DROP TABLE IF EXISTS ProductVariants;
DROP TABLE IF EXISTS ProductImages;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS Exercises;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Brands;
GO
-- ============================================
-- TABLES
-- ============================================

CREATE TABLE Users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  email NVARCHAR(255) NOT NULL UNIQUE,
  password NVARCHAR(255) NOT NULL,
  name NVARCHAR(100) NOT NULL,
  phone NVARCHAR(20) NULL,
  role NVARCHAR(20) NOT NULL DEFAULT 'member' CONSTRAINT CK_Users_Role CHECK (role IN ('member','coach','admin','seller')),
  referral_code NVARCHAR(10) NULL,
  referred_by INT NULL,
  avatar_url NVARCHAR(500) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  coach_status NVARCHAR(20) NULL CONSTRAINT CK_Users_CoachStatus CHECK (coach_status IS NULL OR coach_status IN ('ACTIVE','SUSPENDED','INACTIVE')),
  coach_status_reason NVARCHAR(500) NULL,
  coach_status_updated_at DATETIME2 NULL,
  email_verified BIT NOT NULL DEFAULT 0,
  last_login_at DATETIME2 NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (referred_by) REFERENCES Users(id)
 );
 CREATE INDEX IX_Users_Email ON Users(email);
 CREATE INDEX IX_Users_Role ON Users(role);
 CREATE INDEX IX_Users_CoachStatus ON Users(role, coach_status, is_active, created_at DESC, id DESC);

CREATE TABLE CoachProfiles (
  id INT IDENTITY(1,1) PRIMARY KEY,
  coach_id INT NOT NULL UNIQUE,
  specialty NVARCHAR(200) NULL,
  bio NVARCHAR(2000) NULL,
  experience_years INT NULL CHECK (experience_years IS NULL OR experience_years >= 0),
  session_mode NVARCHAR(20) NULL CHECK (session_mode IS NULL OR session_mode IN ('ONLINE','IN_PERSON','BOTH')),
  location NVARCHAR(255) NULL,
  booking_enabled BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  FOREIGN KEY (coach_id) REFERENCES Users(id)
 );

CREATE TABLE SellerApplications (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SellerApplications PRIMARY KEY,
  user_id INT NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_SellerApplications_Status DEFAULT 'DRAFT',
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
  CONSTRAINT FK_SellerApplications_User FOREIGN KEY (user_id) REFERENCES Users(id),
  CONSTRAINT FK_SellerApplications_ReviewedBy FOREIGN KEY (reviewed_by_user_id) REFERENCES Users(id),
  CONSTRAINT CK_SellerApplications_Status CHECK (status IN ('DRAFT','PENDING','APPROVED','REJECTED','WITHDRAWN')),
  CONSTRAINT CK_SellerApplications_BusinessType CHECK (business_type IS NULL OR business_type IN ('BRAND','SPORTS_STORE','SMALL_BUSINESS','OTHER')),
  CONSTRAINT CK_SellerApplications_ContactEmail CHECK (contact_email IS NULL OR LEN(LTRIM(RTRIM(contact_email))) BETWEEN 3 AND 255),
  CONSTRAINT CK_SellerApplications_ReviewFields CHECK ((status IN ('APPROVED','REJECTED') AND reviewed_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL) OR status NOT IN ('APPROVED','REJECTED')),
  CONSTRAINT CK_SellerApplications_SubmittedAt CHECK (status='DRAFT' OR submitted_at IS NOT NULL)
);
CREATE INDEX IX_SellerApplications_Status_SubmittedAt ON SellerApplications(status,submitted_at DESC,id DESC);

CREATE TABLE SellerApplicationStatusHistory (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SellerApplicationStatusHistory PRIMARY KEY,
  seller_application_id INT NOT NULL,
  from_status NVARCHAR(20) NULL,
  to_status NVARCHAR(20) NOT NULL,
  actor_user_id INT NULL,
  reason NVARCHAR(1000) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_SellerApplicationStatusHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_SellerApplicationStatusHistory_Application FOREIGN KEY (seller_application_id) REFERENCES SellerApplications(id),
  CONSTRAINT FK_SellerApplicationStatusHistory_Actor FOREIGN KEY (actor_user_id) REFERENCES Users(id),
  CONSTRAINT CK_SellerApplicationStatusHistory_FromStatus CHECK (from_status IS NULL OR from_status IN ('DRAFT','PENDING','APPROVED','REJECTED','WITHDRAWN')),
  CONSTRAINT CK_SellerApplicationStatusHistory_ToStatus CHECK (to_status IN ('DRAFT','PENDING','APPROVED','REJECTED','WITHDRAWN')),
  CONSTRAINT CK_SellerApplicationStatusHistory_Changed CHECK (from_status IS NULL OR from_status<>to_status),
  CONSTRAINT CK_SellerApplicationStatusHistory_Reason CHECK (reason IS NULL OR LEN(LTRIM(RTRIM(reason)))>0)
);
CREATE INDEX IX_SellerApplicationStatusHistory_Application_CreatedAt ON SellerApplicationStatusHistory(seller_application_id,created_at,id);
GO
CREATE OR ALTER TRIGGER TR_SellerApplicationStatusHistory_Immutable
ON SellerApplicationStatusHistory
AFTER UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  THROW 51100, 'Seller application status history is immutable.', 1;
END;
GO

CREATE TABLE Plans (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  description NVARCHAR(500),
  price DECIMAL(10,2) NOT NULL,
  duration_days INT NOT NULL,
  type NVARCHAR(20) NOT NULL CHECK (type IN ('monthly','quarterly','yearly','custom')),
  features NVARCHAR(MAX) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE TABLE Memberships (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  start_date DATETIME2 NOT NULL,
  end_date DATETIME2 NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','suspended')),
  payment_id INT NULL,
  auto_renew BIT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE TABLE Payments (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method NVARCHAR(50) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  transaction_id NVARCHAR(255) NULL,
  coupon_id INT NULL,
  points_used INT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE TABLE Invoices (
  id INT IDENTITY(1,1) PRIMARY KEY,
  invoice_number NVARCHAR(50) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  payment_id INT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  pdf_path NVARCHAR(500) NULL,
  email_sent BIT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (payment_id) REFERENCES Payments(id)
);
CREATE INDEX IX_Invoices_User ON Invoices(user_id);

CREATE TABLE Notifications (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  title NVARCHAR(200) NOT NULL,
  message NVARCHAR(MAX) NOT NULL,
  type NVARCHAR(50) NOT NULL,
  is_read BIT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Referral
CREATE TABLE ReferralCodes (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  code NVARCHAR(20) NOT NULL UNIQUE,
  status NVARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);
CREATE INDEX IX_ReferralCodes_Code ON ReferralCodes(code);

CREATE TABLE ReferralClicks (
  id INT IDENTITY(1,1) PRIMARY KEY,
  referral_code NVARCHAR(20) NOT NULL,
  ip NVARCHAR(45) NULL,
  user_agent NVARCHAR(500) NULL,
  timestamp DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (referral_code) REFERENCES ReferralCodes(code)
);

CREATE TABLE ReferralRewards (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  type NVARCHAR(50) NOT NULL CHECK (type IN ('points','discount','free_days','cash')),
  amount DECIMAL(10,2) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','credited','rejected')),
  reference_id INT NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE TABLE ReferralTransactions (
  id INT IDENTITY(1,1) PRIMARY KEY,
  referrer_id INT NOT NULL,
  referred_id INT NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  transaction_type NVARCHAR(50) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','paid')),
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (referrer_id) REFERENCES Users(id),
  FOREIGN KEY (referred_id) REFERENCES Users(id)
);

CREATE TABLE Affiliates (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  tier NVARCHAR(20) NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  total_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','suspended')),
  approved_at DATETIME2 NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE TABLE AffiliatePayouts (
  id INT IDENTITY(1,1) PRIMARY KEY,
  affiliate_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method NVARCHAR(50) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  processed_at DATETIME2 NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (affiliate_id) REFERENCES Affiliates(id)
);

-- Coupons & Promotions
CREATE TABLE Coupons (
  id INT IDENTITY(1,1) PRIMARY KEY,
  code NVARCHAR(50) NOT NULL UNIQUE,
  type NVARCHAR(20) NOT NULL CHECK (type IN ('fixed','percentage','free_trial','first_purchase','referral','flash_sale')),
  value DECIMAL(10,2) NOT NULL,
  min_purchase DECIMAL(10,2) NOT NULL DEFAULT 0,
  start_date DATETIME2 NOT NULL,
  end_date DATETIME2 NOT NULL,
  usage_limit INT NULL,
  user_limit INT NOT NULL DEFAULT 1,
  applicable_plans NVARCHAR(500) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (created_by) REFERENCES Users(id)
);
CREATE INDEX IX_Coupons_Code ON Coupons(code);

CREATE TABLE CouponUsages (
  id INT IDENTITY(1,1) PRIMARY KEY,
  coupon_id INT NOT NULL,
  user_id INT NOT NULL,
  order_id INT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  used_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (coupon_id) REFERENCES Coupons(id),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE TABLE Promotions (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  type NVARCHAR(50) NOT NULL,
  config NVARCHAR(MAX) NULL,
  start_date DATETIME2 NOT NULL,
  end_date DATETIME2 NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Loyalty Points
CREATE TABLE Points (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  balance INT NOT NULL DEFAULT 0,
  lifetime_earned INT NOT NULL DEFAULT 0,
  lifetime_spent INT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE TABLE PointTransactions (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  type NVARCHAR(20) NOT NULL CHECK (type IN ('earn','spend')),
  points INT NOT NULL,
  source NVARCHAR(50) NOT NULL CHECK (source IN ('login','workout','purchase','referral','community','redeem')),
  reference_id INT NULL,
  description NVARCHAR(200) NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);
CREATE INDEX IX_PointTransactions_User ON PointTransactions(user_id, created_at);

CREATE TABLE RewardsCatalog (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  description NVARCHAR(500),
  points_cost INT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  image NVARCHAR(500) NULL,
  category NVARCHAR(50) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE TABLE RewardRedemptions (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  reward_id INT NOT NULL,
  points_spent INT NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','cancelled')),
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (reward_id) REFERENCES RewardsCatalog(id)
);

-- Workouts & Training
CREATE TABLE Workouts (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX) NULL,
  coach_id INT NULL,
  plan_type NVARCHAR(50) NULL,
  difficulty NVARCHAR(20) CHECK (difficulty IN ('beginner','intermediate','advanced')),
  duration_minutes INT NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (coach_id) REFERENCES Users(id)
);

CREATE TABLE WorkoutExercises (
  id INT IDENTITY(1,1) PRIMARY KEY,
  workout_id INT NOT NULL,
  name NVARCHAR(200) NOT NULL,
  sets INT NULL,
  reps INT NULL,
  weight DECIMAL(6,2) NULL,
  duration_seconds INT NULL,
  rest_seconds INT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (workout_id) REFERENCES Workouts(id) ON DELETE CASCADE
);

CREATE TABLE WorkoutSessions (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  workout_id INT NOT NULL,
  started_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  completed_at DATETIME2 NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','cancelled')),
  notes NVARCHAR(MAX) NULL,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (workout_id) REFERENCES Workouts(id)
);

CREATE TABLE NutritionPlans (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  coach_id INT NULL,
  name NVARCHAR(200) NOT NULL,
  calories_target INT NULL,
  protein_target INT NULL,
  carbs_target INT NULL,
  fat_target INT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (coach_id) REFERENCES Users(id)
);

CREATE TABLE NutritionEntries (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NULL,
  meal_name NVARCHAR(100) NOT NULL,
  food_name NVARCHAR(200) NOT NULL,
  calories INT NOT NULL,
  protein DECIMAL(6,2) NULL,
  carbs DECIMAL(6,2) NULL,
  fat DECIMAL(6,2) NULL,
  logged_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Support Tickets
CREATE TABLE Tickets (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  subject NVARCHAR(200) NOT NULL,
  category NVARCHAR(50) NOT NULL DEFAULT 'general',
  priority NVARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status NVARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
  assigned_to INT NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (assigned_to) REFERENCES Users(id)
);
CREATE INDEX IX_Tickets_Status ON Tickets(status);
CREATE INDEX IX_Tickets_User ON Tickets(user_id);

CREATE TABLE TicketMessages (
  id INT IDENTITY(1,1) PRIMARY KEY,
  ticket_id INT NOT NULL,
  sender_id INT NOT NULL,
  message NVARCHAR(MAX) NOT NULL,
  is_internal BIT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (ticket_id) REFERENCES Tickets(id),
  FOREIGN KEY (sender_id) REFERENCES Users(id)
);

CREATE TABLE TicketAttachments (
  id INT IDENTITY(1,1) PRIMARY KEY,
  message_id INT NOT NULL,
  filename NVARCHAR(255) NOT NULL,
  file_path NVARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type NVARCHAR(100) NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (message_id) REFERENCES TicketMessages(id)
);

-- CRM
CREATE TABLE CRMCustomers (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  tags NVARCHAR(500) NULL,
  last_contact_at DATETIME2 NULL,
  assigned_coach_id INT NULL,
  lifetime_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  risk_score INT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (assigned_coach_id) REFERENCES Users(id)
);

CREATE TABLE CRMNotes (
  id INT IDENTITY(1,1) PRIMARY KEY,
  customer_id INT NOT NULL,
  author_id INT NOT NULL,
  content NVARCHAR(MAX) NOT NULL,
  type NVARCHAR(20) NOT NULL DEFAULT 'note' CHECK (type IN ('note','follow_up','coach_note')),
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (customer_id) REFERENCES CRMCustomers(id),
  FOREIGN KEY (author_id) REFERENCES Users(id)
);

CREATE TABLE CRMTasks (
  id INT IDENTITY(1,1) PRIMARY KEY,
  customer_id INT NOT NULL,
  assigned_to INT NULL,
  title NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX) NULL,
  due_date DATETIME2 NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (customer_id) REFERENCES CRMCustomers(id),
  FOREIGN KEY (assigned_to) REFERENCES Users(id)
);

-- Audit & Backup
CREATE TABLE AuditLogs (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NULL,
  action NVARCHAR(100) NOT NULL,
  entity_type NVARCHAR(50) NOT NULL,
  entity_id INT NULL,
  old_value NVARCHAR(MAX) NULL,
  new_value NVARCHAR(MAX) NULL,
  ip NVARCHAR(45) NULL,
  device NVARCHAR(500) NULL,
  timestamp DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);
CREATE INDEX IX_AuditLogs_User ON AuditLogs(user_id);
CREATE INDEX IX_AuditLogs_Action ON AuditLogs(action);
CREATE INDEX IX_AuditLogs_Timestamp ON AuditLogs(timestamp);

CREATE TABLE BackupLogs (
  id INT IDENTITY(1,1) PRIMARY KEY,
  type NVARCHAR(20) NOT NULL CHECK (type IN ('daily','weekly','monthly','manual')),
  status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  file_path NVARCHAR(500) NULL,
  file_size BIGINT NULL,
  duration_seconds INT NULL,
  verified BIT NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (created_by) REFERENCES Users(id)
);

-- Analytics
CREATE TABLE AnalyticsDaily (
  id INT IDENTITY(1,1) PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  dau INT NOT NULL DEFAULT 0,
  new_users INT NOT NULL DEFAULT 0,
  new_memberships INT NOT NULL DEFAULT 0,
  revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  workouts_completed INT NOT NULL DEFAULT 0,
  tickets_created INT NOT NULL DEFAULT 0,
  coupons_used INT NOT NULL DEFAULT 0,
  points_earned INT NOT NULL DEFAULT 0,
  points_redeemed INT NOT NULL DEFAULT 0
);

CREATE TABLE AnalyticsRetention (
  id INT IDENTITY(1,1) PRIMARY KEY,
  cohort_date DATE NOT NULL,
  day_1 INT NULL, day_7 INT NULL, day_14 INT NULL, day_30 INT NULL, day_60 INT NULL, day_90 INT NULL,
  total_users INT NOT NULL DEFAULT 0
);
GO
CREATE TABLE Brands (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  slug NVARCHAR(100) NOT NULL UNIQUE,
  logo_url NVARCHAR(500) NULL,
  description NVARCHAR(500) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_Brands_Slug ON Brands(slug);
CREATE TABLE Categories (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  slug NVARCHAR(100) NOT NULL UNIQUE,
  description NVARCHAR(500) NULL,
  image_url NVARCHAR(500) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_Categories_Slug ON Categories(slug);
CREATE TABLE Products (
  id INT IDENTITY(1,1) PRIMARY KEY,
  product_name NVARCHAR(200) NOT NULL,
  slug NVARCHAR(200) NOT NULL UNIQUE,
  description NVARCHAR(MAX) NULL,
  specifications NVARCHAR(MAX) NULL,
  features NVARCHAR(MAX) NULL,
  sku NVARCHAR(100) NOT NULL UNIQUE,
  barcode NVARCHAR(50) NULL,
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2) NULL,
  stock INT NOT NULL DEFAULT 0,
  weight DECIMAL(8,2) NULL,
  flavor NVARCHAR(100) NULL,
  color NVARCHAR(50) NULL,
  size NVARCHAR(50) NULL,
  target_users NVARCHAR(200) NULL,
  rating DECIMAL(3,1) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  main_image NVARCHAR(500) NULL,
  gallery_images NVARCHAR(MAX) NULL,
  brand_id INT NULL,
  category_id INT NULL,
  sub_category NVARCHAR(100) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  is_featured BIT NOT NULL DEFAULT 0,
  is_on_sale BIT NOT NULL DEFAULT 0,
  is_new_arrival BIT NOT NULL DEFAULT 0,
  is_best_seller BIT NOT NULL DEFAULT 0,
  tags NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (brand_id) REFERENCES Brands(id),
  FOREIGN KEY (category_id) REFERENCES Categories(id)
);
CREATE INDEX IX_Products_Slug ON Products(slug);
CREATE INDEX IX_Products_Brand ON Products(brand_id);
CREATE INDEX IX_Products_Category ON Products(category_id);

ALTER TABLE Products ADD is_new BIT NOT NULL DEFAULT 0, is_bestseller BIT NOT NULL DEFAULT 0;
GO
CREATE TABLE Exercises (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  slug NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX) NULL,
  instructions NVARCHAR(MAX) NULL,
  muscle_group NVARCHAR(100) NULL,
  equipment NVARCHAR(100) NULL,
  difficulty NVARCHAR(20) NULL,
  video_url NVARCHAR(500) NULL,
  thumbnail_url NVARCHAR(500) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
CREATE TABLE ProductImages (
  id INT IDENTITY(1,1) PRIMARY KEY,
  product_id INT NOT NULL,
  image_url NVARCHAR(500) NOT NULL,
  alt_text NVARCHAR(200) NULL,
  sort_order INT NULL DEFAULT 0,
  is_primary BIT NULL DEFAULT 0,
  created_at DATETIME2 NULL DEFAULT GETDATE(),
  FOREIGN KEY (product_id) REFERENCES Products(id)
);
CREATE TABLE ProductVariants (
  id INT IDENTITY(1,1) PRIMARY KEY,
  product_id INT NOT NULL,
  variant_name NVARCHAR(100) NOT NULL,
  sku NVARCHAR(50) NULL,
  price DECIMAL(10,2) NULL,
  stock INT NULL DEFAULT 0,
  is_active BIT NULL DEFAULT 1,
  created_at DATETIME2 NULL DEFAULT GETDATE(),
  FOREIGN KEY (product_id) REFERENCES Products(id)
);
CREATE TABLE ProductTags (
  id INT IDENTITY(1,1) PRIMARY KEY,
  product_id INT NOT NULL,
  tag NVARCHAR(50) NOT NULL,
  FOREIGN KEY (product_id) REFERENCES Products(id)
);
CREATE TABLE Inventory (
  id INT IDENTITY(1,1) PRIMARY KEY,
  product_id INT NOT NULL,
  variant_id INT NULL,
  quantity INT NULL DEFAULT 0,
  reserved INT NULL DEFAULT 0,
  warehouse NVARCHAR(100) NULL,
  last_restocked DATETIME2 NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NULL DEFAULT GETDATE(),
  FOREIGN KEY (product_id) REFERENCES Products(id),
  FOREIGN KEY (variant_id) REFERENCES ProductVariants(id)
);
CREATE TABLE Bookings (
  id INT IDENTITY(1,1) PRIMARY KEY,
  coach_id INT NOT NULL,
  member_id INT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  notes NVARCHAR(500) NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (coach_id) REFERENCES Users(id),
  FOREIGN KEY (member_id) REFERENCES Users(id)
);
CREATE INDEX IX_Bookings_Coach ON Bookings(coach_id, booking_date);
CREATE INDEX IX_Bookings_Member ON Bookings(member_id, booking_date);
PRINT '=== ALL TABLES CREATED ===';
GO
-- ============================================
-- STORED PROCEDURES
-- ============================================

CREATE OR ALTER PROCEDURE sp_GetDAU
  @StartDate DATE = NULL, @EndDate DATE = NULL
AS BEGIN
  SET NOCOUNT ON;
  SELECT @StartDate = ISNULL(@StartDate, DATEADD(day, -30, GETDATE()));
  SELECT @EndDate = ISNULL(@EndDate, GETDATE());
  SELECT date, dau, new_users, revenue FROM AnalyticsDaily
  WHERE date BETWEEN @StartDate AND @EndDate ORDER BY date;
END;
GO
CREATE OR ALTER PROCEDURE sp_GetRevenueByPeriod
  @StartDate DATE, @EndDate DATE, @GroupBy NVARCHAR(10) = 'daily'
AS BEGIN
  SET NOCOUNT ON;
  SELECT date, SUM(revenue) as revenue, SUM(new_memberships) as memberships
  FROM AnalyticsDaily WHERE date BETWEEN @StartDate AND @EndDate
  GROUP BY date ORDER BY date;
END;
GO
CREATE OR ALTER PROCEDURE sp_GetRetentionCohort
  @CohortDate DATE
AS BEGIN
  SET NOCOUNT ON;
  SELECT * FROM AnalyticsRetention WHERE cohort_date = @CohortDate;
END;
GO
CREATE OR ALTER PROCEDURE sp_CalculateChurnRate
  @Month INT = NULL, @Year INT = NULL
AS BEGIN
  SET NOCOUNT ON;
  SET @Month = ISNULL(@Month, MONTH(GETDATE()));
  SET @Year = ISNULL(@Year, YEAR(GETDATE()));
  DECLARE @TotalStart INT, @Cancelled INT;
  SELECT @TotalStart = COUNT(*) FROM Memberships WHERE MONTH(start_date) < @Month OR YEAR(start_date) < @Year;
  SELECT @Cancelled = COUNT(*) FROM Memberships WHERE status='cancelled' AND MONTH(end_date)=@Month AND YEAR(end_date)=@Year AND status='cancelled';
  SELECT CAST(@Cancelled AS FLOAT) / NULLIF(@TotalStart, 0) * 100 AS churn_rate;
END;
GO
CREATE OR ALTER PROCEDURE sp_AddPoints
  @UserID INT, @Points INT, @Source NVARCHAR(50), @RefID INT = NULL, @Description NVARCHAR(200) = NULL
AS BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS (SELECT 1 FROM Points WHERE user_id = @UserID)
    INSERT INTO Points (user_id, balance, lifetime_earned, lifetime_spent) VALUES (@UserID, @Points, @Points, 0);
  ELSE
    UPDATE Points SET balance = balance + @Points, lifetime_earned = lifetime_earned + @Points, updated_at = GETDATE()
    WHERE user_id = @UserID;
  INSERT INTO PointTransactions (user_id, type, points, source, reference_id, description)
  VALUES (@UserID, 'earn', @Points, @Source, @RefID, @Description);
END;
GO
CREATE OR ALTER PROCEDURE sp_SpendPoints
  @UserID INT, @Points INT, @Source NVARCHAR(50), @RefID INT = NULL, @Description NVARCHAR(200) = NULL
AS BEGIN
  SET NOCOUNT ON;
  DECLARE @Balance INT = (SELECT balance FROM Points WHERE user_id = @UserID);
  IF @Balance < @Points THROW 50001, 'Insufficient points', 1;
  UPDATE Points SET balance = balance - @Points, lifetime_spent = lifetime_spent + @Points, updated_at = GETDATE()
  WHERE user_id = @UserID;
  INSERT INTO PointTransactions (user_id, type, points, source, reference_id, description)
  VALUES (@UserID, 'spend', @Points, @Source, @RefID, @Description);
END;
GO
CREATE OR ALTER PROCEDURE sp_ProcessReferralCommission
  @ReferrerID INT, @ReferredID INT, @PaymentAmount DECIMAL(10,2)
AS BEGIN
  SET NOCOUNT ON;
  DECLARE @CommissionRate DECIMAL(5,2);
  SELECT @CommissionRate = commission_rate FROM Affiliates WHERE user_id = @ReferrerID;
  SET @CommissionRate = ISNULL(@CommissionRate, 10.0);
  DECLARE @Commission DECIMAL(10,2) = @PaymentAmount * @CommissionRate / 100;
  INSERT INTO ReferralTransactions (referrer_id, referred_id, commission_amount, transaction_type, status)
  VALUES (@ReferrerID, @ReferredID, @Commission, 'purchase', 'confirmed');
  UPDATE Affiliates SET total_earned = total_earned + @Commission WHERE user_id = @ReferrerID;
  DECLARE @Points INT = CAST(@Commission AS INT) * 10;
  EXEC sp_AddPoints @UserID = @ReferrerID, @Points = @Points, @Source = 'referral';
END;
GO
CREATE OR ALTER PROCEDURE sp_GenerateInvoice
  @UserID INT, @PaymentID INT, @Amount DECIMAL(10,2), @Tax DECIMAL(10,2), @Discount DECIMAL(10,2)
AS BEGIN
  SET NOCOUNT ON;
  DECLARE @Total DECIMAL(10,2) = @Amount + @Tax - @Discount;
  DECLARE @InvoiceNum NVARCHAR(50) = 'GYM-' + FORMAT(GETDATE(),'yyyyMMdd') + '-' + RIGHT('00000' + CAST((SELECT ISNULL(MAX(id),0)+1 FROM Invoices) AS NVARCHAR), 5);
  INSERT INTO Invoices (invoice_number, user_id, payment_id, amount, tax, discount, total)
  VALUES (@InvoiceNum, @UserID, @PaymentID, @Amount, @Tax, @Discount, @Total);
  SELECT @InvoiceNum AS invoice_number, @Total AS total;
END;
GO
PRINT '=== ALL PROCEDURES CREATED ===';
GO
-- ============================================
-- SEED DATA
-- ============================================

-- 1. Users
-- admin: id=1, coaches: id=2-3, members: id=4-15
INSERT INTO Users (email, password, name, role, referral_code, phone, is_active, email_verified) VALUES
('admin@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Admin', 'admin', 'ADMIN001', '0901000001', 1, 1),
('coach1@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Coach Minh', 'coach', NULL, '0901000002', 1, 1),
('coach2@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Coach Lan', 'coach', NULL, '0901000003', 1, 1),
('member1@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Nguyen Van An', 'member', 'GETFIT01', '0901000004', 1, 1),
('member2@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Tran Thi Binh', 'member', 'FITFAM02', '0901000005', 1, 1),
('member3@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Le Van Cuong', 'member', 'GYMPAL03', '0901000006', 1, 1),
('member4@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Pham Thi Dung', 'member', 'STRONG04', '0901000007', 1, 1),
('member5@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Hoang Van Em', 'member', 'POWER05', '0901000008', 1, 1),
('member6@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Vo Thi Phuong', 'member', NULL, '0901000009', 1, 0),
('member7@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Dang Van Giang', 'member', NULL, '0901000010', 1, 1),
('member8@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Bui Thi Hanh', 'member', NULL, '0901000011', 1, 0),
('member9@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Ngo Van Ich', 'member', NULL, '0901000012', 0, 0),
('member10@gymer.com', '$2a$12$peO0xH0BGS8z7kkXfpD3pOFbBcd6OpMdmyaUnMsERZmu3OshkZl0.', 'Ly Thi Kim', 'member', NULL, '0901000013', 1, 0);
PRINT 'Users: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 2. Plans
INSERT INTO Plans (name, description, price, duration_days, type, features, sort_order) VALUES
('Basic', 'Access to gym equipment', 29.99, 30, 'monthly', '["Gym Access","Locker Room"]', 1),
('Premium', 'Full gym + classes', 59.99, 30, 'monthly', '["Gym Access","Classes","Sauna","Locker Room"]', 2),
('VIP', 'Premium + personal trainer', 99.99, 30, 'monthly', '["Gym Access","Classes","Sauna","Personal Trainer","Nutrition Plan"]', 3),
('Annual Basic', '12 months Basic', 299.99, 365, 'yearly', '["Gym Access","Locker Room"]', 4),
('Annual Premium', '12 months Premium', 599.99, 365, 'yearly', '["Gym Access","Classes","Sauna","Locker Room"]', 5);
PRINT 'Plans: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 3. Memberships (user_id, plan_id, start, end, status, auto_renew)
INSERT INTO Memberships (user_id, plan_id, start_date, end_date, status, auto_renew, created_at) VALUES
(4, 1, DATEADD(month,-2,GETDATE()), DATEADD(month,4,DATEADD(month,-2,GETDATE())), 'active', 1, DATEADD(month,-2,GETDATE())),
(5, 2, DATEADD(month,-3,GETDATE()), DATEADD(month,3,DATEADD(month,-3,GETDATE())), 'active', 1, DATEADD(month,-3,GETDATE())),
(6, 3, DATEADD(month,-1,GETDATE()), DATEADD(month,6,DATEADD(month,-1,GETDATE())), 'active', 1, DATEADD(month,-1,GETDATE())),
(7, 2, DATEADD(month,-5,GETDATE()), DATEADD(month,3,DATEADD(month,-5,GETDATE())), 'active', 0, DATEADD(month,-5,GETDATE())),
(8, 4, DATEADD(month,-2,GETDATE()), DATEADD(month,12,DATEADD(month,-2,GETDATE())), 'active', 1, DATEADD(month,-2,GETDATE())),
(9, 1, DATEADD(month,-1,GETDATE()), DATEADD(month,1,DATEADD(month,-1,GETDATE())), 'active', 1, DATEADD(month,-1,GETDATE())),
(10, 3, GETDATE(), DATEADD(month,6,GETDATE()), 'active', 1, GETDATE()),
(11, 5, DATEADD(month,-8,GETDATE()), DATEADD(month,12,DATEADD(month,-8,GETDATE())), 'active', 1, DATEADD(month,-8,GETDATE())),
(12, 2, DATEADD(month,-6,GETDATE()), GETDATE(), 'expired', 0, DATEADD(month,-6,GETDATE())),
(13, 1, DATEADD(month,-9,GETDATE()), GETDATE(), 'expired', 0, DATEADD(month,-9,GETDATE()));
PRINT 'Memberships: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 4. Payments
INSERT INTO Payments (user_id, plan_id, amount, method, status, transaction_id, created_at) VALUES
(4, 1, 29.99, 'credit_card', 'completed', 'TXN' + CONVERT(VARCHAR, DATEADD(month,-2,GETDATE()), 112) + '-4', DATEADD(month,-2,GETDATE())),
(4, 1, 29.99, 'credit_card', 'completed', 'TXN' + CONVERT(VARCHAR, DATEADD(month,-1,GETDATE()), 112) + '-4', DATEADD(month,-1,GETDATE())),
(5, 2, 59.99, 'bank_transfer', 'completed', 'TXN' + CONVERT(VARCHAR, DATEADD(month,-3,GETDATE()), 112) + '-5', DATEADD(month,-3,GETDATE())),
(6, 3, 99.99, 'credit_card', 'completed', 'TXN' + CONVERT(VARCHAR, DATEADD(month,-1,GETDATE()), 112) + '-6', DATEADD(month,-1,GETDATE())),
(7, 2, 59.99, 'momo', 'completed', 'TXN' + CONVERT(VARCHAR, DATEADD(month,-5,GETDATE()), 112) + '-7', DATEADD(month,-5,GETDATE())),
(8, 4, 299.99, 'credit_card', 'completed', 'TXN' + CONVERT(VARCHAR, DATEADD(month,-2,GETDATE()), 112) + '-8', DATEADD(month,-2,GETDATE())),
(9, 1, 29.99, 'bank_transfer', 'completed', 'TXN' + CONVERT(VARCHAR, DATEADD(month,-1,GETDATE()), 112) + '-9', DATEADD(month,-1,GETDATE())),
(10, 3, 99.99, 'credit_card', 'completed', 'TXN' + CONVERT(VARCHAR, GETDATE(), 112) + '-10', GETDATE()),
(11, 5, 599.99, 'credit_card', 'completed', 'TXN' + CONVERT(VARCHAR, DATEADD(month,-8,GETDATE()), 112) + '-11', DATEADD(month,-8,GETDATE())),
(12, 2, 59.99, 'momo', 'completed', 'TXN' + CONVERT(VARCHAR, DATEADD(month,-6,GETDATE()), 112) + '-12', DATEADD(month,-6,GETDATE())),
(13, 1, 29.99, 'bank_transfer', 'failed', 'TXN' + CONVERT(VARCHAR, DATEADD(month,-9,GETDATE()), 112) + '-13', DATEADD(month,-9,GETDATE()));
PRINT 'Payments: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 5. Invoices
INSERT INTO Invoices (invoice_number, user_id, payment_id, amount, tax, discount, total, created_at)
SELECT
  'GYM-' + CONVERT(VARCHAR, p.created_at, 112) + '-' + RIGHT('00000' + CAST(ROW_NUMBER() OVER(ORDER BY p.id) AS VARCHAR), 5),
  p.user_id, p.id, p.amount, p.amount * 0.08,
  CASE WHEN p.user_id % 2 = 0 THEN p.amount * 0.05 ELSE 0 END,
  p.amount + p.amount * 0.08 - CASE WHEN p.user_id % 2 = 0 THEN p.amount * 0.05 ELSE 0 END,
  p.created_at
FROM Payments p WHERE p.status = 'completed';
PRINT 'Invoices: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 6. ReferralCodes
INSERT INTO ReferralCodes (user_id, code, status, created_at) VALUES
(4, 'GETFIT01', 'active', DATEADD(month,-6,GETDATE())),
(5, 'FITFAM02', 'active', DATEADD(month,-5,GETDATE())),
(6, 'GYMPAL03', 'active', DATEADD(month,-4,GETDATE())),
(7, 'STRONG04', 'active', DATEADD(month,-8,GETDATE())),
(8, 'POWER05', 'active', DATEADD(month,-3,GETDATE()));
PRINT 'ReferralCodes: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 7. ReferralTransactions
INSERT INTO ReferralTransactions (referrer_id, referred_id, commission_amount, transaction_type, status, created_at) VALUES
(4, 7, 29.99, 'purchase', 'confirmed', DATEADD(month,-5,GETDATE())),
(5, 8, 59.99, 'purchase', 'confirmed', DATEADD(month,-4,GETDATE())),
(4, 9, 29.99, 'purchase', 'confirmed', DATEADD(month,-3,GETDATE())),
(6, 10, 99.99, 'purchase', 'confirmed', DATEADD(month,-2,GETDATE())),
(5, 12, 59.99, 'purchase', 'confirmed', DATEADD(month,-1,GETDATE())),
(7, 13, 29.99, 'purchase', 'pending', DATEADD(day,-10,GETDATE()));
PRINT 'ReferralTransactions: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 8. Affiliates
INSERT INTO Affiliates (user_id, tier, commission_rate, total_earned, total_paid, status, approved_at, created_at) VALUES
(4, 'gold', 15.00, 150.00, 100.00, 'approved', DATEADD(month,-5,GETDATE()), DATEADD(month,-6,GETDATE())),
(5, 'silver', 12.00, 80.00, 40.00, 'approved', DATEADD(month,-4,GETDATE()), DATEADD(month,-5,GETDATE())),
(6, 'bronze', 10.00, 30.00, 0.00, 'approved', DATEADD(month,-3,GETDATE()), DATEADD(month,-4,GETDATE())),
(7, 'bronze', 10.00, 15.00, 0.00, 'pending', NULL, DATEADD(month,-2,GETDATE()));
PRINT 'Affiliates: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 9. AffiliatePayouts
INSERT INTO AffiliatePayouts (affiliate_id, amount, method, status, processed_at, created_at)
SELECT a.id, p.amt, p.method, p.sts, p.prcd, p.crt
FROM (VALUES
  (4, 50.00, 'bank_transfer', 'completed', DATEADD(month,-3,GETDATE()), DATEADD(month,-3,GETDATE())),
  (4, 50.00, 'bank_transfer', 'completed', DATEADD(month,-1,GETDATE()), DATEADD(month,-1,GETDATE())),
  (5, 40.00, 'momo', 'completed', DATEADD(month,-1,GETDATE()), DATEADD(month,-1,GETDATE())),
  (4, 100.00, 'bank_transfer', 'processing', NULL, DATEADD(day,-5,GETDATE()))
) p(uid, amt, method, sts, prcd, crt)
JOIN Affiliates a ON a.user_id = p.uid;
PRINT 'AffiliatePayouts: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 10. Coupons
INSERT INTO Coupons (code, type, value, min_purchase, start_date, end_date, usage_limit, user_limit, applicable_plans, is_active, created_at) VALUES
('WELCOME10', 'first_purchase', 10.00, 0, DATEADD(month,-6,GETDATE()), DATEADD(month,6,GETDATE()), 100, 1, '[1,2]', 1, GETDATE()),
('SUMMER20', 'percentage', 20.00, 50, DATEADD(month,-2,GETDATE()), DATEADD(month,1,GETDATE()), 50, 1, '[2,3]', 1, DATEADD(month,-2,GETDATE())),
('FREEMONTH', 'free_trial', 29.99, 0, DATEADD(month,-1,GETDATE()), DATEADD(month,2,GETDATE()), 20, 1, '[1]', 1, DATEADD(month,-1,GETDATE())),
('VIP50', 'flash_sale', 50.00, 100, DATEADD(day,-5,GETDATE()), DATEADD(day,5,GETDATE()), 10, 1, '[3]', 1, DATEADD(day,-5,GETDATE())),
('LOYALTY15', 'referral', 15.00, 0, DATEADD(month,-3,GETDATE()), DATEADD(month,3,GETDATE()), 200, 1, '[1,2,3]', 1, DATEADD(month,-3,GETDATE())),
('FLASH10', 'flash_sale', 10.00, 30, DATEADD(day,-10,GETDATE()), DATEADD(day,2,GETDATE()), 30, 1, '[1,2]', 1, DATEADD(day,-10,GETDATE()));
PRINT 'Coupons: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 11. CouponUsages
INSERT INTO CouponUsages (coupon_id, user_id, discount_amount, used_at)
SELECT c.id, p.user_id,
  CASE WHEN c.type = 'percentage' THEN p.amount * c.value / 100 ELSE c.value END,
  p.created_at
FROM (VALUES (1,4),(2,5),(3,6),(4,8),(5,9)) cu(cidx, uid)
JOIN Coupons c ON c.id = cu.cidx
JOIN Users u ON u.id = cu.uid
JOIN Payments p ON p.user_id = u.id AND p.status = 'completed';
PRINT 'CouponUsages: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 12. Points
INSERT INTO Points (user_id, balance, lifetime_earned, lifetime_spent, created_at) VALUES
(4, 500, 1500, 1000, DATEADD(month,-6,GETDATE())),
(5, 300, 800, 500, DATEADD(month,-5,GETDATE())),
(6, 200, 600, 400, DATEADD(month,-4,GETDATE())),
(7, 100, 300, 200, DATEADD(month,-3,GETDATE())),
(8, 150, 400, 250, DATEADD(month,-2,GETDATE())),
(9, 50, 150, 100, DATEADD(month,-1,GETDATE())),
(10, 80, 80, 0, GETDATE());
PRINT 'Points: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 13. PointTransactions
INSERT INTO PointTransactions (user_id, type, points, source, description, created_at) VALUES
(4, 'earn', 100, 'login', 'Daily login bonus', DATEADD(day,-30,GETDATE())),
(4, 'earn', 200, 'workout', 'Completed 10 workouts', DATEADD(day,-25,GETDATE())),
(4, 'earn', 150, 'purchase', 'Premium membership purchase', DATEADD(day,-20,GETDATE())),
(4, 'spend', 100, 'redeem', 'Redeemed for PT session', DATEADD(day,-15,GETDATE())),
(5, 'earn', 80, 'login', 'Daily login bonus', DATEADD(day,-28,GETDATE())),
(5, 'earn', 120, 'workout', 'Completed 5 workouts', DATEADD(day,-20,GETDATE())),
(5, 'spend', 50, 'redeem', 'Redeemed water bottle', DATEADD(day,-12,GETDATE())),
(6, 'earn', 60, 'login', 'Daily login bonus', DATEADD(day,-20,GETDATE())),
(6, 'earn', 100, 'referral', 'Referred member10', DATEADD(day,-15,GETDATE())),
(7, 'earn', 40, 'login', 'Daily login bonus', DATEADD(day,-10,GETDATE())),
(8, 'earn', 50, 'purchase', 'Membership purchase bonus', DATEADD(day,-5,GETDATE())),
(9, 'earn', 30, 'login', 'Daily login bonus', GETDATE());
PRINT 'PointTransactions: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 14. RewardsCatalog
INSERT INTO RewardsCatalog (name, description, points_cost, stock, category, is_active) VALUES
('Free PT Session', '1-hour personal training session', 500, 20, 'training', 1),
('Gymer Water Bottle', 'Premium stainless steel bottle', 200, 50, 'merchandise', 1),
('Guest Pass', 'Bring a friend for free (1 day)', 150, 100, 'access', 1),
('Nutrition Consultation', '30-min nutrition consultation', 350, 15, 'training', 1),
('Gymer T-Shirt', 'Exclusive Gymer t-shirt', 250, 30, 'merchandise', 1),
('Sauna Upgrade', '1 month sauna access upgrade', 400, 25, 'upgrade', 1);
PRINT 'RewardsCatalog: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 15. RewardRedemptions
INSERT INTO RewardRedemptions (user_id, reward_id, points_spent, status, created_at) VALUES
(4, 1, 500, 'fulfilled', DATEADD(day,-15,GETDATE())),
(4, 2, 200, 'fulfilled', DATEADD(day,-20,GETDATE())),
(5, 2, 200, 'fulfilled', DATEADD(day,-12,GETDATE())),
(6, 3, 150, 'pending', DATEADD(day,-2,GETDATE())),
(8, 4, 350, 'pending', GETDATE());
PRINT 'RewardRedemptions: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 16. Workouts
INSERT INTO Workouts (name, description, coach_id, plan_type, difficulty, duration_minutes, is_active, created_at) VALUES
('Full Body Blast', 'Complete full body workout', 2, 'strength', 'intermediate', 45, 1, DATEADD(month,-3,GETDATE())),
('HIIT Cardio', 'High intensity interval training', 2, 'cardio', 'advanced', 30, 1, DATEADD(month,-3,GETDATE())),
('Yoga Flow', 'Beginner yoga session', 3, 'flexibility', 'beginner', 60, 1, DATEADD(month,-2,GETDATE())),
('Upper Body', 'Upper body strength', 2, 'strength', 'intermediate', 40, 1, DATEADD(month,-2,GETDATE())),
('Core Crusher', 'Ab-focused workout', 3, 'strength', 'intermediate', 25, 1, DATEADD(month,-1,GETDATE()));
PRINT 'Workouts: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 17. WorkoutExercises
INSERT INTO WorkoutExercises (workout_id, name, sets, reps, weight, duration_seconds, rest_seconds, sort_order) VALUES
(1, 'Bench Press', 4, 10, 60.0, NULL, 60, 1),
(1, 'Squats', 4, 12, 80.0, NULL, 60, 2),
(1, 'Deadlifts', 3, 8, 100.0, NULL, 90, 3),
(1, 'Pull-ups', 3, 8, NULL, NULL, 60, 4),
(2, 'Burpees', 3, 15, NULL, 60, 30, 1),
(2, 'Mountain Climbers', 3, 20, NULL, 45, 20, 2),
(2, 'Jump Squats', 3, 12, NULL, 45, 30, 3),
(3, 'Downward Dog', NULL, NULL, NULL, 90, 15, 1),
(3, 'Warrior Pose', NULL, NULL, NULL, 120, 20, 2),
(4, 'Shoulder Press', 4, 10, 40.0, NULL, 60, 1),
(4, 'Bicep Curls', 3, 12, 20.0, NULL, 45, 2),
(5, 'Planks', 3, 1, NULL, 60, 30, 1),
(5, 'Russian Twists', 3, 20, 10.0, NULL, 30, 2);
PRINT 'WorkoutExercises: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 18. WorkoutSessions
INSERT INTO WorkoutSessions (user_id, workout_id, started_at, completed_at, status) VALUES
(4, 1, DATEADD(day,-3,GETDATE()), DATEADD(minute,45,DATEADD(day,-3,GETDATE())), 'completed'),
(4, 2, DATEADD(day,-5,GETDATE()), DATEADD(minute,30,DATEADD(day,-5,GETDATE())), 'completed'),
(4, 4, DATEADD(day,-7,GETDATE()), DATEADD(minute,40,DATEADD(day,-7,GETDATE())), 'completed'),
(5, 1, DATEADD(day,-2,GETDATE()), DATEADD(minute,45,DATEADD(day,-2,GETDATE())), 'completed'),
(5, 3, DATEADD(day,-4,GETDATE()), DATEADD(minute,60,DATEADD(day,-4,GETDATE())), 'completed'),
(6, 2, DATEADD(day,-1,GETDATE()), DATEADD(minute,30,DATEADD(day,-1,GETDATE())), 'completed'),
(7, 1, DATEADD(day,-6,GETDATE()), DATEADD(minute,45,DATEADD(day,-6,GETDATE())), 'completed'),
(8, 2, DATEADD(day,-3,GETDATE()), DATEADD(minute,30,DATEADD(day,-3,GETDATE())), 'completed'),
(9, 1, DATEADD(day,-4,GETDATE()), DATEADD(minute,45,DATEADD(day,-4,GETDATE())), 'completed'),
(10, 3, DATEADD(day,-8,GETDATE()), DATEADD(minute,60,DATEADD(day,-8,GETDATE())), 'completed');
PRINT 'WorkoutSessions: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 19. NutritionPlans
INSERT INTO NutritionPlans (user_id, coach_id, name, calories_target, protein_target, carbs_target, fat_target, start_date, end_date, is_active, created_at) VALUES
(4, 2, 'Muscle Building', 2800, 180, 300, 70, DATEADD(month,-1,GETDATE()), DATEADD(month,2,GETDATE()), 1, DATEADD(month,-1,GETDATE())),
(5, 2, 'Weight Loss', 1800, 120, 150, 50, DATEADD(month,-1,GETDATE()), DATEADD(month,2,GETDATE()), 1, DATEADD(month,-1,GETDATE())),
(6, 3, 'General Fitness', 2200, 140, 220, 60, DATEADD(day,-15,GETDATE()), DATEADD(month,1,GETDATE()), 1, DATEADD(day,-15,GETDATE())),
(7, NULL, 'Maintenance', 2000, 130, 200, 55, DATEADD(month,-2,GETDATE()), DATEADD(day,-1,GETDATE()), 0, DATEADD(month,-2,GETDATE()));
PRINT 'NutritionPlans: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 20. NutritionEntries
INSERT INTO NutritionEntries (user_id, plan_id, meal_name, food_name, calories, protein, carbs, fat, logged_at) VALUES
(4, 1, 'Breakfast', 'Oatmeal with eggs', 450, 30, 50, 12, DATEADD(day,-1,GETDATE())),
(4, 1, 'Lunch', 'Chicken breast with rice', 650, 50, 60, 15, DATEADD(day,-1,GETDATE())),
(4, 1, 'Dinner', 'Salmon with vegetables', 500, 40, 20, 18, DATEADD(day,-1,GETDATE())),
(5, 2, 'Breakfast', 'Smoothie bowl', 350, 20, 45, 10, DATEADD(day,-1,GETDATE())),
(5, 2, 'Lunch', 'Grilled fish with salad', 400, 35, 15, 14, DATEADD(day,-1,GETDATE())),
(6, 3, 'Breakfast', 'Eggs and toast', 380, 25, 30, 16, DATEADD(day,-1,GETDATE())),
(6, 3, 'Lunch', 'Beef stir fry', 550, 40, 35, 22, DATEADD(day,-1,GETDATE()));
PRINT 'NutritionEntries: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 21. Notifications
INSERT INTO Notifications (user_id, title, message, type, is_read, created_at) VALUES
(4, 'Welcome Back!', 'Your membership is active. Time to hit the gym!', 'system', 1, DATEADD(day,-5,GETDATE())),
(4, 'Workout Reminder', 'You have a scheduled session today at 5PM.', 'reminder', 0, DATEADD(hour,-3,GETDATE())),
(5, 'Payment Successful', 'Your Premium plan payment was processed.', 'payment', 1, DATEADD(day,-10,GETDATE())),
(5, 'Points Earned', 'You earned 80 points from today''s workout!', 'points', 1, DATEADD(day,-2,GETDATE())),
(6, 'New Class Available', 'HIIT Cardio class added at 6AM tomorrow.', 'promo', 0, DATEADD(day,-1,GETDATE())),
(7, 'Referral Bonus', 'Your friend joined! You earned 100 referral points.', 'reward', 0, DATEADD(day,-3,GETDATE())),
(8, 'Membership Expiring', 'Your plan expires in 7 days. Renew now!', 'alert', 0, DATEADD(day,-1,GETDATE())),
(9, 'Welcome!', 'Thank you for joining Gymer!', 'system', 1, DATEADD(day,-30,GETDATE()));
PRINT 'Notifications: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 22. Tickets
INSERT INTO Tickets (user_id, subject, category, priority, status, assigned_to, created_at) VALUES
(4, 'Equipment maintenance request', 'maintenance', 'medium', 'open', 2, DATEADD(day,-2,GETDATE())),
(5, 'Billing inquiry', 'billing', 'low', 'resolved', NULL, DATEADD(day,-5,GETDATE())),
(6, 'Personal training session', 'training', 'high', 'open', 3, DATEADD(day,-1,GETDATE())),
(7, 'Locker issue', 'facility', 'low', 'pending', NULL, DATEADD(day,-3,GETDATE())),
(8, 'Membership cancellation', 'billing', 'urgent', 'open', NULL, DATEADD(day,-1,GETDATE())),
(4, 'Class schedule question', 'general', 'low', 'closed', NULL, DATEADD(day,-10,GETDATE()));
PRINT 'Tickets: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 23. TicketMessages
INSERT INTO TicketMessages (ticket_id, sender_id, message, is_internal, created_at) VALUES
(1, 4, 'The treadmill #3 is making a strange noise when running above 10km/h.', 0, DATEADD(day,-2,GETDATE())),
(1, 2, 'I will check it tomorrow morning. Thanks for reporting.', 1, DATEADD(day,-2,GETDATE())),
(2, 5, 'I was charged twice for this month. Please check.', 0, DATEADD(day,-5,GETDATE())),
(2, 5, 'Refund processed. Please allow 3-5 business days.', 0, DATEADD(day,-4,GETDATE())),
(3, 6, 'I want to schedule extra PT sessions for next week.', 0, DATEADD(day,-1,GETDATE())),
(5, 8, 'Please cancel my membership effective immediately.', 0, DATEADD(day,-1,GETDATE())),
(6, 4, 'What time is the Saturday yoga class?', 0, DATEADD(day,-10,GETDATE())),
(6, 4, 'Yoga is at 8AM every Saturday in Studio B.', 0, DATEADD(day,-10,GETDATE()));
PRINT 'TicketMessages: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 24. CRMCustomers
INSERT INTO CRMCustomers (user_id, tags, last_contact_at, assigned_coach_id, lifetime_value, risk_score, created_at) VALUES
(4, '[vip,regular,referral-source]', DATEADD(day,-1,GETDATE()), 2, 500.00, 10, DATEADD(month,-6,GETDATE())),
(5, '[regular,new]', DATEADD(day,-3,GETDATE()), 2, 300.00, 20, DATEADD(month,-5,GETDATE())),
(6, '[vip,high-risk]', DATEADD(day,-2,GETDATE()), 3, 250.00, 70, DATEADD(month,-4,GETDATE())),
(7, '[referral]', DATEADD(day,-5,GETDATE()), NULL, 100.00, 40, DATEADD(month,-3,GETDATE())),
(8, '[regular]', GETDATE(), NULL, 200.00, 15, DATEADD(month,-2,GETDATE())),
(9, '[new]', DATEADD(day,-1,GETDATE()), NULL, 50.00, 5, DATEADD(month,-1,GETDATE())),
(10, '[at-risk,inactive]', DATEADD(day,-7,GETDATE()), 3, 80.00, 85, DATEADD(day,-30,GETDATE())),
(11, '[loyal]', DATEADD(day,-10,GETDATE()), 2, 150.00, 10, DATEADD(month,-9,GETDATE())),
(12, '[regular]', DATEADD(day,-4,GETDATE()), NULL, 120.00, 30, DATEADD(month,-7,GETDATE())),
(13, '[at-risk]', DATEADD(day,-15,GETDATE()), NULL, 30.00, 90, DATEADD(month,-10,GETDATE()));
PRINT 'CRMCustomers: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 25. CRMNotes
INSERT INTO CRMNotes (customer_id, author_id, content, type, created_at) VALUES
(1, 1, 'Member requested early morning hours. Follow up with manager.', 'follow_up', DATEADD(day,-5,GETDATE())),
(1, 2, 'Completed PT assessment. Recommended advanced program.', 'coach_note', DATEADD(day,-2,GETDATE())),
(3, 1, 'Multiple complaints about equipment. Needs attention.', 'note', DATEADD(day,-3,GETDATE())),
(3, 3, 'Showing improvement in form. Keep encouraging.', 'coach_note', DATEADD(day,-1,GETDATE())),
(7, 1, 'Has not visited in 2 weeks. Send re-engagement offer.', 'follow_up', DATEADD(day,-5,GETDATE()));
PRINT 'CRMNotes: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 26. CRMTasks
INSERT INTO CRMTasks (customer_id, assigned_to, title, description, due_date, status, created_at) VALUES
(1, 2, 'Follow up assessment', 'Schedule next PT assessment', DATEADD(day,3,GETDATE()), 'pending', DATEADD(day,-2,GETDATE())),
(3, 3, 'Retention call', 'Call to discuss concerns about facilities', DATEADD(day,1,GETDATE()), 'pending', DATEADD(day,-3,GETDATE())),
(7, 3, 'Send re-engagement email', 'Send personalized offer to inactive member', DATEADD(day,-1,GETDATE()), 'completed', DATEADD(day,-3,GETDATE())),
(10, 2, 'Risk intervention', 'Immediate outreach needed - high risk score', GETDATE(), 'in_progress', DATEADD(day,-1,GETDATE()));
PRINT 'CRMTasks: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 27. AuditLogs
INSERT INTO AuditLogs (user_id, action, entity_type, entity_id, old_value, new_value, ip, timestamp) VALUES
(1, 'user.login', 'User', 1, NULL, '{"ip":"192.168.1.10"}', '192.168.1.10', DATEADD(day,-1,GETDATE())),
(1, 'membership.create', 'Membership', 1, NULL, '{"plan":"Premium","price":59.99}', '192.168.1.10', DATEADD(month,-3,GETDATE())),
(5, 'user.register', 'User', 2, NULL, '{"email":"member2@gymer.com"}', '10.0.0.5', DATEADD(month,-5,GETDATE())),
(1, 'coupon.create', 'Coupon', 1, NULL, '{"code":"WELCOME10","value":10}', '192.168.1.10', DATEADD(month,-6,GETDATE())),
(1, 'payment.process', 'Payment', 1, NULL, '{"amount":59.99,"method":"credit_card"}', '192.168.1.10', DATEADD(month,-3,GETDATE())),
(6, 'ticket.create', 'Ticket', 1, NULL, '{"subject":"Equipment maintenance"}', '10.0.0.15', DATEADD(day,-2,GETDATE())),
(1, 'user.update', 'User', 8, '{"is_active":false}', '{"is_active":true}', '192.168.1.10', DATEADD(month,-1,GETDATE())),
(10, 'workout.complete', 'WorkoutSessions', 1, NULL, '{"workout":"Full Body","duration":45}', '10.0.0.20', DATEADD(day,-3,GETDATE())),
(5, 'point.earn', 'PointTransactions', 1, NULL, '{"points":80,"source":"workout"}', '10.0.0.5', DATEADD(day,-2,GETDATE())),
(1, 'backup.create', 'BackupLogs', 1, NULL, '{"type":"daily","status":"completed"}', '192.168.1.10', DATEADD(day,-1,GETDATE()));
PRINT 'AuditLogs: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 28. BackupLogs
INSERT INTO BackupLogs (type, status, file_path, file_size, duration_seconds, verified, created_by, created_at) VALUES
('daily', 'completed', 'D:\backups\gymer_20260623.bak', 157286400, 45, 1, 1, DATEADD(day,-1,GETDATE())),
('daily', 'completed', 'D:\backups\gymer_20260622.bak', 157286400, 42, 1, 1, DATEADD(day,-2,GETDATE())),
('weekly', 'completed', 'D:\backups\gymer_weekly_20260620.bak', 524288000, 180, 1, 1, DATEADD(day,-4,GETDATE())),
('daily', 'completed', 'D:\backups\gymer_20260619.bak', 157286400, 44, 1, 1, DATEADD(day,-5,GETDATE())),
('daily', 'running', 'D:\backups\gymer_current.bak', NULL, NULL, 0, 1, GETDATE());
PRINT 'BackupLogs: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 29. AnalyticsDaily (30 ngày gần nhất)
WITH dates AS (
  SELECT CAST(DATEADD(day,-n,GETDATE()) AS DATE) dt, n
  FROM (VALUES(0),(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),
              (16),(17),(18),(19),(20),(21),(22),(23),(24),(25),(26),(27),(28),(29)) nums(n)
)
INSERT INTO AnalyticsDaily (date, dau, new_users, new_memberships, revenue, workouts_completed, tickets_created, coupons_used, points_earned, points_redeemed)
SELECT
  dt,
  3 + CAST(ABS(CHECKSUM(NEWID())) % 7 AS INT),
  CASE WHEN n % 4 = 0 THEN 1 ELSE 0 END,
  CASE WHEN n % 3 = 0 THEN 1 ELSE 0 END,
  50.00 + CAST((ABS(CHECKSUM(NEWID())) % 5000) AS DECIMAL(12,2)) / 100.0,
  CAST(ABS(CHECKSUM(NEWID())) % 5 AS INT),
  CAST(ABS(CHECKSUM(NEWID())) % 2 AS INT),
  CAST(ABS(CHECKSUM(NEWID())) % 3 AS INT),
  CAST(ABS(CHECKSUM(NEWID())) % 200 AS INT),
  CAST(ABS(CHECKSUM(NEWID())) % 50 AS INT)
FROM dates d;
PRINT 'AnalyticsDaily: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 30. AnalyticsRetention
INSERT INTO AnalyticsRetention (cohort_date, day_1, day_7, day_14, day_30, day_60, day_90, total_users) VALUES
(DATEADD(month,-1,GETDATE()), 80, 60, 45, 30, 20, 15, 50),
(DATEADD(month,-2,GETDATE()), 75, 55, 40, 28, 18, 12, 45),
(DATEADD(month,-3,GETDATE()), 85, 65, 50, 35, 25, 18, 60),
(DATEADD(month,-4,GETDATE()), 70, 50, 35, 25, 15, 10, 40),
(DATEADD(month,-5,GETDATE()), 90, 70, 55, 40, 30, 22, 55),
(DATEADD(month,-6,GETDATE()), 78, 58, 42, 30, 20, 14, 35);
PRINT 'AnalyticsRetention: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- 31. Promotions
INSERT INTO Promotions (name, type, config, start_date, end_date, priority, is_active, created_at) VALUES
('Summer Sale 2026', 'discount', '{"discount_percent":20,"applicable_plans":[2,3]}', DATEADD(month,-1,GETDATE()), DATEADD(month,1,GETDATE()), 1, 1, DATEADD(month,-1,GETDATE())),
('New Year Fitness', 'referral', '{"bonus_points":200,"commission_boost":5}', DATEADD(month,-3,GETDATE()), DATEADD(month,3,GETDATE()), 0, 1, DATEADD(month,-3,GETDATE())),
('Flash Friday', 'flash_sale', '{"discount_percent":30,"duration_hours":48,"max_redemptions":10}', DATEADD(day,-7,GETDATE()), DATEADD(day,7,GETDATE()), 2, 1, DATEADD(day,-7,GETDATE()));
PRINT 'Promotions: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- ============================================
PRINT '';
PRINT '========================================';
PRINT '✅ GYMER DATABASE READY';
PRINT '   Tables: 43 | Data: ~420 rows';
PRINT '   Admin: admin@gymer.com / admin123';

-- ============================================
-- CATEGORIES (93 rows) - IDs 1-93
-- ============================================

-- Supplements (1-15)
INSERT INTO Categories (name,slug,description,sort_order) VALUES
('Whey Protein','whey-protein','Premium whey protein supplements',1),
('Whey Isolate','whey-isolate','High-purity whey isolate',2),
('Casein Protein','casein','Slow-release casein protein',3),
('Vegan Protein','vegan-protein','Plant-based protein powder',4),
('Mass Gainer','mass-gainer','High-calorie weight gain formulas',5),
('Creatine','creatine','Creatine monohydrate and blends',6),
('BCAA','bcaa','Branched-chain amino acids',7),
('EAA','eaa','Essential amino acids',8),
('Glutamine','glutamine','L-glutamine supplements',9),
('Pre-Workout','pre-workout','Energy and performance boosters',10),
('Electrolytes','electrolytes','Hydration and mineral supplements',11),
('Fish Oil','fish-omega','Omega-3 fish oil',12),
('Vitamins and Minerals','vitamins','Multivitamins and minerals',13),
('Joint Support','joint-support','Glucosamine chondroitin collagen',14),
('Recovery','recovery','Post-workout recovery formulas',15);

-- Equipment (16-25)
INSERT INTO Categories (name,slug,description,sort_order) VALUES
('Adjustable Dumbbells','adjustable-dumbbells','Space-saving adjustable weights',20),
('Hex Dumbbells','hex-dumbbells','Rubber hex dumbbells',21),
('Barbells','barbells','Olympic and standard barbells',22),
('EZ Curl Bars','ez-curl-bars','Curl bars for arms',23),
('Weight Plates','weight-plates','Iron and bumper plates',24),
('Bumper Plates','bumper-plates','Rubber bumper plates',25),
('Kettlebells','kettlebells','Cast iron and competition',26),
('Medicine Balls','medicine-balls','Weighted medicine balls',27),
('Slam Balls','slam-balls','Slam and throw balls',28),
('Sandbags','sandbags','Tactical sandbags',29);

-- Cardio (26-31)
INSERT INTO Categories (name,slug,description,sort_order) VALUES
('Treadmills','treadmills','Running machines',30),
('Exercise Bikes','exercise-bikes','Upright and recumbent bikes',31),
('Spin Bikes','spin-bikes','Indoor cycling bikes',32),
('Rowing Machines','rowing-machines','Cardio rowers',33),
('Ellipticals','ellipticals','Elliptical trainers',34),
('Stair Climbers','stair-climbers','Stair stepper machines',35);

-- Home Gym (32-37)
INSERT INTO Categories (name,slug,description,sort_order) VALUES
('Bench Press','bench-press','Weight benches',40),
('Squat Rack','squat-rack','Squat racks and cages',41),
('Smith Machine','smith-machine','Smith stations',42),
('Power Rack','power-rack','Power racks and half racks',43),
('Cable Machine','cable-machine','Cable crossover stations',44),
('Functional Trainer','functional-trainer','Functional trainers',45);

-- Accessories (38-50)
INSERT INTO Categories (name,slug,description,sort_order) VALUES
('Resistance Bands','resistance-bands','Exercise bands',50),
('Jump Rope','jump-rope','Speed and weighted ropes',51),
('Battle Rope','battle-rope','Battle ropes for cardio',52),
('Gym Gloves','gym-gloves','Weightlifting gloves',53),
('Wrist Wraps','wrist-wraps','Wrist support wraps',54),
('Lifting Belts','lifting-belts','Leather and lever belts',55),
('Lifting Straps','lifting-straps','Lifting straps and hooks',56),
('Knee Sleeves','knee-sleeves','7mm and 5mm knee sleeves',57),
('Foam Roller','foam-roller','Muscle recovery rollers',58),
('Massage Ball','massage-ball','Spiky and peanut balls',59),
('Shaker Cup','shaker-cup','Protein shaker bottles',60),
('Water Bottle','water-bottle','Gym water bottles',61),
('Gym Bag','gym-bag','Sports and duffel bags',62);

-- Clothing (51-59)
INSERT INTO Categories (name,slug,description,sort_order) VALUES
('Men Tank Tops','mens-tank-top','Mens gym tank tops',65),
('Men Hoodies','mens-hoodie','Mens hoodies and pullovers',66),
('Men Shorts','mens-shorts','Mens training shorts',67),
('Men Joggers','mens-joggers','Mens joggers and sweatpants',68),
('Men Compression','mens-compression','Mens compression wear',69),
('Women Leggings','women-leggings','Womens training leggings',70),
('Women Sports Bra','women-sports-bra','Supportive sports bras',71),
('Women Tops','womens-top','Womens training tops',72),
('Kids Apparel','kids-apparel','Kids activewear',73);

-- Shoes (60-63)
INSERT INTO Categories (name,slug,description,sort_order) VALUES
('Running Shoes','running-shoes','Athletic running shoes',80),
('Training Shoes','training-shoes','Cross-training shoes',81),
('Weightlifting Shoes','weightlifting-shoes','Lifters and squat shoes',82),
('Cross Training Shoes','cross-training-shoes','CrossFit and HIIT shoes',83);

-- Smart Devices (64-67)
INSERT INTO Categories (name,slug,description,sort_order) VALUES
('Smart Watch','smart-watch','Fitness smartwatches',90),
('Fitness Tracker','fitness-tracker','Activity trackers',91),
('Heart Rate Monitor','heart-rate-monitor','Chest strap and armband HRM',92),
('Smart Scale','smart-scale','Body composition scales',93);

-- Additional categories (68-72)
INSERT INTO Categories (name,slug,description,is_active,sort_order,created_at,updated_at) VALUES
('Nootropics','nootropics','Brain and focus supplements',1,16,GETDATE(),GETDATE()),
('Greens & Superfoods','greens-superfoods','Green superfood blends',1,17,GETDATE(),GETDATE()),
('Collagen','collagen','Collagen peptides and supplements',1,18,GETDATE(),GETDATE()),
('Digestive Health','digestive-health','Probiotics and digestive enzymes',1,19,GETDATE(),GETDATE()),
('Stress & Cortisol','stress-cortisol','Adaptogens and cortisol support',1,20,GETDATE(),GETDATE());
PRINT 'Categories: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- ============================================
-- BRANDS (43 rows) - IDs 1-43
-- ============================================
INSERT INTO Brands (name,slug,description,is_active) VALUES
('Optimum Nutrition','optimum-nutrition','Gold Standard protein',1),
('MyProtein','myprotein','UK-based nutrition',1),
('Dymatize','dymatize','ISO100 hydrolyzed whey',1),
('BSN','bsn','Syntha-6 and NO-Xplode',1),
('Ghost','ghost','Legendary flavors transparent formulas',1),
('MusclePharm','musclepharm','Combat nutrition',1),
('Rule One','ruleone','Pharmaceutical-grade protein',1),
('Cellucor','cellucor','Energy and physique supplements',1),
('JYM','jym','Scientist-formulated supplements',1),
('Naked Nutrition','naked-nutrition','Minimal ingredient supplements',1),
('Nutricost','nutricost','Value supplements',1),
('Universal Nutrition','universal-nutrition','Animal Pak and more',1),
('Scivation','scivation','Xtend BCAAs',1),
('Promix','promix','Clean supplements',1),
('Onnit','onnit','Total human optimization',1),
('Gorilla Mind','gorilla-mind','Nootropic and pre-workout',1),
('Bucked Up','bucked-up','Pre-workout and deer antler',1),
('PowerBlock','powerblock','Innovative adjustable dumbbells',1),
('REP Fitness','rep-fitness','Affordable commercial equipment',1),
('Rogue Fitness','rogue-fitness','Made in the USA',1),
('Eleiko','eleiko','Premium Swedish equipment',1),
('Ironmaster','ironmaster','Adjustable equipment',1),
('Titan Fitness','titan-fitness','Budget strength equipment',1),
('Horizon Fitness','horizon-fitness','Home cardio',1),
('Concept2','concept2','Rowing ergometers',1),
('Sole Fitness','sole-fitness','Premium home cardio',1),
('Assault Fitness','assault-fitness','Air bike and rower',1),
('Under Armour','under-armour','Performance sportswear',1),
('Gymshark','gymshark','Fitness apparel community',1),
('Alphalete','alphalete','Premium athletic apparel',1),
('Vuori','vuori','Performance activewear',1),
('HOKA','hoka','Maximum cushion running shoes',1),
('On Running','on-running','Swiss-engineered running',1),
('Reebok','reebok','CrossFit and training footwear',1),
('NoBull','nobull','Minimalist training shoes',1),
('SBD','sbd','Powerlifting gear',1),
('Warm Body Cold Mind','wbcm','Premium lifting apparel',1),
('RAGE Fitness','rage-fitness','Functional fitness gear',1),
('Garmin','garmin','GPS and fitness technology',1),
('Polar','polar','Heart rate technology',1),
('Withings','withings','Smart health devices',1),
('Whoop','whoop','Strain and recovery tracking',1),
('Nike','nike','Athletic footwear and apparel',1),
('Adidas','adidas','Sportswear and training gear',1);
PRINT 'Brands: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO
-- ============================================
-- PRODUCTS (167 rows) - using correct category/brand IDs (remapped)
-- ============================================
DELETE FROM Products;
DBCC CHECKIDENT ('Products', RESEED, 0);
GO
INSERT INTO Products (product_name,slug,description,sku,price,sale_price,stock,rating,review_count,main_image,brand_id,category_id,sub_category,is_active,is_featured,is_on_sale,created_at,updated_at) VALUES
('Adistar','adistar','Premium women tops product','MEDIAPRODUCT',45.99,34.49,120,4.0,500,'/media/products/adidas/adistar/main.webp',44,58,'Women Tops',1,0,1,GETDATE(),GETDATE()),
('Kids Tee','kids-tee','Premium women tops product','MEDIAPRODU1',28.59,NULL,62,4.2,94,'/media/products/adidas/kids-tee/main.webp',44,58,'Women Tops',1,0,0,GETDATE(),GETDATE()),
('Ultraboost','ultraboost','Premium smart watch product','MEDIAPRODU2',315.99,NULL,79,4.9,213,'/media/products/adidas/ultraboost/main.webp',44,64,'Smart Watch',1,0,0,GETDATE(),GETDATE()),
('Bra','bra','Premium women sports bra product','MEDIAPRODU3',50.54,NULL,123,4.3,521,'/media/products/alphalete/bra/main.webp',30,57,'Women Sports Bra',1,0,0,GETDATE(),GETDATE()),
('Hoodie','hoodie','Premium men hoodies product','MEDIAPRODU4',67.49,50.62,105,4.5,395,'/media/products/alphalete/hoodie/main.webp',30,52,'Men Hoodies',1,0,1,GETDATE(),GETDATE()),
('Joggers','joggers','Premium men joggers product','MEDIAPRODU5',46.24,34.68,75,4.5,185,'/media/products/alphalete/joggers/main.webp',30,54,'Men Joggers',1,0,1,GETDATE(),GETDATE()),
('Leggings','leggings','Premium women leggings product','MEDIAPRODU6',55.59,44.47,76,4.6,192,'/media/products/alphalete/leggings/main.webp',30,56,'Women Leggings',1,0,1,GETDATE(),GETDATE()),
('Shorts','shorts','Premium men shorts product','MEDIAPRODU7',51.94,NULL,127,4.7,549,'/media/products/alphalete/shorts/main.webp',30,53,'Men Shorts',1,0,0,GETDATE(),GETDATE()),
('Tank','tank','Premium men tank tops product','MEDIAPRODU8',46.99,NULL,138,4.8,626,'/media/products/alphalete/tank/main.webp',30,51,'Men Tank Tops',1,0,0,GETDATE(),GETDATE()),
('Top','top','Premium women tops product','MEDIAPRODU9',39.69,NULL,99,4.9,353,'/media/products/alphalete/top/main.webp',30,58,'Women Tops',1,0,0,GETDATE(),GETDATE()),
('Selecttech 552','selecttech-552','Premium adjustable dumbbells product','MEDIAPRODU10',444.99,NULL,119,4.9,493,'/media/products/bowflex/selecttech-552/main.webp',18,16,'Adjustable Dumbbells',1,0,0,GETDATE(),GETDATE()),
('Amino X','amino-x','Premium electrolytes product','MEDIAPRODU11',22.29,NULL,123,4.3,521,'/media/products/bsn/amino-x/main.webp',4,11,'Electrolytes',1,0,0,GETDATE(),GETDATE()),
('Eaas Hydration','eaas-hydration','Premium eaa product','MEDIAPRODU12',23.09,17.32,81,4.1,227,'/media/products/bsn/eaas-hydration/main.webp',4,8,'EAA',1,0,1,GETDATE(),GETDATE()),
('Iso 100 Isolate','iso-100-isolate','Premium whey isolate product','MEDIAPRODU13',35.19,26.39,51,4.1,17,'/media/products/bsn/iso-100-isolate/main.webp',4,2,'Whey Isolate',1,1,1,GETDATE(),GETDATE()),
('Syntha 6','syntha-6','Premium whey protein product','MEDIAPRODU14',44.59,NULL,123,4.3,521,'/media/products/bsn/syntha-6/main.webp',4,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('True Mass','true-mass','Premium mass gainer product','MEDIAPRODU15',46.79,NULL,84,4.4,248,'/media/products/bsn/true-mass/main.webp',4,5,'Mass Gainer',1,0,0,GETDATE(),GETDATE()),
('C4 Original','c4-original','Premium pre-workout product','MEDIAPRODU16',25.14,18.86,51,4.1,17,'/media/products/cellucor/c4-original/main.webp',8,10,'Pre-Workout',1,1,1,GETDATE(),GETDATE()),
('C4 Ultimate','c4-ultimate','Premium pre-workout product','MEDIAPRODU17',39.24,31.39,145,4.5,675,'/media/products/cellucor/c4-ultimate/main.webp',8,10,'Pre-Workout',1,0,1,GETDATE(),GETDATE()),
('Cor Creatine','cor-creatine','Premium creatine product','MEDIAPRODU18',25.19,NULL,118,4.8,486,'/media/products/cellucor/cor-creatine/main.webp',8,6,'Creatine',1,0,0,GETDATE(),GETDATE()),
('Rowerg','rowerg','Premium rowing machines product','MEDIAPRODU19',726.99,545.24,111,4.1,437,'/media/products/concept2/rowerg/main.webp',25,29,'Rowing Machines',1,0,1,GETDATE(),GETDATE()),
('Skierg','skierg','Premium treadmills product','MEDIAPRODU20',724.99,507.49,65,4.5,115,'/media/products/concept2/skierg/main.webp',25,26,'Treadmills',1,0,1,GETDATE(),GETDATE()),
('Iso100','iso100','Premium whey protein product','MEDIAPRODU21',42.59,NULL,113,4.3,451,'/media/products/dymatize/iso100/main.webp',3,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Apple Watch Ultra 2','apple-watch-ultra-2','Premium smart watch product','MEDIAPRODU22',579.99,463.99,145,4.5,675,'/media/products/garmin/apple-watch-ultra-2/main.webp',39,64,'Smart Watch',1,0,1,GETDATE(),GETDATE()),
('Garmin Fenix 7','garmin-fenix-7','Premium smart watch product','MEDIAPRODU23',459.99,367.99,115,4.5,465,'/media/products/garmin/garmin-fenix-7/main.webp',39,64,'Smart Watch',1,0,1,GETDATE(),GETDATE()),
('Garmin Forerunner 265','garmin-forerunner-265','Premium fitness tracker product','MEDIAPRODU24',134.99,NULL,84,4.4,248,'/media/products/garmin/garmin-forerunner-265/main.webp',39,65,'Fitness Tracker',1,0,0,GETDATE(),GETDATE()),
('Garmin Hrm Pro','garmin-hrm-pro','Premium heart rate monitor product','MEDIAPRODU25',123.59,92.69,126,4.6,542,'/media/products/garmin/garmin-hrm-pro/main.webp',39,66,'Heart Rate Monitor',1,0,1,GETDATE(),GETDATE()),
('Garmin Index S2','garmin-index-s2','Premium smart watch product','MEDIAPRODU26',215.99,NULL,54,4.4,38,'/media/products/garmin/garmin-index-s2/main.webp',39,64,'Smart Watch',1,1,0,GETDATE(),GETDATE()),
('Garmin Venu 3','garmin-venu-3','Premium smart watch product','MEDIAPRODU27',451.99,NULL,113,4.3,451,'/media/products/garmin/garmin-venu-3/main.webp',39,64,'Smart Watch',1,0,0,GETDATE(),GETDATE()),
('Whey','whey','Premium whey protein product','MEDIAPRODU28',44.79,NULL,124,4.4,528,'/media/products/ghost/whey/main.webp',5,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Flex Shorts','flex-shorts','Premium men shorts product','MEDIAPRODU29',53.34,37.34,131,4.1,577,'/media/products/gymshark/flex-shorts/main.webp',29,53,'Men Shorts',1,0,1,GETDATE(),GETDATE()),
('Gymshark Vital Seamless','gymshark-vital-seamless','Premium women tops product','MEDIAPRODU30',54.39,NULL,148,4.8,696,'/media/products/gymshark/gymshark-vital-seamless/main.webp',29,58,'Women Tops',1,0,0,GETDATE(),GETDATE()),
('Hoodie','gymshark-hoodie','Premium men hoodies product','MEDIAPRODU31',67.49,50.62,105,4.5,395,'/media/products/gymshark/hoodie/main.webp',29,52,'Men Hoodies',1,0,1,GETDATE(),GETDATE()),
('Joggers','gymshark-joggers','Premium men joggers product','MEDIAPRODU32',46.24,34.68,75,4.5,185,'/media/products/gymshark/joggers/main.webp',29,54,'Men Joggers',1,0,1,GETDATE(),GETDATE()),
('Legacy Bra','legacy-bra','Premium women sports bra product','MEDIAPRODU33',41.44,NULL,97,4.7,339,'/media/products/gymshark/legacy-bra/main.webp',29,57,'Women Sports Bra',1,0,0,GETDATE(),GETDATE()),
('Training Tee','training-tee','Premium women tops product','MEDIAPRODU34',54.09,NULL,147,4.7,689,'/media/products/gymshark/training-tee/main.webp',29,58,'Women Tops',1,0,0,GETDATE(),GETDATE()),
('Vital Tank','vital-tank','Premium men tank tops product','MEDIAPRODU35',40.74,NULL,113,4.3,451,'/media/products/gymshark/vital-tank/main.webp',29,51,'Men Tank Tops',1,0,0,GETDATE(),GETDATE()),
('Hoka Bondi 8','hoka-bondi-8','Premium running shoes product','MEDIAPRODU36',144.99,115.99,100,4.0,360,'/media/products/hoka/hoka-bondi-8/main.webp',32,60,'Running Shoes',1,0,1,GETDATE(),GETDATE()),
('Hoka Clifton 9','hoka-clifton-9','Premium running shoes product','MEDIAPRODU37',92.19,NULL,52,4.2,24,'/media/products/hoka/hoka-clifton-9/main.webp',32,60,'Running Shoes',1,1,0,GETDATE(),GETDATE()),
('Pre Jym','pre-jym','Premium whey protein product','MEDIAPRODU38',47.59,NULL,138,4.8,626,'/media/products/jym/pre-jym/main.webp',9,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Pro Jym','pro-jym','Premium whey protein product','MEDIAPRODU39',45.39,NULL,127,4.7,549,'/media/products/jym/pro-jym/main.webp',9,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Combat','combat','Premium whey protein product','MEDIAPRODU40',41.39,NULL,107,4.7,409,'/media/products/musclepharm/combat/main.webp',6,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Combat Casein','combat-casein','Premium casein protein product','MEDIAPRODU41',47.78,NULL,137,4.7,619,'/media/products/musclepharm/combat-casein/main.webp',6,3,'Casein Protein',1,0,0,GETDATE(),GETDATE()),
('Cell Tech','cell-tech','Premium whey protein product','MEDIAPRODU42',44.99,31.49,125,4.5,535,'/media/products/muscletech/cell-tech/main.webp',6,1,'Whey Protein',1,0,1,GETDATE(),GETDATE()),
('Mass Tech','mass-tech','Premium mass gainer product','MEDIAPRODU43',53.79,NULL,119,4.9,493,'/media/products/muscletech/mass-tech/main.webp',6,5,'Mass Gainer',1,0,0,GETDATE(),GETDATE()),
('Nitro Tech','nitro-tech','Premium whey protein product','MEDIAPRODU44',34.99,26.24,75,4.5,185,'/media/products/muscletech/nitro-tech/main.webp',6,1,'Whey Protein',1,0,1,GETDATE(),GETDATE()),
('Bcaa','bcaa','Premium bcaa product','MEDIAPRODU45',22.07,NULL,84,4.4,248,'/media/products/myprotein/bcaa/main.webp',2,7,'BCAA',1,0,0,GETDATE(),GETDATE()),
('Blenderbottle','blenderbottle','Premium water bottle product','MEDIAPRODU46',20.19,NULL,118,4.8,486,'/media/products/myprotein/blenderbottle/main.webp',2,49,'Water Bottle',1,0,0,GETDATE(),GETDATE()),
('Casein','casein','Premium casein protein product','MEDIAPRODU47',35.54,24.88,65,4.5,115,'/media/products/myprotein/casein/main.webp',2,3,'Casein Protein',1,0,1,GETDATE(),GETDATE()),
('Clear Whey','clear-whey','Premium whey protein product','MEDIAPRODU48',49.19,34.43,146,4.6,682,'/media/products/myprotein/clear-whey/main.webp',2,1,'Whey Protein',1,0,1,GETDATE(),GETDATE()),
('Complete Eaa','complete-eaa','Premium eaa product','MEDIAPRODU49',26.09,19.57,111,4.1,437,'/media/products/myprotein/complete-eaa/main.webp',2,8,'EAA',1,0,1,GETDATE(),GETDATE()),
('Creapure','creapure','Premium whey protein product','MEDIAPRODU50',46.39,NULL,132,4.2,584,'/media/products/myprotein/creapure/main.webp',2,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Glucosamine Chondroitin','glucosamine-chondroitin','Premium whey protein product','MEDIAPRODU51',32.39,NULL,62,4.2,94,'/media/products/myprotein/glucosamine-chondroitin/main.webp',2,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Glutamine','glutamine','Premium glutamine product','MEDIAPRODU52',13.71,9.6,56,4.6,52,'/media/products/myprotein/glutamine/main.webp',2,9,'Glutamine',1,1,1,GETDATE(),GETDATE()),
('Impact Whey','impact-whey','Premium whey protein product','MEDIAPRODU53',36.79,NULL,84,4.4,248,'/media/products/myprotein/impact-whey/main.webp',2,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Kaged Muscle Eaa','kaged-muscle-eaa','Premium eaa product','MEDIAPRODU54',21.69,NULL,67,4.7,129,'/media/products/myprotein/kaged-muscle-eaa/main.webp',2,8,'EAA',1,0,0,GETDATE(),GETDATE()),
('Lean Whey','lean-whey','Premium whey protein product','MEDIAPRODU55',43.59,NULL,118,4.8,486,'/media/products/myprotein/lean-whey/main.webp',2,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Omega 3 Fish Oil','omega-3-fish-oil','Premium fish oil product','MEDIAPRODU56',29.48,NULL,147,4.7,689,'/media/products/myprotein/omega-3-fish-oil/main.webp',2,12,'Fish Oil',1,0,0,GETDATE(),GETDATE()),
('Organic Vegan','organic-vegan','Premium vegan protein product','MEDIAPRODU57',43.34,NULL,139,4.9,633,'/media/products/myprotein/organic-vegan/main.webp',2,4,'Vegan Protein',1,0,0,GETDATE(),GETDATE()),
('Pulse','pulse','Premium women tops product','MEDIAPRODU58',41.49,31.12,105,4.5,395,'/media/products/myprotein/pulse/main.webp',2,58,'Women Tops',1,0,1,GETDATE(),GETDATE()),
('Vegan Blend','vegan-blend','Premium vegan protein product','MEDIAPRODU59',31.49,23.62,60,4.0,80,'/media/products/myprotein/vegan-blend/main.webp',2,4,'Vegan Protein',1,1,1,GETDATE(),GETDATE()),
('Vegan Isolate','vegan-isolate','Premium whey isolate product','MEDIAPRODU60',51.79,NULL,134,4.4,598,'/media/products/myprotein/vegan-isolate/main.webp',2,2,'Whey Isolate',1,0,0,GETDATE(),GETDATE()),
('Wrecked','wrecked','Premium whey protein product','MEDIAPRODU61',48.79,NULL,144,4.4,668,'/media/products/myprotein/wrecked/main.webp',2,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Xtend Sport','xtend-sport','Premium whey protein product','MEDIAPRODU62',31.39,NULL,57,4.7,59,'/media/products/myprotein/xtend-sport/main.webp',2,1,'Whey Protein',1,1,0,GETDATE(),GETDATE()),
('Zma','zma','Premium whey protein product','MEDIAPRODU63',35.59,NULL,78,4.8,206,'/media/products/myprotein/zma/main.webp',2,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Brasilia Bag','brasilia-bag','Premium gym bag product','MEDIAPRODU64',21.99,17.59,55,4.5,45,'/media/products/nike/brasilia-bag/main.webp',43,50,'Gym Bag',1,1,1,GETDATE(),GETDATE()),
('Kids Tee','nike-kids-tee','Premium women tops product','MEDIAPRODU65',28.59,NULL,62,4.2,94,'/media/products/nike/kids-tee/main.webp',43,58,'Women Tops',1,0,0,GETDATE(),GETDATE()),
('Nike Free Metcon 5','nike-free-metcon-5','Premium women tops product','MEDIAPRODU66',30.09,NULL,67,4.7,129,'/media/products/nike/nike-free-metcon-5/main.webp',43,58,'Women Tops',1,0,0,GETDATE(),GETDATE()),
('Nike Metcon 9','nike-metcon-9','Premium women tops product','MEDIAPRODU67',39.69,NULL,99,4.9,353,'/media/products/nike/nike-metcon-9/main.webp',43,58,'Women Tops',1,0,0,GETDATE(),GETDATE()),
('Nike Pegasus 41','nike-pegasus-41','Premium women tops product','MEDIAPRODU68',39.09,NULL,97,4.7,339,'/media/products/nike/nike-pegasus-41/main.webp',43,58,'Women Tops',1,0,0,GETDATE(),GETDATE()),
('Nike Romaleos 4','nike-romaleos-4','Premium women tops product','MEDIAPRODU69',33.09,NULL,77,4.7,199,'/media/products/nike/nike-romaleos-4/main.webp',43,58,'Women Tops',1,0,0,GETDATE(),GETDATE()),
('Pro Tights','pro-tights','Premium women tops product','MEDIAPRODU70',40.29,28.2,101,4.1,367,'/media/products/nike/pro-tights/main.webp',43,58,'Women Tops',1,0,1,GETDATE(),GETDATE()),
('Trainer','trainer','Premium functional trainer product','MEDIAPRODU71',1360.99,NULL,83,4.3,241,'/media/products/nobull/trainer/main.webp',35,37,'Functional Trainer',1,0,0,GETDATE(),GETDATE()),
('Cloudmonster','cloudmonster','Premium running shoes product','MEDIAPRODU72',113.09,79.16,71,4.1,157,'/media/products/on-running/cloudmonster/main.webp',33,60,'Running Shoes',1,0,1,GETDATE(),GETDATE()),
('Bcaa 5000','bcaa-5000','Premium bcaa product','MEDIAPRODU73',26.03,NULL,117,4.7,479,'/media/products/optimum-nutrition/bcaa-5000/main.webp',1,7,'BCAA',1,0,0,GETDATE(),GETDATE()),
('Casein','optimum-nutrition-casein','Premium casein protein product','MEDIAPRODU74',35.54,24.88,65,4.5,115,'/media/products/optimum-nutrition/casein/main.webp',1,3,'Casein Protein',1,0,1,GETDATE(),GETDATE()),
('Creatine','creatine','Premium creatine product','MEDIAPRODU75',24.74,19.79,115,4.5,465,'/media/products/optimum-nutrition/creatine/main.webp',1,6,'Creatine',1,0,1,GETDATE(),GETDATE()),
('Fish Oil','fish-oil','Premium fish oil product','MEDIAPRODU76',20.47,NULL,94,4.4,318,'/media/products/optimum-nutrition/fish-oil/main.webp',1,12,'Fish Oil',1,0,0,GETDATE(),GETDATE()),
('Glutamine','optimum-nutrition-glutamine','Premium glutamine product','MEDIAPRODU77',13.71,9.6,56,4.6,52,'/media/products/optimum-nutrition/glutamine/main.webp',1,9,'Glutamine',1,1,1,GETDATE(),GETDATE()),
('Gold Isolate','gold-isolate','Premium whey isolate product','MEDIAPRODU78',52.19,41.75,136,4.6,612,'/media/products/optimum-nutrition/gold-isolate/main.webp',1,2,'Whey Isolate',1,0,1,GETDATE(),GETDATE()),
('Gold Standard Whey','gold-standard-whey','Premium whey protein product','MEDIAPRODU79',33.19,24.89,66,4.6,122,'/media/products/optimum-nutrition/gold-standard-whey/main.webp',1,1,'Whey Protein',1,0,1,GETDATE(),GETDATE()),
('Hydration Tabs','hydration-tabs','Premium electrolytes product','MEDIAPRODU80',19.09,15.27,91,4.1,297,'/media/products/optimum-nutrition/hydration-tabs/main.webp',1,11,'Electrolytes',1,0,1,GETDATE(),GETDATE()),
('Night Recovery','night-recovery','Premium recovery product','MEDIAPRODU81',34.59,NULL,114,4.4,458,'/media/products/optimum-nutrition/night-recovery/main.webp',1,15,'Recovery',1,0,0,GETDATE(),GETDATE()),
('Platinum Hydrowhey','platinum-hydrowhey','Premium whey protein product','MEDIAPRODU82',32.59,NULL,63,4.3,101,'/media/products/optimum-nutrition/platinum-hydrowhey/main.webp',1,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Serious Mass','serious-mass','Premium mass gainer product','MEDIAPRODU83',39.99,27.99,50,4.0,10,'/media/products/optimum-nutrition/serious-mass/main.webp',1,5,'Mass Gainer',1,1,1,GETDATE(),GETDATE()),
('Triple Joint','triple-joint','Premium joint support product','MEDIAPRODU84',26.59,NULL,94,4.4,318,'/media/products/optimum-nutrition/triple-joint/main.webp',1,14,'Joint Support',1,0,0,GETDATE(),GETDATE()),
('H10','h10','Premium smart watch product','MEDIAPRODU85',335.99,NULL,84,4.4,248,'/media/products/polar/h10/main.webp',40,64,'Smart Watch',1,0,0,GETDATE(),GETDATE()),
('Verity Sense','verity-sense','Premium smart watch product','MEDIAPRODU86',411.99,NULL,103,4.3,381,'/media/products/polar/verity-sense/main.webp',40,64,'Smart Watch',1,0,0,GETDATE(),GETDATE()),
('Sport 52','sport-52','Premium adjustable dumbbells product','MEDIAPRODU87',474.99,332.49,125,4.5,535,'/media/products/powerblock/sport-52/main.webp',18,16,'Adjustable Dumbbells',1,0,1,GETDATE(),GETDATE()),
('Battle Rope','battle-rope','Premium battle rope product','MEDIAPRODU88',95.09,NULL,143,4.3,661,'/media/products/rage-fitness/battle-rope/main.webp',38,40,'Battle Rope',1,0,0,GETDATE(),GETDATE()),
('Foam Roller','foam-roller','Premium foam roller product','MEDIAPRODU89',34.74,NULL,149,4.9,703,'/media/products/rage-fitness/foam-roller/main.webp',38,46,'Foam Roller',1,0,0,GETDATE(),GETDATE()),
('Rage Fitness Med Ball','rage-fitness-med-ball','Premium massage ball product','MEDIAPRODU90',15.09,12.07,115,4.5,465,'/media/products/rage-fitness/rage-fitness-med-ball/main.webp',38,47,'Massage Ball',1,0,1,GETDATE(),GETDATE()),
('Sandbag','sandbag','Premium sandbags product','MEDIAPRODU91',46.79,NULL,78,4.8,206,'/media/products/rage-fitness/sandbag/main.webp',38,25,'Sandbags',1,0,0,GETDATE(),GETDATE()),
('Slam Ball','slam-ball','Premium slam balls product','MEDIAPRODU92',26.79,NULL,67,4.7,129,'/media/products/rage-fitness/slam-ball/main.webp',38,24,'Slam Balls',1,0,0,GETDATE(),GETDATE()),
('Reebok Nano X3','reebok-nano-x3','Premium cross training shoes product','MEDIAPRODU93',123.29,NULL,87,4.7,269,'/media/products/reebok/reebok-nano-x3/main.webp',34,63,'Cross Training Shoes',1,0,0,GETDATE(),GETDATE()),
('Reebok Nano X4','reebok-nano-x4','Premium cross training shoes product','MEDIAPRODU94',117.89,88.42,81,4.1,227,'/media/products/reebok/reebok-nano-x4/main.webp',34,63,'Cross Training Shoes',1,0,1,GETDATE(),GETDATE()),
('Rep Ab 3100 Bench','rep-ab-3100-bench','Premium bench press product','MEDIAPRODU95',338.99,NULL,104,4.4,388,'/media/products/rep-fitness/rep-ab-3100-bench/main.webp',19,32,'Bench Press',1,0,0,GETDATE(),GETDATE()),
('Rep Adjustable Dumbbell','rep-adjustable-dumbbell','Premium adjustable dumbbells product','MEDIAPRODU96',419.99,NULL,114,4.4,458,'/media/products/rep-fitness/rep-adjustable-dumbbell/main.webp',19,16,'Adjustable Dumbbells',1,0,0,GETDATE(),GETDATE()),
('Rep Bumper Plates','rep-bumper-plates','Premium weight plates product','MEDIAPRODU97',45.99,36.79,55,4.5,45,'/media/products/rep-fitness/rep-bumper-plates/main.webp',19,20,'Weight Plates',1,1,1,GETDATE(),GETDATE()),
('Rep Cable Crossover','rep-cable-crossover','Premium cable machine product','MEDIAPRODU98',784.99,NULL,69,4.9,143,'/media/products/rep-fitness/rep-cable-crossover/main.webp',19,36,'Cable Machine',1,0,0,GETDATE(),GETDATE()),
('Rep Ez Curl Bar','rep-ez-curl-bar','Premium ez curl bars product','MEDIAPRODU99',111.59,NULL,127,4.7,549,'/media/products/rep-fitness/rep-ez-curl-bar/main.webp',19,19,'EZ Curl Bars',1,0,0,GETDATE(),GETDATE()),
('Rep Functional Trainer','rep-functional-trainer','Premium cable machine product','MEDIAPRODU100',1174.99,822.49,95,4.5,325,'/media/products/rep-fitness/rep-functional-trainer/main.webp',19,36,'Cable Machine',1,0,1,GETDATE(),GETDATE()),
('Rep Hex Dumbbells','rep-hex-dumbbells','Premium adjustable dumbbells product','MEDIAPRODU101',164.99,NULL,63,4.3,101,'/media/products/rep-fitness/rep-hex-dumbbells/main.webp',19,16,'Adjustable Dumbbells',1,0,0,GETDATE(),GETDATE()),
('Rep Iron Plates','rep-iron-plates','Premium weight plates product','MEDIAPRODU102',49.19,34.43,56,4.6,52,'/media/products/rep-fitness/rep-iron-plates/main.webp',19,20,'Weight Plates',1,1,1,GETDATE(),GETDATE()),
('Rep Pr 4000 Power Rack','rep-pr-4000-power-rack','Premium power rack product','MEDIAPRODU103',796.99,637.59,121,4.1,507,'/media/products/rep-fitness/rep-pr-4000-power-rack/main.webp',19,35,'Power Rack',1,0,1,GETDATE(),GETDATE()),
('Rep Pr 5000 Power Rack','rep-pr-5000-power-rack','Premium power rack product','MEDIAPRODU104',628.99,NULL,97,4.7,339,'/media/products/rep-fitness/rep-pr-5000-power-rack/main.webp',19,35,'Power Rack',1,0,0,GETDATE(),GETDATE()),
('Rep Sm 4000 Smith Machine','rep-sm-4000-smith-machine','Premium smith machine product','MEDIAPRODU105',869.99,NULL,87,4.7,269,'/media/products/rep-fitness/rep-sm-4000-smith-machine/main.webp',19,34,'Smith Machine',1,0,0,GETDATE(),GETDATE()),
('Battle Rope','rogue-fitness-battle-rope','Premium battle rope product','MEDIAPRODU106',95.09,NULL,143,4.3,661,'/media/products/rogue-fitness/battle-rope/main.webp',20,40,'Battle Rope',1,0,0,GETDATE(),GETDATE()),
('Bella Bar','bella-bar','Premium adjustable dumbbells product','MEDIAPRODU107',364.99,NULL,103,4.3,381,'/media/products/rogue-fitness/bella-bar/main.webp',20,16,'Adjustable Dumbbells',1,0,0,GETDATE(),GETDATE()),
('Echo Bike','echo-bike','Premium exercise bikes product','MEDIAPRODU108',1029.99,NULL,123,4.3,521,'/media/products/rogue-fitness/echo-bike/main.webp',20,27,'Exercise Bikes',1,0,0,GETDATE(),GETDATE()),
('Flat Bench','flat-bench','Premium bench press product','MEDIAPRODU109',237.49,178.12,75,4.5,185,'/media/products/rogue-fitness/flat-bench/main.webp',20,32,'Bench Press',1,0,1,GETDATE(),GETDATE()),
('Foam Roller','rogue-fitness-foam-roller','Premium foam roller product','MEDIAPRODU110',34.74,NULL,149,4.9,703,'/media/products/rogue-fitness/foam-roller/main.webp',20,46,'Foam Roller',1,0,0,GETDATE(),GETDATE()),
('Gloves','gloves','Premium gym gloves product','MEDIAPRODU111',32.49,24.37,120,4.0,500,'/media/products/rogue-fitness/gloves/main.webp',20,41,'Gym Gloves',1,0,1,GETDATE(),GETDATE()),
('Gym Bag','gym-bag','Premium gym bag product','MEDIAPRODU112',27.99,22.39,70,4.0,150,'/media/products/rogue-fitness/gym-bag/main.webp',20,50,'Gym Bag',1,0,1,GETDATE(),GETDATE()),
('Hex Dumbbell','hex-dumbbell','Premium adjustable dumbbells product','MEDIAPRODU113',139.99,NULL,58,4.8,66,'/media/products/rogue-fitness/hex-dumbbell/main.webp',20,16,'Adjustable Dumbbells',1,1,0,GETDATE(),GETDATE()),
('Kettlebell','kettlebell','Premium kettlebells product','MEDIAPRODU114',62.89,NULL,83,4.3,241,'/media/products/rogue-fitness/kettlebell/main.webp',20,22,'Kettlebells',1,0,0,GETDATE(),GETDATE()),
('Knee Sleeves','knee-sleeves','Premium knee sleeves product','MEDIAPRODU115',31.19,NULL,78,4.8,206,'/media/products/rogue-fitness/knee-sleeves/main.webp',20,45,'Knee Sleeves',1,0,0,GETDATE(),GETDATE()),
('Lever Belt','lever-belt','Premium lifting belts product','MEDIAPRODU116',55.79,NULL,93,4.3,311,'/media/products/rogue-fitness/lever-belt/main.webp',20,43,'Lifting Belts',1,0,0,GETDATE(),GETDATE()),
('Massage Ball','massage-ball','Premium mass gainer product','MEDIAPRODU117',47.79,NULL,89,4.9,283,'/media/products/rogue-fitness/massage-ball/main.webp',20,5,'Mass Gainer',1,0,0,GETDATE(),GETDATE()),
('Medicine Ball','medicine-ball','Premium medicine balls product','MEDIAPRODU118',76.74,61.39,145,4.5,675,'/media/products/rogue-fitness/medicine-ball/main.webp',20,23,'Medicine Balls',1,0,1,GETDATE(),GETDATE()),
('Monster Rack','monster-rack','Premium adjustable dumbbells product','MEDIAPRODU119',409.99,NULL,112,4.2,444,'/media/products/rogue-fitness/monster-rack/main.webp',20,16,'Adjustable Dumbbells',1,0,0,GETDATE(),GETDATE()),
('Ohio Bar','ohio-bar','Premium adjustable dumbbells product','MEDIAPRODU120',294.99,NULL,89,4.9,283,'/media/products/rogue-fitness/ohio-bar/main.webp',20,16,'Adjustable Dumbbells',1,0,0,GETDATE(),GETDATE()),
('Ohio Belt','ohio-belt','Premium lifting belts product','MEDIAPRODU121',88.79,NULL,148,4.8,696,'/media/products/rogue-fitness/ohio-belt/main.webp',20,43,'Lifting Belts',1,0,0,GETDATE(),GETDATE()),
('Resistance Bands','resistance-bands','Premium resistance bands product','MEDIAPRODU122',10.99,NULL,52,4.2,24,'/media/products/rogue-fitness/resistance-bands/main.webp',20,38,'Resistance Bands',1,1,0,GETDATE(),GETDATE()),
('Rogue C 70 Bar','rogue-c-70-bar','Premium adjustable dumbbells product','MEDIAPRODU123',114.99,NULL,53,4.3,31,'/media/products/rogue-fitness/rogue-c-70-bar/main.webp',20,16,'Adjustable Dumbbells',1,1,0,GETDATE(),GETDATE()),
('Rogue Calibrated Cast Iron','rogue-calibrated-cast-iron','Premium weight plates product','MEDIAPRODU124',65.19,52.15,61,4.1,87,'/media/products/rogue-fitness/rogue-calibrated-cast-iron/main.webp',20,20,'Weight Plates',1,1,1,GETDATE(),GETDATE()),
('Rogue Figure 8 Straps','rogue-figure-8-straps','Premium lifting straps product','MEDIAPRODU125',21.99,15.39,110,4.0,430,'/media/products/rogue-fitness/rogue-figure-8-straps/main.webp',20,44,'Lifting Straps',1,0,1,GETDATE(),GETDATE()),
('Rogue Functional Trainer','rogue-functional-trainer','Premium cable machine product','MEDIAPRODU126',1639.99,1229.99,126,4.6,542,'/media/products/rogue-fitness/rogue-functional-trainer/main.webp',20,36,'Cable Machine',1,0,1,GETDATE(),GETDATE()),
('Rogue Hg 2.0 Bumper Plates','rogue-hg-2.0-bumper-plates','Premium weight plates product','MEDIAPRODU127',263.59,NULL,123,4.3,521,'/media/products/rogue-fitness/rogue-hg-2.0-bumper-plates/main.webp',20,20,'Weight Plates',1,0,0,GETDATE(),GETDATE()),
('Rogue R 3 Power Rack','rogue-r-3-power-rack','Premium power rack product','MEDIAPRODU128',663.99,NULL,102,4.2,374,'/media/products/rogue-fitness/rogue-r-3-power-rack/main.webp',20,35,'Power Rack',1,0,0,GETDATE(),GETDATE()),
('Rogue Sml 2','rogue-sml-2','Premium adjustable dumbbells product','MEDIAPRODU129',469.99,NULL,124,4.4,528,'/media/products/rogue-fitness/rogue-sml-2/main.webp',20,16,'Adjustable Dumbbells',1,0,0,GETDATE(),GETDATE()),
('Rogue Sr 1 Speed Rope','rogue-sr-1-speed-rope','Premium jump rope product','MEDIAPRODU130',13.99,11.19,70,4.0,150,'/media/products/rogue-fitness/rogue-sr-1-speed-rope/main.webp',20,39,'Jump Rope',1,0,1,GETDATE(),GETDATE()),
('Rogue Sr 2 Conditioning Rope','rogue-sr-2-conditioning-rope','Premium jump rope product','MEDIAPRODU131',23.19,16.23,116,4.6,472,'/media/products/rogue-fitness/rogue-sr-2-conditioning-rope/main.webp',20,39,'Jump Rope',1,0,1,GETDATE(),GETDATE()),
('Rogue T 3 Treadmill','rogue-t-3-treadmill','Premium treadmills product','MEDIAPRODU132',1714.99,1200.49,131,4.1,577,'/media/products/rogue-fitness/rogue-t-3-treadmill/main.webp',20,26,'Treadmills',1,0,1,GETDATE(),GETDATE()),
('Sandbag','rogue-fitness-sandbag','Premium sandbags product','MEDIAPRODU133',46.79,NULL,78,4.8,206,'/media/products/rogue-fitness/sandbag/main.webp',20,25,'Sandbags',1,0,0,GETDATE(),GETDATE()),
('Shaker','shaker','Premium shaker cup product','MEDIAPRODU134',6.17,NULL,52,4.2,24,'/media/products/rogue-fitness/shaker/main.webp',20,48,'Shaker Cup',1,1,0,GETDATE(),GETDATE()),
('Slam Ball','rogue-fitness-slam-ball','Premium slam balls product','MEDIAPRODU135',26.79,NULL,67,4.7,129,'/media/products/rogue-fitness/slam-ball/main.webp',20,24,'Slam Balls',1,0,0,GETDATE(),GETDATE()),
('Water Bottle','water-bottle','Premium water bottle product','MEDIAPRODU136',17.04,NULL,97,4.7,339,'/media/products/rogue-fitness/water-bottle/main.webp',20,49,'Water Bottle',1,0,0,GETDATE(),GETDATE()),
('Wrist Wraps','wrist-wraps','Premium wrist wraps product','MEDIAPRODU137',20.19,NULL,118,4.8,486,'/media/products/rogue-fitness/wrist-wraps/main.webp',20,42,'Wrist Wraps',1,0,0,GETDATE(),GETDATE()),
('R1 Isolate','r1-isolate','Premium whey isolate product','MEDIAPRODU138',45.99,34.49,105,4.5,395,'/media/products/rule-one/r1-isolate/main.webp',1,2,'Whey Isolate',1,0,1,GETDATE(),GETDATE()),
('Rule 1 R1 Whey','rule-1-r1-whey','Premium whey protein product','MEDIAPRODU139',42.79,NULL,114,4.4,458,'/media/products/rule-one/rule-1-r1-whey/main.webp',1,1,'Whey Protein',1,0,0,GETDATE(),GETDATE()),
('Sbd 13Mm Belt','sbd-13mm-belt','Premium lifting belts product','MEDIAPRODU140',31.79,NULL,53,4.3,31,'/media/products/sbd/sbd-13mm-belt/main.webp',36,43,'Lifting Belts',1,1,0,GETDATE(),GETDATE()),
('Sbd 7Mm Knee Sleeves','sbd-7mm-knee-sleeves','Premium knee sleeves product','MEDIAPRODU141',25.59,NULL,64,4.4,108,'/media/products/sbd/sbd-7mm-knee-sleeves/main.webp',36,45,'Knee Sleeves',1,0,0,GETDATE(),GETDATE()),
('Sbd Lifting Straps','sbd-lifting-straps','Premium lifting straps product','MEDIAPRODU142',10.19,7.64,51,4.1,17,'/media/products/sbd/sbd-lifting-straps/main.webp',36,44,'Lifting Straps',1,1,1,GETDATE(),GETDATE()),
('Sbd Wrist Wraps','sbd-wrist-wraps','Premium wrist wraps product','MEDIAPRODU143',24.69,NULL,148,4.8,696,'/media/products/sbd/sbd-wrist-wraps/main.webp',36,42,'Wrist Wraps',1,0,0,GETDATE(),GETDATE()),
('Sb700','sb700','Premium treadmills product','MEDIAPRODU144',739.99,554.99,66,4.6,122,'/media/products/sole-fitness/sb700/main.webp',26,26,'Treadmills',1,0,1,GETDATE(),GETDATE()),
('Sb900','sb900','Premium treadmills product','MEDIAPRODU145',1654.99,NULL,127,4.7,549,'/media/products/sole-fitness/sb900/main.webp',26,26,'Treadmills',1,0,0,GETDATE(),GETDATE()),
('Sc800','sc800','Premium treadmills product','MEDIAPRODU146',1519.99,NULL,118,4.8,486,'/media/products/sole-fitness/sc800/main.webp',26,26,'Treadmills',1,0,0,GETDATE(),GETDATE()),
('Sole Climber','sole-climber','Premium treadmills product','MEDIAPRODU147',1549.99,1162.49,120,4.0,500,'/media/products/sole-fitness/sole-climber/main.webp',26,26,'Treadmills',1,0,1,GETDATE(),GETDATE()),
('Sole E25 Elliptical','sole-e25-elliptical','Premium ellipticals product','MEDIAPRODU148',1474.99,1179.99,115,4.5,465,'/media/products/sole-fitness/sole-e25-elliptical/main.webp',26,30,'Ellipticals',1,0,1,GETDATE(),GETDATE()),
('Sole E35 Elliptical','sole-e35-elliptical','Premium ellipticals product','MEDIAPRODU149',1204.99,NULL,97,4.7,339,'/media/products/sole-fitness/sole-e35-elliptical/main.webp',26,30,'Ellipticals',1,0,0,GETDATE(),GETDATE()),
('Sole F63 Treadmill','sole-f63-treadmill','Premium treadmills product','MEDIAPRODU150',679.99,NULL,62,4.2,94,'/media/products/sole-fitness/sole-f63-treadmill/main.webp',26,26,'Treadmills',1,0,0,GETDATE(),GETDATE()),
('Sole F80 Treadmill','sole-f80-treadmill','Premium treadmills product','MEDIAPRODU151',1774.99,1331.24,135,4.5,605,'/media/products/sole-fitness/sole-f80-treadmill/main.webp',26,26,'Treadmills',1,0,1,GETDATE(),GETDATE()),
('Titan Olympic Bar','titan-olympic-bar','Premium adjustable dumbbells product','MEDIAPRODU152',344.99,NULL,99,4.9,353,'/media/products/titan-fitness/titan-olympic-bar/main.webp',23,16,'Adjustable Dumbbells',1,0,0,GETDATE(),GETDATE()),
('Trx Bands','trx-bands','Premium resistance bands product','MEDIAPRODU153',55.49,41.62,141,4.1,647,'/media/products/trx/trx-bands/main.webp',38,38,'Resistance Bands',1,0,1,GETDATE(),GETDATE()),
('Bra','under-armour-bra','Premium women sports bra product','MEDIAPRODU154',50.54,NULL,123,4.3,521,'/media/products/under-armour/bra/main.webp',28,57,'Women Sports Bra',1,0,0,GETDATE(),GETDATE()),
('Compression','compression','Premium men compression product','MEDIAPRODU155',44.69,NULL,92,4.2,304,'/media/products/under-armour/compression/main.webp',28,55,'Men Compression',1,0,0,GETDATE(),GETDATE()),
('Gloves','under-armour-gloves','Premium gym gloves product','MEDIAPRODU156',32.49,24.37,120,4.0,500,'/media/products/under-armour/gloves/main.webp',28,41,'Gym Gloves',1,0,1,GETDATE(),GETDATE()),
('Hydro Flask','hydro-flask','Premium women tops product','MEDIAPRODU157',49.29,34.5,131,4.1,577,'/media/products/under-armour/hydro-flask/main.webp',28,58,'Women Tops',1,0,1,GETDATE(),GETDATE()),
('Leggings','under-armour-leggings','Premium women leggings product','MEDIAPRODU158',55.59,44.47,76,4.6,192,'/media/products/under-armour/leggings/main.webp',28,56,'Women Leggings',1,0,1,GETDATE(),GETDATE()),
('Shorts','under-armour-shorts','Premium men shorts product','MEDIAPRODU159',51.94,NULL,127,4.7,549,'/media/products/under-armour/shorts/main.webp',28,53,'Men Shorts',1,0,0,GETDATE(),GETDATE()),
('Tech Tank','tech-tank','Premium men tank tops product','MEDIAPRODU160',39.99,27.99,110,4.0,430,'/media/products/under-armour/tech-tank/main.webp',28,51,'Men Tank Tops',1,0,1,GETDATE(),GETDATE()),
('Hoodie','vuori-hoodie','Premium men hoodies product','MEDIAPRODU161',67.49,50.62,105,4.5,395,'/media/products/vuori/hoodie/main.webp',31,52,'Men Hoodies',1,0,1,GETDATE(),GETDATE()),
('Kore Joggers','kore-joggers','Premium men joggers product','MEDIAPRODU162',57.04,NULL,99,4.9,353,'/media/products/vuori/kore-joggers/main.webp',31,54,'Men Joggers',1,0,0,GETDATE(),GETDATE()),
('Vuori Performance Jogger','vuori-performance-jogger','Premium men joggers product','MEDIAPRODU163',60.19,48.15,106,4.6,402,'/media/products/vuori/vuori-performance-jogger/main.webp',31,54,'Men Joggers',1,0,1,GETDATE(),GETDATE()),
('4','4','Premium smart watch product','MEDIAPRODU164',427.99,NULL,107,4.7,409,'/media/products/whoop/4/main.webp',42,64,'Smart Watch',1,0,0,GETDATE(),GETDATE()),
('Body Scan','body-scan','Premium smart scale product','MEDIAPRODU165',196.59,NULL,148,4.8,696,'/media/products/withings/body-scan/main.webp',41,67,'Smart Scale',1,0,0,GETDATE(),GETDATE()),
('Withings Body+','withings-body+','Premium smart scale product','MEDIAPRODU166',167.69,117.38,131,4.1,577,'/media/products/withings/withings-body+/main.webp',41,67,'Smart Scale',1,0,1,GETDATE(),GETDATE());
GO

-- ============================================
-- TEST ACCOUNTS
-- ============================================
-- Password for both: Test@123 (bcrypt hash)
INSERT INTO Users (email, password, name, phone, role, is_active, email_verified, created_at, updated_at)
VALUES
('testuser@gymer.com', '$2b$10$SfRreuG7pf.c8E3H1spEiup0aAhoR504RRwRfnbpiUNlYZcrtOVbO', 'Test User', '0900000001', 'member', 1, 1, GETDATE(), GETDATE()),
('testcoach@gymer.com', '$2b$10$SfRreuG7pf.c8E3H1spEiup0aAhoR504RRwRfnbpiUNlYZcrtOVbO', 'Test Coach', '0900000002', 'coach', 1, 1, GETDATE(), GETDATE());
GO

PRINT '========================================';
GO

-- SELLER-002/003 canonical marketplace convergence
CREATE TABLE dbo.Shops(
 id INT IDENTITY(1,1) PRIMARY KEY,owner_user_id INT NULL,system_key NVARCHAR(100) NULL,name NVARCHAR(200) NOT NULL,slug NVARCHAR(200) NOT NULL,
 logo_url NVARCHAR(500) NULL,banner_url NVARCHAR(500) NULL,description NVARCHAR(2000) NULL,pickup_address NVARCHAR(500) NULL,
 status NVARCHAR(20) NOT NULL DEFAULT N'ACTIVE',is_verified BIT NOT NULL DEFAULT 0,is_system BIT NOT NULL DEFAULT 0,
 average_rating DECIMAL(3,2) NOT NULL DEFAULT 0,review_count INT NOT NULL DEFAULT 0,completed_order_count INT NOT NULL DEFAULT 0,sold_count INT NOT NULL DEFAULT 0,
 created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),row_version ROWVERSION,
 CONSTRAINT FK_Shops_Owner FOREIGN KEY(owner_user_id) REFERENCES dbo.Users(id),CONSTRAINT UQ_Shops_Slug UNIQUE(slug),
 CONSTRAINT CK_Shops_Status CHECK(status IN(N'ACTIVE',N'SUSPENDED')),
 CONSTRAINT CK_Shops_SystemOwnership CHECK((is_system=1 AND owner_user_id IS NULL AND system_key IS NOT NULL) OR (is_system=0 AND owner_user_id IS NOT NULL AND system_key IS NULL))
);
CREATE UNIQUE INDEX UX_Shops_Owner ON dbo.Shops(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE UNIQUE INDEX UX_Shops_SystemKey ON dbo.Shops(system_key) WHERE system_key IS NOT NULL;
INSERT dbo.Shops(system_key,name,slug,status,is_verified,is_system) VALUES(N'GYMFIT_OFFICIAL',N'GymFit Official',N'gymfit-official',N'ACTIVE',1,1);
ALTER TABLE dbo.Products ADD shop_id INT NULL;
GO
UPDATE dbo.Products SET shop_id=(SELECT id FROM dbo.Shops WHERE system_key=N'GYMFIT_OFFICIAL');
ALTER TABLE dbo.Products ALTER COLUMN shop_id INT NOT NULL;
ALTER TABLE dbo.Products ADD CONSTRAINT FK_Products_Shops FOREIGN KEY(shop_id) REFERENCES dbo.Shops(id);
CREATE INDEX IX_Products_Shop_Active ON dbo.Products(shop_id,is_active,id);
GO

ALTER TABLE dbo.Brands ADD normalized_name NVARCHAR(200) NULL,is_generic BIT NOT NULL DEFAULT 0;
GO
UPDATE dbo.Brands SET normalized_name=LOWER(LTRIM(RTRIM(name)));
WHILE EXISTS(SELECT 1 FROM dbo.Brands WHERE normalized_name LIKE N'%  %') UPDATE dbo.Brands SET normalized_name=REPLACE(normalized_name,N'  ',N' ');
ALTER TABLE dbo.Brands ALTER COLUMN normalized_name NVARCHAR(200) NOT NULL;
CREATE UNIQUE INDEX UX_Brands_NormalizedName ON dbo.Brands(normalized_name);
CREATE UNIQUE INDEX UX_Brands_OneGeneric ON dbo.Brands(is_generic) WHERE is_generic=1;
IF EXISTS(SELECT 1 FROM dbo.Brands WHERE normalized_name=LOWER(N'Không có thương hiệu'))
 UPDATE dbo.Brands SET is_generic=1,is_active=1 WHERE normalized_name=LOWER(N'Không có thương hiệu');
ELSE INSERT dbo.Brands(name,slug,normalized_name,is_generic,is_active) VALUES(N'Không có thương hiệu',N'khong-co-thuong-hieu',LOWER(N'Không có thương hiệu'),1,1);
GO

CREATE TABLE dbo.BrandRequests(
 id INT IDENTITY(1,1) PRIMARY KEY,requester_user_id INT NOT NULL,shop_id INT NOT NULL,requested_name NVARCHAR(200) NOT NULL,normalized_name NVARCHAR(200) NOT NULL,
 website_url NVARCHAR(500) NULL,description NVARCHAR(2000) NULL,status NVARCHAR(20) NOT NULL DEFAULT N'PENDING',resolved_brand_id INT NULL,
 review_reason NVARCHAR(1000) NULL,reviewed_by_user_id INT NULL,reviewed_at DATETIME2 NULL,created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),row_version ROWVERSION,
 FOREIGN KEY(requester_user_id) REFERENCES dbo.Users(id),FOREIGN KEY(shop_id) REFERENCES dbo.Shops(id),FOREIGN KEY(resolved_brand_id) REFERENCES dbo.Brands(id),
 FOREIGN KEY(reviewed_by_user_id) REFERENCES dbo.Users(id),CHECK(status IN(N'PENDING',N'APPROVED',N'REJECTED')),
 CONSTRAINT CK_BrandRequests_State CHECK((status=N'PENDING' AND resolved_brand_id IS NULL AND reviewed_by_user_id IS NULL AND reviewed_at IS NULL AND review_reason IS NULL)
 OR(status=N'APPROVED' AND resolved_brand_id IS NOT NULL AND reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL)
 OR(status=N'REJECTED' AND resolved_brand_id IS NULL AND reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL AND LEN(LTRIM(RTRIM(review_reason)))>0))
);
CREATE UNIQUE INDEX UX_BrandRequests_PendingNormalized ON dbo.BrandRequests(normalized_name) WHERE status=N'PENDING';
CREATE INDEX IX_BrandRequests_Shop_Status_Created ON dbo.BrandRequests(shop_id,status,created_at DESC,id DESC);
CREATE TABLE dbo.BrandRequestStatusHistory(id BIGINT IDENTITY(1,1) PRIMARY KEY,brand_request_id INT NOT NULL,from_status NVARCHAR(20) NULL,to_status NVARCHAR(20) NOT NULL,actor_user_id INT NULL,reason NVARCHAR(1000) NULL,created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),FOREIGN KEY(brand_request_id) REFERENCES dbo.BrandRequests(id),FOREIGN KEY(actor_user_id) REFERENCES dbo.Users(id));
GO
CREATE OR ALTER TRIGGER dbo.TR_BrandRequestStatusHistory_Immutable ON dbo.BrandRequestStatusHistory AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON;THROW 51300,'Brand request status history is immutable.',1;END;
GO

-- SELLER-005 Product lifecycle foundation
ALTER TABLE dbo.Products ADD
 moderation_status NVARCHAR(20) NOT NULL CONSTRAINT DF_Products_ModerationStatus DEFAULT N'PUBLISHED',
 submitted_at DATETIME2 NULL,review_reason NVARCHAR(1000) NULL,brand_request_id INT NULL,
 CONSTRAINT FK_Products_BrandRequest FOREIGN KEY(brand_request_id) REFERENCES dbo.BrandRequests(id),
 CONSTRAINT CK_Products_ModerationStatus CHECK(moderation_status IN(N'DRAFT',N'PENDING_REVIEW',N'PUBLISHED',N'REJECTED',N'SUSPENDED')),
 CONSTRAINT CK_Products_BrandSource CHECK((brand_id IS NOT NULL AND brand_request_id IS NULL) OR (brand_id IS NULL AND brand_request_id IS NOT NULL)),
 CONSTRAINT CK_Products_ModerationState CHECK(
  (moderation_status=N'DRAFT' AND submitted_at IS NULL AND is_active=0)
  OR(moderation_status=N'PENDING_REVIEW' AND submitted_at IS NOT NULL AND review_reason IS NULL AND is_active=0)
  OR(moderation_status=N'PUBLISHED' AND brand_id IS NOT NULL AND brand_request_id IS NULL)
  OR(moderation_status=N'REJECTED' AND is_active=0)
  OR(moderation_status=N'SUSPENDED' AND is_active=0));
CREATE INDEX IX_Products_Shop_Moderation ON dbo.Products(shop_id,moderation_status,updated_at DESC,id DESC);
CREATE INDEX IX_Products_Moderation_Submitted ON dbo.Products(moderation_status,submitted_at,id) INCLUDE(shop_id,is_active,brand_id,category_id);
GO

-- SELLER-006 Admin Product moderation
ALTER TABLE dbo.Products ADD reviewed_at DATETIME2 NULL,published_at DATETIME2 NULL,reviewed_by_user_id INT NULL,
 CONSTRAINT FK_Products_ReviewedBy FOREIGN KEY(reviewed_by_user_id) REFERENCES dbo.Users(id);
CREATE TABLE dbo.ProductModerationHistory(
 id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProductModerationHistory PRIMARY KEY,
 product_id INT NOT NULL,from_status NVARCHAR(20) NULL,to_status NVARCHAR(20) NOT NULL,actor_user_id INT NULL,reason NVARCHAR(1000) NULL,
 created_at DATETIME2 NOT NULL CONSTRAINT DF_ProductModerationHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_ProductModerationHistory_Product FOREIGN KEY(product_id) REFERENCES dbo.Products(id),
 CONSTRAINT FK_ProductModerationHistory_Actor FOREIGN KEY(actor_user_id) REFERENCES dbo.Users(id),
 CONSTRAINT CK_ProductModerationHistory_FromStatus CHECK(from_status IS NULL OR from_status IN(N'DRAFT',N'PENDING_REVIEW',N'PUBLISHED',N'REJECTED',N'SUSPENDED')),
 CONSTRAINT CK_ProductModerationHistory_ToStatus CHECK(to_status IN(N'DRAFT',N'PENDING_REVIEW',N'PUBLISHED',N'REJECTED',N'SUSPENDED')),
 CONSTRAINT CK_ProductModerationHistory_Reason CHECK(to_status NOT IN(N'REJECTED',N'SUSPENDED') OR LEN(LTRIM(RTRIM(reason)))>0));
CREATE INDEX IX_ProductModerationHistory_Product_Created ON dbo.ProductModerationHistory(product_id,created_at DESC,id DESC);
CREATE INDEX IX_ProductModerationHistory_Status_Created ON dbo.ProductModerationHistory(to_status,created_at DESC,id DESC);
CREATE INDEX IX_Products_Moderation_Reviewed ON dbo.Products(moderation_status,reviewed_at DESC,id DESC) INCLUDE(shop_id,is_active,submitted_at,published_at);
GO
CREATE OR ALTER TRIGGER dbo.TR_ProductModerationHistory_Immutable ON dbo.ProductModerationHistory AFTER UPDATE,DELETE AS
BEGIN SET NOCOUNT ON;THROW 51400,'Product moderation history is immutable.',1;END;
GO

