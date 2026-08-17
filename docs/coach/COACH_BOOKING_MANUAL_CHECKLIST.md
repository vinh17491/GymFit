# Coach Booking Manual Checkpoint

Status: PHASE 53 CHECKPOINT

This checklist is prepared for a user-operated browser/API verification. No
browser or live database verification was performed by Codex in this phase.
Every item therefore remains `MANUAL_CHECK_REQUIRED`.

## Preconditions

- [ ] Use a disposable/development environment whose database identity is
      explicitly known — `MANUAL_CHECK_REQUIRED`.
- [ ] Confirm test accounts for active Member, active Coach and Admin roles —
      `MANUAL_CHECK_REQUIRED`.
- [ ] Confirm an active membership with Coach booking entitlement and a known
      monthly limit — `MANUAL_CHECK_REQUIRED`.
- [ ] Confirm the Coach has active availability rules and booking enabled —
      `MANUAL_CHECK_REQUIRED`.

## Public discovery and availability

- [ ] `GET /api/bookings/coaches` returns only the intended public Coach
      discovery data — `MANUAL_CHECK_REQUIRED`.
- [ ] Availability uses `Asia/Ho_Chi_Minh`, the configured date window and
      60-minute slots — `MANUAL_CHECK_REQUIRED`.
- [ ] BLOCK/OPEN exceptions and current pending/confirmed intervals are
      reflected in the availability snapshot — `MANUAL_CHECK_REQUIRED`.
- [ ] A slot unavailable to the server cannot be created by changing the
      frontend request mode/location — `MANUAL_CHECK_REQUIRED`.

## Member create and quota

- [ ] Member can create a valid future booking and receives a `pending` booking
      with server-derived mode/location — `MANUAL_CHECK_REQUIRED`.
- [ ] Request-body identity cannot create a booking for another Member —
      `MANUAL_CHECK_REQUIRED`.
- [ ] Invalid date, invalid start time, past time, outside-window date and
      non-60-minute end time are rejected safely — `MANUAL_CHECK_REQUIRED`.
- [ ] Missing/ineligible Coach entitlement is rejected with the safe expected
      response — `MANUAL_CHECK_REQUIRED`.
- [ ] Monthly quota exhaustion is rejected and does not insert a booking —
      `MANUAL_CHECK_REQUIRED`.
- [ ] Concurrent attempts for the same Coach or Member interval do not create
      overlapping active bookings — `MANUAL_CHECK_REQUIRED`.

## Reads and ownership

- [ ] Member list/summary/detail show only the authenticated Member's
      bookings — `MANUAL_CHECK_REQUIRED`.
- [ ] Coach list/summary/detail show only the authenticated Coach's bookings —
      `MANUAL_CHECK_REQUIRED`.
- [ ] Admin read scope behaves as intended — `MANUAL_CHECK_REQUIRED`.
- [ ] A Member/Coach cannot read another user's booking by changing `:id` —
      `MANUAL_CHECK_REQUIRED`.
- [ ] Pagination, status filters and date filters preserve the expected
      response shape — `MANUAL_CHECK_REQUIRED`.

## Status transitions and notifications

- [ ] Pending booking can be confirmed only by the allowed Coach/Admin path and
      only before the appointment start — `MANUAL_CHECK_REQUIRED`.
- [ ] Member can perform only the existing cancellation action —
      `MANUAL_CHECK_REQUIRED`.
- [ ] Confirmed booking can be completed only after start and marked no-show
      only after end — `MANUAL_CHECK_REQUIRED`.
- [ ] Terminal states cannot transition again — `MANUAL_CHECK_REQUIRED`.
- [ ] Ownership and role failures return safe 403/404/409 responses without
      leaking SQL or stack details — `MANUAL_CHECK_REQUIRED`.
- [ ] Create/status notifications reach the intended participant once under
      the current deduplication behavior — `MANUAL_CHECK_REQUIRED`.

## Business confirmation still required

- [ ] Product owner confirms quota treatment for cancelled bookings —
      `BUSINESS_RULE_REQUIRES_CONFIRMATION`.
- [ ] Product owner confirms quota treatment for no-show bookings —
      `BUSINESS_RULE_REQUIRES_CONFIRMATION`.
- [ ] Product owner confirms late-cancellation/refund/compensation semantics —
      `BUSINESS_RULE_REQUIRES_CONFIRMATION`.
- [ ] Product owner confirms whether historical NULL availability snapshots are
      ever reconstructed — `BUSINESS_RULE_REQUIRES_CONFIRMATION`.

## Result policy

Until a human performs and records each check, do not replace
`MANUAL_CHECK_REQUIRED` with PASS and do not claim `PRODUCTION_SAFE`,
`PRODUCTION_READY`, `FULLY_SECURE` or `FULLY_VERIFIED`.
