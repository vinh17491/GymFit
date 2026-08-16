# Coach1 Known Limitations and Non-Blockers

These items were observed during final validation and are documented rather than expanded into new scope.

- Canonical `GYMFIT_DB` has Coach migrations `0011`-`0016` pending. This is an intentional deployment boundary, not an acceptance failure; the disposable migration and idempotency checks passed.
- Consequently, `verify:coach-migration` against canonical reports the pending Availability/Entitlement/Context/Notification/Versioning/Performance tables and exits nonzero until release deployment. The same command passes on the fully migrated disposable verification database.
- Backend lint has 461 existing `no-explicit-any` warnings and zero errors. Removing them is outside Phase 29 and does not change the PASS result.
- Vite reports its existing large JavaScript chunk warning during production build. The build succeeds.
- React Router emits existing future-flag notices in the browser console. No new application console errors were observed.
- The first browser harness attempt used `127.0.0.1` while the disposable backend allowed `localhost:51231`, producing a CORS `Internal Server Error`. The browser QA was rerun with the configured localhost origin and passed.
- Long browser navigation loops can time out and reset the harness. The final evidence was collected route-by-route with fresh sessions; the timeout itself was not an application failure.
- Full-project clean-install issues involving Marketplace/Seller migration `0100` remain outside Coach scope and were not changed.

Out of scope remains: Marketplace Backend, Seller Backend, migrations `0100`-`0111`, framework/database replacement, microservices, AI, realtime chat and video call.
