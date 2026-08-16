SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH(N'dbo.Users', N'token_version') IS NULL
  ALTER TABLE dbo.Users ADD token_version INT NOT NULL CONSTRAINT DF_Users_token_version DEFAULT (0);

IF OBJECT_ID(N'dbo.AuthSessions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AuthSessions (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuthSessions PRIMARY KEY,
    user_id INT NOT NULL,
    refresh_token_hash CHAR(64) NOT NULL,
    token_family UNIQUEIDENTIFIER NOT NULL,
    expires_at DATETIME2 NOT NULL,
    revoked_at DATETIME2 NULL,
    replaced_by_session_id BIGINT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_AuthSessions_created_at DEFAULT SYSUTCDATETIME(),
    last_used_at DATETIME2 NULL,
    CONSTRAINT FK_AuthSessions_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
    CONSTRAINT FK_AuthSessions_ReplacedBy FOREIGN KEY (replaced_by_session_id) REFERENCES dbo.AuthSessions(id),
    CONSTRAINT UQ_AuthSessions_RefreshHash UNIQUE (refresh_token_hash)
  );
  CREATE INDEX IX_AuthSessions_User_Active ON dbo.AuthSessions(user_id, expires_at) WHERE revoked_at IS NULL;
  CREATE INDEX IX_AuthSessions_Family ON dbo.AuthSessions(token_family);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Bookings') AND name=N'UX_Bookings_ActiveSlot')
  CREATE UNIQUE INDEX UX_Bookings_ActiveSlot ON dbo.Bookings(coach_id, booking_date, start_time)
  WHERE status IN (N'pending', N'confirmed');

COMMIT TRANSACTION;
