-- ============================================================
-- GymFit V2 - Cleanup: Xoá toàn bộ Stripe columns & constraints
-- ============================================================

USE [GymFit];
GO

-- 1. Memberships — drop StripePaymentId
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Memberships]') AND name = 'StripePaymentId')
BEGIN
    ALTER TABLE [dbo].[Memberships] DROP CONSTRAINT IF EXISTS [DF_Memberships_StripePaymentId];
    ALTER TABLE [dbo].[Memberships] DROP COLUMN [StripePaymentId];
END
GO
-- Fix CHECK: thêm PENDING
ALTER TABLE [dbo].[Memberships] DROP CONSTRAINT IF EXISTS [CK_Memberships_Status];
ALTER TABLE [dbo].[Memberships] ADD CONSTRAINT [CK_Memberships_Status] 
  CHECK ([Status] IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'));
GO

-- 2. Bookings — drop StripePaymentId, thêm Amount
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Bookings]') AND name = 'StripePaymentId')
BEGIN
    ALTER TABLE [dbo].[Bookings] DROP CONSTRAINT IF EXISTS [DF_Bookings_StripePaymentId];
    ALTER TABLE [dbo].[Bookings] DROP COLUMN [StripePaymentId];
END
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Bookings]') AND name = 'Amount')
BEGIN
    ALTER TABLE [dbo].[Bookings] ADD [Amount] DECIMAL(10,2) NULL;
END
GO
-- Fix default: PENDING thay vì CONFIRMED
ALTER TABLE [dbo].[Bookings] DROP CONSTRAINT IF EXISTS [DF_Bookings_Status];
ALTER TABLE [dbo].[Bookings] ADD CONSTRAINT [DF_Bookings_Status] DEFAULT 'PENDING' FOR [Status];
GO
ALTER TABLE [dbo].[Bookings] DROP CONSTRAINT IF EXISTS [CK_Bookings_Status];
ALTER TABLE [dbo].[Bookings] ADD CONSTRAINT [CK_Bookings_Status]
  CHECK ([Status] IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'));
GO

-- 3. Supplements — drop StripePriceId, StripeProductId
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Supplements]') AND name = 'StripePriceId')
BEGIN
    ALTER TABLE [dbo].[Supplements] DROP CONSTRAINT IF EXISTS [DF_Supplements_StripePriceId];
    ALTER TABLE [dbo].[Supplements] DROP COLUMN [StripePriceId];
END
GO
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Supplements]') AND name = 'StripeProductId')
BEGIN
    ALTER TABLE [dbo].[Supplements] DROP CONSTRAINT IF EXISTS [DF_Supplements_StripeProductId];
    ALTER TABLE [dbo].[Supplements] DROP COLUMN [StripeProductId];
END
GO

-- 4. Orders — drop StripeSessionId + unique constraint
IF EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'UQ_Orders_StripeSessionId')
BEGIN
    ALTER TABLE [dbo].[Orders] DROP CONSTRAINT [UQ_Orders_StripeSessionId];
END
GO
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'StripeSessionId')
BEGIN
    ALTER TABLE [dbo].[Orders] DROP CONSTRAINT IF EXISTS [DF_Orders_StripeSessionId];
    ALTER TABLE [dbo].[Orders] DROP COLUMN [StripeSessionId];
END
GO

-- 5. Payments — drop StripePaymentIntentId, StripeSessionId + unique constraint
IF EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[Payments]') AND name = 'UQ_Payments_StripePaymentIntentId')
BEGIN
    ALTER TABLE [dbo].[Payments] DROP CONSTRAINT [UQ_Payments_StripePaymentIntentId];
END
GO
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Payments]') AND name = 'StripePaymentIntentId')
BEGIN
    ALTER TABLE [dbo].[Payments] DROP COLUMN [StripePaymentIntentId];
END
GO
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Payments]') AND name = 'StripeSessionId')
BEGIN
    ALTER TABLE [dbo].[Payments] DROP COLUMN [StripeSessionId];
END
GO
-- Fix Currency default: VND thay vì USD
ALTER TABLE [dbo].[Payments] DROP CONSTRAINT IF EXISTS [DF_Payments_Currency];
ALTER TABLE [dbo].[Payments] ADD CONSTRAINT [DF_Payments_Currency] DEFAULT 'VND' FOR [Currency];
GO

PRINT '✅ Stripe cleanup complete. All Stripe columns removed.';
GO