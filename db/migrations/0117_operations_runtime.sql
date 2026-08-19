SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
   OR OBJECT_ID(N'dbo.CRMCustomers', N'U') IS NULL
  THROW 50170, 'dbo.Users and dbo.CRMCustomers are required before operations migration.', 1;

IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AuditLogs (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
    user_id INT NULL,
    action NVARCHAR(100) NOT NULL,
    entity_type NVARCHAR(50) NOT NULL,
    entity_id INT NULL,
    old_value NVARCHAR(MAX) NULL,
    new_value NVARCHAR(MAX) NULL,
    ip NVARCHAR(45) NULL,
    device NVARCHAR(500) NULL,
    timestamp DATETIME2 NOT NULL CONSTRAINT DF_AuditLogs_Timestamp DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_AuditLogs_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id)
  );
END
ELSE IF COL_LENGTH(N'dbo.AuditLogs', N'user_id') IS NULL
     OR COL_LENGTH(N'dbo.AuditLogs', N'action') IS NULL
     OR COL_LENGTH(N'dbo.AuditLogs', N'entity_type') IS NULL
     OR COL_LENGTH(N'dbo.AuditLogs', N'entity_id') IS NULL
     OR COL_LENGTH(N'dbo.AuditLogs', N'old_value') IS NULL
     OR COL_LENGTH(N'dbo.AuditLogs', N'new_value') IS NULL
     OR COL_LENGTH(N'dbo.AuditLogs', N'ip') IS NULL
     OR COL_LENGTH(N'dbo.AuditLogs', N'device') IS NULL
     OR COL_LENGTH(N'dbo.AuditLogs', N'timestamp') IS NULL
  THROW 50171, 'Existing dbo.AuditLogs does not satisfy the operations runtime contract.', 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.AuditLogs') AND name=N'IX_AuditLogs_UserTimestamp')
  CREATE INDEX IX_AuditLogs_UserTimestamp ON dbo.AuditLogs(user_id,timestamp DESC,id DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.AuditLogs') AND name=N'IX_AuditLogs_ActionTimestamp')
  CREATE INDEX IX_AuditLogs_ActionTimestamp ON dbo.AuditLogs(action,timestamp DESC,id DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.AuditLogs') AND name=N'IX_AuditLogs_Timestamp')
  CREATE INDEX IX_AuditLogs_Timestamp ON dbo.AuditLogs(timestamp DESC,id DESC);

IF OBJECT_ID(N'dbo.BackupLogs', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.BackupLogs (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BackupLogs PRIMARY KEY,
    type NVARCHAR(20) NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_BackupLogs_Status DEFAULT N'pending',
    file_path NVARCHAR(500) NULL,
    file_size BIGINT NULL,
    duration_seconds INT NULL,
    verified BIT NOT NULL CONSTRAINT DF_BackupLogs_Verified DEFAULT 0,
    created_by INT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_BackupLogs_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_BackupLogs_CreatedBy FOREIGN KEY (created_by) REFERENCES dbo.Users(id),
    CONSTRAINT CK_BackupLogs_Type CHECK (type IN (N'daily',N'weekly',N'monthly',N'manual')),
    CONSTRAINT CK_BackupLogs_Status CHECK (status IN (N'pending',N'running',N'completed',N'failed')),
    CONSTRAINT CK_BackupLogs_Size CHECK (file_size IS NULL OR file_size >= 0),
    CONSTRAINT CK_BackupLogs_Duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
  );
END
ELSE IF COL_LENGTH(N'dbo.BackupLogs', N'type') IS NULL
     OR COL_LENGTH(N'dbo.BackupLogs', N'status') IS NULL
     OR COL_LENGTH(N'dbo.BackupLogs', N'file_path') IS NULL
     OR COL_LENGTH(N'dbo.BackupLogs', N'file_size') IS NULL
     OR COL_LENGTH(N'dbo.BackupLogs', N'duration_seconds') IS NULL
     OR COL_LENGTH(N'dbo.BackupLogs', N'verified') IS NULL
     OR COL_LENGTH(N'dbo.BackupLogs', N'created_by') IS NULL
     OR COL_LENGTH(N'dbo.BackupLogs', N'created_at') IS NULL
  THROW 50172, 'Existing dbo.BackupLogs does not satisfy the operations runtime contract.', 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.BackupLogs') AND name=N'IX_BackupLogs_CreatedAt')
  CREATE INDEX IX_BackupLogs_CreatedAt ON dbo.BackupLogs(created_at DESC,id DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.BackupLogs') AND name=N'IX_BackupLogs_StatusCreated')
  CREATE INDEX IX_BackupLogs_StatusCreated ON dbo.BackupLogs(status,created_at DESC,id DESC);

IF OBJECT_ID(N'dbo.CRMNotes', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CRMNotes (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CRMNotes PRIMARY KEY,
    customer_id INT NOT NULL,
    author_id INT NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    type NVARCHAR(20) NOT NULL CONSTRAINT DF_CRMNotes_Type DEFAULT N'note',
    created_at DATETIME2 NOT NULL CONSTRAINT DF_CRMNotes_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_CRMNotes_Customer FOREIGN KEY (customer_id) REFERENCES dbo.CRMCustomers(id),
    CONSTRAINT FK_CRMNotes_Author FOREIGN KEY (author_id) REFERENCES dbo.Users(id),
    CONSTRAINT CK_CRMNotes_Type CHECK (type IN (N'note',N'follow_up',N'coach_note'))
  );
END
ELSE IF COL_LENGTH(N'dbo.CRMNotes', N'customer_id') IS NULL
     OR COL_LENGTH(N'dbo.CRMNotes', N'author_id') IS NULL
     OR COL_LENGTH(N'dbo.CRMNotes', N'content') IS NULL
     OR COL_LENGTH(N'dbo.CRMNotes', N'type') IS NULL
     OR COL_LENGTH(N'dbo.CRMNotes', N'created_at') IS NULL
  THROW 50173, 'Existing dbo.CRMNotes does not satisfy the operations runtime contract.', 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.CRMNotes') AND name=N'IX_CRMNotes_CustomerCreated')
  CREATE INDEX IX_CRMNotes_CustomerCreated ON dbo.CRMNotes(customer_id,created_at DESC,id DESC);

IF OBJECT_ID(N'dbo.CRMTasks', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CRMTasks (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CRMTasks PRIMARY KEY,
    customer_id INT NOT NULL,
    assigned_to INT NULL,
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,
    due_date DATETIME2 NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_CRMTasks_Status DEFAULT N'pending',
    created_at DATETIME2 NOT NULL CONSTRAINT DF_CRMTasks_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_CRMTasks_Customer FOREIGN KEY (customer_id) REFERENCES dbo.CRMCustomers(id),
    CONSTRAINT FK_CRMTasks_AssignedTo FOREIGN KEY (assigned_to) REFERENCES dbo.Users(id),
    CONSTRAINT CK_CRMTasks_Status CHECK (status IN (N'pending',N'in_progress',N'completed',N'cancelled'))
  );
END
ELSE IF COL_LENGTH(N'dbo.CRMTasks', N'customer_id') IS NULL
     OR COL_LENGTH(N'dbo.CRMTasks', N'assigned_to') IS NULL
     OR COL_LENGTH(N'dbo.CRMTasks', N'title') IS NULL
     OR COL_LENGTH(N'dbo.CRMTasks', N'description') IS NULL
     OR COL_LENGTH(N'dbo.CRMTasks', N'due_date') IS NULL
     OR COL_LENGTH(N'dbo.CRMTasks', N'status') IS NULL
     OR COL_LENGTH(N'dbo.CRMTasks', N'created_at') IS NULL
  THROW 50174, 'Existing dbo.CRMTasks does not satisfy the operations runtime contract.', 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.CRMTasks') AND name=N'IX_CRMTasks_CustomerDue')
  CREATE INDEX IX_CRMTasks_CustomerDue ON dbo.CRMTasks(customer_id,due_date ASC,id ASC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.CRMTasks') AND name=N'IX_CRMTasks_AssignedStatus')
  CREATE INDEX IX_CRMTasks_AssignedStatus ON dbo.CRMTasks(assigned_to,status,due_date ASC,id ASC);
