SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
  THROW 50150, 'dbo.Users is required before support runtime migration.', 1;

IF OBJECT_ID(N'dbo.Tickets', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Tickets (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Tickets PRIMARY KEY,
    user_id INT NOT NULL,
    subject NVARCHAR(200) NOT NULL,
    category NVARCHAR(50) NOT NULL CONSTRAINT DF_Tickets_Category DEFAULT N'general',
    priority NVARCHAR(10) NOT NULL CONSTRAINT DF_Tickets_Priority DEFAULT N'medium',
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_Tickets_Status DEFAULT N'open',
    assigned_to INT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_Tickets_CreatedAt DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_Tickets_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Tickets_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
    CONSTRAINT FK_Tickets_AssignedTo FOREIGN KEY (assigned_to) REFERENCES dbo.Users(id),
    CONSTRAINT CK_Tickets_Priority CHECK (priority IN (N'low',N'medium',N'high',N'urgent')),
    CONSTRAINT CK_Tickets_Status CHECK (status IN (N'open',N'pending',N'resolved',N'closed'))
  );
END
ELSE IF COL_LENGTH(N'dbo.Tickets', N'user_id') IS NULL
     OR COL_LENGTH(N'dbo.Tickets', N'subject') IS NULL
     OR COL_LENGTH(N'dbo.Tickets', N'category') IS NULL
     OR COL_LENGTH(N'dbo.Tickets', N'priority') IS NULL
     OR COL_LENGTH(N'dbo.Tickets', N'status') IS NULL
     OR COL_LENGTH(N'dbo.Tickets', N'assigned_to') IS NULL
     OR COL_LENGTH(N'dbo.Tickets', N'created_at') IS NULL
     OR COL_LENGTH(N'dbo.Tickets', N'updated_at') IS NULL
  THROW 50151, 'Existing dbo.Tickets does not satisfy the active runtime contract.', 1;

IF OBJECT_ID(N'dbo.TicketMessages', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.TicketMessages (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TicketMessages PRIMARY KEY,
    ticket_id INT NOT NULL,
    sender_id INT NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    is_internal BIT NOT NULL CONSTRAINT DF_TicketMessages_IsInternal DEFAULT 0,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_TicketMessages_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_TicketMessages_Ticket FOREIGN KEY (ticket_id) REFERENCES dbo.Tickets(id),
    CONSTRAINT FK_TicketMessages_Sender FOREIGN KEY (sender_id) REFERENCES dbo.Users(id)
  );
END
ELSE IF COL_LENGTH(N'dbo.TicketMessages', N'ticket_id') IS NULL
     OR COL_LENGTH(N'dbo.TicketMessages', N'sender_id') IS NULL
     OR COL_LENGTH(N'dbo.TicketMessages', N'message') IS NULL
     OR COL_LENGTH(N'dbo.TicketMessages', N'is_internal') IS NULL
     OR COL_LENGTH(N'dbo.TicketMessages', N'created_at') IS NULL
  THROW 50152, 'Existing dbo.TicketMessages does not satisfy the active runtime contract.', 1;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.Tickets') AND name=N'IX_Tickets_UserUpdated'
)
  CREATE INDEX IX_Tickets_UserUpdated
    ON dbo.Tickets(user_id,updated_at DESC,id DESC);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.Tickets') AND name=N'IX_Tickets_AssignedStatus'
)
  CREATE INDEX IX_Tickets_AssignedStatus
    ON dbo.Tickets(assigned_to,status,updated_at DESC,id DESC);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.Tickets') AND name=N'IX_Tickets_StatusUpdated'
)
  CREATE INDEX IX_Tickets_StatusUpdated
    ON dbo.Tickets(status,updated_at DESC,id DESC);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.TicketMessages') AND name=N'IX_TicketMessages_TicketCreated'
)
  CREATE INDEX IX_TicketMessages_TicketCreated
    ON dbo.TicketMessages(ticket_id,created_at ASC,id ASC);

-- TicketAttachments is intentionally not created: no active runtime caller
-- was found in the mounted support feature.
