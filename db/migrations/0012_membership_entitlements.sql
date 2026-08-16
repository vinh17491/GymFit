/*
  Structured Plan entitlements for Coach Booking.

  Plan display features remain compatibility copy. Runtime authorization must
  read these typed rows instead of parsing Plans.features. The first three
  active Plan slots are the stable Starter/Pro/Elite seed contract for coach1;
  display names are intentionally not used as identifiers.
*/

IF OBJECT_ID(N'dbo.PlanEntitlements', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PlanEntitlements (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PlanEntitlements PRIMARY KEY,
    plan_id INT NOT NULL,
    entitlement_key NVARCHAR(100) NOT NULL,
    entitlement_value NVARCHAR(50) NOT NULL,
    value_type NVARCHAR(20) NOT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_PlanEntitlements_Created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_PlanEntitlements_Updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_PlanEntitlements_Plan FOREIGN KEY (plan_id) REFERENCES dbo.Plans(id),
    CONSTRAINT UQ_PlanEntitlements_PlanKey UNIQUE (plan_id, entitlement_key),
    CONSTRAINT CK_PlanEntitlements_Key CHECK (entitlement_key IN (N'COACH_BOOKING_ENABLED', N'COACH_BOOKING_MONTHLY_LIMIT')),
    CONSTRAINT CK_PlanEntitlements_Type CHECK (value_type IN (N'BOOLEAN', N'INTEGER', N'UNLIMITED')),
    CONSTRAINT CK_PlanEntitlements_Value CHECK (
      (entitlement_key = N'COACH_BOOKING_ENABLED' AND value_type = N'BOOLEAN' AND entitlement_value IN (N'true', N'false'))
      OR
      (entitlement_key = N'COACH_BOOKING_MONTHLY_LIMIT' AND value_type = N'UNLIMITED' AND entitlement_value = N'-1')
      OR
      (entitlement_key = N'COACH_BOOKING_MONTHLY_LIMIT' AND value_type = N'INTEGER'
        AND TRY_CONVERT(INT, entitlement_value) IS NOT NULL
        AND TRY_CONVERT(INT, entitlement_value) >= 0)
    )
  );
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = N'FK_PlanEntitlements_Plan' AND parent_object_id = OBJECT_ID(N'dbo.PlanEntitlements')
)
  ALTER TABLE dbo.PlanEntitlements
    ADD CONSTRAINT FK_PlanEntitlements_Plan FOREIGN KEY (plan_id) REFERENCES dbo.Plans(id);

IF NOT EXISTS (
  SELECT 1 FROM sys.key_constraints
  WHERE name = N'UQ_PlanEntitlements_PlanKey' AND parent_object_id = OBJECT_ID(N'dbo.PlanEntitlements')
)
  ALTER TABLE dbo.PlanEntitlements
    ADD CONSTRAINT UQ_PlanEntitlements_PlanKey UNIQUE (plan_id, entitlement_key);

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = N'CK_PlanEntitlements_Key' AND parent_object_id = OBJECT_ID(N'dbo.PlanEntitlements')
)
  ALTER TABLE dbo.PlanEntitlements
    ADD CONSTRAINT CK_PlanEntitlements_Key CHECK (entitlement_key IN (N'COACH_BOOKING_ENABLED', N'COACH_BOOKING_MONTHLY_LIMIT'));

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = N'CK_PlanEntitlements_Type' AND parent_object_id = OBJECT_ID(N'dbo.PlanEntitlements')
)
  ALTER TABLE dbo.PlanEntitlements
    ADD CONSTRAINT CK_PlanEntitlements_Type CHECK (value_type IN (N'BOOLEAN', N'INTEGER', N'UNLIMITED'));

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = N'CK_PlanEntitlements_Value' AND parent_object_id = OBJECT_ID(N'dbo.PlanEntitlements')
)
  ALTER TABLE dbo.PlanEntitlements
    ADD CONSTRAINT CK_PlanEntitlements_Value CHECK (
      (entitlement_key = N'COACH_BOOKING_ENABLED' AND value_type = N'BOOLEAN' AND entitlement_value IN (N'true', N'false'))
      OR
      (entitlement_key = N'COACH_BOOKING_MONTHLY_LIMIT' AND value_type = N'UNLIMITED' AND entitlement_value = N'-1')
      OR
      (entitlement_key = N'COACH_BOOKING_MONTHLY_LIMIT' AND value_type = N'INTEGER'
        AND TRY_CONVERT(INT, entitlement_value) IS NOT NULL
        AND TRY_CONVERT(INT, entitlement_value) >= 0)
    );

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_PlanEntitlements_KeyValue' AND object_id = OBJECT_ID(N'dbo.PlanEntitlements')
)
  CREATE INDEX IX_PlanEntitlements_KeyValue
    ON dbo.PlanEntitlements(entitlement_key, entitlement_value, plan_id);

/*
  Seed only missing rows. sort_order 1/2/3 is the existing stable Plan slot
  contract (Basic/Premium/VIP in the current seed); an admin may rename those
  Plans without changing entitlement meaning. Existing configured rows win.
*/
;WITH seed_rows AS (
  SELECT id AS plan_id, N'COACH_BOOKING_ENABLED' AS entitlement_key,
         CASE WHEN sort_order = 1 THEN N'false' ELSE N'true' END AS entitlement_value,
         N'BOOLEAN' AS value_type
  FROM dbo.Plans
  WHERE is_active = 1 AND sort_order IN (1, 2, 3)
  UNION ALL
  SELECT id, N'COACH_BOOKING_MONTHLY_LIMIT',
         CASE WHEN sort_order = 1 THEN N'0' WHEN sort_order = 2 THEN N'2' ELSE N'-1' END,
         CASE WHEN sort_order = 3 THEN N'UNLIMITED' ELSE N'INTEGER' END
  FROM dbo.Plans
  WHERE is_active = 1 AND sort_order IN (1, 2, 3)
)
INSERT dbo.PlanEntitlements(plan_id, entitlement_key, entitlement_value, value_type)
SELECT s.plan_id, s.entitlement_key, s.entitlement_value, s.value_type
FROM seed_rows s
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.PlanEntitlements e
  WHERE e.plan_id = s.plan_id AND e.entitlement_key = s.entitlement_key
);
