SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Plans', N'U') IS NULL
  THROW 50160, 'dbo.Users and dbo.Plans are required before membership billing migration.', 1;

IF OBJECT_ID(N'dbo.Payments', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Payments (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Payments PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    method NVARCHAR(50) NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_Payments_Status DEFAULT N'pending',
    transaction_id NVARCHAR(255) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Payments_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
    CONSTRAINT FK_Payments_Plan FOREIGN KEY (plan_id) REFERENCES dbo.Plans(id),
    CONSTRAINT CK_Payments_Amount CHECK (amount >= 0),
    CONSTRAINT CK_Payments_Status CHECK (status IN (N'pending',N'completed',N'failed',N'refunded')),
    CONSTRAINT CK_Payments_Method CHECK (LEN(LTRIM(RTRIM(method))) > 0)
  );
END
ELSE IF COL_LENGTH(N'dbo.Payments', N'user_id') IS NULL
     OR COL_LENGTH(N'dbo.Payments', N'plan_id') IS NULL
     OR COL_LENGTH(N'dbo.Payments', N'amount') IS NULL
     OR COL_LENGTH(N'dbo.Payments', N'method') IS NULL
     OR COL_LENGTH(N'dbo.Payments', N'status') IS NULL
     OR COL_LENGTH(N'dbo.Payments', N'transaction_id') IS NULL
     OR COL_LENGTH(N'dbo.Payments', N'created_at') IS NULL
  THROW 50161, 'Existing dbo.Payments does not satisfy the membership billing runtime contract.', 1;

IF EXISTS (SELECT 1 FROM dbo.Payments WHERE amount < 0 OR status NOT IN (N'pending',N'completed',N'failed',N'refunded'))
  THROW 50162, 'Existing dbo.Payments contains invalid amount or status values.', 1;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.Payments') AND name=N'IX_Payments_User_StatusCreated'
)
  CREATE INDEX IX_Payments_User_StatusCreated
    ON dbo.Payments(user_id,status,created_at DESC,id DESC);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.Payments') AND name=N'IX_Payments_StatusCreated'
)
  CREATE INDEX IX_Payments_StatusCreated
    ON dbo.Payments(status,created_at DESC,id DESC);

IF OBJECT_ID(N'dbo.Invoices', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Invoices (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Invoices PRIMARY KEY,
    invoice_number NVARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    payment_id INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) NOT NULL CONSTRAINT DF_Invoices_Tax DEFAULT 0,
    discount DECIMAL(10,2) NOT NULL CONSTRAINT DF_Invoices_Discount DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    pdf_path NVARCHAR(500) NULL,
    email_sent BIT NOT NULL CONSTRAINT DF_Invoices_EmailSent DEFAULT 0,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_Invoices_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Invoices_Number UNIQUE (invoice_number),
    CONSTRAINT FK_Invoices_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id),
    CONSTRAINT FK_Invoices_Payment FOREIGN KEY (payment_id) REFERENCES dbo.Payments(id),
    CONSTRAINT CK_Invoices_Amounts CHECK (amount >= 0 AND tax >= 0 AND discount >= 0 AND total >= 0)
  );
END
ELSE IF COL_LENGTH(N'dbo.Invoices', N'invoice_number') IS NULL
     OR COL_LENGTH(N'dbo.Invoices', N'user_id') IS NULL
     OR COL_LENGTH(N'dbo.Invoices', N'payment_id') IS NULL
     OR COL_LENGTH(N'dbo.Invoices', N'amount') IS NULL
     OR COL_LENGTH(N'dbo.Invoices', N'tax') IS NULL
     OR COL_LENGTH(N'dbo.Invoices', N'discount') IS NULL
     OR COL_LENGTH(N'dbo.Invoices', N'total') IS NULL
     OR COL_LENGTH(N'dbo.Invoices', N'pdf_path') IS NULL
     OR COL_LENGTH(N'dbo.Invoices', N'email_sent') IS NULL
     OR COL_LENGTH(N'dbo.Invoices', N'created_at') IS NULL
  THROW 50163, 'Existing dbo.Invoices does not satisfy the membership billing runtime contract.', 1;

IF EXISTS (SELECT 1 FROM dbo.Invoices WHERE amount < 0 OR tax < 0 OR discount < 0 OR total < 0)
  THROW 50164, 'Existing dbo.Invoices contains invalid amount values.', 1;

IF EXISTS (
  SELECT payment_id
  FROM dbo.Invoices
  WHERE payment_id IS NOT NULL
  GROUP BY payment_id
  HAVING COUNT(*) > 1
)
  THROW 50165, 'Duplicate invoice payment links require explicit cleanup before billing migration.', 1;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.Invoices') AND name=N'UX_Invoices_Payment'
)
  CREATE UNIQUE INDEX UX_Invoices_Payment
    ON dbo.Invoices(payment_id)
    WHERE payment_id IS NOT NULL;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.Invoices') AND name=N'IX_Invoices_UserCreated'
)
  CREATE INDEX IX_Invoices_UserCreated
    ON dbo.Invoices(user_id,created_at DESC,id DESC);

-- sp_GenerateInvoice is retained only in the historical snapshot. The active
-- route generates invoices in the application service, so no procedure is
-- created and there is no second invoice authority.
