# Project Text Encoding Test Matrix

Validation branch: `coach3`<br>
Published branch: `coach4`<br>
Final verdict: **PROJECT_TEXT_ENCODING_CLEAN**

| Phase | Result | Evidence / boundary |
| --- | --- | --- |
| E00 | PASS | Branch/worktree baseline captured; no pre-existing tracked diff. |
| E01 | VERIFIED_NO_CHANGE | UTF-8 entry points, package boundaries, SQL/backend/frontend/docs roots reviewed. |
| E02 | PASS | Repository scanner created at `scripts/check-text-encoding.mjs`. |
| E03 | PASS | Baseline: 521 text files, 394 findings; 290 unresolved after removing 104 task-fixture examples. |
| E04 | PASS | High-confidence signatures classified; valid Vietnamese and valid English were preserved. |
| E05 | PASS | Repaired 233 deterministic findings in `AdminProductsPage.tsx`; behavior/payloads unchanged. |
| E06 | PASS | Repaired 8 deterministic findings in `AdminProductVariantsPage.tsx`; behavior unchanged. |
| E07 | VERIFIED_NO_CHANGE | Shared layout/navigation/UI scan clean. |
| E08 | VERIFIED_NO_CHANGE | Public marketing page scan clean. |
| E09 | VERIFIED_NO_CHANGE | Auth and validation copy scan clean. |
| E10 | VERIFIED_NO_CHANGE | Member dashboard/profile/settings surfaces clean. |
| E11 | VERIFIED_NO_CHANGE | Member Coach/booking/appointment text clean. |
| E12 | VERIFIED_NO_CHANGE | Workout/progress/session text clean. |
| E13 | VERIFIED_NO_CHANGE | Coach workspace text clean. |
| E14 | VERIFIED_NO_CHANGE | Seller text-only scope clean. |
| E15 | PASS | Admin-wide scan clean after source repairs. |
| E16 | VERIFIED_NO_CHANGE | Customer commerce text clean. |
| E17 | VERIFIED_NO_CHANGE | Backend user-visible/API/email/PDF text clean. |
| E18 | VERIFIED_NO_CHANGE | SQL, seed, and migration text clean; no migration rewritten. |
| E19 | PASS | Repaired 47 findings in `COACH2_FINAL_CLOSURE_PROGRESS.md` and 2 punctuation findings in `COACH_COMPLETION_PROGRESS.md`. |
| E20 | VERIFIED_NO_CHANGE | Historical archive scan clean. |
| E21 | PASS | 318 text columns audited: 314 `nvarchar`, 4 `char`; no `varchar`/`nchar`/`text`/`ntext`; migration checksums clean. |
| E22 | PASS | 316 non-sensitive text columns scanned; `findings=[]`; no data logged or mutated. |
| E23 | PASS | Disposable SQL → JSON → frontend-safe Unicode roundtrip passed, then fixture DB dropped. |
| E24 | VERIFIED_NO_CHANGE | No production repair, seed edit, new migration, RBAC, or state-machine change required. |
| E25 | PASS | 84 API GET responses across Guest/Member/Coach/Seller/Admin; 0 findings, 0 5xx, 0 other statuses. |
| E26 | PASS | UTF-8 HTML/API path, font glyphs, CSS/pseudo-element sanity, and mixed-language rendering clean. |
| E27 | PASS | 535 active text files: invalid UTF-8/BOM/zero-width/non-NFC all 0. |
| E28 | PASS | `.editorconfig`, `check:encoding`, exact allowlist, and generated-scan behavior added/documented. |
| E29 | PASS | Generated-inclusive scan: 1,468 text files, 104 intentional allowlisted, 0 unresolved HIGH. |
| E30 | PASS | Active static scan: 530 files, 104 allowlisted, 0 unresolved HIGH; `git diff --check` pass. |
| E31 | PASS | Backend/frontend install, build, typecheck, and lint pass; 0 lint errors. |
| E32 | PASS | Guest 42 + Member 42 route/viewport visits; clean detector, no empty pages/unexpected redirects. |
| E33 | PASS | Coach 39 + Seller 33 + Admin focus 48 route/viewport visits; analytics recheck clean. |
| E34 | PASS | Coach booking unit, canonical read-only integrity, DB roundtrip, and browser form→API→DB→render pass. |
| E35 | PASS | Final cleanup, canonical migration/status verification, static/runtime/browser/build gates complete. |

## Test commands

```text
npm run check:encoding
node scripts/check-text-encoding.mjs --include-generated
git diff --check
```

The scanner's 104 remaining findings are exact, documented broken examples in the user-owned master task. They are not application source, SQL, seed, migration, API, build, or browser findings.
