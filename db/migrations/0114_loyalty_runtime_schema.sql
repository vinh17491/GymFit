SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
  THROW 50140, 'dbo.Users is required before loyalty runtime migration.', 1;

IF OBJECT_ID(N'dbo.Points', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Points (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Points PRIMARY KEY,
    user_id INT NOT NULL,
    balance INT NOT NULL CONSTRAINT DF_Points_Balance DEFAULT 0,
    lifetime_earned INT NOT NULL CONSTRAINT DF_Points_LifetimeEarned DEFAULT 0,
    lifetime_spent INT NOT NULL CONSTRAINT DF_Points_LifetimeSpent DEFAULT 0,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_Points_CreatedAt DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_Points_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Points_User UNIQUE (user_id),
    CONSTRAINT FK_Points_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
    CONSTRAINT CK_Points_Balance CHECK (balance >= 0),
    CONSTRAINT CK_Points_LifetimeEarned CHECK (lifetime_earned >= 0),
    CONSTRAINT CK_Points_LifetimeSpent CHECK (lifetime_spent >= 0)
  );
END
ELSE IF COL_LENGTH(N'dbo.Points', N'user_id') IS NULL
     OR COL_LENGTH(N'dbo.Points', N'balance') IS NULL
     OR COL_LENGTH(N'dbo.Points', N'lifetime_earned') IS NULL
     OR COL_LENGTH(N'dbo.Points', N'lifetime_spent') IS NULL
     OR COL_LENGTH(N'dbo.Points', N'created_at') IS NULL
     OR COL_LENGTH(N'dbo.Points', N'updated_at') IS NULL
  THROW 50141, 'Existing dbo.Points does not satisfy the active runtime contract.', 1;

IF OBJECT_ID(N'dbo.PointTransactions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PointTransactions (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PointTransactions PRIMARY KEY,
    user_id INT NOT NULL,
    type NVARCHAR(20) NOT NULL,
    points INT NOT NULL,
    source NVARCHAR(50) NOT NULL,
    reference_id INT NULL,
    description NVARCHAR(200) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_PointTransactions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_PointTransactions_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
    CONSTRAINT CK_PointTransactions_Type CHECK (type IN (N'earn',N'spend')),
    CONSTRAINT CK_PointTransactions_Points CHECK (points > 0),
    CONSTRAINT CK_PointTransactions_Source CHECK (LEN(LTRIM(RTRIM(source))) > 0)
  );
END
ELSE IF COL_LENGTH(N'dbo.PointTransactions', N'user_id') IS NULL
     OR COL_LENGTH(N'dbo.PointTransactions', N'type') IS NULL
     OR COL_LENGTH(N'dbo.PointTransactions', N'points') IS NULL
     OR COL_LENGTH(N'dbo.PointTransactions', N'source') IS NULL
     OR COL_LENGTH(N'dbo.PointTransactions', N'reference_id') IS NULL
     OR COL_LENGTH(N'dbo.PointTransactions', N'description') IS NULL
     OR COL_LENGTH(N'dbo.PointTransactions', N'created_at') IS NULL
  THROW 50142, 'Existing dbo.PointTransactions does not satisfy the active runtime contract.', 1;

IF OBJECT_ID(N'dbo.RewardsCatalog', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.RewardsCatalog (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RewardsCatalog PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500) NULL,
    points_cost INT NOT NULL,
    stock INT NOT NULL CONSTRAINT DF_RewardsCatalog_Stock DEFAULT 0,
    image NVARCHAR(500) NULL,
    category NVARCHAR(50) NULL,
    is_active BIT NOT NULL CONSTRAINT DF_RewardsCatalog_IsActive DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_RewardsCatalog_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_RewardsCatalog_PointsCost CHECK (points_cost > 0),
    CONSTRAINT CK_RewardsCatalog_Stock CHECK (stock >= 0)
  );
END
ELSE IF COL_LENGTH(N'dbo.RewardsCatalog', N'name') IS NULL
     OR COL_LENGTH(N'dbo.RewardsCatalog', N'description') IS NULL
     OR COL_LENGTH(N'dbo.RewardsCatalog', N'points_cost') IS NULL
     OR COL_LENGTH(N'dbo.RewardsCatalog', N'stock') IS NULL
     OR COL_LENGTH(N'dbo.RewardsCatalog', N'image') IS NULL
     OR COL_LENGTH(N'dbo.RewardsCatalog', N'category') IS NULL
     OR COL_LENGTH(N'dbo.RewardsCatalog', N'is_active') IS NULL
     OR COL_LENGTH(N'dbo.RewardsCatalog', N'created_at') IS NULL
  THROW 50143, 'Existing dbo.RewardsCatalog does not satisfy the active runtime contract.', 1;

IF OBJECT_ID(N'dbo.RewardRedemptions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.RewardRedemptions (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RewardRedemptions PRIMARY KEY,
    user_id INT NOT NULL,
    reward_id INT NOT NULL,
    points_spent INT NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_RewardRedemptions_Status DEFAULT N'pending',
    created_at DATETIME2 NOT NULL CONSTRAINT DF_RewardRedemptions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_RewardRedemptions_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
    CONSTRAINT FK_RewardRedemptions_Reward FOREIGN KEY (reward_id) REFERENCES dbo.RewardsCatalog(id),
    CONSTRAINT CK_RewardRedemptions_PointsSpent CHECK (points_spent > 0),
    CONSTRAINT CK_RewardRedemptions_Status CHECK (status IN (N'pending',N'fulfilled',N'cancelled'))
  );
END
ELSE IF COL_LENGTH(N'dbo.RewardRedemptions', N'user_id') IS NULL
     OR COL_LENGTH(N'dbo.RewardRedemptions', N'reward_id') IS NULL
     OR COL_LENGTH(N'dbo.RewardRedemptions', N'points_spent') IS NULL
     OR COL_LENGTH(N'dbo.RewardRedemptions', N'status') IS NULL
     OR COL_LENGTH(N'dbo.RewardRedemptions', N'created_at') IS NULL
  THROW 50144, 'Existing dbo.RewardRedemptions does not satisfy the active runtime contract.', 1;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.PointTransactions') AND name=N'IX_PointTransactions_UserCreated'
)
  CREATE INDEX IX_PointTransactions_UserCreated
    ON dbo.PointTransactions(user_id,created_at DESC,id DESC);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.PointTransactions') AND name=N'IX_PointTransactions_LoginDay'
)
  CREATE INDEX IX_PointTransactions_LoginDay
    ON dbo.PointTransactions(user_id,source,created_at,id);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.RewardsCatalog') AND name=N'IX_RewardsCatalog_ActiveStock'
)
  CREATE INDEX IX_RewardsCatalog_ActiveStock
    ON dbo.RewardsCatalog(is_active,stock,id);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.RewardRedemptions') AND name=N'IX_RewardRedemptions_UserCreated'
)
  CREATE INDEX IX_RewardRedemptions_UserCreated
    ON dbo.RewardRedemptions(user_id,created_at DESC,id DESC);

-- Redemption is implemented in one controlled TypeScript transaction. Do not
-- create sp_SpendPoints here: there must not be two authoritative spend paths.
