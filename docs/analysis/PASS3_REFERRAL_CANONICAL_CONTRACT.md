# Pass 3 Referral Canonical Contract

This contract covers the active mounted auth/referral flow after phase 149.
It does not copy the affiliate, click, reward or payout portion of the legacy
snapshot because no mounted runtime caller uses those objects.

## Objects

### `dbo.ReferralCodes`

- `id INT IDENTITY` primary key;
- `user_id INT NOT NULL`, foreign key to `dbo.Users(id)`, unique per user;
- `code NVARCHAR(20) NOT NULL`, unique and indexed;
- `status NVARCHAR(20) NOT NULL`, current values `active` or `disabled`;
- `created_at DATETIME2 NOT NULL`, default `SYSUTCDATETIME()`.

The referral controller owns user-scoped read/create operations. The existing
`Users.referral_code` remains the registration-generated compatibility code;
the auth flow accepts either that current code or an active
`ReferralCodes.code`, with the canonical table taking precedence when both
match. This preserves the existing API while making the link produced by the
mounted referral page usable.

### `dbo.ReferralTransactions`

- `id INT IDENTITY` primary key;
- `referrer_id` and `referred_id` are required foreign keys to `dbo.Users`;
- `commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0`;
- `transaction_type NVARCHAR(50) NOT NULL`;
- `status NVARCHAR(20) NOT NULL`, current values `pending`, `confirmed` or
  `paid`;
- `created_at DATETIME2 NOT NULL`, default `SYSUTCDATETIME()`;
- a check prevents a user from referring itself;
- a filtered unique index allows at most one `registration` transaction for a
  referrer/referred pair/type.

The registration transaction is created inside the existing auth transaction.
An invalid or missing referral code still creates the user without a referral
transaction. No commission, points or demo row is inserted by migration
`0112_referral_runtime_schema.sql`.

## Ownership decisions

`ReferralCodes` and `ReferralTransactions` are `KEEP_AND_MIGRATE` active
runtime objects. `ReferralRewards`, `ReferralClicks`, `Affiliates` and
`AffiliatePayouts` are `DEAD_LEGACY` candidates in the current source scan;
they are not recreated. The existing `Users.referred_by` foundation foreign
key remains the direct user relationship.

The unique filtered registration index is an integrity guard, not a new reward
rule. Commission amount remains the current registration value (`0`), and
other commission semantics remain outside this pass.

`DATABASE_MANUAL_CHECK_REQUIRED`: apply `0112` to a connected SQL Server and
inspect existing duplicate data before certifying the migration. No database
was connected or mutated during this change.
