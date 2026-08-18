# GymFit Pass 3 Runtime Schema Ownership Matrix

This is the combined result of the registered-route, frontend-surface,
runtime-SQL, stored-procedure and background-runner inventories. It is the
decision gate for later Pass 3 migrations. No schema change was made before
this matrix was created.

`foundation_owner` and `migration_owner` identify the current installation
source. `legacy_schema_owner` records presence in the destructive legacy
snapshot, not permission to copy that snapshot into foundation. A `-` means no
owner was found in that source. Classification is intentionally conservative:
uncertain business semantics are `UNCLEAR_OWNER` or
`BUSINESS_RULE_REQUIRES_CONFIRMATION`, not guessed schema.

| object | object_type | runtime_callers | frontend_usage | foundation_owner | migration_owner | legacy_schema_owner | classification | risk | recommended_action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Users` | TABLE | auth, users, CRM, coach/admin scopes | login, register, profile, members, seller/admin/coach surfaces | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P0 auth and ownership | keep root owner; additive changes only |
| `Plans` | TABLE | plans, revenue, membership, analytics | membership and plan discovery | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P1 billing | keep root owner; preserve membership billing separation |
| `Brands` | TABLE | public/admin catalog and product joins | products, shops, admin brands | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P1 catalog | keep root owner |
| `Categories` | TABLE | public/admin catalog and product joins | products, admin categories | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P1 catalog | keep root owner |
| `Products` | TABLE | product, shop, cart/order and seller/admin services | products, shops, cart, seller/admin product surfaces | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P0 marketplace | preserve catalog/order contracts |
| `ProductVariants` | TABLE | product, cart/order, inventory and seller/admin services | products, cart, seller/admin catalog | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P0 checkout | preserve variant/inventory identity |
| `ProductImages` | TABLE | product/catalog/moderation services | product and shop detail | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P1 catalog | keep root owner |
| `Inventory` | TABLE | cart/order reservation, admin inventory, expiration runner | cart, checkout, admin inventory | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P0 non-negative reservation | frozen; no semantic rewrite |
| `Exercises` | TABLE | exercise, coach, member workout and admin services | exercise, workout and coach pages | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P1 workout | keep root owner; inspect media relation separately |
| `Bookings` | TABLE | booking repository/controller and chatbot adapter | coach booking and appointments | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P0 coach ownership | frozen booking contract |
| `Notifications` | TABLE | notifications, coach overdue runner and business events | notifications and shared dashboard surfaces | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P1 user data | keep root owner; preserve event scopes |
| `CRMCustomers` | TABLE | CRM, users and admin-coach services | CRM and member/admin surfaces | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P1 customer ownership | extend through additive child migrations |
| `Memberships` | TABLE | membership/plans and account services | membership account/checkout | `db/bootstrap/foundation.sql` | - | `db/schema.sql` | `FOUNDATION_CANONICAL` | P0 entitlement state | frozen payment/activation semantics |
| `ProductOptions` | TABLE | variant/catalog services | admin variants/product forms | - | `0001_commerce_catalog_foundation.sql` | - | `MIGRATION_CANONICAL` | P1 catalog | retain migration owner |
| `ProductOptionValues` | TABLE | variant/catalog services | admin variants/product forms | - | `0001_commerce_catalog_foundation.sql` | - | `MIGRATION_CANONICAL` | P1 catalog | retain migration owner |
| `VariantOptionValues` | TABLE | variant/catalog services | admin variants/product forms | - | `0001_commerce_catalog_foundation.sql` | - | `MIGRATION_CANONICAL` | P1 catalog | retain migration owner |
| `InventoryAdjustments` | TABLE | admin inventory service | admin inventory | - | `0002_catalog_inventory_management.sql` | - | `MIGRATION_CANONICAL` | P1 inventory | retain immutable adjustment history |
| `Orders` | TABLE | order/checkout, complaints, reviews, seller/admin, expiration runner | checkout, orders, complaints, reviews, seller/admin | - | `0003_order_management_foundation.sql` | - | `MIGRATION_CANONICAL` | P0 marketplace | preserve checkout and payment terminal rules |
| `OrderItems` | TABLE | order, inventory, complaints and review services | orders, complaints, reviews | - | `0003_order_management_foundation.sql` | - | `MIGRATION_CANONICAL` | P0 checkout | retain migration owner |
| `OrderStatusHistory` | TABLE | order/admin and expiration runner | order/admin status surfaces | - | `0003_order_management_foundation.sql` | - | `MIGRATION_CANONICAL` | P1 auditability | retain append-only status history |
| `PaymentStatusHistory` | TABLE | marketplace payment and expiration runner | checkout/order/admin | - | `0004_payment_status_history.sql` | - | `MIGRATION_CANONICAL` | P0 payment terminal | preserve `FAILED` terminal rule |
| `AuthSessions` | TABLE | auth and seller application services | login/register/account | - | `0006_auth_session_security.sql` | - | `MIGRATION_CANONICAL` | P0 auth | frozen session contract |
| `WorkoutPrograms` | TABLE | coach workspace and member workout services | coach programs and member workouts | - | `0007_coach_programs_assignments_schedules.sql` | - | `MIGRATION_CANONICAL` | P0 coach/member ownership | keep canonical program owner |
| `WorkoutProgramDays` | TABLE | coach workspace and member workout services | coach programs and member workouts | - | `0007_coach_programs_assignments_schedules.sql` | - | `MIGRATION_CANONICAL` | P1 workout | retain snapshot source |
| `WorkoutProgramExercises` | TABLE | coach workspace and member workout services | coach programs and member workouts | - | `0007_coach_programs_assignments_schedules.sql` | - | `MIGRATION_CANONICAL` | P1 workout | retain program definition owner |
| `CoachProgramAssignments` | TABLE | coach workspace, member workout, overdue runner | coach/member assignments | - | `0007_coach_programs_assignments_schedules.sql` | - | `MIGRATION_CANONICAL` | P0 cross-user scope | preserve coach/member ownership |
| `CoachProgramSchedules` | TABLE | coach workspace, member workout, overdue runner | schedules and coach/member session pages | - | `0007_coach_programs_assignments_schedules.sql` | - | `MIGRATION_CANONICAL` | P0 scheduling | preserve timezone and overdue behavior |
| `MemberWorkoutSessions` | TABLE | member workout, coach workspace/admin, overdue runner | member progress and coach member sessions | - | `0008_member_workout_flow.sql` | - | `MIGRATION_CANONICAL` | P0 workout ownership | keep canonical execution model |
| `MemberWorkoutSessionExercises` | TABLE | member workout and progress services | member session detail/progress | - | `0008_member_workout_flow.sql` | - | `MIGRATION_CANONICAL` | P1 workout | retain snapshot rows |
| `MemberWorkoutSetLogs` | TABLE | member workout and progress services | member session detail/progress | - | `0008_member_workout_flow.sql` | - | `MIGRATION_CANONICAL` | P1 workout | retain set-log invariants |
| `CoachProfiles` | TABLE | coach discovery, booking and coach workspace | coach pages and booking | - | `0010_coach_profiles.sql` | - | `MIGRATION_CANONICAL` | P0 coach identity | retain ownership boundary |
| `CoachAvailabilityRules` | TABLE | coach availability and booking | coach availability/booking | - | `0011_coach_availability.sql` | - | `MIGRATION_CANONICAL` | P0 booking | preserve timezone/rule semantics |
| `CoachAvailabilityExceptions` | TABLE | coach availability and booking | coach availability/booking | - | `0011_coach_availability.sql` | - | `MIGRATION_CANONICAL` | P0 booking | preserve exception semantics |
| `PlanEntitlements` | TABLE | membership, plan and coach booking checks | membership/booking | - | `0012_membership_entitlements.sql` | - | `MIGRATION_CANONICAL` | P0 entitlement | preserve typed entitlement contract |
| `CoachMemberContexts` | TABLE | coach workspace context services | coach member detail | - | `0013_coach_member_context.sql` | - | `MIGRATION_CANONICAL` | P1 coach privacy | preserve scoped context |
| `SellerApplications` | TABLE | seller application and admin review | seller apply/admin review | - | `0100_seller_application_role_foundation.sql` | - | `MIGRATION_CANONICAL` | P1 seller identity | retain application state machine |
| `SellerApplicationStatusHistory` | TABLE | seller application/admin review | seller/admin application history | - | `0100_seller_application_role_foundation.sql` | - | `MIGRATION_CANONICAL` | P1 auditability | retain append-only history |
| `Shops` | TABLE | public shop, seller shop, product and admin services | shops, seller/admin shop | - | `0101_shop_foundation_and_product_ownership_baseline.sql` | - | `MIGRATION_CANONICAL` | P0 marketplace ownership | preserve shop ownership |
| `BrandRequests` | TABLE | seller/admin brand request services | seller/admin brand requests | - | `0102_brand_request_and_moderation.sql` | - | `MIGRATION_CANONICAL` | P1 moderation | retain state machine |
| `BrandRequestStatusHistory` | TABLE | seller/admin brand request services | seller/admin brand requests | - | `0102_brand_request_and_moderation.sql` | - | `MIGRATION_CANONICAL` | P1 auditability | retain history |
| `ProductModerationHistory` | TABLE | product moderation/admin product services | admin moderation | - | `0104_admin_product_moderation.sql` | - | `MIGRATION_CANONICAL` | P1 moderation | retain moderation history |
| `ShopOrders` | TABLE | marketplace checkout, seller/admin order, complaints, expiration runner | customer/seller/admin orders | - | `0105_multi_shop_order_architecture.sql` | - | `MIGRATION_CANONICAL` | P0 checkout | preserve multi-shop order boundaries |
| `ShopOrderStatusHistory` | TABLE | seller/admin order and expiration runner | seller/admin order status | - | `0105_multi_shop_order_architecture.sql` | - | `MIGRATION_CANONICAL` | P1 fulfillment | retain status history |
| `Carts` | TABLE | cart and checkout services | cart/checkout | - | `0106_persistent_server_side_cart.sql` | - | `MIGRATION_CANONICAL` | P0 checkout | retain server-side cart owner |
| `CartItems` | TABLE | cart and checkout services | cart/checkout | - | `0106_persistent_server_side_cart.sql` | - | `MIGRATION_CANONICAL` | P0 checkout | retain variant scope |
| `MarketplaceSettings` | TABLE | marketplace finance and compensation services | admin marketplace settings | - | `0107_checkout_refund_compensation.sql` | - | `MIGRATION_CANONICAL` | P1 finance | retain marketplace-only scope |
| `Refunds` | TABLE | refund/admin order/complaint services | admin refunds, complaints | - | `0107_checkout_refund_compensation.sql` | - | `MIGRATION_CANONICAL` | P0 refund | preserve refund state machine |
| `RefundStatusHistory` | TABLE | refund/admin order services | admin refunds | - | `0107_checkout_refund_compensation.sql` | - | `MIGRATION_CANONICAL` | P1 auditability | retain history |
| `CompensationVouchers` | TABLE | marketplace compensation and complaint services | checkout/complaints | - | `0107_checkout_refund_compensation.sql` | - | `MIGRATION_CANONICAL` | P1 compensation | preserve voucher restrictions |
| `MarketplaceNotifications` | TABLE | marketplace order/complaint services | order/complaint notifications | - | `0107_checkout_refund_compensation.sql` | - | `MIGRATION_CANONICAL` | P1 user data | keep separate event namespace |
| `OrderLogisticsStatusHistory` | TABLE | seller/admin fulfillment services | seller/admin orders | - | `0108_seller_fulfillment_hub_logistics.sql` | - | `MIGRATION_CANONICAL` | P1 fulfillment | retain logistics history |
| `ShopOrderSettlements` | TABLE | seller/admin marketplace finance | seller revenue/admin settlements | - | `0109_commission_weekly_settlement_seller_revenue.sql` | - | `MIGRATION_CANONICAL` | P0 seller finance | preserve settlement totals |
| `SettlementStatusHistory` | TABLE | seller/admin marketplace finance | seller revenue/admin settlements | - | `0109_commission_weekly_settlement_seller_revenue.sql` | - | `MIGRATION_CANONICAL` | P1 finance audit | retain history |
| `SettlementAdjustments` | TABLE | seller/admin marketplace finance | seller revenue/admin settlements | - | `0109_commission_weekly_settlement_seller_revenue.sql` | - | `MIGRATION_CANONICAL` | P1 finance | preserve adjustment ownership |
| `SettlementAdjustmentHistory` | TABLE | seller/admin marketplace finance | seller revenue/admin settlements | - | `0109_commission_weekly_settlement_seller_revenue.sql` | - | `MIGRATION_CANONICAL` | P1 finance audit | retain history |
| `SettlementBatches` | TABLE | seller/admin marketplace finance | seller revenue/admin settlements | - | `0109_commission_weekly_settlement_seller_revenue.sql` | - | `MIGRATION_CANONICAL` | P1 finance | retain batch lifecycle |
| `SettlementBatchItems` | TABLE | seller/admin marketplace finance | seller revenue/admin settlements | - | `0109_commission_weekly_settlement_seller_revenue.sql` | - | `MIGRATION_CANONICAL` | P1 finance | retain batch detail |
| `MarketplaceComplaints` | TABLE | buyer/seller/admin complaints | complaints pages | - | `0110_lightweight_complaint_fault_replacement.sql` | - | `MIGRATION_CANONICAL` | P0 buyer/seller scope | preserve complaint ownership |
| `ComplaintEventHistory` | TABLE | buyer/seller/admin complaints | complaints pages | - | `0110_lightweight_complaint_fault_replacement.sql` | - | `MIGRATION_CANONICAL` | P1 auditability | retain event history |
| `ComplaintReplacements` | TABLE | buyer/seller/admin complaints | complaints pages | - | `0110_lightweight_complaint_fault_replacement.sql` | - | `MIGRATION_CANONICAL` | P1 fulfillment | preserve replacement state |
| `ReplacementStatusHistory` | TABLE | buyer/seller/admin complaints | complaints pages | - | `0110_lightweight_complaint_fault_replacement.sql` | - | `MIGRATION_CANONICAL` | P1 auditability | retain history |
| `ProductReviews` | TABLE | buyer/seller/admin reviews and product services | product, review, seller/admin review pages | - | `0111_product_shop_reviews.sql` | - | `MIGRATION_CANONICAL` | P1 trust | preserve verified-purchase scope |
| `ShopReviews` | TABLE | buyer/seller/admin reviews and shop services | shop and review pages | - | `0111_product_shop_reviews.sql` | - | `MIGRATION_CANONICAL` | P1 trust | preserve moderation scope |
| `ReviewModerationHistory` | TABLE | seller/admin review services | seller/admin review pages | - | `0111_product_shop_reviews.sql` | - | `MIGRATION_CANONICAL` | P1 moderation | retain history |
| `ReferralCodes` | TABLE | auth registration, referral controller | `/referral`, `/register` | - | `0112_referral_runtime_schema.sql` | `db/schema.sql` | `MIGRATION_CANONICAL` | P0 registration | `KEEP_AND_MIGRATE`; preserve Users compatibility code and active canonical code |
| `ReferralTransactions` | TABLE | auth registration, referral controller | `/referral`, `/register` | - | `0112_referral_runtime_schema.sql` | `db/schema.sql` | `MIGRATION_CANONICAL` | P0 registration | `KEEP_AND_MIGRATE`; enforce one registration transaction per pair/type |
| `Coupons` | TABLE | coupon controller | `/coupons`, checkout-related UI | - | `0113_coupon_runtime_schema.sql` | `db/schema.sql` | `MIGRATION_CANONICAL` | P1 pricing | `KEEP_AND_MIGRATE`; preserve current validation/admin/stats contract |
| `CouponUsages` | TABLE | coupon controller | `/coupons`, checkout-related UI | - | `0113_coupon_runtime_schema.sql` | `db/schema.sql` | `MIGRATION_CANONICAL` | P1 pricing | `KEEP_AND_MIGRATE`; index current count lookups without adding checkout integration |
| `Points` | TABLE | loyalty controller | `/loyalty` and member dashboard | - | `0114_loyalty_runtime_schema.sql` | `db/schema.sql` | `MIGRATION_CANONICAL` | P1 balance integrity | `KEEP_AND_MIGRATE`; lock balance in redemption/daily-login paths |
| `PointTransactions` | TABLE | loyalty controller | `/loyalty` | - | `0114_loyalty_runtime_schema.sql` | `db/schema.sql` | `MIGRATION_CANONICAL` | P1 auditability | `KEEP_AND_MIGRATE`; keep earn/spend history append-only |
| `RewardsCatalog` | TABLE | loyalty controller | `/loyalty` | - | `0114_loyalty_runtime_schema.sql` | `db/schema.sql` | `MIGRATION_CANONICAL` | P1 catalog | `KEEP_AND_MIGRATE`; enforce non-negative stock without seed data |
| `RewardRedemptions` | TABLE | loyalty controller | `/loyalty` | - | `0114_loyalty_runtime_schema.sql` | `db/schema.sql` | `MIGRATION_CANONICAL` | P0 balance and stock | `KEEP_AND_MIGRATE`; one serializable transaction covers the full redemption |
| `Tickets` | TABLE | ticket controller | `/tickets` | - | `0115_support_runtime_schema.sql` | `db/schema.sql` | `MIGRATION_CANONICAL` | P1 support | `KEEP_AND_MIGRATE`; preserve member/coach/admin scopes |
| `TicketMessages` | TABLE | ticket controller | `/tickets` | - | `0115_support_runtime_schema.sql` | `db/schema.sql` | `MIGRATION_CANONICAL` | P1 support privacy | `KEEP_AND_MIGRATE`; preserve admin-only internal visibility |
| `Payments` | TABLE | plans/membership, invoices, revenue, analytics | membership account, invoices, admin revenue/analytics | - | - | `db/schema.sql` | `LEGACY_REQUIRED` | P0 billing | create separate membership billing owner; do not merge with marketplace payment |
| `Invoices` | TABLE | invoice controller | `/invoices` | - | - | `db/schema.sql` | `LEGACY_REQUIRED` | P1 billing | preserve payment link and current invoice number contract |
| `AnalyticsDaily` | TABLE | analytics controller | `/admin/analytics` | - | - | `db/schema.sql` | `LEGACY_REQUIRED` | P2 reporting | decide stored projection vs derived report before migration |
| `AnalyticsRetention` | TABLE | analytics controller | `/admin/analytics` | - | - | `db/schema.sql` | `LEGACY_REQUIRED` | P2 reporting | document cohort/refresh contract before migration |
| `AuditLogs` | TABLE | auth, seller/admin workflows, audit controller | `/admin/audit` plus mutation flows | - | - | `db/schema.sql` | `LEGACY_REQUIRED` | P1 auditability | add operations owner; keep writes transactional |
| `BackupLogs` | TABLE | backup controller | `/admin/backup` | - | - | `db/schema.sql` | `LEGACY_REQUIRED` | P2 operations | add operations owner; preserve filesystem path behavior |
| `CRMNotes` | TABLE | CRM controller | `/crm` | - | - | `db/schema.sql` | `LEGACY_REQUIRED` | P1 customer privacy | add child migration under CRMCustomers |
| `CRMTasks` | TABLE | CRM controller | `/crm` | - | - | `db/schema.sql` | `LEGACY_REQUIRED` | P1 customer privacy | add child migration under CRMCustomers |
| `ProductTags` | TABLE | admin/seller product services | admin/seller product pages | - | - | `db/schema.sql` | `UNCLEAR_OWNER` | P1 catalog | recover taxonomy ownership before creating or repointing |
| `ExerciseMedia` | TABLE | media service; exercise/program media payloads | exercise/program images; no dedicated management route | - | - | - | `UNCLEAR_OWNER` | P1 media | recover historical schema/source contract; do not guess a table |
| `Workouts` | TABLE | videos, coach workspace, admin workout/coach summaries | `/videos`, coach/admin workout surfaces | - | - | `db/schema.sql` | `LEGACY_DUPLICATE_MODEL` | P1 active duplicate | retain until explicit repoint decision; label any unresolved semantics `BUSINESS_RULE_REQUIRES_CONFIRMATION` |
| `WorkoutSessions` | TABLE | analytics, coach workspace, admin workout/coach summaries | `/admin/analytics`, coach/admin workout surfaces | - | - | `db/schema.sql` | `LEGACY_DUPLICATE_MODEL` | P1 active duplicate | compare with MemberWorkoutSessions before any migration or repoint |
| `WorkoutExercises` | TABLE | coach workspace legacy session detail | coach member session detail | - | - | `db/schema.sql` | `LEGACY_DUPLICATE_MODEL` | P1 active duplicate | compare with WorkoutProgramExercises and snapshots; no wholesale copy |
| `sp_SpendPoints` | PROCEDURE | baseline loyalty redemption caller; no current caller after phase 159 | `/loyalty` | - | - | `db/schema.sql` | `DEAD_LEGACY` | P2 legacy compatibility | `ARCHIVE_UNUSED`; TypeScript transaction is the sole spend authority |

## Matrix decisions and gates

1. The foundation stays minimal. No legacy-only object is copied wholesale
   into `foundation.sql`.
2. Applied migrations `0001` through `0111` remain immutable. New owners are
   additive migrations after `0111` and must be domain-specific.
3. Referral, coupon, loyalty and support objects are active runtime
   dependencies with forward-only ownership; membership billing remains an
   active runtime dependency awaiting its dedicated billing migration.
4. `Workouts`/`WorkoutSessions`/`WorkoutExercises` are active duplicate-model
   dependencies. They cannot be deleted or silently replaced by the newer
   program/session model.
5. `ExerciseMedia` and `ProductTags` remain `UNCLEAR_OWNER` until the source
   contract is sufficient to define safe columns, keys and foreign keys.
6. A live SQL Server check is required after each relevant migration:
   `DATABASE_MANUAL_CHECK_REQUIRED`. This static matrix does not connect to,
   mutate or certify a database.

## Orphan priority and canonicalization decisions

| Orphan or duplicate family | Priority | Decision |
| --- | --- | --- |
| `ReferralCodes`, `ReferralTransactions` | P0 | `KEEP_AND_MIGRATE` in `0112`; active registration and referral UI depend on them |
| `Payments`, `Invoices` | P0 for membership payment; P1 for invoice UI | `KEEP_AND_MIGRATE` as a separate membership billing domain; never merge with marketplace order payment |
| `Coupons`, `CouponUsages` | P1 | `KEEP_AND_MIGRATE` using only the current route contract |
| `Points`, `PointTransactions`, `RewardsCatalog`, `RewardRedemptions` | P1 | `KEEP_AND_MIGRATE` in `0114`; redemption uses one serializable TypeScript transaction |
| `Tickets`, `TicketMessages` | P1 | `KEEP_AND_MIGRATE` in `0115` with role-scope and message ordering preserved |
| `CRMNotes`, `CRMTasks` | P1 | `KEEP_AND_MIGRATE` as CRMCustomers child tables |
| `ProductTags`, `ExerciseMedia` | P1 | `REQUIRES_CONFIRMATION` until the source/schema contract is recovered |
| `Workouts`, `WorkoutSessions`, `WorkoutExercises` | P1 | `REQUIRES_CONFIRMATION`; retain active legacy reads while comparing with canonical program/session snapshots |
| `AuditLogs`, `BackupLogs` | P2 | `KEEP_AND_MIGRATE` under operations ownership; keep backup filesystem behavior |
| `AnalyticsDaily`, `AnalyticsRetention` | P2 | `REQUIRES_CONFIRMATION` until stored-projection versus derived-report ownership is explicit |
| `AffiliatePayouts`, `Affiliates`, `ReferralClicks`, `ReferralRewards`, `NutritionEntries`, `NutritionPlans`, `Promotions`, `TicketAttachments` | P3 | `ARCHIVE_UNUSED` review only; no table recreation or deletion in this pass |
