# GymFit Pass 3 Membership Billing Contract

Phases 170–173 close the active membership billing schema without changing the
marketplace payment state machine.

## Runtime ownership

| Object | Owner | Current runtime use | Boundary |
| --- | --- | --- | --- |
| `Payments` | `0116_membership_billing_runtime.sql` | simulated membership subscribe/upgrade/downgrade, confirmation, cancellation, revenue and paid-member analytics | membership payments only |
| `Invoices` | `0116_membership_billing_runtime.sql` | invoice list/read/create and email-sent marker | linked to membership `Payments`; no PDF or email provider is introduced |

The migration creates only the fields currently read or written by the active
source. It adds payment/status and invoice/payment indexes, keeps one invoice
per non-null payment link, and adds no gateway, refund, order, seller, or
marketplace settlement behavior. Existing `coupon_id` or `points_used`
columns in a legacy object are not part of the new membership contract.

`backend/src/modules/plans/plans.service.ts` is the sole current membership
payment state transition owner: it creates simulated pending payments, confirms
them transactionally with membership activation, and marks pending payments
failed during cancellation. `backend/src/modules/invoices/invoice.controller.ts`
generates invoice numbers in application code and only marks `email_sent`; it
does not render a PDF or send an email through a runtime provider.

`sp_GenerateInvoice` is present only in the historical `db/schema.sql`
snapshot. It has no active caller, so `0116` deliberately does not recreate it
and there is no dual invoice authority.

Database installation/adoption remains fail-closed. A live database check is
still `DATABASE_MANUAL_CHECK_REQUIRED`; this document does not claim that
`0116` has been applied anywhere.
