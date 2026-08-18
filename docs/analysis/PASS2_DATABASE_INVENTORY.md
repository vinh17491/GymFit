# GYMFIT Pass 2 Database Foundation Inventory

Phase 75 is a read-only inventory of `db/schema.sql`, the ordered migration
files, and `backend/src/scripts/migrate.ts`. It does not define the bootstrap
implementation yet; dependency ordering is resolved in Phase 76.

## A. Objects required before migration `0001`

Migration `0001_commerce_catalog_foundation.sql` does not create the legacy
commerce tables. It explicitly requires these six tables and reads/writes
their existing rows and columns:

- `dbo.Products`
- `dbo.ProductVariants`
- `dbo.ProductImages`
- `dbo.Inventory`
- `dbo.Brands`
- `dbo.Categories`

The migration uses the legacy product/variant shape, product option fields,
legacy image fields, and the pre-normalized inventory fields before it adds
canonical constraints and columns. These are therefore foundation contracts,
not migration-owned tables.

Additional legacy tables are required before the first later migration that
references them:

- `dbo.Users` - `0002`, `0003`, `0006`-`0017`, and Marketplace migrations.
- `dbo.Exercises` - `0007` and `0008` foreign keys.
- `dbo.Bookings` - `0006`, `0016`, and `0017`.
- `dbo.Plans` - `0012` foreign key and entitlement seed.
- `dbo.Notifications` - `0014` additive upgrade.
- `dbo.CRMCustomers` and `dbo.Memberships` - `0016` indexes.

These later prerequisites are not evidence that they belong in a minimal
`0001` bootstrap; their exact ordering and bootstrap inclusion are deferred to
the dependency graph in Phase 76.

## B. Objects created or owned by migrations

| Migration | Owned objects and changes |
| --- | --- |
| `0001` | `ProductOptions`, `ProductOptionValues`, `VariantOptionValues`; canonicalizes `ProductVariants`, `ProductImages`, and `Inventory`; adds their checks/indexes. |
| `0002` | `InventoryAdjustments`, immutable-history trigger; inventory/default-variant columns, checks, and indexes. |
| `0003` | `Orders`, `OrderItems`, `OrderStatusHistory`, immutable-history trigger, order/item/history indexes. |
| `0004` | `PaymentStatusHistory`, immutable-history trigger, order history index. |
| `0005` | Order reservation-expiration column/check/index and lifecycle trigger. |
| `0006` | `AuthSessions`; `Users.token_version`; active-booking unique index. |
| `0007` | `WorkoutPrograms`, `WorkoutProgramDays`, `WorkoutProgramExercises`, `CoachProgramAssignments`, `CoachProgramSchedules`, and related indexes. |
| `0008` | `MemberWorkoutSessions`, `MemberWorkoutSessionExercises`, `MemberWorkoutSetLogs`, and related indexes. |
| `0009` | Coach status columns/check/index on `Users`. |
| `0010` | `CoachProfiles` and its index. |
| `0011` | `CoachAvailabilityRules`, `CoachAvailabilityExceptions`, constraints, and indexes. |
| `0012` | `PlanEntitlements`, constraints/index, and deterministic entitlement backfill from existing Plans. |
| `0013` | `CoachMemberContexts`, constraints/index. |
| `0014` | Additive notification columns, recipient foreign key, and notification indexes. |
| `0015` | Workout-program versioning columns, constraints, and indexes. |
| `0016` | Coach/member/membership performance indexes. |
| `0017` | Booking session/location columns and session-mode check. |
| `0100` | Seller role constraint replacement; `SellerApplications`, `SellerApplicationStatusHistory`, indexes, immutable-history trigger. |
| `0101` | `Shops`, shop indexes, `Products.shop_id` ownership constraint/index, official/seller shop backfill. |
| `0102` | Brand normalization columns/indexes; `BrandRequests`, `BrandRequestStatusHistory`, indexes, immutable-history trigger, generic-brand compatibility row. |
| `0103` | Product seller/moderation columns, constraints, and indexes. |
| `0104` | Product moderation columns; `ProductModerationHistory`, indexes, immutable-history trigger. |
| `0105` | `ShopOrders`, `ShopOrderStatusHistory`, `OrderItems.shop_order_id`, backfill, invariant trigger, and indexes. |
| `0106` | `Carts`, `CartItems`, invariant trigger, and indexes. |
| `0107` | `MarketplaceSettings`, `Refunds`, `RefundStatusHistory`, `CompensationVouchers`, `MarketplaceNotifications`; order/item compensation fields, indexes, and settings seed. |
| `0108` | Fulfillment/logistics columns and checks; `OrderLogisticsStatusHistory`, indexes, immutable-history trigger, and history backfill. |
| `0109` | Settlement fields/backfill; `ShopOrderSettlements`, `SettlementStatusHistory`, `SettlementAdjustments`, `SettlementAdjustmentHistory`, `SettlementBatches`, `SettlementBatchItems`, indexes, immutable-history triggers, settlement backfill. |
| `0110` | `MarketplaceComplaints`, `ComplaintEventHistory`, `ComplaintReplacements`, `ReplacementStatusHistory`, complaint/refund/notification/inventory constraints/indexes, immutable-history triggers. |
| `0111` | `ProductReviews`, `ShopReviews`, `ReviewModerationHistory`, indexes, immutable-history triggers. |

