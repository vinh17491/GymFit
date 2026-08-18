# GymFit Pass 3 Frontend Feature Surfaces

Source of truth for this inventory: `frontend/src/App.tsx`,
`frontend/src/routes/routeGroups.tsx`, `frontend/src/auth/accessPolicy.ts`,
`frontend/src/components/layout/Sidebar.tsx` and
`frontend/src/components/CommandMenu.tsx`. `ChatbotWidget` is mounted by
`App.tsx` outside the route-group list.

Classification is based on the current mounted route or shared UI source:

- `ACTIVE_UI`: reachable from a mounted page, layout, menu or widget;
- `BACKEND_ONLY_ACTIVE`: mounted backend behavior is live, but no dedicated
  frontend surface was found for that operation;
- `HISTORICAL`: source evidence identifies an intentionally retired surface;
- `UNKNOWN`: evidence is insufficient and the surface must not be removed.

No surface is marked `HISTORICAL` only because it uses a legacy table. A route
that is still mounted remains active until a product decision retires it.

## Route and feature families

| Frontend surface | Mounted paths or source | Backend family | Classification | Runtime-schema implication |
| --- | --- | --- | --- | --- |
| Marketing and information | `/`, `/about`, `/contact`, `/blog`, `/success-stories` | no required backend write path | `ACTIVE_UI` | no new runtime table implied by this surface |
| Membership discovery and checkout | `/membership`, `/membership/account`, `/membership/checkout`, `/checkout` | `/api/plans`, `/api/auth`, membership/payment controllers | `ACTIVE_UI` | Plans, Memberships, PlanEntitlements and the separate membership `Payments` contract are active |
| Coach discovery and booking | `/coaches`, `/coaches/:id`, `/coaches/:id/book`, `/booking`, `/appointments/*`, `/coach/appointments/*` | `/api/coaches`, `/api/bookings`, `/api/plans` | `ACTIVE_UI` | Bookings, CoachProfiles and availability tables are active |
| Public exercise and video library | `/exercises`, `/exercises/:id`, `/videos`, `/video`, `/workout-programs` | `/api/exercises`, `/api/videos` | `ACTIVE_UI` | Exercises are canonical; the video controller still reads legacy `Workouts` |
| Public commerce discovery | `/products`, `/products/:id`, `/shops/:shopSlug` | `/api/products`, `/api/shops` | `ACTIVE_UI` | foundation catalog plus ShopReviews/ProductReviews and Shops are active |
| Cart and customer orders | `/cart`, `/orders`, `/orders/:orderId`, `/complaints`, `/reviews` | `/api/cart`, `/api/orders`, `/api/complaints`, `/api/reviews` | `ACTIVE_UI` | canonical marketplace order, inventory, complaint and review migrations are active |
| Guest authentication | `/login`, `/register` | `/api/auth` | `ACTIVE_UI` | Users and AuthSessions are canonical; referral tables are active runtime orphans |
| Member dashboard and account | `/dashboard`, `/profile`, `/settings`, `/members` | `/api/users`, `/api/notifications`, `/api/crm` | `ACTIVE_UI` | Users, Notifications, CRMCustomers and CRM detail tables are active |
| Member workout and progress | `/workouts/*`, `/progress`, `/progress/sessions`, `/progress/exercises/:exerciseId` | `/api/member/workouts`, `/api/coach` | `ACTIVE_UI` | canonical member-session tables are active; coach/admin legacy summaries still read `Workouts` and `WorkoutSessions` |
| Referral and coupons | `/referral`, `/coupons` | `/api/referral`, `/api/coupons` | `ACTIVE_UI` | ReferralCodes/ReferralTransactions and Coupons/CouponUsages must have forward-only ownership migrations |
| Loyalty and rewards | `/loyalty` | `/api/loyalty` | `ACTIVE_UI` | Points, PointTransactions, RewardsCatalog, RewardRedemptions and `sp_SpendPoints` are live dependencies |
| Support and billing documents | `/tickets`, `/invoices` | `/api/tickets`, `/api/invoices` | `ACTIVE_UI` | Tickets/TicketMessages and Invoices/Payments are live dependencies |
| CRM workspace | `/crm` | `/api/crm` | `ACTIVE_UI` | CRMCustomers is foundation-owned; CRMNotes/CRMTasks are legacy-only active dependencies |
| Seller onboarding and workspace | `/seller/apply`, `/seller`, `/seller/shop`, `/seller/brand-requests`, `/seller/products*`, `/seller/orders*`, `/seller/revenue`, `/seller/complaints`, `/seller/reviews` | `/api/seller-applications`, `/api/seller/shop`, `/api/seller/brand-requests`, `/api/seller/products`, `/api/seller/orders`, `/api/seller/finance`, `/api/seller/complaints`, `/api/seller/reviews` | `ACTIVE_UI` | seller, shop, settlement, complaint, review and catalog migrations are active |
| Admin operations | `/admin`, `/admin/coaches*`, `/admin/exercises`, `/admin/workouts`, `/admin/analytics`, `/admin/audit`, `/admin/revenue`, `/admin/backup` | corresponding `/api/admin/*`, `/api/analytics`, `/api/audit`, `/api/revenue`, `/api/backup` | `ACTIVE_UI` | analytics, audit, backup and membership billing tables are active runtime dependencies |
| Admin marketplace governance | `/admin/products*`, `/admin/product-moderation*`, `/admin/orders*`, `/admin/refunds`, `/admin/settlements`, `/admin/complaints`, `/admin/reviews`, `/admin/seller-applications*`, `/admin/shops*`, `/admin/brand-requests`, `/admin/categories`, `/admin/brands`, `/admin/inventory` | registered admin catalog, order, finance, complaint, review and seller routes | `ACTIVE_UI` | the numbered marketplace migration chain is the canonical owner; `ProductTags` remains an orphan dependency |
| Coach workspace | `/coach`, `/coach/profile`, `/coach/availability`, `/coach/appointments*`, `/coach/exercises*`, `/coach/workout-programs*`, `/coach/members*`, `/coach/assignments*`, `/coach/schedules` | `/api/coach`, `/api/coaches`, `/api/bookings`, `/api/member/workouts` | `ACTIVE_UI` | canonical CoachProgram* and MemberWorkout* tables coexist with legacy workout reads and require an explicit duplicate-model decision |
| Shared navigation and command surfaces | `Sidebar.tsx`, `CommandMenu.tsx`, role-specific access policy | many registered modules | `ACTIVE_UI` | menu reachability is evidence that a backend module is not dead code |
| Assistant widget | `App.tsx` -> `ChatbotWidget` | `/api/assistant` plus local adapters | `ACTIVE_UI` | no database table dependency for assistant tools; preserve identity, limiter, circuit and indicator boundaries |
| Exercise media processing endpoint | `/api/media` is registered; media fields are rendered by exercise/program pages, but no dedicated media-management route was found in `routeGroups.tsx` | `/api/media` | `BACKEND_ONLY_ACTIVE` | `ExerciseMedia` is an active runtime reference with no foundation or numbered migration owner; classify `UNCLEAR_OWNER` until its schema contract is recovered |
| Access-denied and not-found handling | `/access-denied` and the wildcard route | client-only routing | `ACTIVE_UI` | no database ownership implication |

## Scope notes

The route group contains protected member, coach, seller and admin branches,
including redirects such as `/booking`, `/coach/sessions` and
`/coach/progress`. Redirects are counted as active route surfaces because they
still make the destination reachable. Existing legacy database names are not
treated as historical UI without source evidence. The corresponding table and
module decisions are in `PASS3_RUNTIME_SCHEMA_MATRIX.md`.
