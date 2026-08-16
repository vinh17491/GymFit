# Database Unicode Schema Audit

Status: `PASS`

Target: local development/canonical SQL Server database `GYMFIT_DB`.

The audit was read-only. It inspected `sys.tables`, `sys.columns`, `sys.types`,
collation metadata and primary-key metadata without selecting user values.

## Result

- Text columns discovered: `318`.
- `nvarchar`: `314`.
- `char`: `4` (technical fixed-width values such as codes/currency/hash fields;
  no Vietnamese user-facing text column required a schema change).
- `varchar`, `nchar`, `text`, `ntext`: `0`.
- Collation observed on the audited columns: `Latin1_General_CI_AS`.
- Migration ledger: `29` applied, `0` pending, `0` checksum mismatches.
- Canonical database mutation: `false`.

All user-facing text surfaces audited by category use `nvarchar`, including:

| Surface | Representative columns |
| --- | --- |
| Users | `name`, `email`, `phone`, `coach_status_reason` |
| Plans | `name`, `description`, `features` |
| Categories / Brands | `name`, `description`, `normalized_name` |
| Products | `product_name`, `description`, `specifications`, `features`, `target_users`, `tags` |
| Product variants | `variant_name`, `sku`, `barcode` |
| Shops / Seller applications | `name`, `description`, `pickup_address`, `business_name`, `contact_name`, `review_reason` |
| Exercises | `name`, `description`, `instructions`, `muscle_group`, `equipment` |
| Coach profiles / availability | `specialty`, `bio`, `session_mode`, `location`, `note` |
| Notifications / CRM | `title`, `message`, `content`, `description` |
| Orders / complaints / reviews | customer/shipping text, notes, reasons and review comments |

`nvarchar` provides Unicode storage; the current collation affects comparison
and ordering, not UTF-16 character storage. No forward schema migration is
needed for this encoding task.

## Safety

- No password, token, hash, credential or secret value was selected or logged.
- No migration was rewritten.
- No canonical row was inserted, updated or deleted.
