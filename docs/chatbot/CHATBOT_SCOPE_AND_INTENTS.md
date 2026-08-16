# GYMFIT Rule-Based Chatbot Scope

## Boundary

The chatbot is a deterministic frontend feature. It does not use Gemini, OpenAI, an LLM, vector search, embeddings, a chat database, WebSocket, or a new chatbot backend endpoint. It can:

- answer curated static guidance;
- navigate to an allowlisted route;
- perform bounded read-only GET lookups through existing frontend services;
- explain when a route, filter, public Shop search, or authoritative data source is unavailable.

It never creates, updates, cancels, refunds, checks out, books a Coach, writes a workout log, or changes an account. Backend guards remain the authority for every protected route.

## Typed contract

`ChatbotReply` contains `intentId`, `score`, `confidence`, `replyType`, `message`, `suggestions`, `actions`, optional typed `results`, `sourceState`, and bounded `context`. Actions use the `ChatbotRoute` allowlist and are filtered by the current role before rendering.

Adapters receive `{ role, parse, context, signal }`. They do not receive a user ID from free text. The registry only contains existing read-only services and the public Product GET endpoint.

## Matching

The normalizer keeps the original message, NFC-normalizes it, lowercases it, collapses spacing/punctuation, and creates an accent-insensitive Vietnamese copy. Matching uses catalog priorities, exact phrases, keyword any/all, negative keywords, role filters, route/context boosts, typed entity filters, clarification for ambiguous prices, and a role-aware fallback.

Quick replies and typed free text call the same `resolveChatbotMessage` engine. There is no required mode toggle.

## Short context

Only the last one or two deterministic turns are retained. Context fields are `previousIntent`, `previousEntityType`, `previousSearchQuery`, bounded result IDs and bounded typed public results. Follow-ups such as “cái rẻ nhất”, “cái đầu tiên”, “coach đó”, “còn lịch ngày mai không”, and “gói đó có đặt Coach được không” can refer only to the bounded results already read. The chatbot does not claim a global minimum or infer missing entitlement/availability data.

Private membership, appointment, workout, notification, and order context is not persisted to `sessionStorage`. Corrupt state is discarded; secrets, tokens, and password-like text are redacted.

## UX timing

Static replies use one bounded random delay from 350–1100 ms and show `Đang soạn...`. Dynamic replies start the real GET request immediately and show `Đang tìm thông tin...`; only a small 150–500 ms polish delay may be applied when the request completed unusually quickly. Abort controllers, stale-response checks, timer cleanup, and unmount cleanup prevent late updates. No “AI đang suy nghĩ” wording is used.
