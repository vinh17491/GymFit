# GymFit Pass 2 Chatbot Orchestration and Actor Tool Contract

Status: source-level contract through phases 119–126; browser, provider and
database verification remain `MANUAL_CHECK_REQUIRED`.

## Frontend orchestration

`frontend/src/features/chatbot/chatbotOrchestrator.ts` owns the Assistant
attempt, the separate seven-second interactive abort budget, LocalProvider
fallback, client retry window, controlled recovery attempt and mode transition.
`ChatbotWidget.tsx` remains responsible for presentation, input, message
history, context persistence, navigation and privacy-boundary role changes.

The local rule engine, catalog, parser, normalizer, adapters, storage and delay
semantics remain in their existing modules. A mode transition does not clear
messages, reset context or close the widget. A role/identity transition retains
the existing privacy reset behavior.

`getAssistantModeStatus()` is a separate status read. It uses the provider
status endpoint only; it does not start an AI completion or a background retry
loop.

## Closed-widget indicator

The closed chat button keeps its existing size and position and adds one small
ringed dot. Green means `AI_ONLINE`; red means `LOCAL_FALLBACK` or status is not
yet known. The button's accessible label and title carry the same mode meaning,
so color is not the only signal.

## Actor-specific Assistant tools

The backend constructs provider tool definitions from the verified actor:

- guest: `searchProducts`, `getCoachAvailability`;
- member: public tools plus `getMyAppointments`, `getMyOrders` and
  `getWorkoutContext`;
- coach: public tools plus `getMyAppointments` and `getMyOrders`;
- seller and admin: public tools only.

The executor applies the same allowlist before parsing or running a private
tool. Model-supplied tool names are therefore not an authority. Private tool
implementations retain their role and ownership checks and return bounded,
sanitized results.

## Manual verification required

- closed indicator is red in Local Mode and green after a successful AI reply;
- mode switching preserves messages and context;
- role changes reset private conversation state;
- each actor receives only its intended definitions;
- an unavailable tool call is rejected by the executor;
- no provider or secret is exposed by the status path.
