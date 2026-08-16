/*
  Additive upgrade of the legacy Notifications table.

  The existing user_id/is_read columns remain during the compatibility window.
  New Coach and Member workflow writes populate both recipient_user_id and
  the legacy columns, while old rows are backfilled below.
*/

IF OBJECT_ID(N'dbo.Notifications', N'U') IS NULL
  THROW 51014, 'Notifications table is required before migration 0014.', 1;

IF COL_LENGTH(N'dbo.Notifications', N'recipient_user_id') IS NULL
  ALTER TABLE dbo.Notifications ADD recipient_user_id INT NULL;

IF COL_LENGTH(N'dbo.Notifications', N'action_url') IS NULL
  ALTER TABLE dbo.Notifications ADD action_url NVARCHAR(500) NULL;

IF COL_LENGTH(N'dbo.Notifications', N'read_at') IS NULL
  ALTER TABLE dbo.Notifications ADD read_at DATETIME2 NULL;

IF COL_LENGTH(N'dbo.Notifications', N'deduplication_key') IS NULL
  ALTER TABLE dbo.Notifications ADD deduplication_key NVARCHAR(255) NULL;

GO

UPDATE n
SET recipient_user_id = n.user_id
FROM dbo.Notifications n
WHERE n.recipient_user_id IS NULL;

UPDATE n
SET read_at = COALESCE(n.read_at, n.created_at)
FROM dbo.Notifications n
WHERE n.is_read = 1 AND n.read_at IS NULL;

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = N'FK_Notifications_RecipientUser'
    AND parent_object_id = OBJECT_ID(N'dbo.Notifications')
)
  ALTER TABLE dbo.Notifications
    ADD CONSTRAINT FK_Notifications_RecipientUser FOREIGN KEY (recipient_user_id) REFERENCES dbo.Users(id);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Notifications_RecipientCreated'
    AND object_id = OBJECT_ID(N'dbo.Notifications')
)
  CREATE INDEX IX_Notifications_RecipientCreated
    ON dbo.Notifications(recipient_user_id, created_at DESC, id DESC);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Notifications_RecipientUnread'
    AND object_id = OBJECT_ID(N'dbo.Notifications')
)
  CREATE INDEX IX_Notifications_RecipientUnread
    ON dbo.Notifications(recipient_user_id, is_read, created_at DESC, id DESC);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'UX_Notifications_DeduplicationKey'
    AND object_id = OBJECT_ID(N'dbo.Notifications')
)
  CREATE UNIQUE INDEX UX_Notifications_DeduplicationKey
    ON dbo.Notifications(deduplication_key)
    WHERE deduplication_key IS NOT NULL AND deduplication_key <> N'';
