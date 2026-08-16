# Project Text Encoding Recovery — Final Handover

## Verdict

`PROJECT_TEXT_ENCODING_CLEAN`

Validation branch: `coach3`<br>
Published branch: `coach4`<br>
Repository: `vinh17491/GymFit`

The verdict is based on clean active-source static scan, generated-output scan, API/runtime scan, database schema/content/roundtrip checks, required role/viewport browser QA, and build/typecheck gates.

## Findings and repairs

- Baseline scan: 521 text files and 394 high-confidence findings.
- Confirmed deterministic mojibake: 290 findings.
- Repaired: 290 findings — Admin Products `233`, Admin Product Variants `8`, Coach2 closure documentation `47`, Coach completion documentation `2`.
- Active source/docs remaining: `0` unresolved HIGH findings.
- Database remaining: `0` deterministic mojibake findings in 316 non-sensitive text columns.
- API/runtime remaining: `0` findings across 84 representative JSON responses.
- Browser remaining: `0` high-confidence visible mojibake findings in the stable role matrices.
- Allowlisted: 104 exact signatures in the user-owned master-task examples; the scanner records their ranges and reasons in `scripts/text-encoding-allowlist.json` and `docs/encoding/ENCODING_ALLOWLIST.md`.

## Prevention added

- `scripts/check-text-encoding.mjs` — repository-wide UTF-8/mojibake scanner with JSON/Markdown output, allowlist support, fatal invalid-UTF-8 detection, and optional generated-output coverage.
- Root `npm run check:encoding` script.
- `.editorconfig` with UTF-8, LF, and final newline defaults.
- Baseline reports and encoding progress/test-matrix documentation under `docs/encoding/`.

Use:

```text
npm run check:encoding
node scripts/check-text-encoding.mjs --include-generated
```

`--include-generated` scans the known `frontend/dist` and `backend/dist` output directories after a build. Bundles were not hand-edited, and ignored build output was not added to the branch.

## Verification

- Backend: `npm ci`, build, lint — pass; 0 lint errors and 461 existing warnings.
- Frontend: `npm ci`, `npx tsc --noEmit`, Vite build — pass.
- API: Guest 14, Member 21, Coach 11, Seller 12, Admin 26 successful representative GET responses; 0 findings and 0 5xx.
- Browser: Guest 42, Member 42, Coach 39, Seller 33, Admin focus 48 route/viewport visits across 375×812, 768×1024, and 1440×900. `/admin/analytics` was additionally rechecked after a presentation-only icon-render correction.
- Database: 318 text columns audited; 314 `nvarchar`, 4 `char`, no `varchar`/`nchar`/`text`/`ntext`; canonical status 29 applied, 0 pending, 0 checksum mismatches.
- Roundtrip: `Sản phẩm thử nghiệm — Đỏ · 250.000 ₫` preserved through form → API → DB → API → render in the disposable acceptance database.
- Cleanup: API/Vite stopped; QA database dropped and verified absent; canonical `GYMFIT_DB` remained present.

## Scope protections

No valid English was translated. No business rules, API contracts, RBAC, state machine, auth policy, applied migration, `.env`, secret, or database dump was changed. No push, commit, or manual bundle edit was performed.

The read-only canonical product integrity check retained one pre-existing MEDIUM missing-local-upload observation; it is unrelated to text encoding and did not mutate data. Dependency audit warnings and the existing Vite chunk-size warning were not altered because they are outside this task.
