# GymFit Pass 3 Runtime Ownership Closure

Phases 184–189 re-scanned active SQL references after migrations `0116`–`0119`.

## Closed active owners

`Payments`/`Invoices` → `0116`; `AuditLogs`/`BackupLogs`/`CRMNotes`/`CRMTasks`
→ `0117`; `AnalyticsDaily` → `0118`; `AnalyticsRetention` → `0119`.
The analytics DAU/MAU source is now the canonical `MemberWorkoutSessions`
table from `0008`.

## Explicit unresolved or legacy classifications

| Object | Classification | Reason and safe boundary |
| --- | --- | --- |
| `ProductTags` | `BUSINESS_RULE_REQUIRES_CONFIRMATION` | only destructive product-delete paths use it; taxonomy write/read semantics are not present in the current mounted source, so no guessed migration is added |
| `Workouts`, `WorkoutSessions`, `WorkoutExercises` | `BUSINESS_RULE_REQUIRES_CONFIRMATION` / `LEGACY_DUPLICATE_MODEL` | videos, coach workspace and admin summaries still depend on the legacy model; only analytics was safely repointed |
| `ExerciseMedia` | `DEAD_LEGACY` | helper source is unmounted and the mounted `/api/media` route operates on product media; no current route caller was found |
| `sp_SpendPoints` | `DEAD_LEGACY` | no caller after `0114`; TypeScript redemption transaction is sole authority |
| `sp_GenerateInvoice` | `DEAD_LEGACY` | no runtime caller; invoice controller owns the current application path |
| `AffiliatePayouts`, `Affiliates`, `ReferralClicks`, `ReferralRewards`, `NutritionEntries`, `NutritionPlans`, `Promotions`, `TicketAttachments` | `DEAD_LEGACY` candidates | present only in the historical snapshot or outside mounted runtime scope |

No unresolved item is silently marked schema-ready. The route coverage document
records the affected mounted prefixes as `NO`. Foundation remains limited to
its 13 root tables; all new active owners are forward migrations after `0111`.
