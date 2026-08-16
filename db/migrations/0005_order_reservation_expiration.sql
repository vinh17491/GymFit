SET NOCOUNT ON;
SET XACT_ABORT ON;

ALTER TABLE dbo.Orders ADD reservation_expires_at DATETIME2 NULL
  CONSTRAINT DF_Orders_ReservationExpiresAt DEFAULT DATEADD(MINUTE, 30, SYSUTCDATETIME());
GO

DECLARE @reservation_minutes INT = 30;
UPDATE dbo.Orders
SET reservation_expires_at = DATEADD(MINUTE, @reservation_minutes, SYSUTCDATETIME())
WHERE order_status = N'PENDING'
  AND payment_status = N'UNPAID'
  AND reservation_expires_at IS NULL;
GO

ALTER TABLE dbo.Orders ADD CONSTRAINT CK_Orders_ReservationExpiration
CHECK (reservation_expires_at IS NULL OR reservation_expires_at >= created_at);
GO

CREATE INDEX IX_Orders_ReservationExpiration
ON dbo.Orders(order_status, payment_status, reservation_expires_at);
GO

-- Keep expiration lifecycle atomic with every order/payment transition.
CREATE OR ALTER TRIGGER dbo.TR_Orders_ReservationExpirationLifecycle
ON dbo.Orders
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE o
  SET reservation_expires_at = CASE
    WHEN i.order_status = N'PENDING' AND i.payment_status = N'UNPAID'
      THEN COALESCE(i.reservation_expires_at, DATEADD(MINUTE, 30, SYSUTCDATETIME()))
    ELSE NULL
  END
  FROM dbo.Orders o
  JOIN inserted i ON i.id = o.id
  WHERE (i.order_status = N'PENDING' AND i.payment_status = N'UNPAID' AND i.reservation_expires_at IS NULL)
     OR ((i.order_status <> N'PENDING' OR i.payment_status <> N'UNPAID') AND i.reservation_expires_at IS NOT NULL);
END;
GO
