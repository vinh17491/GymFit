# Chatbot Current Engine Freeze

PHASE 71 freezes the existing frontend local chatbot as the fallback source
before the PHASE 72 Assistant implementation.

## Frozen runtime surface

- `chatbotTypes.ts` defines roles, intents, context, replies, entities,
  allowlisted routes and adapter contracts.
- `chatbotCatalog.ts` is the single intent catalog. It contains static,
  dynamic, safety, medical-scope and mutation-blocking intents.
- `chatbotEntityParser.ts` extracts price, date, mode, category, sort, Shop
  slug and bounded follow-up references.
- `chatbotNormalizer.ts` normalizes punctuation, case, accents and tokens.
- `chatbotSuggestions.ts` owns role-aware and contextual suggestions.
- `chatbotDataAdapters.ts` connects read-only lookups to existing GymFit
  services and the shared API client. Private lookups remain self-scoped by
  the existing authenticated service/API boundary.
- `chatbotEngine.ts` performs role-aware scoring, safety handling, bounded
  context, read-only adapter execution, timeout/abort handling and local
  fallback replies.
- `chatbotStorage.ts` persists bounded public context in session storage and
  excludes private intent context from restoration.
- `ChatbotWidget.tsx` owns the current local UI, message lifecycle, route
  navigation and abort handling.
- `chatbotDelay.ts` and the existing `chatbot.test.ts` artifact remain part of
  the current source set; the test artifact is not executed in this task.

## Freeze rules

- Do not delete, rewrite, duplicate or create a second catalog/rule engine.
- Do not add an Assistant module, Assistant router, provider or placeholder in
  this phase.
- Do not treat local intent matching as backend authorization. Backend JWT,
  session, RBAC, ownership and service boundaries remain authoritative.
- The local engine is the valid fallback mode and must remain independently
  usable when the future Assistant backend/provider is unavailable.

## PHASE 72 handoff

PHASE 72 may wrap this engine behind a `LocalProvider` or equivalent existing
convention, while preserving these files and their current contracts. The
future Assistant API must not give the model direct SQL access, private
identity control or write tools.

Manual UI verification remains `MANUAL_CHECK_REQUIRED`.
