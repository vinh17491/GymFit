# Deterministic Intent Catalog

The source of truth is `frontend/src/features/chatbot/chatbotCatalog.ts`. The catalog is data-driven: matching is performed by the shared scoring engine rather than a single giant conditional.

## Groups

| Group | Intent IDs |
| --- | --- |
| General/auth | `greeting`, `help`, `services_overview`, `thanks`, `goodbye`, `login`, `register`, `profile`, `settings`, `password`, `fallback`, `clarification` |
| Membership | `plans`, `membership_status`, `membership_pending_payment`, `membership_upgrade`, `membership_downgrade`, `membership_cancel`, `membership_entitlement`, `membership_quota` |
| Coach | `coach_find`, `coach_profile`, `coach_availability`, `coach_booking`, `coach_booking_status`, `coach_booking_conflict`, `coach_booking_quota`, `coach_booking_mode`, `coach_workspace`, `member_appointments` |
| Workout | `workout_program`, `workout_assignment`, `workout_schedule`, `workout_session`, `workout_progress`, `workout_notifications` |
| Marketplace | `product_search`, `product_filter`, `product_detail`, `shop_detail`, `shop_search_unsupported`, `cart`, `checkout`, `order_status`, `order_tracking`, `order_cancel`, `order_complaint`, `order_refund`, `order_replacement`, `review`, `complaint` |
| Seller | `seller_apply`, `seller_status`, `seller_shop`, `seller_products`, `seller_orders`, `seller_revenue`, `seller_complaints` |
| Admin | `admin_dashboard`, `admin_coach`, `admin_exercises`, `admin_moderation`, `admin_seller_applications`, `admin_orders`, `admin_refunds`, `admin_settlements` |
| Safety | `safety_secret`, `safety_idor`, `safety_medical`, `mutation_block`, `unsupported` |

## Selection rules

1. Normalize the original text and parse typed entities.
2. Drop role-ineligible intents before returning an action or adapter.
3. Apply exact phrase, phrase, keyword any/all, negative keyword, route, typed filter, and short-context scores.
4. Prefer clarification for close equal-priority matches and for ambiguous bare prices.
5. Prefer safety intents for secrets, IDOR bypass, medical diagnosis, and mutation requests.
6. Return a useful fallback with four to seven role-aware suggestions when no catalog intent reaches its minimum score.

Static responses state the no-mutation boundary. Dynamic responses state whether data is live, not found, or unavailable. None claims a backend operation happened unless the corresponding read-only API returned it.
