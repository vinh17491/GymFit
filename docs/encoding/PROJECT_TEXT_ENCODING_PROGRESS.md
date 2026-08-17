# Project Text Encoding Recovery — Progress

Repository: `vinh17491/GymFit`
Branch: `coach3`
Start commit: `d23f4f5 chore(coach): complete coach2 closure`

This log records the E00→E35 text/encoding recovery phases. Existing user files
outside this task are intentionally preserved and are not staged by this task.

## E00 — BASELINE / BRANCH / WORKTREE

Status: PASS

Findings:

- Branch confirmed as `coach3`.
- `git diff --check` passed at baseline.
- Worktree contained pre-existing untracked user files; no tracked changes were present.
- Start commit recorded as `d23f4f5`.

Files inspected:

- Repository status, recent history, root/frontend/backend manifests.
- `docs/archive/2026-08/prompts/MASTER_TASK_COACH3_PROJECT_TEXT_ENCODING_RECOVERY.txt` (all 1,406 lines).

Files changed:

- `docs/encoding/PROJECT_TEXT_ENCODING_PROGRESS.md` (this log).

Scanner: Not yet created (required by E02).

Build/Test: Baseline `git diff --check` PASS.

Database: Not inspected yet.

Browser: Not inspected yet.

Remaining: E01→E35.

Commit: No commit created; no push.

Next: E01 — confirm encoding entry points.

## E01 — ENCODING ENTRY POINT

Status: VERIFIED_NO_CHANGE

Findings:

- `frontend/index.html` already contains `<meta charset="UTF-8"/>`.
- `frontend/src/main.tsx` does not decode or re-encode text.
- Express uses `express.json()` and `res.json()`; no ISO-8859-1/Windows-1252 override was found.
- Static serving only overrides image/SVG MIME types and does not affect JSON/text encoding.
- Vite proxy configuration does not rewrite response text.

Files inspected:

- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/vite.config.ts`
- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/src/utils/response.ts`
- backend content-type/charset/static-serving references.

Files changed: None.

Scanner: E02 pending.

Build/Test: Entry-point audit PASS.

Database: Not inspected yet.

Browser: Not inspected yet.

Remaining: E02→E35.

Commit: No commit created; no push.

Next: E02 — create repository encoding scanner.

## E02 — REPOSITORY ENCODING SCANNER

Status: PASS

Findings:

- Added `scripts/check-text-encoding.mjs` using Node built-ins only.
- Scanner recursively walks repository text files, excludes binary/dependency/runtime/generated paths by default, and supports `--include-generated`.
- Findings include path, line, column, exact signature, short context, severity, category, scope and allowlist reason.
- Detector covers high-confidence mojibake, replacement characters, C1 controls, BOM/zero-width anomalies and invalid UTF-8.
- Standalone valid Vietnamese `Ã` in words such as `ĐÃ` is not flagged; only byte-like/truncated contexts are treated as mojibake.
- Signature definitions are encoded as code points so the scanner does not report its own detector patterns.
- Scanner is deterministic, has JSON/Markdown report options, and exits non-zero only for unresolved HIGH findings or invalid UTF-8.

Files changed:

- `scripts/check-text-encoding.mjs`

Scanner: `node --check scripts/check-text-encoding.mjs` PASS.

Build/Test: Scanner smoke test PASS.

Database: Not inspected yet.

Browser: Not inspected yet.

Remaining: E03→E35.

Next: E03 — baseline scan.

## E03 — BASELINE SCAN

Status: PASS

Baseline evidence:

- Snapshot of `HEAD` plus the user-owned master task was scanned with the calibrated detector.
- Files scanned: `521`.
- Total HIGH findings: `394`.
- Allowlisted task-spec examples: `104`.
- Unresolved baseline findings: `290`.
- Unresolved scopes: frontend source `241`, docs `49`.
- Unresolved files: `AdminProductsPage.tsx` `233`, `COACH2_FINAL_CLOSURE_PROGRESS.md` `47`, `AdminProductVariantsPage.tsx` `8`, `COACH_COMPLETION_PROGRESS.md` `2`.

Reports:

- `docs/encoding/ENCODING_FINDINGS_BASELINE.md`
- `docs/encoding/encoding-findings-baseline.json`

Files changed: Baseline reports only.

Scanner: Baseline findings intentionally fail until repair phases; report is retained as evidence.

