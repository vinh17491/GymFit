/*
  GymFit Migration 001: Add audit columns to key tables.
  Safe to run multiple times (IF NOT EXISTS).
*/

/* ============ Users ============ */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='LastLoginAt')
BEGIN
  ALTER TABLE Users ADD LastLoginAt DATETIME2 NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='IsDeleted')
BEGIN
  ALTER TABLE Users ADD IsDeleted BIT NOT NULL CONSTRAINT DF_Users_IsDeleted DEFAULT 0;
END
GO

/* ============ Orders ============ */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Orders') AND name='DeletedAt')
BEGIN
  ALTER TABLE Orders ADD DeletedAt DATETIME2 NULL;
END
GO

/* ============ Products ============ */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Products') AND name='DeletedAt')
BEGIN
  ALTER TABLE Products ADD DeletedAt DATETIME2 NULL;
END
GO

/* ============ Coaches ============ */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Coaches') AND name='DeletedAt')
BEGIN
  ALTER TABLE Coaches ADD DeletedAt DATETIME2 NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Coaches') AND name='IsPublished')
BEGIN
  ALTER TABLE Coaches ADD IsPublished BIT NOT NULL CONSTRAINT DF_Coaches_IsPublished DEFAULT 1;
END
GO

/* ============ Memberships ============ */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Memberships') AND name='DeletedAt')
BEGIN
  ALTER TABLE Memberships ADD DeletedAt DATETIME2 NULL;
END
GO

/* ============ Bookings ============ */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Bookings') AND name='DeletedAt')
BEGIN
  ALTER TABLE Bookings ADD DeletedAt DATETIME2 NULL;
END
GO

/* ============ Category ============ */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Category') AND name='DeletedAt')
BEGIN
  ALTER TABLE Category ADD DeletedAt DATETIME2 NULL;
END
GO