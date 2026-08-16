# Coach4 Hardening and Rule Chatbot Progress

## Execution contract

- Branch: `coach4`
- Start commit: `3b6954c chore(encoding): complete project text recovery`
- Push: prohibited by the Master Task
- Backend RBAC: unchanged; frontend policy may only mirror the existing backend authority
- Marketplace/Seller backend: out of scope
- Applied migrations `0100`–`0111`: read-only audit only; no rewrite

## Phase log

| Phase | Status | Findings | Files changed | Tests | Commit | Next |
| --- | --- | --- | --- | --- | --- | --- |
| H00 | PASS | Branch/worktree, migration status, encoding baseline, routes and package scripts audited. Existing user-owned untracked files preserved. | This document | `npm run check:encoding`; backend/frontend builds; migration status; `git diff --check` | No local commit; working tree preserved | H01 |
| H01 | PASS | Product API supports the audited public list filters through `products.routes.ts`, `products.validation.ts` and `products.service.ts`; Shop public API is slug/detail based with no public search/list contract. Coach findings confirmed for draft mutation races, publish integrity, duration bounds, partial exercise PATCH, schedule race/bounds, attention date scope, availability mode/location, runner import isolation, frontend Seller Apply role policy and product media reporting. | `docs/coach/COACH_RELEASE_STATE.json`, `docs/marketplace/MISSING_PRODUCT_MEDIA_FINDING.md`, this document | Read-only route/service/schema audit; migration checksum status | No local commit; working tree preserved | H02 |

## Verdict policy

## H02-H46 execution ledger

