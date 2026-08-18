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
the object. `LEGACY_DUPLICATE_MODEL` is reserved for active legacy workout
objects that overlap the newer coach/member model. `UNCLEAR_OWNER` means the
source contract is not sufficiently recoverable to write a safe migration.

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

## Remaining active objects without a current owner

| Object | Runtime callers or SQL domain | Legacy evidence | Classification | Next ownership work |
| --- | --- | --- | --- | --- |
| `Payments` | membership payment, invoice, revenue and analytics controllers | `db/schema.sql` | `LEGACY_REQUIRED` | create a separate membership billing owner; do not merge with Marketplace Orders payment |
| `Invoices` | invoice list/create/read/mark-sent | `db/schema.sql` | `LEGACY_REQUIRED` | billing migration; retain current payment-to-invoice relationship |
| `AnalyticsDaily` | admin analytics range endpoint | `db/schema.sql` | `LEGACY_REQUIRED` pending model review | decide whether this is stored reporting data or a derived projection before migration |
| `AnalyticsRetention` | admin retention endpoint | `db/schema.sql` | `LEGACY_REQUIRED` pending model review | decide retention grain and refresh ownership before migration |
| `AuditLogs` | auth, seller/admin workflows and audit route | `db/schema.sql` | `LEGACY_REQUIRED` | operations/audit migration; keep audit writes inside existing business transactions |
| `BackupLogs` | admin backup controller | `db/schema.sql` | `LEGACY_REQUIRED` | operations migration; filesystem backup behavior remains unchanged |
| `CRMNotes` | CRM detail/read and note creation | `db/schema.sql` | `LEGACY_REQUIRED` | CRM extension migration under the foundation `CRMCustomers` root |
| `CRMTasks` | CRM detail/read and task creation | `db/schema.sql` | `LEGACY_REQUIRED` | CRM extension migration under the foundation `CRMCustomers` root |
| `ProductTags` | admin/seller product read/delete paths | `db/schema.sql` | `LEGACY_REQUIRED` with `UNCLEAR_OWNER` for taxonomy semantics | recover whether tags are still product metadata or a superseded catalog concept before creating a table |
| `ExerciseMedia` | media processing service and exercise media payloads | no matching table in the legacy snapshot scan; no foundation/migration owner | `UNCLEAR_OWNER` | inspect historical schema/source contract; do not create guessed columns |
| `Workouts` | public videos, coach workspace and admin workout/coach summaries | `db/schema.sql` | `LEGACY_REQUIRED` + `LEGACY_DUPLICATE_MODEL` | retain while active; decide whether/when to repoint to WorkoutPrograms without changing coach-visible behavior |
| `WorkoutSessions` | analytics, coach workspace and admin workout/coach summaries | `db/schema.sql` | `LEGACY_REQUIRED` + `LEGACY_DUPLICATE_MODEL` | retain while active; compare with MemberWorkoutSessions before any repoint |
| `WorkoutExercises` | coach workspace legacy session detail | `db/schema.sql` | `LEGACY_REQUIRED` + `LEGACY_DUPLICATE_MODEL` | retain while active; compare with WorkoutProgramExercises and session snapshots |

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
