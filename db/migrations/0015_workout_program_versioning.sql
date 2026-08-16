/* Coach workout program version lifecycle.
   Existing program rows are backfilled without changing Assignment.program_id;
   an Assignment therefore continues to point at the exact program version it
   was created with. Structural edits are enforced by the Coach service for
   DRAFT rows; these columns provide the durable lifecycle contract. */

IF COL_LENGTH(N'dbo.WorkoutPrograms', N'root_program_id') IS NULL
  ALTER TABLE dbo.WorkoutPrograms ADD root_program_id INT NULL;
GO
IF COL_LENGTH(N'dbo.WorkoutPrograms', N'version_number') IS NULL
  ALTER TABLE dbo.WorkoutPrograms ADD version_number INT NULL;
GO
IF COL_LENGTH(N'dbo.WorkoutPrograms', N'lifecycle_status') IS NULL
  ALTER TABLE dbo.WorkoutPrograms ADD lifecycle_status NVARCHAR(20) NULL;
GO
IF COL_LENGTH(N'dbo.WorkoutPrograms', N'published_at') IS NULL
  ALTER TABLE dbo.WorkoutPrograms ADD published_at DATETIME2 NULL;
GO
IF COL_LENGTH(N'dbo.WorkoutPrograms', N'cloned_from_program_id') IS NULL
  ALTER TABLE dbo.WorkoutPrograms ADD cloned_from_program_id INT NULL;
GO

UPDATE p
SET root_program_id = p.id
FROM dbo.WorkoutPrograms p
WHERE p.root_program_id IS NULL;

UPDATE p
SET version_number = 1
FROM dbo.WorkoutPrograms p
WHERE p.version_number IS NULL OR p.version_number < 1;

/* Preserve legacy active rows already used by an Assignment as Published;
   unassigned active rows remain editable Drafts. */
UPDATE p
SET lifecycle_status = CASE
  WHEN p.is_active = 0 THEN N'ARCHIVED'
  WHEN EXISTS (
    SELECT 1
    FROM dbo.CoachProgramAssignments a
    WHERE a.program_id = p.id
      AND a.status IN (N'ACTIVE', N'PAUSED')
  ) THEN N'PUBLISHED'
  ELSE N'DRAFT'
END
FROM dbo.WorkoutPrograms p
WHERE p.lifecycle_status IS NULL;

UPDATE p
SET published_at = COALESCE(p.updated_at, p.created_at, SYSUTCDATETIME())
FROM dbo.WorkoutPrograms p
WHERE p.lifecycle_status = N'PUBLISHED' AND p.published_at IS NULL;

/* root_program_id remains nullable at the storage boundary so a new identity
   can be inserted and self-rooted in the same service transaction. Existing
   and successfully-created rows are always populated by the Coach service. */
ALTER TABLE dbo.WorkoutPrograms ALTER COLUMN version_number INT NOT NULL;
ALTER TABLE dbo.WorkoutPrograms ALTER COLUMN lifecycle_status NVARCHAR(20) NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_WorkoutPrograms_VersionNumber')
  ALTER TABLE dbo.WorkoutPrograms ADD CONSTRAINT CK_WorkoutPrograms_VersionNumber CHECK (version_number >= 1);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_WorkoutPrograms_LifecycleStatus')
  ALTER TABLE dbo.WorkoutPrograms ADD CONSTRAINT CK_WorkoutPrograms_LifecycleStatus CHECK (lifecycle_status IN (N'DRAFT',N'PUBLISHED',N'ARCHIVED'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_WorkoutPrograms_PublishedAt')
  ALTER TABLE dbo.WorkoutPrograms ADD CONSTRAINT CK_WorkoutPrograms_PublishedAt CHECK ((lifecycle_status = N'PUBLISHED' AND published_at IS NOT NULL) OR lifecycle_status <> N'PUBLISHED');

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_WorkoutPrograms_RootProgram')
  ALTER TABLE dbo.WorkoutPrograms ADD CONSTRAINT FK_WorkoutPrograms_RootProgram FOREIGN KEY (root_program_id) REFERENCES dbo.WorkoutPrograms(id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_WorkoutPrograms_ClonedFrom')
  ALTER TABLE dbo.WorkoutPrograms ADD CONSTRAINT FK_WorkoutPrograms_ClonedFrom FOREIGN KEY (cloned_from_program_id) REFERENCES dbo.WorkoutPrograms(id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_WorkoutPrograms_RootVersion' AND object_id = OBJECT_ID(N'dbo.WorkoutPrograms'))
  CREATE UNIQUE INDEX UX_WorkoutPrograms_RootVersion ON dbo.WorkoutPrograms(root_program_id,version_number);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_WorkoutPrograms_Lifecycle' AND object_id = OBJECT_ID(N'dbo.WorkoutPrograms'))
  CREATE INDEX IX_WorkoutPrograms_Lifecycle ON dbo.WorkoutPrograms(owner_coach_id,lifecycle_status,is_active,updated_at DESC,id DESC);