| Phase | Status | Findings | Files changed | Tests | Commit | Next |
| --- | --- | --- | --- | --- | --- | --- |
| H02 | PASS | Serializable draft mutation helper/ADR is in the existing Coach workspace service; owner and DRAFT checks remain inside the transaction. | Coach workspace service; `docs/coach/ADR_PROGRAM_DRAFT_MUTATION_LOCKING.md` | Role, concurrency and closure acceptance PASS | Working tree | H03 |
| H03 | PASS | Program, Day, reorder and Program Exercise mutations use the locked service boundary. | Coach workspace service | Role, versioning, security and closure acceptance PASS | Working tree | H04 |
| H04 | PASS | Publish gate rejects incomplete/invalid Programs and exposes stable not-ready behavior; acceptance fixtures publish only valid Days. | Coach workspace service; acceptance fixtures | Role/versioning/security/admin/closure acceptance PASS | Working tree | H05 |
| H05 | PASS | Duration/week/day bounds and uniqueness are enforced. | Coach workspace service | Coach role/versioning/closure acceptance PASS | Working tree | H06 |
| H06 | PASS | PATCH merges the locked current row; omitted fields remain and explicit null clears. | Coach workspace service | Versioning/security/closure acceptance PASS | Working tree | H07 |
| H07 | PASS | Reschedule validates status, assignment scope, timezone/date and bounds without an unrequested same-week rule. | Coach workspace service | Security, race and final-closure acceptance PASS | Working tree | H08 |
| H08 | PASS | Schedule/assignment locking and zero-row conflicts protect cancel/reschedule/transition races. | Coach workspace service | Security, concurrency and final-closure acceptance PASS | Working tree | H09 |
| H09 | PASS | Seller Apply frontend visibility mirrors existing backend policy; backend RBAC is unchanged. | Frontend access policy/header | Regression-02/RBAC and five-role browser QA PASS | Working tree | H10 |
| H10 | PASS | OPEN availability is concrete and precedence-aware; BLOCK remains authoritative. | Coach availability service | Booking/quota/concurrency acceptance PASS | Working tree | H11 |
| H11 | PASS | BOTH is profile-level only; booking payloads and fixtures use concrete ONLINE/IN_PERSON modes. | Booking services/pages and acceptance fixtures | Booking/quota/security/final-closure PASS | Working tree | H12 |
| H12 | PASS | Mode/location resolution follows the existing availability contract and rejects unresolved bookable state. | Availability service and booking UI | Booking and final-closure acceptance PASS | Working tree | H13 |
| H13 | PASS | Attention queue is scoped and bounded; recent/old skipped behavior remains covered by closure/performance fixtures. | Coach workspace service and fixtures | Performance/final-closure acceptance PASS | Working tree | H14 |
| H14 | PASS | Release state is source of truth; historical docs remain historical. | `docs/coach/COACH_RELEASE_STATE.json` | State audit | Working tree | H15 |
| H15 | PASS | Product media report is read-only; no ProductImage or canonical row was changed. | `docs/marketplace/MISSING_PRODUCT_MEDIA_FINDING.md` | Migration/media audit PASS | Working tree | H16 |
| H16 | PASS | Express app import does not start background runners; server bootstrap owns runner start and test disable flag. | `backend/src/app.ts`, `backend/src/server.ts` | Build and acceptance server PASS | Working tree | H17 |
| H17 | PASS | Regression baseline completed before and after chatbot integration. | Existing hardening files | Encoding, backend build/lint, frontend typecheck/build, Coach unit and regression suites PASS | Working tree | H18 |
| H18 | PASS | App/routes/navigation/backend guards and Product/Shop contracts were audited before adapters. | Chatbot adapter docs/catalog | Route/schema audit PASS | Working tree | H19 |
| H19 | PASS | User-visible capability families are mapped to intents, adapters, navigation, or fallback. | `docs/chatbot/CHATBOT_COVERAGE_MATRIX.md` | Coverage review | Working tree | H20 |
| H20 | PASS | Typed role, intent, action, suggestion, reply, context, entity and adapter contracts exist. | `chatbotTypes.ts` | Frontend typecheck PASS | Working tree | H21 |
| H21 | PASS | NFC, accent-insensitive Vietnamese normalizer preserves original input. | `chatbotNormalizer.ts` | Deterministic tests PASS | Working tree | H22 |
| H22 | PASS | Entity parser supports bounded price/date/mode/category/sort/slug filters and explicit ambiguity. | `chatbotEntityParser.ts` | Deterministic tests PASS | Working tree | H23 |
| H23 | PASS | Catalog scoring handles priorities, negative keywords, role mismatch, context boosts, clarification, safety and fallback. | `chatbotCatalog.ts`, `chatbotEngine.ts` | Deterministic tests PASS | Working tree | H24 |
| H24 | PASS | Typed adapter registry uses AbortSignal/timeout and existing GET services only. | `chatbotDataAdapters.ts`; service signal overloads | Static mutation scan; typecheck PASS | Working tree | H25 |
| H25 | PASS | Product adapter sends only audited fields; category is resolved through live filters and result fields are bounded. | `chatbotDataAdapters.ts` | Contract review and fake adapters PASS | Working tree | H26 |
| H26 | PASS | Shop adapter is slug/detail-only; no Shop search backend or Marketplace/Seller backend was added. | Adapter/docs | Contract review PASS | Working tree | H27 |
| H27 | PASS | Coach list/detail/availability adapters reuse public authoritative services and cap candidates. | Adapter and Coach services | Coach API contract, availability acceptance and adapter signal/cap tests PASS | Working tree | H28 |
| H28 | PASS | User-scoped adapters call self-scoped existing services only and are role-filtered before invocation. | Adapter registry/catalog | Unit role/adapter cases PASS | Working tree | H29 |
| H29 | PASS | Static delay 350-1100 ms; dynamic request indicator plus bounded polish; cancellation is wired. | `chatbotDelay.ts`, widget, engine | Delay/cancel cases PASS | Working tree | H30 |
| H30 | PASS | General/auth intents and secret-safe guidance are cataloged. | Catalog/suggestions | Deterministic role/safety cases PASS | Working tree | H31 |
| H31 | PASS | Plan lookup is live where public; membership mutation language remains guidance/read-only. | Plans adapter/catalog | Entitlement/membership acceptance and dynamic adapter contract PASS | Working tree | H32 |
| H32 | PASS | Coach discovery/availability is live-read-only; booking is guidance/navigation. | Coach adapter/catalog | Booking/security acceptance PASS | Working tree | H33 |
| H33 | PASS | Workout/progress/notification summaries are GET-only; session mutations are blocked in guidance. | Workout/notification adapters/catalog | Security acceptance PASS | Working tree | H34 |
| H34 | PASS | Product/Shop/order/cart/checkout/review/complaint coverage is typed; transaction actions are non-mutating. | Marketplace catalog/adapters | Adapter mutation scan and Product/Shop runtime contract QA PASS | Working tree | H35 |
| H35 | PASS | Seller guidance is role-filtered and does not alter Seller backend. | Catalog/access policy | RBAC review and Seller browser QA PASS | Working tree | H36 |
| H36 | PASS | Admin guidance is Admin-only and does not query credentials or private bulk data. | Catalog/route allowlist | RBAC review and Admin browser QA PASS | Working tree | H37 |
| H37 | PASS | Secret, IDOR, medical, mutation and unknown-feature guards return a reply/safety/fallback. | Catalog/engine | Deterministic safety cases PASS | Working tree | H38 |
| H38 | PASS | Initial/contextual suggestions and free chat use the same resolver. | Suggestions/widget | Deterministic suggestion cases PASS | Working tree | H39 |
| H39 | PASS | Versioned session storage caps messages, resets corruption, redacts secrets, and excludes private context. | `chatbotStorage.ts` | Storage deterministic cases PASS | Working tree | H40 |
| H40 | PASS | Single responsive widget includes launcher, panel, cards, actions, clear/close and indicators. | `ChatbotWidget.tsx`, `App.tsx` | Five-role browser QA at 375x812, 768x1024 and 1440x900 PASS | Working tree | H41 |
| H41 | PASS | Input cap/IME/keyboard/focus/AbortController/stale and double-send handling is implemented. | Widget/engine/delay | Typecheck and abort cases PASS | Working tree | H42 |
| H42 | PASS | Widget is mounted once in App shell; guest/public and role-aware behavior is integrated with role-change context isolation. | `frontend/src/App.tsx` | Five-role browser QA, reload/clear and role guard PASS | Working tree | H43 |
| H43 | PASS | Deterministic harness reports 163 cases and 333 assertions, including role-safe quick-reply coverage. | Chatbot test and package script | `npm run test:chatbot` PASS | Working tree | H44 |
| H44 | PASS | Browser QA covered Guest, Member, Coach, Seller and Admin, free typing and quick replies, live lookup indicators, errors/not-found, action links, clear/restore, IME/long input and stale cancellation across three viewports. | Browser QA evidence; `ChatbotWidget.tsx`; route/policy catalog | In-app browser: no chatbot console errors or overflow; only pre-existing React Router future-flag warnings | Working tree | H45 |
| H45 | PASS | Encoding, builds, lint, unit/contract, Coach hardening/concurrency/security, auth/product regressions and static scope guards all pass. | Progress/docs/tests | `check:encoding`; frontend/backend build/typecheck/lint; Regression-02 125 assertions; Regression-03 161 assertions; Coach unit; diff/static guards PASS | Working tree | H46 |
| H46 | PASS | Final diff/privacy/RBAC/no-mutation/contract/delay/AI-scope audit is complete; no push and no local commit were made. | Handover/catalog/coverage/adapter/test docs; release state | Product/Shop/Coach dynamic lookup QA, five roles/three viewports, session isolation, encoding and full regression PASS | Working tree | Complete |

