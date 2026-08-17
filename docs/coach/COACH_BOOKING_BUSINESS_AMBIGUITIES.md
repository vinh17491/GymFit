# Coach Booking Business Ambiguity Log

Status: PHASE 52 CHECKPOINT / BUSINESS RULES NOT INVENTED

The following items require product/business confirmation. This checkpoint
does not change code or database behavior. Until a decision is supplied, the
current implementation remains the source behavior.

## BUSINESS_RULE_REQUIRES_CONFIRMATION

1. **Quota consumption by status**

   The current monthly quota query counts every `Bookings` row for the member
   in the month, without filtering by status. Therefore `pending`,
   `confirmed`, `completed`, `cancelled` and `no_show` rows all contribute to
   `used`.

   Current behavior: preserved. No status filter was invented.

2. **Cancellation and quota restoration**

   The current cancellation flow does not restore or reinstate monthly quota.
   This applies to Member cancellation and the existing Coach/Admin status
   update path.

   Current behavior: preserved. No refund/reinstatement rule was invented.

3. **No-show quota treatment**

   The current `no_show` transition does not have a separate quota policy.
   Because quota counts all rows, a no-show currently consumes quota.

   Current behavior: preserved. No exception was invented.

4. **Cancellation timing/refund semantics**

   The state machine permits `pending -> cancelled` and
   `confirmed -> cancelled`. The repository has no confirmed business rule
   for late cancellation, quota refund, payment refund or Coach compensation
   associated with either transition.

   Current behavior: preserved. No cancellation window or financial rule was
   invented.

5. **No-show/completion actor policy**

   Members may only request `cancelled`; Coach/Admin may request the other
   allowed transitions through the existing authorization route. Whether a
   Member should ever be allowed to report no-show or completion is not
   specified here.

   Current behavior: preserved. Backend role policy remains authoritative.

6. **Historical availability snapshot fields**

   Older bookings may have nullable `session_mode`/`location` fields. The
   current read path returns the stored snapshot and does not reconstruct it
   from current Coach availability.

   Current behavior: preserved. No historical reconstruction rule was
   invented.

7. **Availability changes after booking**

   Create uses an authoritative slot snapshot at booking time. The current
   status flow does not recalculate a booked slot when a Coach later edits
   availability. Whether a later availability change should affect an existing
   booking is unspecified.

   Current behavior: preserved. No rebooking/cancellation rule was invented.

## Execution rule

Any future change to one of these items must be tied to an explicit business
decision and a later phase scope. Until then, record the issue as
`BUSINESS_RULE_REQUIRES_CONFIRMATION` and preserve the current behavior.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for the related flows.