Build/Test: Not applicable at baseline.

Database: Not inspected yet.

Browser: Not inspected yet.

Remaining: E04→E35.

Next: E04 — classify true mojibake and false positives.

## E04 — CLASSIFICATION

Status: PASS

Findings:

- The `290` non-task findings were classified as `CONFIRMED_MOJIBAKE` in active source/docs.
- The `104` findings in the exact master-task ranges are `HISTORICAL_ARCHIVE`/`TASK_SPEC_EXAMPLE` fixtures and are documented, scanned allowlist entries.
- No valid English, valid Vietnamese, valid symbols or ambiguous user data were changed.
- No broad non-ASCII replacement was used.

Files changed:

- `scripts/text-encoding-allowlist.json`
- `docs/encoding/ENCODING_ALLOWLIST.md`

Scanner: Allowlist is path + exact line-range scoped; no application source, seed, migration or runtime data is allowlisted.

Build/Test: Classification review PASS.

Database: No data mutation.

Browser: Not inspected yet.

Remaining: E05→E35.

Next: E05 — repair Admin Products page.

## E05 — ADMIN PRODUCTS PAGE

Status: PASS

Findings: `233` baseline findings in `frontend/src/pages/admin/AdminProductsPage.tsx` were deterministic mojibake in user-visible strings.

Files changed:

- `frontend/src/pages/admin/AdminProductsPage.tsx`

Repair scope:

- Restored Vietnamese labels, errors, toasts, form fields, status text, confirmation text and accessibility-visible copy.
- Restored em/en dash, ellipsis, quote, middle-dot and Vietnamese dong symbols where the existing UI already used them.
- Preserved product API calls, payloads, currency calculation, pagination, image actions and business conditions.

Scanner: Targeted file clean after repair.

Build/Test: `git diff --check` PASS; frontend typecheck/build pending final E31.

Database: No mutation.

Browser: Admin route verification pending E33.

Remaining: E06→E35.

Next: E06 — repair Admin Product Variants page.

## E06 — ADMIN PRODUCT VARIANTS PAGE

Status: PASS

Findings: `8` baseline punctuation/loading mojibake findings.

Files changed:

- `frontend/src/pages/admin/AdminProductVariantsPage.tsx`

Repair scope:

- Restored `—`, `·` and `…` while preserving valid English UI copy and all variant/inventory state transitions.

Scanner: Targeted file clean after repair.

Build/Test: `git diff --check` PASS; frontend typecheck/build pending final E31.

Database: No mutation.

Browser: Variants route verification pending E33.

Remaining: E07→E35.

Next: E07 — scan shared layout and navigation.

## E07 — GLOBAL LAYOUT / SHARED COMPONENTS

Status: VERIFIED_NO_CHANGE

Findings: No unresolved HIGH findings in layout, navigation, shared UI, toast, dialog, table, pagination, loading/error/empty, command menu, marketing header/footer or sidebar source.

Files changed: None.

Scanner: Full repository scan clean except documented task-spec examples.

Build/Test: Pending E31.

Database: No mutation.

Browser: Pending E32/E33.

Remaining: E08→E35.

Next: E08 — scan public marketing pages.

## E08 — PUBLIC MARKETING PAGES

Status: VERIFIED_NO_CHANGE

Findings: No unresolved HIGH findings in Landing, About, Contact, Blog, Success Stories, Membership, public Coaches, Exercises, Workout Programs, Products, Shops or Videos source.

Files changed: None.

Scanner: PASS for active frontend source.

Build/Test: Pending E31.

Database: No mutation.

Browser: Guest crawl pending E32.

Remaining: E09→E35.

Next: E09 — scan auth pages.

## E09 — AUTH PAGES

Status: VERIFIED_NO_CHANGE

Findings: No unresolved HIGH findings in Login, Register, access denied, validation, password helper or auth toast/error copy.

Files changed: None.

Scanner: PASS for auth source.

Build/Test: Pending E31.

Database: No mutation.

Browser: Guest/member auth QA pending E32.

Remaining: E10→E35.

Next: E10 — scan Member dashboard/profile.

## E10 — MEMBER DASHBOARD / PROFILE

Status: VERIFIED_NO_CHANGE

Findings: No unresolved HIGH findings in Member Dashboard, Profile, Settings, Loyalty, Referral, Coupons, Tickets, Invoices or Notifications source.

