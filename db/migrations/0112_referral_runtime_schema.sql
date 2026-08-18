SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
  THROW 50120, 'dbo.Users is required before referral runtime migration.', 1;

IF COL_LENGTH(N'dbo.Users', N'referral_code') IS NULL
   OR COL_LENGTH(N'dbo.Users', N'referred_by') IS NULL
  THROW 50121, 'dbo.Users referral columns are missing.', 1;

IF EXISTS (
  SELECT referral_code
  FROM dbo.Users
  WHERE referral_code IS NOT NULL
  GROUP BY referral_code
  HAVING COUNT(*) > 1
)
  THROW 50122, 'Duplicate dbo.Users.referral_code values require explicit cleanup before referral migration.', 1;

IF OBJECT_ID(N'dbo.ReferralCodes', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ReferralCodes (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ReferralCodes PRIMARY KEY,
    user_id INT NOT NULL,
    code NVARCHAR(20) NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_ReferralCodes_Status DEFAULT N'active',
    created_at DATETIME2 NOT NULL CONSTRAINT DF_ReferralCodes_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_ReferralCodes_User UNIQUE (user_id),
    CONSTRAINT UQ_ReferralCodes_Code UNIQUE (code),
    CONSTRAINT FK_ReferralCodes_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
    CONSTRAINT CK_ReferralCodes_Status CHECK (status IN (N'active',N'disabled')),
    CONSTRAINT CK_ReferralCodes_Code CHECK (LEN(LTRIM(RTRIM(code))) >= 3)
  );
END
ELSE IF COL_LENGTH(N'dbo.ReferralCodes', N'user_id') IS NULL
     OR COL_LENGTH(N'dbo.ReferralCodes', N'code') IS NULL
     OR COL_LENGTH(N'dbo.ReferralCodes', N'status') IS NULL
     OR COL_LENGTH(N'dbo.ReferralCodes', N'created_at') IS NULL
  THROW 50123, 'Existing dbo.ReferralCodes does not satisfy the active runtime contract.', 1;

IF EXISTS (
  SELECT user_id
  FROM dbo.ReferralCodes
  GROUP BY user_id
  HAVING COUNT(*) > 1
)
  THROW 50124, 'Duplicate dbo.ReferralCodes.user_id values require explicit cleanup before referral migration.', 1;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes i
  JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
  JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
  WHERE i.object_id=OBJECT_ID(N'dbo.ReferralCodes')
    AND i.is_unique=1
    AND ic.key_ordinal=1
    AND c.name=N'user_id'
    AND NOT EXISTS (
      SELECT 1
      FROM sys.index_columns extra
      WHERE extra.object_id=i.object_id AND extra.index_id=i.index_id AND extra.key_ordinal>1
    )
)
  CREATE UNIQUE INDEX UX_ReferralCodes_User ON dbo.ReferralCodes(user_id);

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes i
  JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
  JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
  WHERE i.object_id=OBJECT_ID(N'dbo.ReferralCodes')
    AND i.is_unique=1
    AND ic.key_ordinal=1
    AND c.name=N'code'
    AND NOT EXISTS (
      SELECT 1
      FROM sys.index_columns extra
      WHERE extra.object_id=i.object_id AND extra.index_id=i.index_id AND extra.key_ordinal>1
    )
)
  CREATE UNIQUE INDEX UX_ReferralCodes_Code ON dbo.ReferralCodes(code);

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.Users') AND name=N'IX_Users_ReferralCode'
)
  CREATE INDEX IX_Users_ReferralCode ON dbo.Users(referral_code) WHERE referral_code IS NOT NULL;

IF OBJECT_ID(N'dbo.ReferralTransactions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ReferralTransactions (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ReferralTransactions PRIMARY KEY,
    referrer_id INT NOT NULL,
    referred_id INT NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL CONSTRAINT DF_ReferralTransactions_Commission DEFAULT 0,
    transaction_type NVARCHAR(50) NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_ReferralTransactions_Status DEFAULT N'pending',
    created_at DATETIME2 NOT NULL CONSTRAINT DF_ReferralTransactions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_ReferralTransactions_Referrer FOREIGN KEY (referrer_id) REFERENCES dbo.Users(id),
    CONSTRAINT FK_ReferralTransactions_Referred FOREIGN KEY (referred_id) REFERENCES dbo.Users(id),
    CONSTRAINT CK_ReferralTransactions_Commission CHECK (commission_amount >= 0),
    CONSTRAINT CK_ReferralTransactions_Status CHECK (status IN (N'pending',N'confirmed',N'paid')),
    CONSTRAINT CK_ReferralTransactions_DifferentUsers CHECK (referrer_id <> referred_id)
  );
END
ELSE IF COL_LENGTH(N'dbo.ReferralTransactions', N'referrer_id') IS NULL
     OR COL_LENGTH(N'dbo.ReferralTransactions', N'referred_id') IS NULL
     OR COL_LENGTH(N'dbo.ReferralTransactions', N'commission_amount') IS NULL
     OR COL_LENGTH(N'dbo.ReferralTransactions', N'transaction_type') IS NULL
     OR COL_LENGTH(N'dbo.ReferralTransactions', N'status') IS NULL
     OR COL_LENGTH(N'dbo.ReferralTransactions', N'created_at') IS NULL
  THROW 50125, 'Existing dbo.ReferralTransactions does not satisfy the active runtime contract.', 1;

IF EXISTS (
  SELECT referrer_id, referred_id, transaction_type
  FROM dbo.ReferralTransactions
  WHERE transaction_type=N'registration'
  GROUP BY referrer_id, referred_id, transaction_type
  HAVING COUNT(*) > 1
)
  THROW 50126, 'Duplicate registration referral transactions require explicit cleanup before referral migration.', 1;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.ReferralTransactions') AND name=N'IX_ReferralTransactions_ReferrerCreated'
)
  CREATE INDEX IX_ReferralTransactions_ReferrerCreated
    ON dbo.ReferralTransactions(referrer_id,created_at DESC,id DESC);

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.ReferralTransactions') AND name=N'IX_ReferralTransactions_Referred'
)
  CREATE INDEX IX_ReferralTransactions_Referred
    ON dbo.ReferralTransactions(referred_id,created_at DESC,id DESC);

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.ReferralTransactions') AND name=N'UX_ReferralTransactions_Registration'
)
  CREATE UNIQUE INDEX UX_ReferralTransactions_Registration
    ON dbo.ReferralTransactions(referrer_id,referred_id,transaction_type)
    WHERE transaction_type=N'registration';
