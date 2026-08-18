# GYMFIT Pass 2 Database Dependency Graph

Phase 76 is a read-only dependency graph derived from actual SQL references in
`db/migrations`, not only from `REQUIRED_TABLES` in the runner. Objects created
inside a migration are listed separately from objects that must already exist.

## Root foundation set

To execute the complete ordered chain from an empty database, the following
legacy/base tables are referenced before any numbered migration can create
their replacements or dependent objects:

```text
FOUNDATION
|-- Users
|-- Products
|-- ProductVariants
|-- ProductImages
|-- Inventory
|-- Brands
|-- Categories
|-- Exercises
|-- Bookings
|-- Plans
|-- Notifications
|-- CRMCustomers
`-- Memberships
```

The first six are direct `0001` prerequisites. The remaining seven are roots
introduced by later migrations: `Users` is needed by `0002`/`0003` and most
later foreign keys; `Exercises` by `0007`; `Bookings` by `0006`; `Plans` by
`0012`; `Notifications` by `0014`; and `CRMCustomers`/`Memberships` by
`0016`. Other legacy snapshot tables may be needed by current application
routes, but they are not required to establish the numbered migration graph.

## Ordered graph

| Migration | Must already exist | Creates or first owns |
| --- | --- | --- |
| `0001` | `Products`, `ProductVariants`, `ProductImages`, `Inventory`, `Brands`, `Categories` | Product option tables; canonical product/image/inventory constraints and shape. |
| `0002` | `Products`, `ProductVariants`, `ProductImages`, `Inventory`, `Users`; `0001` applied | `InventoryAdjustments`, immutable trigger, inventory/default-variant additions. |
| `0003` | `Users`, `Products`, `ProductVariants`; `0001` applied | `Orders`, `OrderItems`, `OrderStatusHistory`, immutable trigger. |
| `0004` | `Users`, `Orders`; `0003` applied | `PaymentStatusHistory`, immutable trigger. |
| `0005` | `Orders`; `0003` applied | Order reservation column/check/index and lifecycle trigger. |
| `0006` | `Users`, legacy `Bookings` | `AuthSessions`, token-version column, active booking index. |
| `0007` | `Users`, legacy `Exercises` | Workout program, day, exercise, assignment, and schedule tables. |
| `0008` | `Users`, `Exercises`, `CoachProgramAssignments`, `CoachProgramSchedules`; `0007` applied | Member workout session, session exercise, and set-log tables. |
| `0009` | `Users` | Coach status columns/check/index. |
| `0010` | `Users` | `CoachProfiles`. |
| `0011` | `Users` | Coach availability rule and exception tables. |
| `0012` | legacy `Plans` | `PlanEntitlements` and entitlement seed rows. |
| `0013` | `Users` | `CoachMemberContexts`. |
| `0014` | legacy `Notifications`, `Users` | Notification recipient fields, FK, and indexes. |
| `0015` | `WorkoutPrograms`; `0007` applied | Workout-program version fields, constraints, and indexes. |
| `0016` | legacy `CRMCustomers`, `Users`, `Bookings`, `Memberships` | Performance indexes only. |
| `0017` | legacy `Bookings` | Booking session/location fields and check. |
| `0100` | `Users` | Seller role constraint; `SellerApplications`, status history, trigger. |
| `0101` | `Users`, `Products`, `SellerApplications`; `0100` applied | `Shops`, official/seller shop rows, product ownership field/constraint. |
| `0102` | `Users`, `Brands`, `Shops`; `0101` applied | Brand normalization fields; `BrandRequests`, status history, trigger. |
| `0103` | `Products`, `BrandRequests`; `0102` applied | Product seller/moderation fields and constraints. |
| `0104` | `Users`, `Products`; `0103` applied | `ProductModerationHistory`, trigger, moderation indexes. |
| `0105` | `Users`, `Orders`, `OrderItems`, `Products`, `ProductVariants`, `Shops`; `0101` and `0003` applied | `ShopOrders`, shop-order history, item ownership field, invariant trigger. |
| `0106` | `Users`, `Products`, `ProductVariants`; `0001` applied | `Carts`, `CartItems`, invariant trigger. |
| `0107` | `Users`, `Orders`, `OrderItems`, `ShopOrders`; `0105` applied | Marketplace settings, refunds, compensation vouchers, marketplace notifications. |
| `0108` | `Users`, `Orders`, `ShopOrders`, `ShopOrderStatusHistory`; `0105` applied | Logistics fields, `OrderLogisticsStatusHistory`, trigger. |
| `0109` | `Users`, `MarketplaceSettings`, `Refunds`, `ShopOrders`, `Shops`; `0101`, `0105`, `0107` applied | Settlement tables, settlement fields, history triggers. |
| `0110` | `Users`, `Orders`, `OrderItems`, `Products`, `ProductVariants`, `InventoryAdjustments`, `Refunds`, `ShopOrders`, `ShopOrderSettlements`, `Shops`, `MarketplaceNotifications`; `0002`, `0105`, `0107`, `0109` applied | Complaint/replacement tables, complaint/refund/notification/inventory changes, triggers. |
| `0111` | `Users`, `Orders`, `OrderItems`, `Products`, `ProductVariants`, `ShopOrders`, `Shops`; `0003`, `0105` applied | Product/shop review tables, moderation history, immutable triggers. |

## Migration-order invariants

The dependency graph confirms these ordering constraints:

```text
FOUNDATION
  -> 0001 -> 0002 -> 0003 -> 0004 -> 0005 -> 0006 -> 0007
  -> 0008 -> 0009 -> 0010 -> 0011 -> 0012 -> 0013 -> 0014
  -> 0015 -> 0016 -> 0017
  -> 0100 -> 0101 -> 0102 -> 0103 -> 0104 -> 0105 -> 0106
  -> 0107 -> 0108 -> 0109 -> 0110 -> 0111
```

The numeric sort order is necessary but not sufficient on its own: a database
with migration-owned objects present but no matching `SchemaMigrations` rows
must be treated as an adoption conflict. The runner's ledger and checksum
rules remain independent of table existence.

## Empty-schema conclusion

The actual migration references require a broader foundation than the six
names in the runner's current `REQUIRED_TABLES` array. The canonical bootstrap
contract must either create the full root set above or fail closed before
starting the runner; it must not rely on the legacy snapshot to create hidden
roots and must not create any migration-owned object.