Files changed: None.

Scanner: PASS for Member source.

Build/Test: Pending E31.

Database: No mutation.

Browser: Member crawl pending E32.

Remaining: E11→E35.

Next: E11 — scan Member Coach/booking.

## E11 — MEMBER COACH / BOOKING / APPOINTMENTS

Status: VERIFIED_NO_CHANGE

Findings: No unresolved HIGH findings in Coach lists/details, availability labels, booking, quota, appointment, mode/location, status or error/toast copy.

Files changed: None.

Scanner: PASS; Coach business rules untouched.

Build/Test: Pending E31/E34.

Database: No mutation.

Browser: Member booking QA pending E32/E33.

Remaining: E12→E35.

Next: E12 — scan workout/progress.

## E12 — MEMBER WORKOUT / PROGRESS

Status: VERIFIED_NO_CHANGE

Findings: No unresolved HIGH findings in workout, program, schedule, session, set-log, progress, exercise description or Coach-note source.

Files changed: None.

Scanner: PASS; source text and data text remain separate concerns for runtime audit.

Build/Test: Pending E31/E34.

Database: Content audit pending E22.

Browser: Member workout QA pending E32/E34.

Remaining: E13→E35.

Next: E13 — scan Coach workspace.

## E13 — COACH WORKSPACE

Status: VERIFIED_NO_CHANGE

Findings: No unresolved HIGH findings in Coach Dashboard/Profile/Availability/Appointments/Exercise Library/Programs/Builder/Members/Context/Assignments/Schedules/Sessions/Progress/Attention/Notifications.

Files changed: None.

Scanner: PASS; Coach logic untouched.

Build/Test: Pending Coach regression E34.

Database: Audit pending E21–E24.

Browser: Coach crawl pending E33.

Remaining: E14→E35.

Next: E14 — scan Seller text-only scope.

## E14 — SELLER PAGES

Status: VERIFIED_NO_CHANGE

Findings: No unresolved HIGH findings in Seller application/foundation/shop/brand/products/orders/revenue/complaints source.

Files changed: None; Seller workflow/API/state transitions untouched.

Scanner: PASS for Seller source.

Build/Test: Pending Seller integrity/regression E34.

Database: Audit pending E21–E24.

Browser: Seller crawl pending E33.

Remaining: E15→E35.

Next: E15 — scan Admin pages.

## E15 — ADMIN PAGES

Status: PASS

Findings: Admin-wide scan has no unresolved HIGH findings after the two confirmed page repairs.

Files changed: Only the confirmed Admin Products and Variants pages.

Scanner: `frontend/src/pages/admin/**` clean.

Build/Test: Pending frontend typecheck/build E31 and product regression E34.

Database: No mutation.

Browser: Admin crawl pending E33.

Remaining: E16→E35.

Next: E16 — scan customer commerce pages.

## E16 — CUSTOMER COMMERCE PAGES

Status: VERIFIED_NO_CHANGE

Findings: No unresolved HIGH findings in product list/detail, cart, checkout, orders, complaints, reviews or shop source.

Files changed: None; commerce rules untouched.

Scanner: PASS for commerce source.

Build/Test: Pending E31/E34.

Database: Runtime content audit pending E22/E25.

Browser: Guest/member commerce crawl pending E32/E34.

Remaining: E17→E35.

Next: E17 — scan backend user-visible strings.

## E17 — BACKEND USER-VISIBLE STRINGS

Status: VERIFIED_NO_CHANGE

Findings: No unresolved HIGH findings in `backend/src/**`, including AppError/API messages, validation, email/template, invoice/PDF labels, notifications and fixtures.

Files changed: None; status codes, error codes and business conditions untouched.

Scanner: Backend source clean.

Build/Test: Backend build/lint pending E31; API runtime audit pending E25.

Database: Schema/content audit pending E21/E22.

Browser: Runtime role crawl pending E32/E33.

Remaining: E18→E35.

Next: E18 — scan SQL/seed/migrations.

## E18 — SQL / SEED / MIGRATION STATIC TEXT

Status: VERIFIED_NO_CHANGE

Findings: No unresolved HIGH findings in `db/**` SQL, seed text or migration text.

Files changed: None; applied migrations, especially `0100`–`0111`, were not rewritten.