`dbo.SchemaMigrations` is created by the migration runner itself and is a
ledger object, not an object owned by any numbered migration.

## C. Legacy objects and demo-only objects

`db/schema.sql` is a combined legacy snapshot, stored-procedure script, and
demo-data script. Its base/runtime tables are not migration ownership evidence.
The current application or migration chain still consumes several of them,
including `Users`, `Plans`, `Memberships`, `Notifications`, `CRMCustomers`,
`Bookings`, `Exercises`, the six commerce foundation tables, and the legacy
fitness/support/analytics tables used by existing routes.

The snapshot also contains non-migration legacy tables with no current
canonical migration owner, including referral/affiliate support tables,
promotions, nutrition tables, and unused attachment/history variants. They
must not be copied into a minimal foundation bootstrap merely because they
appear in the snapshot; runtime references and the Phase 76 dependency graph
must decide whether they remain a separate legacy prerequisite.

## D. Seed and demo data

- `db/schema.sql:767-1470` contains demo users, plans, memberships, payments,
  invoices, referrals, coupons, loyalty rows, workouts, support/CRM rows,
  analytics rows, categories, brands, products, and test accounts.
- `backend/seed_data.json` and the product JSON files are retained data assets,
  not foundation DDL.
- Numbered migrations contain controlled compatibility/backfill DML. Examples
  include product normalization in `0001`, entitlement rows in `0012`, the
  official shop in `0101`, marketplace settings in `0107`, and settlement
  backfills in `0109`. These are migration-owned behavior and must not be
  moved into a foundation bootstrap.

## E. Stored procedures

The legacy snapshot defines eight procedures: `sp_GetDAU`,
`sp_GetRevenueByPeriod`, `sp_GetRetentionCohort`, `sp_CalculateChurnRate`,
`sp_AddPoints`, `sp_SpendPoints`, `sp_ProcessReferralCommission`, and
`sp_GenerateInvoice`. No numbered migration owns them. The current loyalty
controller invokes `sp_SpendPoints`, so deleting or silently replacing these
compatibility procedures is outside this pass; they are not foundation
bootstrap objects.

## F. Foundation indexes and constraints

The six pre-`0001` commerce tables need a compatible legacy shape, primary
keys, required foreign keys, and the columns read by `0001`. `0001` then owns
the canonical product-variant SKU/price checks, product-image uniqueness and
primary-image index, inventory variant uniqueness, and inventory quantity
checks. Later migrations own their own checks, foreign keys, triggers, and
indexes.

The runner's `SchemaMigrations` primary key and exact column contract are a
separate ledger foundation. Existing migration-owned tables without a matching
ledger entry remain an adoption conflict; table existence alone is not an
applied-migration signal.

## Inventory conclusion

An empty database cannot be initialized by copying `db/schema.sql`, and the
current runner cannot reach `0001` without pre-existing commerce foundation
objects. The canonical bootstrap must therefore be a small, non-destructive
foundation layer whose exact object set and safety guards are defined in
Phases 76-80.
