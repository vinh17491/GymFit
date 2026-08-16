# Chatbot Coverage Matrix

Every user-visible area is mapped to a catalog intent, a read-only adapter, a navigation action, or a deterministic fallback. A route not listed as a dynamic adapter is never presented as if its data had been loaded.

| Capability / route family | Intent(s) or fallback | Data/action boundary |
| --- | --- | --- |
| Landing, About, Contact, Blog, Success Stories | `services_overview`, `help`, fallback | Static guidance and existing public navigation only |
| Login, Register, Profile, Settings, Password | `login`, `register`, `profile`, `settings`, `password`, `safety_secret` | Navigation; no credential collection or update |
| Membership plans | `plans` | Public `GET /plans`; API values only |
| Membership account, pending payment, entitlement, quota | `membership_status`, `membership_pending_payment`, `membership_entitlement`, `membership_quota` | Self-scoped GET only; no subscribe/confirm/upgrade/downgrade/cancel |
| Coach list/search/profile | `coach_find`, `coach_profile` | Public Coach list/detail GET; bounded cards |
| Coach availability and booking guidance | `coach_availability`, `coach_booking`, `coach_booking_conflict`, `coach_booking_mode`, `coach_booking_quota` | Availability GET only when date/Coach are clear; booking is guidance/navigation |
| Member appointments | `coach_booking_status`, `member_appointments` | Self-scoped GET only; no cancel/reschedule |
| Coach workspace | `coach_workspace` | Role-filtered route guidance; no Coach workspace mutation |
| Workout program, assignment, schedule, progress, notifications | `workout_program`, `workout_assignment`, `workout_schedule`, `workout_session`, `workout_progress`, `workout_notifications` | Self-scoped summaries where existing GET service exists; start/log/complete remain guidance |
| Exercise library and workout-program discovery | `services_overview`, `help`, fallback | Public route guidance; no unverified catalog result |
| Product list/filter/detail | `product_search`, `product_filter`, `product_detail` | Audited Product GET; at most five typed cards |
| Shop detail | `shop_detail` | Existing slug/detail GET only |
| Shop search/list | `shop_search_unsupported` | Explains the absence of a public Shop search route |
| Cart and checkout | `cart`, `checkout` | Navigation only; no item or payment mutation |
| Orders/tracking/cancel/complaint/refund/replacement/review | `order_status`, `order_tracking`, `order_cancel`, `order_complaint`, `order_refund`, `order_replacement`, `review`, `complaint` | Self-scoped order GET; all transactions are user-directed UI guidance |
| Seller Apply/status | `seller_apply`, `seller_status` | Frontend action is shown only for roles allowed by the existing backend guard |
| Seller Shop/products/orders/revenue/complaints | `seller_shop`, `seller_products`, `seller_orders`, `seller_revenue`, `seller_complaints` | Seller-role guidance only; no new Seller backend and no mutation |
| Admin dashboard/Coach/exercises/moderation/applications/orders/refunds/settlements | `admin_dashboard`, `admin_coach`, `admin_exercises`, `admin_moderation`, `admin_seller_applications`, `admin_orders`, `admin_refunds`, `admin_settlements` | Admin-only navigation; no credential or private bulk data lookup |
| Admin analytics/audit/revenue/backup/catalog/inventory/shops/reviews/complaints | `admin_dashboard`, `services_overview`, help/fallback | Existing admin route is described or opened only after backend role guard; no chatbot-admin action |
| Safety, IDOR, medical, secret, unknown feature | `safety_secret`, `safety_idor`, `safety_medical`, `mutation_block`, `unsupported`, fallback | Safe refusal or bounded platform guidance |

Guest suggestions are public Product/Coach/Plan/help oriented. Member, Coach, Seller, and Admin suggestions are role-specific and action links are filtered again at reply construction time.
