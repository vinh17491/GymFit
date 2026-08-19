SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.AnalyticsRetention', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AnalyticsRetention (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AnalyticsRetention PRIMARY KEY,
    cohort_date DATE NOT NULL,
    day_1 INT NULL,
    day_7 INT NULL,
    day_14 INT NULL,
    day_30 INT NULL,
    day_60 INT NULL,
    day_90 INT NULL,
    total_users INT NOT NULL CONSTRAINT DF_AnalyticsRetention_TotalUsers DEFAULT 0,
    CONSTRAINT UQ_AnalyticsRetention_CohortDate UNIQUE (cohort_date),
    CONSTRAINT CK_AnalyticsRetention_Counts CHECK (
      (day_1 IS NULL OR day_1 >= 0) AND (day_7 IS NULL OR day_7 >= 0) AND
      (day_14 IS NULL OR day_14 >= 0) AND (day_30 IS NULL OR day_30 >= 0) AND
      (day_60 IS NULL OR day_60 >= 0) AND (day_90 IS NULL OR day_90 >= 0) AND
      total_users >= 0
    )
  );
END
ELSE IF COL_LENGTH(N'dbo.AnalyticsRetention', N'cohort_date') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsRetention', N'day_1') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsRetention', N'day_7') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsRetention', N'day_14') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsRetention', N'day_30') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsRetention', N'day_60') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsRetention', N'day_90') IS NULL
     OR COL_LENGTH(N'dbo.AnalyticsRetention', N'total_users') IS NULL
  THROW 50190, 'Existing dbo.AnalyticsRetention does not satisfy the retention report contract.', 1;

IF EXISTS (
  SELECT cohort_date FROM dbo.AnalyticsRetention GROUP BY cohort_date HAVING COUNT(*) > 1
)
  THROW 50191, 'Duplicate AnalyticsRetention cohorts require explicit cleanup before analytics migration.', 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.AnalyticsRetention') AND name=N'UX_AnalyticsRetention_CohortDate')
  CREATE UNIQUE INDEX UX_AnalyticsRetention_CohortDate
    ON dbo.AnalyticsRetention(cohort_date);

-- No historical or synthetic cohort rows are inserted here.
