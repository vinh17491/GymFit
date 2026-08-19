# GymFit Pass 3 Chatbot Recovery and Privacy Contract

Phases 195-201 keep the existing local chatbot engine and add only the
smallest recovery and identity boundary around the Assistant provider.

## Recovery contract

- The widget performs one initial read-only Assistant status request per
  authenticated identity/guest session.
- If that request fails, the client enters `LOCAL_FALLBACK` with configuration
  unknown. A later user message may perform one bounded status probe with a
  three-second timeout.
- A failed probe sets a thirty-second retry time. There is no timer, polling
  loop or background request loop.
- A successful probe updates mode, circuit and retry state from the backend.
  AI chat still requires the existing healthy/closed-circuit status and uses
  the existing seven-second interactive timeout and cooldown behavior.
- Aborted probes and stale chat requests do not publish results into the
  current widget state.

## History and identity contract

- Guest history keeps the existing `gymfit:chatbot:v1` session key for
  compatibility.
- Authenticated history uses a separate session key containing the scoped
  identity (`user:<id>`). A stored state with a mismatched identity is rejected
  and removed from that scoped key.
- History is not loaded until auth initialization finishes. Login, logout and
  same-role user changes switch to the corresponding key and abort in-flight
  work before restoring messages.
- Clearing the conversation removes only the current identity's history; a
  user switch does not erase another identity's stored history.
- Existing redaction remains active: private-intent messages are not restored
  from session storage, and public results/context are minimized.

`MANUAL_CHECK_REQUIRED`: browser verification is still required for initial
status failure/recovery, stale-request cancellation, login/logout switching,
same-role account switching and session-storage inspection. No chatbot test or
database operation was run for this contract.
