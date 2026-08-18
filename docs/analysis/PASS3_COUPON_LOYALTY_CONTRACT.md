# Pass 3 Coupon and Loyalty Runtime Contract

This document records phases 150-159. It is intentionally limited to the
mounted coupon and loyalty routes; it does not create a promotion engine,
checkout integration, gateway, reward fulfillment system or demo data.

## Referral response minimization

The member referral list now returns only the fields rendered by the current
page: transaction id, commission amount, transaction type, status, timestamp
and referred display name. It no longer returns the referred user's email or
the internal referrer/referred ids. The referral page no longer renders an
email. The mounted feature and response purpose are unchanged.

## Coupon flow inventory

- `POST /api/coupons/validate` is member-only and checks active code, current
  date boundary, total `usage_limit`, per-user `user_limit`, the referenced
  Plan, `min_purchase` and the current fixed/percentage discount calculation.
- `POST /api/coupons` is admin-only and creates the current coupon fields.
- `GET /api/coupons` and `GET /api/coupons/stats` are admin-only list/stats
  paths.
- No active source path inserts into `CouponUsages`; this pass therefore only
  creates the table and lookup indexes. It does not invent checkout usage
  recording or apply `applicable_plans` outside the existing contract.

`0113_coupon_runtime_schema.sql` owns `Coupons` and `CouponUsages`. It keeps
the existing type set, value, minimum purchase, date range, usage limits,
applicable plan payload and creator foreign key. It adds only current lookup
indexes and integrity checks for non-negative values, positive limits and a
valid date range.

## Loyalty mutation inventory

| Mutation | Current behavior | Pass 3 decision |
| --- | --- | --- |
| Read/create member points row | `GET /points` reads the member row and creates a zero row if absent | preserve response and zero-row behavior; canonical `Points` has one row per user |
| Daily login | serializable transaction checks one `login` transaction for the local SQL Server calendar date, then increments balance and records one earn row | retain date expression and transaction boundary; add supporting indexes only |
| Admin adjustment | validates active user, creates row if absent, updates balance/lifetime counters and inserts one earn/spend row | preserve current route behavior; no new reward rule |
| Reward redemption | baseline read reward/read balance -> stored procedure -> redemption insert -> stock decrement | replace with one serializable TypeScript transaction that locks reward and balance, debits points, records the spend, decrements stock and inserts redemption |

## Loyalty contract

`0114_loyalty_runtime_schema.sql` owns `Points`, `PointTransactions`,
`RewardsCatalog` and `RewardRedemptions`. It creates no reward rows and no
`sp_SpendPoints` procedure.

The canonical redemption order is:

1. lock an active, in-stock reward row;
2. lock the member's points row;
3. debit the balance and increment lifetime spent;
4. insert the `spend` PointTransaction;
5. decrement stock only while stock remains positive;
6. insert the pending RewardRedemption;
7. commit all changes together.

Any error rolls the transaction back. This prevents double spending, negative
stock and partial mutations while preserving the existing `201` success and
normal application error messages. `sp_SpendPoints` is now a legacy-only
definition from `db/schema.sql`, not a second authority.

Known domain failures use `AppError` messages. Unexpected database errors still
flow through the existing error boundary, which logs diagnostics server-side
and returns a generic client-safe error rather than a SQL Server message or
constraint name.

`DATABASE_MANUAL_CHECK_REQUIRED`: migration/index/lock behavior still needs a
connected SQL Server check. No database was connected or mutated here.
