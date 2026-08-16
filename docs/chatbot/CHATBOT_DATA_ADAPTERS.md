# Rule Chatbot Adapter Catalog

## Contract audit used by H18/H24/H25/H26

| Domain | Existing route/service | Confirmed capability | Chatbot behavior |
| --- | --- | --- | --- |
| Product | `GET /api/products` via `products.routes.ts` and `products.validation.ts` | Public list; `q`/`search`, `category`/`categoryId`, price range, `sort`, pagination, and related public filters are schema-validated | Sends only confirmed fields, page 1, at most 5 results; resolves a natural-language category against `GET /api/products/filters` before sending the category slug |
| Product detail | Existing public Product detail route/service | Public detail by slug or numeric identifier | Result cards navigate only to an encoded `/products/:slug` or `/products/:id` route; no price/stock/image is invented |
| Shop | `GET /api/shops/:shopSlug` via `shopsApi.public` | Public detail by slug, with product query support; reviews are separate | Looks up only a known slug/link/result route; no Shop search/list assumption and no new endpoint |
| Coach | Existing public Coach list/detail service | Public list/search and detail | Bounded list/detail lookup; mode filters only on returned fields |
| Coach availability | Existing public `GET /api/coaches/:id/availability` | Authoritative date-specific availability | Requires a clear date; uses a known Coach or a maximum five public candidates; reports only returned non-booked/non-past slots |
| Plans | Existing public plan service | Active public plan list | Shows API price/duration/features only when returned |
| Membership | Existing self-scoped `getMyMembership` | Current member’s own membership/pending-payment state | Called only for roles and services that already authorize the current session; never accepts arbitrary `userId` |
| Appointments | Existing self-scoped bookings service | Current member’s own bookings | GET only, bounded page; no booking/cancel/reschedule action |
| Workout/progress | Existing self-scoped member workout services | Current assignment/progress summary | GET only; no start, set log, complete, or abandon mutation |
| Notifications | Existing authenticated notification list | Current account notifications | GET only, bounded page |
| Orders | Existing customer order list | Current account orders | GET only, bounded page; no checkout/cancel/refund |

## Product contract safeguards

The adapter does not assume that a field is supported merely because a natural-language parser can identify it. Every query field is either present in the audited schema or omitted. Category terms are resolved against the live public filters response; if no matching slug is returned, the request omits the category and tells the user that category filtering was not applied. Ambiguous bare values such as `500` are clarified instead of being interpreted as `500 VND` or `500k`.

The adapter does not manufacture sale price, inventory, discount, availability, or media. It uses only typed fields returned by the public response and limits result cards to five.

## Shop contract safeguards

There is no public Shop search/list endpoint in the audited route catalog. “Tìm shop” therefore returns static guidance. A Shop lookup without a slug/link/previous bounded Shop route returns an unavailable guidance response. No Marketplace/Seller backend code is added for the chatbot.

## Mutation guard

`frontend/src/features/chatbot/chatbotDataAdapters.ts` contains only GET calls or existing GET-only service functions. The chatbot registry has no POST, PUT, PATCH, DELETE, direct database access, arbitrary user identifier, or backend chatbot route.
