# GymFit Pass 3 Analytics Runtime Contract

Phases 178–183 preserve the current analytics response shapes while closing
their schema ownership and duplicate-model dependency.

## Metric sources

| Metric/API | Source | Meaning preserved |
| --- | --- | --- |
| DAU / MAU | `MemberWorkoutSessions` (`0008`) | distinct member workout participants by start time |
| daily and trend revenue | `Payments` (`0116`) | completed membership payment amount only |
| active members / churn | foundation `Memberships` | current membership lifecycle counts |
| conversion / paid | `Users`, `Memberships`, `Payments` | registration, membership and completed membership payment counts |
| user growth | foundation `Users` | registrations grouped by creation date |
| retention | `AnalyticsRetention` (`0119`) | stored cohort projection returned by the existing endpoint |
| CSV/range export | `AnalyticsDaily` (`0118`) | stored daily reporting projection returned by the existing endpoint |

`backend/src/modules/analytics/analytics.controller.ts` now uses
`MemberWorkoutSessions.member_id` for DAU/MAU. The current workout engine
writes that table, with `COMPLETED`/`IN_PROGRESS`/`ABANDONED` lifecycle states;
the analytics queries retain their existing start-time participation meaning
and do not recreate or write the legacy `WorkoutSessions` model.

`Payments` is membership revenue. Marketplace GMV, refunds, seller settlement
and compensation remain in their separate `Orders`, `ShopOrders`, refund and
settlement migrations. No analytics query combines those financial domains.

`AnalyticsDaily` and `AnalyticsRetention` are retained as stored report
projections because the mounted export/retention routes read them directly and
the source contains no safe writer or complete derivation contract. `0118` and
`0119` create ownership and constraints only; they insert no historical or
synthetic rows. A projection refresh job remains an explicit follow-up, not an
invented startup behavior.

Database application and projection freshness are
`DATABASE_MANUAL_CHECK_REQUIRED`.