Scanner: SQL scope clean.

Build/Test: Migration checksum/read-only audit pending E21–E24.

Database: No mutation.

Browser: Not applicable.

Remaining: E19→E35.

Next: E19 — repair active documentation.

## E19 — ACTIVE DOCUMENTATION

Status: PASS

Findings: Repaired `47` deterministic findings in `docs/coach/COACH2_FINAL_CLOSURE_PROGRESS.md` and `2` deterministic punctuation findings in `docs/coach/COACH_COMPLETION_PROGRESS.md`.

Files changed:

- `docs/coach/COACH2_FINAL_CLOSURE_PROGRESS.md`
- `docs/coach/COACH_COMPLETION_PROGRESS.md`

Repair scope: Presentation-only restoration; factual history, branch facts, migration facts and acceptance evidence remain unchanged.

Scanner: Active docs clean except documented master task examples.

Build/Test: `git diff --check` PASS; final docs audit pending E35.

Database: No mutation.

Browser: Not applicable.

Remaining: E20→E35.

Next: E20 — scan historical archive.

## E20 — DOCUMENTATION ARCHIVE

Status: VERIFIED_NO_CHANGE

Findings: No unresolved HIGH findings in `docs/archive/**`; no historical archive needed byte-sensitive repair or allowlisting.

Files changed: None.

Scanner: Archive scope clean.

Build/Test: Pending final static gate.

Database: No mutation.

Browser: Not applicable.

Remaining: E21→E35.

Next: E21 — Unicode database schema audit.

## E21 — UNICODE DATABASE SCHEMA AUDIT

Status: **PASS**

Read-only inspection was run against the canonical `GYMFIT_DB` connection using the backend's configured SQL Server credentials. The audit found 318 text columns: 314 `nvarchar` columns and 4 fixed-width `char` columns; no `varchar`, `nchar`, `text`, or `ntext` columns were found. Priority user-facing fields in Users, Plans, Categories, Brands, Products, ProductVariants, Shops, SellerApplications, Exercises, CoachProfiles, Notifications, Orders, and ShopReviews were confirmed Unicode-capable. Migration status remained 29 applied, 0 pending, and 0 checksum mismatches, including the protected 0100–0111 range. No schema, migration, or canonical data was changed.

## E22 — DATABASE CONTENT MOJIBAKE SCAN

Status: **PASS**

The read-only content scan inspected 316 non-sensitive text columns and excluded password, token, secret, hash, credential, and private-key fields. It performed in-memory signature detection without logging row values. Result: `findings=[]`, `truncated_columns=[]`, and `database_mutated=false`. No mojibake was found in canonical database content.

## E23 — DISPOSABLE UNICODE ROUNDTRIP

Status: **PASS**

A guarded disposable database named with the `GYMFIT_DB_COACH_FINAL_CLOSURE_` prefix was created, populated with Vietnamese names/labels, Unicode punctuation (`— – … “ ” ‘ ’ ·`), the Vietnamese đồng sign, and emoji, then read back through SQL, JSON serialization/parsing, and frontend-safe string handling. All comparisons returned `true`. The fixture was removed successfully, the disposable database was dropped, and `canonical_mutated=false`.

## E24 — DATABASE REPAIR DECISION

Status: **VERIFIED_NO_CHANGE**

E22 found no deterministic database corruption and E23 confirmed the Unicode roundtrip. Therefore no production-row repair, seed edit, migration rewrite, or new migration was necessary. The protected applied migrations and RBAC/state data were left unchanged.

Next: E25 — API JSON/runtime audit.

## E25 — API JSON RUNTIME TEXT SCAN

Status: **PASS**

The local API was run against the disposable `GYMFIT_DB_SELLER012_ACCEPTANCE_BROWSER_20260808_A73C9E` database. A recursive JSON-string scan covered 84 representative successful GET responses: Guest `14`, Member `21`, Coach `11`, Seller `12`, and Admin `26`. Message text, nested data, pagination text, notifications, products, categories, brands, Coach, Plan, and Exercise responses were included. Result: `findings=[]`, `fiveHundreds=[]`, `otherStatuses=[]`; no secrets, tokens, passwords, or response bodies were written to the report.

## E26 — FONT / CSS / HTML RENDERING SANITY

Status: **PASS**

