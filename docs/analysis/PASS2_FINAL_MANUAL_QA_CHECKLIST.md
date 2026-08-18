# GymFit Pass 2 Final Manual QA Checklist

Status: source complete; every item below remains
`MANUAL_CHECK_REQUIRED`. Database items additionally remain
`DATABASE_MANUAL_CHECK_REQUIRED`.

## Database

- [ ] Create/identify the intended empty SQL Server database.
- [ ] Verify `DB_*` configuration and runtime database identity.
- [ ] Run guarded `npm run db:bootstrap` against the disposable empty database.
- [ ] Review `npm run db:migrate:status`.
- [ ] Run migrations `0001` through `0017` and `0100` through `0111`.
- [ ] Confirm no `0100` collision and no legacy `db/schema.sql` execution.

## Auth

- [ ] Login, reload, refresh and logout.
- [ ] Confirm refresh rotation/replay and inactive-user boundaries.
- [ ] Confirm role change clears private chatbot state while mode changes do not.

## Payment and inventory

- [ ] `UNPAID -> PENDING` succeeds for a valid order.
- [ ] `PENDING -> PAID` succeeds only for a live order with a held reservation.
- [ ] `PENDING -> FAILED` atomically releases reservation and cancels the order.
- [ ] `FAILED` cannot reset to `UNPAID` or start a retry on the same order.
- [ ] Cancelled orders cannot receive payment confirmation or become `PAID`.
- [ ] Failed/cancel flows release inventory once and never create negative
      reserved quantity.

## Assistant and chatbot

- [ ] Guest and authenticated rate limits use their intended keys and return a
      safe `429` response.
- [ ] Status reads do not call the provider and expose no key, URL or raw error.
- [ ] Closed widget dot is red in Local Mode and green after a successful AI
      response; the accessible label/title also changes.
- [ ] Invalid key, disabled AI, timeout and provider-unavailable cases fall back
      to Local Mode without making the user wait through repeated technical
      timeouts.
- [ ] After an AI failure, messages within the cooldown use Local directly;
      only the next message after cooldown attempts recovery.
- [ ] AI/Local mode switching preserves messages, context and open state.
- [ ] Cancelling or replacing a request does not append a stale response.
- [ ] Guest receives only public tools; Member, Coach, Seller and Admin receive
      the intended actor-specific definitions.
- [ ] Admin cannot invoke `getMyAppointments` or receive system-wide
      appointments through the Assistant.
- [ ] Tool outputs omit email, phone, password, token, session, secret, private
      notes, internal metadata and unnecessary full profiles.
- [ ] No frontend bundle or request contains `AI_API_KEY`.

## QA disposition

No item in this checklist was executed during the stabilization pass. The
repository is ready for a controlled manual QA run, but this checklist does not
assert production safety or complete verification.
