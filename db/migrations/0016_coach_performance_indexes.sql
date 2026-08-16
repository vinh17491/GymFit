/*
  Coach performance indexes selected from Phase 28 query-plan evidence.
  These are additive and idempotent. They cover the high-cardinality filters
  used by Coach member/booking/membership lists without changing any data or
  touching Marketplace/Seller migrations.
*/

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_CRMCustomers_AssignedCoachUser'
    AND object_id = OBJECT_ID(N'dbo.CRMCustomers')
)
  CREATE INDEX IX_CRMCustomers_AssignedCoachUser
    ON dbo.CRMCustomers(assigned_coach_id,user_id)
    INCLUDE (last_contact_at,created_at);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Users_RoleActiveName'
    AND object_id = OBJECT_ID(N'dbo.Users')
)
  CREATE INDEX IX_Users_RoleActiveName
    ON dbo.Users(role,is_active,name,id)
    INCLUDE (email,avatar_url,created_at);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Bookings_CoachStatusDate'
    AND object_id = OBJECT_ID(N'dbo.Bookings')
)
  CREATE INDEX IX_Bookings_CoachStatusDate
    ON dbo.Bookings(coach_id,status,booking_date,start_time,id)
    INCLUDE (end_time,member_id,notes,created_at,updated_at);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Bookings_MemberStatusDate'
    AND object_id = OBJECT_ID(N'dbo.Bookings')
)
  CREATE INDEX IX_Bookings_MemberStatusDate
    ON dbo.Bookings(member_id,status,booking_date,start_time,id)
    INCLUDE (end_time,coach_id,notes,created_at,updated_at);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Memberships_UserStatusDates'
    AND object_id = OBJECT_ID(N'dbo.Memberships')
)
  CREATE INDEX IX_Memberships_UserStatusDates
    ON dbo.Memberships(user_id,status,start_date,end_date,id DESC)
    INCLUDE (plan_id,payment_id,auto_renew,created_at);
