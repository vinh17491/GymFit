# API Text Runtime Audit

Status: **PASS**

Date: 2026-08-08

## Scope

The local backend was started with the normal application configuration against the guarded disposable database `GYMFIT_DB_SELLER012_ACCEPTANCE_BROWSER_20260808_A73C9E`. No canonical database was used for runtime fixture writes.

Every JSON string value in the sampled responses was traversed recursively. The scan included top-level messages, nested data, pagination text, notifications, product/catalog text, categories, brands, Coach data, Plans, and Exercises.

| Role | Successful representative GET responses | Mojibake findings | 5xx | Other status |
| --- | ---: | ---: | ---: | ---: |
| Guest | 14 | 0 | 0 | 0 |
| Member | 21 | 0 | 0 | 0 |
| Coach | 11 | 0 | 0 | 0 |
| Seller | 12 | 0 | 0 | 0 |
| Admin | 26 | 0 | 0 | 0 |
| **Total** | **84** | **0** | **0** | **0** |

Result: `findings=[]`, `fiveHundreds=[]`, `otherStatuses=[]`.

## Unicode roundtrip

The disposable acceptance path also verified Vietnamese text, em/en dashes, ellipsis, typographic quotes, middle dot, `₫`, and emoji through SQL parameter binding, API JSON serialization/parsing, and frontend-safe string handling. The browser acceptance fixture used:

`Sản phẩm thử nghiệm — Đỏ · 250.000 ₫`

The exact product name and description were preserved in the database and rendered on the seller product detail page. The shop/profile seed fixture was corrected through a Unicode-safe disposable-DB path before the final browser recheck; no source or canonical row was changed.

## Safety and cleanup

- Passwords, tokens, secrets, and response bodies were not written to this report.
- The runtime API and Vite processes were stopped after QA.
- The disposable database was dropped and verified absent (`qa_id=null`).
- Canonical `GYMFIT_DB` remained present and unchanged by the runtime fixture flow.
