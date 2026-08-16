# Rule-Based Chatbot Handover

## Implementation locations

- `frontend/src/features/chatbot/chatbotTypes.ts` — typed public interface.
- `frontend/src/features/chatbot/chatbotNormalizer.ts` and `chatbotEntityParser.ts` — normalization and entity parsing.
- `frontend/src/features/chatbot/chatbotCatalog.ts` — curated intents, role rules, guidance, suggestions, and allowlisted actions.
- `frontend/src/features/chatbot/chatbotEngine.ts` — deterministic scoring, role filtering, fallback, adapters, timeout, and bounded context.
- `frontend/src/features/chatbot/chatbotDataAdapters.ts` — existing read-only Product, Shop detail, Coach, availability, Plan, membership, booking, workout, notification, and order lookups.
- `frontend/src/features/chatbot/chatbotDelay.ts` — bounded response timing and cancellation.
- `frontend/src/features/chatbot/chatbotStorage.ts` — versioned session-only public context and safe message persistence.
- `frontend/src/features/chatbot/ChatbotWidget.tsx` — responsive dual-mode UI, indicators, action cards, and race handling.
- `frontend/src/App.tsx` — single shell mount.

## Operating rules

Do not add a chatbot backend endpoint, AI provider, vector store, Marketplace/Seller backend route, role expansion, or migration rewrite. When a new domain is added, first audit its existing route/service/schema, then add a typed read-only adapter only if the data is authoritative and self-scoped.

Do not use free-text IDs as authorization inputs. Do not turn a missing endpoint into an invented query parameter or a fabricated result. Keep follow-up context bounded and public unless there is a specific approved privacy design.

## Verification command set

```text
npm run check:encoding
npm run test:chatbot
cd frontend && npx tsc --noEmit && npm run build
cd ../backend && npm run build && npm run lint
git diff --check
```

The final project verdict is allowed only when the H00–H46 progress log records PASS for hardening, contracts, no-mutation/AI guards, deterministic tests, dynamic adapters, all five roles, all three browser sizes, encoding, and the final scope diff.
