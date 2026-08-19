# Pass 4 Legacy Decision Matrix

The matrix is the source-of-truth decision record for legacy objects. The
decision vocabulary is intentionally limited to the Pass 4 contract.

| legacy_object | active_callers | canonical_replacement | fresh_db_required | legacy_db_compatibility | decision | risk | phase_owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Workouts` | videos controller; coach workspace dashboard/history; admin workout session CTE | `Exercises` for public media; `WorkoutPrograms` + `MemberWorkoutSessions` for execution | NO | Optional only for explicitly quarantined historical data; never a required runtime join | `CANONICAL_REPOINT` | High until all mounted reads/writes are removed; medium after source scan is clean | 229-254 |
| `WorkoutSessions` | coach workspace dashboard/list/detail/progress; admin coach summary; admin workout sessions/progress | `MemberWorkoutSessions` and canonical set logs | NO | Optional historical compatibility may be handled outside fresh-db runtime; no implicit fallback | `CANONICAL_REPOINT` | High for scope/count correctness; low after canonical-only queries | 230-244 |
| `ProductTags` | admin product delete; seller product delete | No runtime replacement; product media/options remain canonical in their own tables | NO | Conditional delete-only cleanup when the table exists; no reads or required FK | `REMOVE_RUNTIME_DEPENDENCY` | Medium if unconditional SQL remains; low after conditional cleanup | 255-262 |
| `Users.referral_code` | registration, login/session DTOs, requested-referral lookup | `ReferralCodes.code` as owner; user column retained as compatibility alias | YES as part of `Users` foundation | Existing values are preserved; new values mirror the canonical code in one transaction | `CANONICAL_MIRROR` | High for duplicate ownership if writes diverge; low after one-code transaction policy | 263-268 |
| `ReferralCodes` | registration referrer lookup; referral self-service read/create | `ReferralCodes.code` and `ReferralTransactions` migration-0112 contract | YES through migration `0112` | Strict metadata/data compatibility before migration; no fake ledger adoption | `CANONICAL_MIRROR` | High if existing incompatible table is silently adopted; low with fail-closed preflight | 211-226,263-268 |

## Decisions

1. A fresh canonical database must operate without all three legacy tables.
2. Legacy workout rows are not silently merged into canonical execution data.
3. Product tag cleanup is best-effort and conditional; catalog safety checks
   remain authoritative.
4. Referral code generation has one owner (`ReferralCodes.code`) and one
   transaction-level mirror (`Users.referral_code`). Existing mismatches are
   retained for auditability.
5. Compatibility is a validated schema path, not a ledger shortcut. Unknown
   or incompatible objects stop migration before any write.