The HTML entry point exposes UTF-8 metadata, the API serializes JSON through the normal Express path, and the UI uses the existing Inter/system fallback stack. Browser evidence at 375×812, 768×1024, and 1440×900 showed Vietnamese glyphs, punctuation, labels, options, buttons, placeholders, dialogs, empty states, and errors rendering correctly. No encoding override, illegal CSS `content`, pseudo-element text injection, extreme text transform/spacing, or icon-font glyph issue was found. The existing mixed-language `<html lang="en">` declaration was retained because changing it would be outside the text-only scope and no rendering regression was observed.

## E27 — UNICODE NORMALIZATION / BOM AUDIT

Status: **PASS**

The normalization audit covered 535 active text files. It found `0` invalid UTF-8 files, `0` leading BOMs, `0` middle-file BOMs, `0` zero-width characters, and `0` non-NFC files. C1 controls remain only in the intentionally preserved master-task examples and the generated baseline evidence files; none remain in active application source or ordinary documentation.

## E28 — PREVENTION CONFIG

Status: **PASS**

Added `.editorconfig` with UTF-8, LF, and final-newline defaults, added the root `check:encoding` script, and documented the exact task-fixture allowlist. The scanner is report-only and does not auto-rewrite source. `--include-generated` was corrected to include the known `frontend/dist` and `backend/dist` output directories without scanning unrelated dependency/build caches.

## E29 — GENERATED FRONTEND DIST

Status: **PASS**

Frontend and backend builds were regenerated locally and scanned without hand-editing bundles. The generated-inclusive scan covered 1,468 text files and returned 104 intentional allowlisted findings with `0` unresolved HIGH findings. `frontend/dist` and `backend/dist` remain ignored build output and were not added to the branch.

## E30 — FULL STATIC CLEAN GATE

Status: **PASS**

`npm run check:encoding` scanned 530 active text files and returned `104` allowlisted task-spec findings and `0` unresolved HIGH findings. `git diff --check` also passed. The only allowlisted signatures are exact broken examples in the user-owned master task; no application source, seed, migration, runtime, or ordinary documentation is allowlisted.

## E31 — BUILD / TYPECHECK / LINT

Status: **PASS**

Backend `npm ci`, build, and lint passed; frontend `npm ci`, TypeScript `--noEmit`, and Vite build passed. Lint reported `0` errors and `461` existing warnings. Vite reported its existing large-chunk warning but no build error. No unrelated warning or dependency audit issue was auto-fixed.

## E32 — BROWSER CRAWL PUBLIC + MEMBER

Status: **PASS**

Guest/public coverage was 14 routes × 3 required viewports = `42` visits. Member coverage was `42` visits. The context-aware high-confidence detector scanned visible body text plus accessible labels, buttons, placeholders, titles, options, dialogs, toast/error/empty states, and returned `mojibake=[]`, with no empty pages or unexpected redirects in the stable pass.

## E33 — BROWSER CRAWL COACH + SELLER + ADMIN

Status: **PASS**

Stable role coverage was Coach `39` visits, Seller `33` visits, and Admin primary focus `48` visits (16 routes × 3 viewports), including Admin Products, Product Variants, catalog/inventory, seller products/orders, and Coach workspace. `/admin/analytics` was separately rechecked after a presentation-only `Percent` icon render correction; it was clean. The intentional Coach `/coach/progress` route redirect remained unchanged. No RBAC, state-machine, API contract, or business behavior was altered.

## E34 — FULL REGRESSION + TEXT ROUNDTRIP

Status: **PASS**

Coach booking unit tests passed. Canonical product integrity ran read-only and passed its checks; its one existing MEDIUM missing-local-upload observation is unrelated to encoding and caused no mutation. Schema/content scans and a disposable SQL → JSON → frontend-safe Unicode roundtrip passed. The browser fixture submitted `Sản phẩm thử nghiệm — Đỏ · 250.000 ₫` through form → API → DB → API → render and returned the exact text. The disposable product/shop/user fixtures were cleaned before final handover.

## E35 — FINAL AUDIT / HANDOVER

Status: **PASS**

Final static scan, generated-output scan, builds, typechecks, API/runtime scan, database status, and stable browser matrices are clean. Canonical migration status is 29 applied, 0 pending, and 0 checksum mismatches, including protected migrations 0100–0111. The final verdict is:

`PROJECT_TEXT_ENCODING_CLEAN`
