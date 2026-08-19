# GymFit Pass 3 Runtime SQL Table References

This inventory was produced from runtime TypeScript under `backend/src` by
searching SQL-bearing `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `JOIN`
and `FROM` statements. It excludes tests, acceptance scripts, integrity and
verification scripts, archived documentation, and `db/schema.sql` itself.
Names are normalized to the unqualified object name; source uses both
`dbo.Name` and `Name`.

The inventory is an ownership map, not a claim that the current installation
already contains every object. `FOUNDATION_CANONICAL` and
`MIGRATION_CANONICAL` mean the object has a current installation owner.
`LEGACY_REQUIRED` means a live caller exists but only the legacy snapshot owns
the object; it must remain paired with an explicit unresolved business or
duplicate-model classification. `LEGACY_DUPLICATE_MODEL` is reserved for
active legacy workout objects that overlap the newer coach/member model.
`UNCLEAR_OWNER` means the source contract is not sufficiently recoverable to
write a safe migration.

## Current canonical runtime objects

### Foundation-owned tables

`Users`, `Plans`, `Brands`, `Categories`, `Products`, `ProductVariants`,
`ProductImages`, `Inventory`, `Exercises`, `Bookings`, `Notifications`,
`CRMCustomers` and `Memberships` are created by
`db/bootstrap/foundation.sql`. Later migrations may add columns, constraints
or indexes, but the bootstrap remains the root owner.

### Numbered-migration-owned tables

| Migration | Runtime objects observed |
| --- | --- |
| `0001` | `ProductOptions`, `ProductOptionValues`, `VariantOptionValues` |
| `0002` | `InventoryAdjustments` |
| `0003` | `Orders`, `OrderItems`, `OrderStatusHistory` |
| `0004` | `PaymentStatusHistory` |
| `0006` | `AuthSessions` |
| `0007` | `WorkoutPrograms`, `WorkoutProgramDays`, `WorkoutProgramExercises`, `CoachProgramAssignments`, `CoachProgramSchedules` |
| `0008` | `MemberWorkoutSessions`, `MemberWorkoutSessionExercises`, `MemberWorkoutSetLogs` |
| `0010` | `CoachProfiles` |
| `0011` | `CoachAvailabilityRules`, `CoachAvailabilityExceptions` |
| `0012` | `PlanEntitlements` |
| `0013` | `CoachMemberContexts` |
| `0100` | `SellerApplications`, `SellerApplicationStatusHistory` |
| `0101` | `Shops` |
| `0102` | `BrandRequests`, `BrandRequestStatusHistory` |
| `0104` | `ProductModerationHistory` |
| `0105` | `ShopOrders`, `ShopOrderStatusHistory` |
| `0106` | `Carts`, `CartItems` |
| `0107` | `MarketplaceSettings`, `Refunds`, `RefundStatusHistory`, `CompensationVouchers`, `MarketplaceNotifications` |
| `0108` | `OrderLogisticsStatusHistory` |
| `0109` | `ShopOrderSettlements`, `SettlementStatusHistory`, `SettlementAdjustments`, `SettlementAdjustmentHistory`, `SettlementBatches`, `SettlementBatchItems` |
| `0110` | `MarketplaceComplaints`, `ComplaintEventHistory`, `ComplaintReplacements`, `ReplacementStatusHistory` |
| `0111` | `ProductReviews`, `ShopReviews`, `ReviewModerationHistory` |
| `0112` | `ReferralCodes`, `ReferralTransactions` |
| `0113` | `Coupons`, `CouponUsages` |
| `0114` | `Points`, `PointTransactions`, `RewardsCatalog`, `RewardRedemptions` |
| `0115` | `Tickets`, `TicketMessages` |
| `0116` | `Payments`, `Invoices` |
| `0117` | `AuditLogs`, `BackupLogs`, `CRMNotes`, `CRMTasks` |
| `0118` | `AnalyticsDaily` |
| `0119` | `AnalyticsRetention` |

## Canonicalized active objects

The following objects were runtime orphans at the phase 133 baseline and now
have forward-only owners. `db/schema.sql` is retained only as historical
column/constraint evidence; it is not required for a canonical installation.

| Object family | Canonical owner | Runtime notes |
| --- | --- | --- |
| `ReferralCodes`, `ReferralTransactions` | `0112_referral_runtime_schema.sql` | auth accepts active ReferralCodes plus the existing Users compatibility code; registration writes are transaction-scoped |
| `Coupons`, `CouponUsages` | `0113_coupon_runtime_schema.sql` | validation/admin/stats only; no new checkout usage integration |
| `Points`, `PointTransactions`, `RewardsCatalog`, `RewardRedemptions` | `0114_loyalty_runtime_schema.sql` | redemption is one controlled TypeScript SQL transaction; no new stored procedure |
| `Tickets`, `TicketMessages` | `0115_support_runtime_schema.sql` | member/coach/admin role scopes and internal-message filtering remain source-owned |
| `Payments`, `Invoices` | `0116_membership_billing_runtime.sql` | membership billing only; application owns invoice generation |
| `AuditLogs`, `BackupLogs`, `CRMNotes`, `CRMTasks` | `0117_operations_runtime.sql` | operations owner; backup filesystem behavior remains unchanged |
| `AnalyticsDaily` | `0118_analytics_daily_runtime.sql` | stored export projection; no seeded rows or invented writer |
| `AnalyticsRetention` | `0119_analytics_retention_runtime.sql` | stored cohort projection; no seeded rows |

## Ownership closure and remaining unresolved active objects

| Object | Runtime callers or SQL domain | Legacy evidence | Classification | Next ownership work |
| --- | --- | --- | --- | --- |
| `Payments`, `Invoices`, `AuditLogs`, `BackupLogs`, `CRMNotes`, `CRMTasks`, `AnalyticsDaily`, `AnalyticsRetention` | closed in migrations `0116`–`0119` | historical snapshot only | `MIGRATION_CANONICAL` | see the canonicalized active-object table above |
| `ProductTags` | admin/seller product delete paths | `db/schema.sql` | `BUSINESS_RULE_REQUIRES_CONFIRMATION` | no safe taxonomy read/write owner; affected routes remain `schema_ready: NO` |
| `ExerciseMedia` | unmounted legacy helper only | none | `DEAD_LEGACY` | archive review; mounted media route uses product filesystem media |
| `Workouts` | public videos, coach workspace and admin workout/coach summaries | `db/schema.sql` | `BUSINESS_RULE_REQUIRES_CONFIRMATION` / `LEGACY_DUPLICATE_MODEL` | retain while active; decide whether/when to repoint to WorkoutPrograms without changing coach-visible behavior |
| `WorkoutSessions` | coach workspace and admin workout/coach summaries | `db/schema.sql` | `BUSINESS_RULE_REQUIRES_CONFIRMATION` / `LEGACY_DUPLICATE_MODEL` | analytics uses MemberWorkoutSessions; retain other active reads until a repoint decision |
| `WorkoutExercises` | coach workspace legacy session detail | `db/schema.sql` | `BUSINESS_RULE_REQUIRES_CONFIRMATION` / `LEGACY_DUPLICATE_MODEL` | retain while active; compare with WorkoutProgramExercises and session snapshots |

## Legacy-only candidates with no active runtime caller found

The following names are present in `db/schema.sql` but had no matching runtime
reference in the scoped source scan: `AffiliatePayouts`, `Affiliates`,
`ReferralClicks`, `ReferralRewards`, `NutritionEntries`, `NutritionPlans`,
`Promotions` and `TicketAttachments`. They are `DEAD_LEGACY` candidates for
review only. No table is deleted, dropped, or copied as part of this inventory.

## False-positive handling

Generic SQL-token matches such as `database`, `today`, `session_rows`, `this`
and `x` were excluded after source-context inspection. Names from scripts,
tests and the destructive legacy snapshot were not counted as runtime callers.
The baseline stored-procedure call and its post-0114 disposition are recorded in
`PASS3_RUNTIME_PROCEDURE_INVENTORY.md`.
