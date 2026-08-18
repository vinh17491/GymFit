# GymFit Pass 2 Chatbot Fallback and Recovery Contract

Status: source-level contract; browser/provider verification remains
`MANUAL_CHECK_REQUIRED`.

## Backend status semantics

The backend keeps the existing three-failure threshold, 30-second circuit
cooldown and one half-open probe. `AI_ONLINE` requires all of the following:

- circuit state `CLOSED`;
- `failureCount === 0`;
- a finite `lastKnownSuccessAt` timestamp newer than
  `lastKnownFailureAt` (or no failure timestamp).

Otherwise the status mode is `LOCAL_FALLBACK`. A successful circuit operation
resets the failure count and records a new success timestamp. A failed operation
records failure and returns to Local Mode at the service boundary.

## Status endpoint

`GET /api/assistant/status` reads only the provider-independent configuration
and circuit snapshot. It does not call the provider and does not expose
`AI_API_KEY`, base URL, raw provider errors or stack details.

## Frontend state model

The widget keeps one assistant state object with:

- `assistantMode`;
- `configured` knowledge (`true`, `false` or not yet known);
- the last safe circuit snapshot;
- `lastStatusCheck`;
- `nextAiAttemptAt`.

The widget fetches status without a background polling loop. If AI is disabled,
configuration is unknown, the circuit is open, or `nextAiAttemptAt` has not
arrived, it calls `LocalProvider` directly.

## Timing and recovery

The backend technical provider timeout remains independent from the frontend
interactive tolerance. The browser aborts an individual AI attempt after 7
seconds, while the local request keeps its own signal and can answer without
waiting for the provider. A failure or Local Mode response sets a 30-second
minimum client retry window, or the configured circuit cooldown when longer.

After that window, the next user message may make one AI attempt. There is no
background retry or provider hammering. Success switches the indicator to
`AI_ONLINE`; failure keeps `LOCAL_FALLBACK` and starts the window again.

## Manual verification required

These cases were not run in this task:

- LocalProvider responds without waiting for the backend technical timeout;
- disabled/open/cooldown paths do not call AI;
- one post-cooldown message is the controlled recovery attempt;
- success and failure update the visible mode correctly;
- cancellation of a user request does not append a stale assistant message;
- status reads do not call the provider.
