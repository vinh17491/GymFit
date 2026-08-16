SET NOCOUNT ON;
SET XACT_ABORT ON;

CREATE TABLE dbo.PaymentStatusHistory (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PaymentStatusHistory PRIMARY KEY,
  order_id INT NOT NULL,
  previous_status NVARCHAR(30) NOT NULL,
  new_status NVARCHAR(30) NOT NULL,
  changed_by INT NULL,
  actor_type NVARCHAR(20) NOT NULL,
  note NVARCHAR(500) NULL,
  payment_reference NVARCHAR(255) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_PaymentStatusHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_PaymentStatusHistory_Order FOREIGN KEY (order_id) REFERENCES dbo.Orders(id),
  CONSTRAINT FK_PaymentStatusHistory_ChangedBy FOREIGN KEY (changed_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_PaymentStatusHistory_PreviousStatus CHECK (previous_status IN (N'UNPAID', N'PENDING', N'PAID', N'FAILED', N'PARTIALLY_REFUNDED', N'REFUNDED')),
  CONSTRAINT CK_PaymentStatusHistory_NewStatus CHECK (new_status IN (N'UNPAID', N'PENDING', N'PAID', N'FAILED', N'PARTIALLY_REFUNDED', N'REFUNDED')),
  CONSTRAINT CK_PaymentStatusHistory_StatusChanged CHECK (previous_status <> new_status),
  CONSTRAINT CK_PaymentStatusHistory_ActorType CHECK (actor_type IN (N'CUSTOMER', N'ADMIN', N'SYSTEM')),
  CONSTRAINT CK_PaymentStatusHistory_Note CHECK (note IS NULL OR LEN(LTRIM(RTRIM(note))) > 0)
);
GO

CREATE INDEX IX_PaymentStatusHistory_OrderId_CreatedAt
ON dbo.PaymentStatusHistory(order_id, created_at DESC, id DESC);
GO

CREATE OR ALTER TRIGGER dbo.TR_PaymentStatusHistory_Immutable
ON dbo.PaymentStatusHistory
AFTER UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  THROW 51002, 'Payment status history is immutable.', 1;
END;
GO
