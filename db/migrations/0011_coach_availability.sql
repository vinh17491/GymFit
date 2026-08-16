/*
  Coach availability is represented by recurring weekly windows and date-specific
  exceptions. Slots are computed by the Coach availability service; this migration
  deliberately does not materialize a fixed-slot table.

  SQL Server has no exclusion constraint. Exact duplicates are prevented here;
  overlapping windows must be rejected by the service inside a serializable
  transaction (Phase 16).
*/

IF OBJECT_ID(N'dbo.CoachAvailabilityRules', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CoachAvailabilityRules (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CoachAvailabilityRules PRIMARY KEY,
    coach_id INT NOT NULL,
    weekday TINYINT NOT NULL,
    start_time TIME(0) NOT NULL,
    end_time TIME(0) NOT NULL,
    mode NVARCHAR(20) NOT NULL,
    location NVARCHAR(255) NULL,
    is_active BIT NOT NULL CONSTRAINT DF_CoachAvailabilityRules_IsActive DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_CoachAvailabilityRules_Created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_CoachAvailabilityRules_Updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_CoachAvailabilityRules_Coach FOREIGN KEY (coach_id) REFERENCES dbo.Users(id),
    CONSTRAINT CK_CoachAvailabilityRules_Weekday CHECK (weekday BETWEEN 1 AND 7),
    CONSTRAINT CK_CoachAvailabilityRules_TimeRange CHECK (start_time < end_time),
    CONSTRAINT CK_CoachAvailabilityRules_Mode CHECK (mode IN (N'ONLINE', N'IN_PERSON', N'BOTH')),
    CONSTRAINT UQ_CoachAvailabilityRules_Exact UNIQUE (coach_id, weekday, start_time, end_time, mode)
  );
END;

IF OBJECT_ID(N'dbo.CoachAvailabilityExceptions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CoachAvailabilityExceptions (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CoachAvailabilityExceptions PRIMARY KEY,
    coach_id INT NOT NULL,
    exception_date DATE NOT NULL,
    exception_type NVARCHAR(20) NOT NULL,
    start_time TIME(0) NULL,
    end_time TIME(0) NULL,
    mode NVARCHAR(20) NULL,
    location NVARCHAR(255) NULL,
    note NVARCHAR(1000) NULL,
    is_active BIT NOT NULL CONSTRAINT DF_CoachAvailabilityExceptions_IsActive DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_CoachAvailabilityExceptions_Created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_CoachAvailabilityExceptions_Updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_CoachAvailabilityExceptions_Coach FOREIGN KEY (coach_id) REFERENCES dbo.Users(id),
    CONSTRAINT CK_CoachAvailabilityExceptions_Type CHECK (exception_type IN (N'BLOCK', N'OPEN')),
    CONSTRAINT CK_CoachAvailabilityExceptions_TimeRange CHECK (
      (exception_type = N'BLOCK' AND start_time IS NULL AND end_time IS NULL)
      OR
      (exception_type = N'OPEN' AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    ),
    CONSTRAINT CK_CoachAvailabilityExceptions_Mode CHECK (mode IS NULL OR mode IN (N'ONLINE', N'IN_PERSON', N'BOTH')),
    CONSTRAINT UQ_CoachAvailabilityExceptions_Exact UNIQUE (coach_id, exception_date, exception_type, start_time, end_time)
  );
END;

/* Keep the migration safe if an earlier partial deployment created a table without
   one of the named constraints. Fresh deployments already create these in-table. */
IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'FK_CoachAvailabilityRules_Coach'
    AND parent_object_id = OBJECT_ID(N'dbo.CoachAvailabilityRules')
)
  ALTER TABLE dbo.CoachAvailabilityRules
    ADD CONSTRAINT FK_CoachAvailabilityRules_Coach FOREIGN KEY (coach_id) REFERENCES dbo.Users(id);

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_CoachAvailabilityRules_Weekday'
    AND parent_object_id = OBJECT_ID(N'dbo.CoachAvailabilityRules')
)
  ALTER TABLE dbo.CoachAvailabilityRules
    ADD CONSTRAINT CK_CoachAvailabilityRules_Weekday CHECK (weekday BETWEEN 1 AND 7);

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_CoachAvailabilityRules_TimeRange'
    AND parent_object_id = OBJECT_ID(N'dbo.CoachAvailabilityRules')
)
  ALTER TABLE dbo.CoachAvailabilityRules
    ADD CONSTRAINT CK_CoachAvailabilityRules_TimeRange CHECK (start_time < end_time);

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_CoachAvailabilityRules_Mode'
    AND parent_object_id = OBJECT_ID(N'dbo.CoachAvailabilityRules')
)
  ALTER TABLE dbo.CoachAvailabilityRules
    ADD CONSTRAINT CK_CoachAvailabilityRules_Mode CHECK (mode IN (N'ONLINE', N'IN_PERSON', N'BOTH'));

