/*
  Private Coach context is deliberately separate from CRMNotes. The row is
  owned by one Coach/Member pair so reassignment can preserve history without
  granting the new Coach access to the previous Coach's private note.
*/

IF OBJECT_ID(N'dbo.CoachMemberContexts', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CoachMemberContexts (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CoachMemberContexts PRIMARY KEY,
    coach_id INT NOT NULL,
    member_id INT NOT NULL,
    goal NVARCHAR(2000) NULL,
    limitations NVARCHAR(2000) NULL,
    private_note NVARCHAR(4000) NULL,
    next_review_date DATE NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_CoachMemberContexts_Created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_CoachMemberContexts_Updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_CoachMemberContexts_Coach FOREIGN KEY (coach_id) REFERENCES dbo.Users(id),
    CONSTRAINT FK_CoachMemberContexts_Member FOREIGN KEY (member_id) REFERENCES dbo.Users(id),
    CONSTRAINT UQ_CoachMemberContexts_CoachMember UNIQUE (coach_id, member_id),
    CONSTRAINT CK_CoachMemberContexts_DifferentUsers CHECK (coach_id <> member_id)
  );
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = N'FK_CoachMemberContexts_Coach' AND parent_object_id = OBJECT_ID(N'dbo.CoachMemberContexts')
)
  ALTER TABLE dbo.CoachMemberContexts
    ADD CONSTRAINT FK_CoachMemberContexts_Coach FOREIGN KEY (coach_id) REFERENCES dbo.Users(id);

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = N'FK_CoachMemberContexts_Member' AND parent_object_id = OBJECT_ID(N'dbo.CoachMemberContexts')
)
  ALTER TABLE dbo.CoachMemberContexts
    ADD CONSTRAINT FK_CoachMemberContexts_Member FOREIGN KEY (member_id) REFERENCES dbo.Users(id);

IF NOT EXISTS (
  SELECT 1 FROM sys.key_constraints
  WHERE name = N'UQ_CoachMemberContexts_CoachMember' AND parent_object_id = OBJECT_ID(N'dbo.CoachMemberContexts')
)
  ALTER TABLE dbo.CoachMemberContexts
    ADD CONSTRAINT UQ_CoachMemberContexts_CoachMember UNIQUE (coach_id, member_id);

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = N'CK_CoachMemberContexts_DifferentUsers' AND parent_object_id = OBJECT_ID(N'dbo.CoachMemberContexts')
)
  ALTER TABLE dbo.CoachMemberContexts
    ADD CONSTRAINT CK_CoachMemberContexts_DifferentUsers CHECK (coach_id <> member_id);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_CoachMemberContexts_MemberUpdated' AND object_id = OBJECT_ID(N'dbo.CoachMemberContexts')
)
  CREATE INDEX IX_CoachMemberContexts_MemberUpdated
    ON dbo.CoachMemberContexts(member_id, updated_at DESC, id DESC);
