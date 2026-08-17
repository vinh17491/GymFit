# Coach Booking Policy Extraction

Status: PHASE 50 CHECKPOINT / POLICY EXTRACTION

`backend/src/modules/bookings/bookings.policy.ts` now centralizes the
existing booking policy decisions without changing them:

- Coach-booking entitlement/quota rejection;
- Member status-change restriction to cancellation;
- allowed status-transition validation;
- Coach/Member/Admin ownership predicate for status mutation;
- status-notification recipient and action URL.

The service still owns orchestration and invokes the policy boundary inside the
existing transaction. The 60-minute duration, timezone, future-window and
status-time checks remain unchanged in the service and are
`DEFERRED_TO_PHASE_51` for the dedicated time-policy checkpoint.

No new cancellation, quota, confirmation, completion or no-show rule was
introduced. Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for booking behavior.
