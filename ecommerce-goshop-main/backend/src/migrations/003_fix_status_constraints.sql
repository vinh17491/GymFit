-- Fix: Thêm PENDING vào CHECK membership status
ALTER TABLE [dbo].[Memberships] DROP CONSTRAINT [CK_Memberships_Status];
ALTER TABLE [dbo].[Memberships] ADD CONSTRAINT [CK_Memberships_Status] 
  CHECK ([Status] IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'));

-- Fix: Thêm PENDING vào CHECK booking status
ALTER TABLE [dbo].[Bookings] DROP CONSTRAINT [CK_Bookings_Status];
ALTER TABLE [dbo].[Bookings] ADD CONSTRAINT [CK_Bookings_Status]
  CHECK ([Status] IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'));

-- Fix: Thêm cột Amount cho Bookings (nếu chưa có)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Bookings]') AND name = 'Amount')
BEGIN
    ALTER TABLE [dbo].[Bookings] ADD [Amount] DECIMAL(10,2) NULL;
END