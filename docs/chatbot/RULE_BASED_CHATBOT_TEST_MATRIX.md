# Rule-Based Chatbot Test Matrix

## Automated deterministic coverage

`npm run test:chatbot` runs the pure TypeScript harness at `frontend/src/features/chatbot/chatbot.test.ts`.

- 163 distinct deterministic matrix cases and 304 assertions in the current run;
- NFC/case/spacing/punctuation/accent normalization, including Vietnamese IME-like text;
- price suffixes, ranges, ambiguous bare values, mode, date, category, sort, Shop slug, and route context;
- exact/keyword scoring, negative keywords, specificity, ambiguity, tie/fallback, safety, and role mismatch;
- Product/Shop/Coach/Plan bounded follow-ups and typed result sanitization;
- fake dynamic adapters, missing adapter, timeout, abort, stale request protection contract, and context bounds;
- role-specific initial/category suggestions and quick-reply equivalence;
- bounded static/polish delay and abortable timer;
- versioned storage, corrupt JSON reset, secret-like text redaction, public-only persisted context, and clear.

## Contract/security checks

- Adapter registry audit permits existing GET services only.
- No chatbot adapter accepts arbitrary `userId` or accesses a database.
- No chatbot route is added to the backend.
- Actions are route-allowlisted and role-filtered.
- Product filters are sent only after route/schema audit; unknown category values are omitted with an explicit notice.
- Shop lookup has no search fallback that fabricates a list.

## Browser cases for H44

For Guest, Member, Coach, Seller, and Admin at 375×812, 768×1024, and 1440×900:

1. Open/close launcher and panel; verify mobile nav is not covered.
2. Verify role-specific initial chips and category chips.
3. Send free text and click an equivalent quick reply; both render through the same engine.
4. Verify `Đang soạn...` for static and `Đang tìm thông tin...` for real GET lookup.
5. Verify Product success/not-found/error, Shop slug-only guidance, Coach result/availability clarification, and role-scoped data guards.
6. Verify typed cards/actions, clear, close, reload restore, 500-character limit, Enter/Shift+Enter, IME composition, and keyboard focus.
7. Start a request, issue a newer request or close/unmount, and verify no stale assistant message appears.
8. Check no console errors, horizontal overflow, unsafe URL, credential prompt, unauthorized action, or mutation request.