IF NOT EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE name = N'UQ_CoachAvailabilityRules_Exact'
    AND parent_object_id = OBJECT_ID(N'dbo.CoachAvailabilityRules')
)
  ALTER TABLE dbo.CoachAvailabilityRules
    ADD CONSTRAINT UQ_CoachAvailabilityRules_Exact UNIQUE (coach_id, weekday, start_time, end_time, mode);

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'FK_CoachAvailabilityExceptions_Coach'
    AND parent_object_id = OBJECT_ID(N'dbo.CoachAvailabilityExceptions')
)
  ALTER TABLE dbo.CoachAvailabilityExceptions
    ADD CONSTRAINT FK_CoachAvailabilityExceptions_Coach FOREIGN KEY (coach_id) REFERENCES dbo.Users(id);

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_CoachAvailabilityExceptions_Type'
    AND parent_object_id = OBJECT_ID(N'dbo.CoachAvailabilityExceptions')
)
  ALTER TABLE dbo.CoachAvailabilityExceptions
    ADD CONSTRAINT CK_CoachAvailabilityExceptions_Type CHECK (exception_type IN (N'BLOCK', N'OPEN'));

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_CoachAvailabilityExceptions_TimeRange'
    AND parent_object_id = OBJECT_ID(N'dbo.CoachAvailabilityExceptions')
)
  ALTER TABLE dbo.CoachAvailabilityExceptions
    ADD CONSTRAINT CK_CoachAvailabilityExceptions_TimeRange CHECK (
      (exception_type = N'BLOCK' AND start_time IS NULL AND end_time IS NULL)
      OR
      (exception_type = N'OPEN' AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    );

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_CoachAvailabilityExceptions_Mode'
    AND parent_object_id = OBJECT_ID(N'dbo.CoachAvailabilityExceptions')
)
  ALTER TABLE dbo.CoachAvailabilityExceptions
    ADD CONSTRAINT CK_CoachAvailabilityExceptions_Mode CHECK (mode IS NULL OR mode IN (N'ONLINE', N'IN_PERSON', N'BOTH'));

IF NOT EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE name = N'UQ_CoachAvailabilityExceptions_Exact'
    AND parent_object_id = OBJECT_ID(N'dbo.CoachAvailabilityExceptions')
)
  ALTER TABLE dbo.CoachAvailabilityExceptions
    ADD CONSTRAINT UQ_CoachAvailabilityExceptions_Exact UNIQUE (coach_id, exception_date, exception_type, start_time, end_time);

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_CoachAvailabilityRules_CoachDayActive'
    AND object_id = OBJECT_ID(N'dbo.CoachAvailabilityRules')
)
  CREATE INDEX IX_CoachAvailabilityRules_CoachDayActive
    ON dbo.CoachAvailabilityRules(coach_id, weekday, is_active, start_time)
    INCLUDE (end_time, mode, location);

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_CoachAvailabilityExceptions_CoachDateActive'
    AND object_id = OBJECT_ID(N'dbo.CoachAvailabilityExceptions')
)
  CREATE INDEX IX_CoachAvailabilityExceptions_CoachDateActive
    ON dbo.CoachAvailabilityExceptions(coach_id, exception_date, is_active)
    INCLUDE (exception_type, start_time, end_time, mode, location);
