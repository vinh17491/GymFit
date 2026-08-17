# `app.ts` Responsibility Review

Status: PHASE 44 CHECKPOINT / ROUTE REGISTRAR EXTRACTION

`backend/src/app.ts` is currently the Express composition root. Its
responsibilities are:

1. Create the Express application and apply the configured `trust proxy`.
2. Register security, CORS/credentials, compression, body parsing,
   sanitization, audit logging, rate limiting and development request logging.
3. Register static asset delivery for uploads, images and media.
4. Expose the existing `/api/health`, `/health/live` and `/health/ready`
   endpoints. The health DB probe remains lazy and goes through the existing
   database helper.
5. Register all currently existing Auth, Public, Member, Coach, Seller,
   Admin and Marketplace routers with their existing URL prefixes and order.
6. Register the terminal not-found and global error handlers.

`backend/src/server.ts` owns process startup, initial pool connection attempt,
background-runner start, HTTP listen, fatal-process handling and graceful
shutdown. `app.ts` does not listen on a port, start a runner, run a migration,
or create a database connection during module composition beyond the health
handler's request-time probe.

The current route registration is a compatibility boundary. Phase 44 extracted
the existing route set into `backend/src/routes/registerRoutes.ts`, preserving
import side-effects, middleware ordering, URL prefixes, route ordering and
error handler placement. The extracted registrar covers the current route set,
including supporting modules such as referrals, coupons, loyalty, CRM,
notifications, products, orders, shops, reviews and finance; a summary label
must not cause routes to be dropped.

No Assistant router, placeholder module or future route is present after the
extraction. Assistant implementation remains exclusively
`DEFERRED_TO_PHASE_72`.

Verification status: source/static extraction review complete;
`MANUAL_CHECK_REQUIRED` for route behavior and deployment health behavior.
