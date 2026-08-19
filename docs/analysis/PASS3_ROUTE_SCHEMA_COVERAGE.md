# GymFit Pass 3 Route-to-Schema Coverage

Source of truth: `backend/src/routes/registerRoutes.ts`. `YES` means every
database dependency used by the mounted route has a foundation or numbered
migration owner. It does not certify that a live database has applied that
owner; that remains `DATABASE_MANUAL_CHECK_REQUIRED`. `NO` records an explicit
legacy duplicate or unresolved owner rather than hiding it behind a compiling
route. Assistant is marked `YES (NO_DB_DEPENDENCY)` because it has no database
tool dependency.

| Mounted prefix | schema_ready | Blocking/owning evidence |
| --- | --- | --- |
| `/api/auth` | YES | foundation, `0006`, `0112`, `0117` |
| `/api/referral` | YES | `0112` |
| `/api/coupons` | YES | `0113` |
| `/api/loyalty` | YES | `0114` |
| `/api/audit` | YES | `0117` |
| `/api/analytics` | YES | foundation, `0008`, `0116`, `0118`, `0119` |
| `/api/crm` | YES | foundation `CRMCustomers`, `0117` child tables |
| `/api/tickets` | YES | `0115` |
| `/api/invoices` | YES | `0116` |
| `/api/backup` | YES | `0117` plus unchanged filesystem infrastructure |
| `/api/revenue` | YES | foundation, `0116` |
| `/api/coaches` | YES | foundation, `0010`, `0011` |
| `/api/plans` | YES | foundation, `0012`, `0116`, `0117` |
| `/api/videos` | NO | active legacy `Workouts` owner unresolved |
| `/api/exercises` | YES | foundation `Exercises` |
| `/api/coach` | NO | active legacy workout/session detail dependencies |
| `/api/member/workouts` | YES | `0007`, `0008`, foundation `Exercises` |
| `/api/admin/coaches` | NO | summary still reads legacy `WorkoutSessions` |
| `/api/admin/exercises` | YES | foundation `Exercises` |
| `/api/admin/workouts` | NO | active legacy `Workouts`/`WorkoutSessions` |
| `/api/bookings` | YES | foundation, `0010`, `0011`, `0017` |
| `/api/notifications` | YES | foundation, `0014`, `0107` |
| `/api/products` | YES | foundation, product/catalog/review migrations |
| `/api/admin/products` | NO | delete path references unresolved `ProductTags` |
| `/api/admin` (catalog) | YES | foundation catalog |
| `/api/admin` (variants) | YES | foundation plus `0001` |
| `/api/admin` (inventory) | YES | foundation plus `0002` |
| `/api/admin/product-moderation` | YES | foundation plus `0104` |
| `/api/admin` (orders) | YES | `0003`–`0005`, `0105`, `0108`–`0110` |
| `/api/orders` | YES | `0003`–`0005`, `0105`–`0110` |
| `/api/cart` | YES | `0106` plus foundation catalog |
| `/api/marketplace` | YES | `0107` |
| `/api/admin/refunds` | YES | `0107` |
| `/api/seller/finance` | YES | `0109` |
| `/api/admin/marketplace-finance` | YES | `0109`–`0110` |
| `/api/complaints` | YES | `0110` |
| `/api/seller/complaints` | YES | `0110` |
| `/api/admin/complaints` | YES | `0110` |
| `/api/reviews` | YES | `0111` |
| `/api/seller/reviews` | YES | `0111` |
| `/api/admin/reviews` | YES | `0111`, `0117` |
| `/api/users` | YES | foundation, `0006`, `0117` |
| `/api/seller-applications` | YES | `0100` |
| `/api/admin/seller-applications` | YES | `0100`, `0117` |
| `/api/seller/shop` | YES | `0101`, `0117` |
| `/api/shops` | YES | `0101`, `0111` |
| `/api/admin/shops` | YES | `0101`, `0117` |
| `/api/seller/brand-requests` | YES | `0102`, `0117` |
| `/api/admin/brand-requests` | YES | `0102`, `0117` |
| `/api/seller/products` | NO | delete path references unresolved `ProductTags` |
| `/api/seller/orders` | YES | `0105`, `0107`, `0108`, `0110` |
| `/api/media` | YES | foundation `Products`/`Brands` plus filesystem media path |
| `/api/assistant` | YES (NO_DB_DEPENDENCY) | provider/tool boundary is not database-backed |

The unmounted `backend/src/modules/media/media.service.ts` still contains an
`ExerciseMedia` helper, but no mounted route calls it. It is classified as
`DEAD_LEGACY` pending an explicit feature owner; the mounted `/api/media`
route is product media and does not depend on that table.
