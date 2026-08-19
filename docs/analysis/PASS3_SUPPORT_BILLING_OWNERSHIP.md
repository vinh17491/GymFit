# Pass 3 Support and Billing Ownership Decisions

This document records phases 160-169. It separates active support runtime
objects from the two payment domains without introducing a gateway or
rewriting marketplace checkout.

## Support contract

`0115_support_runtime_schema.sql` owns only `Tickets` and `TicketMessages`.
`TicketAttachments` remains a `DEAD_LEGACY` candidate because no active
backend or frontend caller was found.

The mounted route contract is:

- Members create tickets, list only their own tickets, read/reply only to
  their own tickets and cannot create internal messages;
- Coaches list/read/reply/update status only for tickets assigned to them;
- Admins have the existing permitted global list/read/reply/status scope;
- only Admin may set `is_internal`; Member message reads filter internal rows;
- status values remain `open`, `pending`, `resolved`, `closed`; priority values
  remain `low`, `medium`, `high`, `urgent`.

The migration adds indexes for member, assigned-coach, status and chronological
message lookups. It adds no tickets, messages, attachments or seed data.

## Billing ownership decision

`Payments` is `MEMBERSHIP_BILLING`:

- `plans.service.ts` creates and confirms simulated membership payments;
- `Invoices` is linked to `Payments` by the invoice controller;
- revenue and analytics aggregate membership `Payments` joined to `Plans`;
- the membership UI and invoice/revenue/admin analytics routes are the active
  consumers.

Marketplace order payment is `MARKETPLACE_ORDER_PAYMENT`:

- `Orders.payment_status` and `PaymentStatusHistory` govern order payment;
- `ShopOrders`, refunds, compensation vouchers and settlements depend on the
  marketplace order model;
- marketplace checkout must not acquire a foreign key or runtime dependency
  on legacy membership `Payments`.

These are separate domains even when both represent money. Phase 170 adds the
minimal forward-only owner for `Payments` and `Invoices` in migration `0116`;
it preserves the current simulated payment/confirmation contract and does not
implement a gateway.

`DATABASE_MANUAL_CHECK_REQUIRED`: support and billing migrations still require
connected SQL Server verification. No database was connected or mutated for
this decision.
