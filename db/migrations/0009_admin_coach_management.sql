/* Admin Coach governance state. Additive only: existing Coach/Member data and
   the Auth/JWT model remain unchanged. */
IF COL_LENGTH(N'dbo.Users', N'coach_status') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD coach_status NVARCHAR(20) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Users', N'coach_status_reason') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD coach_status_reason NVARCHAR(500) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Users', N'coach_status_updated_at') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD coach_status_updated_at DATETIME2 NULL;
END;
GO

UPDATE dbo.Users
SET coach_status = CASE WHEN is_active = 1 THEN N'ACTIVE' ELSE N'INACTIVE' END,
    coach_status_updated_at = COALESCE(coach_status_updated_at, updated_at)
WHERE role = N'coach' AND coach_status IS NULL;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.Users')
    AND name = N'CK_Users_CoachStatus'
)
BEGIN
  ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_CoachStatus
    CHECK (coach_status IS NULL OR coach_status IN (N'ACTIVE', N'SUSPENDED', N'INACTIVE'));
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'dbo.Users')
    AND name = N'IX_Users_CoachStatus'
)
BEGIN
  CREATE INDEX IX_Users_CoachStatus ON dbo.Users(role, coach_status, is_active, created_at DESC, id DESC);
END;
GO
