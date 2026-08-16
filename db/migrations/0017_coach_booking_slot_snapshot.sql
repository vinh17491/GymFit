/* Add the immutable slot details needed to render historical Coach Bookings.
   Existing rows remain NULL because their historical Availability cannot be
   reconstructed safely. */

IF COL_LENGTH(N'dbo.Bookings', N'session_mode') IS NULL
  ALTER TABLE dbo.Bookings ADD session_mode NVARCHAR(20) NULL;
GO

IF COL_LENGTH(N'dbo.Bookings', N'location') IS NULL
  ALTER TABLE dbo.Bookings ADD location NVARCHAR(255) NULL;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_Bookings_SessionMode'
    AND parent_object_id = OBJECT_ID(N'dbo.Bookings')
)
  ALTER TABLE dbo.Bookings
    ADD CONSTRAINT CK_Bookings_SessionMode
    CHECK (session_mode IS NULL OR session_mode IN (N'ONLINE', N'IN_PERSON', N'BOTH'));
GO

