# GymFit Pass 3 Registered Backend Route Inventory

Source of truth: `backend/src/routes/registerRoutes.ts`. This inventory covers
only mounted runtime route registrations, not folders that are never mounted.
Roles are the union of route-level authorization in each route file; endpoints
inside one mount may be narrower.

| URL prefix | Module / controller-service | Roles | Database dependency | Frontend consumer |
| --- | --- | --- | --- | --- |
| `/api/auth` | `auth.routes` / auth controller | guest + authenticated | Users, AuthSessions, ReferralCodes, ReferralTransactions, AuditLogs | Login, Register, Profile, Settings |
| `/api/referral` | `referral.routes` / referral controller | authenticated; Admin for `/all` | ReferralCodes, ReferralTransactions, Users | ReferralPage |
| `/api/coupons` | `coupon.routes` / coupon controller | Member validate; Admin management | Coupons, CouponUsages | CouponPage / admin menu |
| `/api/loyalty` | `loyalty.routes` / loyalty controller | Member; Admin adjustment; authenticated catalog | Points, PointTransactions, RewardsCatalog, RewardRedemptions; transaction-owned redemption | LoyaltyPage |
| `/api/audit` | `audit.routes` / audit controller | Admin | AuditLogs, Users | AuditPage |
| `/api/analytics` | `analytics.routes` / analytics controller | Admin | AnalyticsDaily, AnalyticsRetention, Payments, WorkoutSessions | AnalyticsPage / admin analytics |
| `/api/crm` | `crm.routes` / CRM controller | Admin, Coach | CRMCustomers, CRMNotes, CRMTasks, Users | CRMPage |
| `/api/tickets` | `ticket.routes` / ticket controller | Member, Coach, Admin | Tickets, TicketMessages, Users | TicketPage |
| `/api/invoices` | `invoice.routes` / invoice controller | Member, Admin | Invoices, Payments, Users | InvoicePage |
| `/api/backup` | `backup.routes` / backup controller | Admin | BackupLogs plus filesystem backup directory | BackupPage |
| `/api/revenue` | `revenue.routes` / revenue controller | Admin | Payments, Plans | RevenuePage |
| `/api/coaches` | `coach.routes` / coach controller | public | Users, CoachProfiles, availability tables | Coach list/profile/booking |
| `/api/plans` | `plans.routes` / plans service | public, Member, Admin | Plans, Memberships, Payments, PlanEntitlements, AuditLogs | Membership pages |
| `/api/videos` | `videos.routes` / videos controller | public, Coach, Admin | legacy Workouts, Users | VideoLibrary / VideosPreviewPage |
| `/api/exercises` | `exercises` router / exercises controller | public, Admin | Exercises | Exercise library/detail |
| `/api/coach` | `coach-workspace.routes` / coach workspace services | Coach | canonical coach/workout tables plus legacy Workouts, WorkoutSessions, WorkoutExercises | Coach dashboard/workspace |
| `/api/member/workouts` | `member-workout.routes` / member workout service | Member | MemberWorkoutSessions, session exercises/set logs, assignments/schedules, Exercises | Member workout/progress pages |
| `/api/admin/coaches` | `admin-coaches.routes` / admin coach service | Admin | Users, CRMCustomers, canonical assignments plus legacy workout summaries | Admin coach pages |
| `/api/admin/exercises` | `admin-exercises.routes` / admin exercise service | Admin | Exercises | Admin exercise library |
| `/api/admin/workouts` | `admin-workouts.routes` / admin workout service | Admin | legacy Workouts/WorkoutSessions plus canonical member sessions | Admin workout governance |
| `/api/bookings` | `bookings.routes` / bookings repository/controller | public discovery; Member, Coach, Admin | Bookings, Users, CoachProfiles, availability | Appointment and coach appointment pages |
| `/api/notifications` | `notifications.routes` / notifications service | authenticated | Notifications, MarketplaceNotifications where event-specific | NotificationsPage |
| `/api/products` | `products.routes` / products service | public | Products, variants, images, brands/categories, shops, reviews | Products list/detail |
| `/api/admin/products` | `admin-products.routes` / admin product service | Admin | Products, variants/options, images, ProductTags, Inventory | Admin products |
| `/api/admin` (catalog) | `admin-catalog.routes` / catalog service | Admin | Brands, Categories, Products | Admin brands/categories |
| `/api/admin` (variants) | `admin-variants.routes` / variant service | Admin | Products, ProductVariants, option tables, Inventory | Admin variants |
| `/api/admin` (inventory) | `admin-inventory.routes` / inventory service | Admin | Inventory, Products, variants, InventoryAdjustments | Admin inventory |
| `/api/admin/product-moderation` | `product-moderation.routes` / moderation service | Admin | Products, ProductModerationHistory, images/brands/categories | Admin moderation |
| `/api/admin` (orders) | `admin-orders.routes` / admin order/logistics services | Admin | Orders, ShopOrders, OrderItems, logistics/status/payment/settlement tables | Admin orders |
| `/api/orders` | `orders.routes` / order, checkout, payment services | Member, Coach | Orders, OrderItems, Carts, inventory, ShopOrders, refunds/vouchers | Customer orders/checkout |
| `/api/cart` | `cart.routes` / cart service | Member, Coach | Carts, CartItems, Products, variants, Shops, Inventory | CartPage |
| `/api/marketplace` | marketplace compensation routes/service | Member, Coach | CompensationVouchers, Orders, ShopOrders | Checkout/order UI |
| `/api/admin/refunds` | `refunds.routes` / refunds service | Admin | Refunds, Orders, ShopOrders, RefundStatusHistory | Admin refunds |
| `/api/seller/finance` | seller marketplace finance router/service | Seller | ShopOrderSettlements, settlement history/adjustments/batches, Shops | Seller revenue |
| `/api/admin/marketplace-finance` | admin marketplace finance router/service | Admin | settlement, Shops, complaints, ShopOrders | Admin settlements |
| `/api/complaints` | buyer complaints router/service | Member, Coach | MarketplaceComplaints, ComplaintEventHistory, replacements/refunds/vouchers/notifications | Buyer complaints |
| `/api/seller/complaints` | seller complaints router/service | Seller | MarketplaceComplaints, replacements, settlements, notifications | Seller complaints |
| `/api/admin/complaints` | admin complaints router/service | Admin | MarketplaceComplaints, event/replacement/refund/settlement tables | Admin complaints |
| `/api/reviews` | buyer reviews router/service | Member, Coach | ProductReviews, ShopReviews, OrderItems, ShopOrders | Buyer reviews |
| `/api/seller/reviews` | seller reviews router/service | Seller | ProductReviews, ShopReviews, Shops, moderation history | Seller reviews |
| `/api/admin/reviews` | admin reviews router/service | Admin | ProductReviews, ShopReviews, moderation history, AuditLogs | Admin reviews |
| `/api/users` | users routes/controller | authenticated; Admin security mutation; Coach scoped list | Users, CRMCustomers, AuditLogs | MembersPage/profile/admin user surfaces |
| `/api/seller-applications` | seller application routes/service | Member submit; Member/Seller read own | SellerApplications, status history, Users, AuthSessions, AuditLogs | Seller application |
| `/api/admin/seller-applications` | admin seller application routes/service | Admin | SellerApplications, status history, Users, AuditLogs | Admin seller applications |
| `/api/seller/shop` | seller shop router/service | Seller | Shops, Products, AuditLogs | Seller shop |
| `/api/shops` | public shop router/service | public | Shops, Products, variants, reviews | PublicShopPage |
| `/api/admin/shops` | admin shop router/service | Admin | Shops, Products, AuditLogs | Admin shops |
| `/api/seller/brand-requests` | seller brand request routes/service | Seller | BrandRequests, status history, Products, AuditLogs | Seller brand requests |
| `/api/admin/brand-requests` | admin brand request routes/service | Admin | BrandRequests, status history, Products, AuditLogs | Admin brand requests |
| `/api/seller/products` | seller product routes/service | Seller | Products, variants/options, images, ProductTags, Inventory, Shops, AuditLogs | Seller products |
| `/api/seller/orders` | seller order routes/service | Seller | ShopOrders, Orders, OrderItems, refunds/vouchers/notifications | Seller orders |
| `/api/media` | media routes/service | public status; Admin processing | ExerciseMedia, filesystem/media source | Admin exercise/media surfaces |
| `/api/assistant` | assistant routes/service | guest chat/status; optional authenticated chat | no database tool dependency; circuit/provider state in process | ChatbotWidget |

## Inventory boundary

This table is an integration map, not a claim that every referenced object is
currently schema-ready. The runtime object ownership matrix is the authoritative
next step for deciding which legacy objects require additive migrations and
which duplicate models should be repointed or retained.
