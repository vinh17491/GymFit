# ADR: Coach Membership Entitlement and Quota

Status: CANONICAL FOR `coach1`; CLOSURE REVIEWED ON `coach2`

## Decision

Coach Booking is allowed only when the authenticated Member has an active Membership and the associated Plan has `COACH_BOOKING_ENABLED=true`. A finite `COACH_BOOKING_MONTHLY_LIMIT` is evaluated against the Asia/Ho_Chi_Minh calendar month of the requested Booking date.

The default quota policy is reservation-based: every successfully inserted Booking consumes one unit, including cancelled and no-show rows. A failed or rolled-back insert consumes no unit. Cancellation does not refund quota.

Pending payment is represented by the Payment lifecycle and API DTO `PENDING_PAYMENT`. The system never marks a Membership active while its Payment is pending. Simulated payment confirmation is explicit and server-authorized.

## Required behavior

- Starter-like Plans with no Coach entitlement return `403 COACH_BOOKING_NOT_INCLUDED`.
- Pro-like Plans enforce their finite limit; Elite-like Plans use an unlimited representation.
- Quota, slot overlap and Membership state are checked in the same Booking transaction.
- Admin and Coach roles do not bypass the Member Booking route.
- Entitlements are structured rows, not parsed from `Plans.features` text.

## Priority booking contract

`COACH_PRIORITY_BOOKING` remains a historical specification placeholder and is not a
consumed entitlement in the current Coach release. Migration `0012` and the runtime
allow only `COACH_BOOKING_ENABLED` and `COACH_BOOKING_MONTHLY_LIMIT`; the current
contract therefore does not reserve priority slots, reorder availability, bypass
quota, or introduce an Elite-only queue. Any future priority behavior requires a
separate additive migration and an explicit acceptance contract before implementation.

## Consequences

The no-refund rule avoids a second cancellation-history column and prevents repeated cancel/rebook cycles from bypassing a monthly reservation limit. Product copy must make this policy visible.
