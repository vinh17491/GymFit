SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.AnalyticsDaily', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AnalyticsDaily (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AnalyticsDaily PRIMARY KEY,
    date DATE NOT NULL,
    dau INT NOT NULL CONSTRAINT DF_AnalyticsDaily_Dau DEFAULT 0,
    new_users INT NOT NULL CONSTRAINT DF_AnalyticsDaily_NewUsers DEFAULT 0,
    new_memberships INT NOT NULL CONSTRAINT DF_AnalyticsDaily_NewMemberships DEFAULT 0,
    revenue DECIMAL(12,2) NOT NULL CONSTRAINT DF_AnalyticsDaily_Revenue DEFAULT 0,
    workouts_completed INT NOT NULL CONSTRAINT DF_AnalyticsDaily_Workouts DEFAULT 0,
    tickets_created INT NOT NULL CONSTRAINT DF_AnalyticsDaily_Tickets DEFAULT 0,
    coupons_used INT NOT NULL CONSTRAINT DF_AnalyticsDaily_Coupons DEFAULT 0,
    points_earned INT NOT NULL CONSTRAINT DF_AnalyticsDaily_PointsEarned DEFAULT 0,
    points_redeemed INT NOT NULL CONSTRAINT DF_AnalyticsDaily_PointsRedeemed DEFAULT 0,
    CONSTRAINT UQ_AnalyticsDaily_Date UNIQUE (date),
    CONSTRAINT CK_AnalyticsDaily_Counts CHECK (
      dau >= 0 AND new_users >= 0 AND new_memberships >= 0 AND
      workouts_completed >= 0 AND tickets_created >= 0 AND coupons_used >= 0 AND
      points_earned >= 0 AND points_redeemed >= 0 AND revenue >= 0
    )
  );
END
ELSE IF COL_LENGTH(N'dbo.AnalyticsDaily', N'date') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsDaily', N'dau') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsDaily', N'new_users') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsDaily', N'new_memberships') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsDaily', N'revenue') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsDaily', N'workouts_completed') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsDaily', N'tickets_created') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsDaily', N'coupons_used') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsDaily', N'points_earned') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsDaily', N'points_redeemed') IS NULL
  THROW 50180, 'Existing dbo.AnalyticsDaily does not satisfy the analytics export contract.', 1;

IF EXISTS (
  SELECT date FROM dbo.AnalyticsDaily GROUP BY date HAVING COUNT(*) > 1
)
  THROW 50181, 'Duplicate AnalyticsDaily dates require explicit cleanup before analytics migration.', 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.AnalyticsDaily') AND name=N'UX_AnalyticsDaily_Date')
  CREATE UNIQUE INDEX UX_AnalyticsDaily_Date ON dbo.AnalyticsDaily(date);

-- This is a stored reporting projection for the existing export route. The
-- migration creates no rows; a separate scheduled writer remains required.