## Final evidence

- Dynamic adapters: Product API contract audited and live lookup verified; Shop is detail-by-slug only; Coach list/detail/availability and self-scoped plans/membership/bookings/workouts/notifications/orders reuse existing GET services.
- UX: static delay is bounded 350–1100 ms; dynamic lookup displays `Đang tìm thông tin...`; static typing displays `Đang soạn...`; no AI-thinking wording; timers/requests are abort-safe.
- Safety/scope: no chatbot backend endpoint, no POST/PUT/PATCH/DELETE adapter calls, no direct DB, no arbitrary `userId`, no Gemini/OpenAI/LLM/vector/embedding source, no RBAC backend changes, no migration `0100–0111` rewrite, no Marketplace/Seller backend changes.
- Browser: Guest, Member, Coach, Seller and Admin; free text and quick replies share the same engine; 375×812, 768×1024 and 1440×900; role-change isolation and responsive overflow checks PASS.
- Verification: `npm run test:chatbot` 163 cases/333 assertions; Regression-02 125 assertions; Regression-03 161 assertions; Coach unit and Coach hardening/concurrency/security/closure/performance acceptance PASS; encoding has 0 unresolved HIGH; frontend/backend build, typecheck, lint and `git diff --check` PASS.

The final verdict is `PROJECT_HARDENING_AND_RULE_CHATBOT_COMPLETE` only after H00–H46, static scan, build, API/runtime checks, deterministic chatbot tests and role/viewport browser QA all pass.
