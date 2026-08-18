# GymFit Database Migration Ownership

Status: canonical ownership map / `BOOTSTRAP_SOURCE_COMPLETE`

Live database status: `DATABASE_MANUAL_CHECK_REQUIRED`

This file records schema ownership only. It does not assert that a migration is
applied in any particular database. Applied state remains the responsibility of
`dbo.SchemaMigrations` plus checksum verification.

## Rules

- `db/migrations/NNNN_*.sql` is the source of truth for forward schema changes.
- `db/schema.sql` is a legacy foundation/snapshot artifact and is not migration
  ownership evidence.
- A migration owns every table, column, index, constraint, trigger, or other
  schema object that it creates or adds.
- `TABLE EXISTS != MIGRATION APPLIED`.
- Adoption requires a full metadata comparison. A mismatch is `SCHEMA_MISMATCH`;
  it must not be recorded as applied.
- Applied/canonical migration files are immutable. Later changes require a new
  ordered migration.

## Foundation bootstrap and legacy foundation

The non-destructive empty-database foundation is owned by
`db/bootstrap/foundation.sql` and executed only through the guarded
`backend/src/scripts/bootstrap.ts` command. It creates exactly these 13 root
tables and no migration ledger, numbered migration object, demo row or
post-foundation migration column:

`Users`, `Plans`, `Brands`, `Categories`, `Products`, `ProductVariants`,
`ProductImages`, `Inventory`, `Exercises`, `Bookings`, `Notifications`,
`CRMCustomers`, `Memberships`.

This source contract is complete, but the first live bootstrap and migration
run remain `DATABASE_MANUAL_CHECK_REQUIRED`.

The broader legacy foundation/runtime inventory below includes tables that may
be consumed by historical code or later migration references. Their presence
does not authorize a bootstrap, migration adoption or demo-data load.

These tables predate the ordered migration chain and are required as foundation
for the current migrations and legacy runtime. Their presence does not mark any
migration as applied:

`Users`, `Plans`, `Memberships`, `Payments`, `Invoices`, `Notifications`,
`ReferralCodes`, `ReferralClicks`, `ReferralRewards`, `ReferralTransactions`,
`Affiliates`, `AffiliatePayouts`, `Coupons`, `CouponUsages`, `Promotions`,
`Points`, `PointTransactions`, `RewardsCatalog`, `RewardRedemptions`,
`Workouts`, `WorkoutExercises`, `WorkoutSessions`, `NutritionPlans`,
`NutritionEntries`, `Tickets`, `TicketMessages`, `TicketAttachments`,
`CRMCustomers`, `CRMNotes`, `CRMTasks`, `AuditLogs`, `BackupLogs`,
`AnalyticsDaily`, `AnalyticsRetention`, `Brands`, `Categories`, `Products`,
`Exercises`, `ProductImages`, `ProductVariants`, `ProductTags`, `Inventory`,
`Bookings`.

The legacy foundation is intentionally kept separate from migration-owned
objects. It must not include later migration additions such as seller tables,
shops, brand requests, product moderation history, or their post-foundation
columns.

## Migration ownership

| Migration | Owned tables | Owned additions to existing objects |
|---|---|---|
| `0001` | `ProductOptions`, `ProductOptionValues`, `VariantOptionValues` | Product variant normalization; ProductImages normalization; Inventory canonicalization and invariants |
| `0002` | `InventoryAdjustments` | ProductVariants default flag; Inventory low-stock fields and constraints |
| `0003` | `Orders`, `OrderItems`, `OrderStatusHistory` | — |
| `0004` | `PaymentStatusHistory` | — |
| `0005` | — | Orders reservation-expiration fields and constraints |
| `0006` | `AuthSessions` | Users token version; active booking slot index |
| `0007` | `WorkoutPrograms`, `WorkoutProgramDays`, `WorkoutProgramExercises`, `CoachProgramAssignments`, `CoachProgramSchedules` | — |
| `0008` | `MemberWorkoutSessions`, `MemberWorkoutSessionExercises`, `MemberWorkoutSetLogs` | — |
| `0009` | — | Users Coach status fields, constraint and index |
| `0010` | `CoachProfiles` | — |
| `0011` | `CoachAvailabilityRules`, `CoachAvailabilityExceptions` | availability foreign keys/indexes where required |
| `0012` | `PlanEntitlements` | plan entitlement compatibility fields/seed mappings where required |
| `0013` | `CoachMemberContexts` | — |
| `0014` | — | Notifications recipient/action/read/deduplication fields, foreign key and indexes |
| `0015` | — | Workout program version/lifecycle fields and constraints |
| `0016` | — | Coach/Member query-performance indexes |
| `0017` | — | Bookings session snapshot fields and constraint |
| `0100` | `SellerApplications`, `SellerApplicationStatusHistory` | Users seller-role check constraint |
| `0101` | `Shops` | Products shop ownership field, foreign key and indexes |
| `0102` | `BrandRequests`, `BrandRequestStatusHistory` | Brands normalization/generic fields, indexes and constraints |
| `0103` | — | Products seller lifecycle fields, foreign key, checks and indexes |
| `0104` | `ProductModerationHistory` | Products review/published fields, reviewer foreign key and indexes |
| `0105` | `ShopOrders`, `ShopOrderStatusHistory` | OrderItems shop-order ownership and compatibility backfill |
| `0106` | `Carts`, `CartItems` | — |
| `0107` | `Refunds`, `RefundStatusHistory`, `CompensationVouchers`, `MarketplaceSettings`, `MarketplaceNotifications` | Order/OrderItem refund, voucher and reservation-release fields/constraints |
| `0108` | `OrderLogisticsStatusHistory` | ShopOrder logistics fields, status constraint and indexes |
| `0109` | `ShopOrderSettlements`, `SettlementStatusHistory`, `SettlementAdjustments`, `SettlementAdjustmentHistory`, `SettlementBatches`, `SettlementBatchItems` | ShopOrder commission/settlement fields and constraints |
| `0110` | `MarketplaceComplaints`, `ComplaintEventHistory`, `ComplaintReplacements`, `ReplacementStatusHistory` | refund, notification and inventory safety constraints |
| `0111` | `ProductReviews`, `ShopReviews`, `ReviewModerationHistory` | review-related indexes/constraints |

## Collision result

`db/schema.sql` remains a destructive legacy/history artifact and is not part of
the canonical bootstrap path. The foundation bootstrap does not create
migration-owned tables or post-foundation Marketplace columns. Migration files
remain unchanged. Any legacy database that already contains an object without a
matching ledger entry still requires strict metadata verification before an
adoption decision; this registry does not authorize automatic adoption.
