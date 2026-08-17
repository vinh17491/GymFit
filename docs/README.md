# GymFit Documentation Index

AI MUST READ:

1. [`README.md`](../README.md)
2. [`PROJECT_STATUS.md`](../PROJECT_STATUS.md)
3. [`ROADMAP.md`](../ROADMAP.md)
4. `docs/README.md` (this file)
5. The canonical handover for the module being changed

AI MUST NOT USE AS CURRENT SOURCE OF TRUTH:

- `docs/archive/**`
- `logs/**`
- Codex prompts and temporary packages
- `skill/**` and `skills/**`

## Active documentation

- Project overview: [`README.md`](../README.md)
- Current status: [`PROJECT_STATUS.md`](../PROJECT_STATUS.md)
- Roadmap: [`ROADMAP.md`](../ROADMAP.md)
- Architecture: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- API and authorization: [`API_AND_AUTHORIZATION.md`](API_AND_AUTHORIZATION.md)
- Auth behavior preservation: [`AUTH_BEHAVIOR_PRESERVATION.md`](AUTH_BEHAVIOR_PRESERVATION.md)
- Frontend Auth token plan: [`FRONTEND_AUTH_TOKEN_PLAN.md`](FRONTEND_AUTH_TOKEN_PLAN.md)
- Auth manual checklist: [`AUTH_MANUAL_CHECKLIST.md`](AUTH_MANUAL_CHECKLIST.md)
- Sanitization boundary: [`SANITIZATION_BOUNDARY.md`](SANITIZATION_BOUNDARY.md)
- Rate-limit architecture: [`RATE_LIMIT_ARCHITECTURE.md`](RATE_LIMIT_ARCHITECTURE.md)
- Trust proxy configuration: [`TRUST_PROXY.md`](TRUST_PROXY.md)
- Database transport security: [`DB_TRANSPORT_SECURITY.md`](DB_TRANSPORT_SECURITY.md)
- Logging hardening: [`LOGGING_HARDENING.md`](LOGGING_HARDENING.md)
- Health and lifecycle: [`HEALTH_LIFECYCLE.md`](HEALTH_LIFECYCLE.md)
- Fatal error policy: [`FATAL_ERROR_POLICY.md`](FATAL_ERROR_POLICY.md)
- Background runner inventory: [`BACKGROUND_RUNNERS.md`](BACKGROUND_RUNNERS.md)
- `app.ts` responsibility review: [`APP_RESPONSIBILITY_REVIEW.md`](APP_RESPONSIBILITY_REVIEW.md)
- Global error boundary: [`ERROR_BOUNDARY.md`](ERROR_BOUNDARY.md)
- Database and migrations: [`DATABASE_AND_MIGRATIONS.md`](DATABASE_AND_MIGRATIONS.md)
- Known limitations: [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md)
- Setup and environment: [`SETUP_AND_ENVIRONMENT.md`](SETUP_AND_ENVIRONMENT.md)
- Developer workflow: [`DEVELOPER_WORKFLOW.md`](DEVELOPER_WORKFLOW.md)
- Contributing: [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- Coach module: [`COACH_MODULE_HANDOVER.md`](coach/COACH_MODULE_HANDOVER.md)
- Coach booking read-only review: [`COACH_BOOKING_READ_ONLY_REVIEW.md`](coach/COACH_BOOKING_READ_ONLY_REVIEW.md)
- Coach booking controller boundary: [`COACH_BOOKING_CONTROLLER_BOUNDARY.md`](coach/COACH_BOOKING_CONTROLLER_BOUNDARY.md)
- Coach booking service extraction: [`COACH_BOOKING_SERVICE_EXTRACTION.md`](coach/COACH_BOOKING_SERVICE_EXTRACTION.md)
- Coach booking repository extraction: [`COACH_BOOKING_REPOSITORY_EXTRACTION.md`](coach/COACH_BOOKING_REPOSITORY_EXTRACTION.md)
- Coach booking policy extraction: [`COACH_BOOKING_POLICY_EXTRACTION.md`](coach/COACH_BOOKING_POLICY_EXTRACTION.md)
- Coach booking time policy: [`COACH_BOOKING_TIME_POLICY.md`](coach/COACH_BOOKING_TIME_POLICY.md)
- Coach booking business ambiguity log: [`COACH_BOOKING_BUSINESS_AMBIGUITIES.md`](coach/COACH_BOOKING_BUSINESS_AMBIGUITIES.md)
- Coach booking manual checkpoint: [`COACH_BOOKING_MANUAL_CHECKLIST.md`](coach/COACH_BOOKING_MANUAL_CHECKLIST.md)
- Order service read-only review: [`ORDER_SERVICE_READ_ONLY_REVIEW.md`](marketplace/ORDER_SERVICE_READ_ONLY_REVIEW.md)
- Checkout service extraction: [`CHECKOUT_SERVICE_EXTRACTION.md`](marketplace/CHECKOUT_SERVICE_EXTRACTION.md)
- Payment service extraction: [`PAYMENT_SERVICE_EXTRACTION.md`](marketplace/PAYMENT_SERVICE_EXTRACTION.md)
- Cancellation service extraction: [`CANCELLATION_SERVICE_EXTRACTION.md`](marketplace/CANCELLATION_SERVICE_EXTRACTION.md)
- Order query service: [`ORDER_QUERY_SERVICE.md`](marketplace/ORDER_QUERY_SERVICE.md)
- Inventory reservation boundary: [`INVENTORY_RESERVATION_BOUNDARY.md`](marketplace/INVENTORY_RESERVATION_BOUNDARY.md)
- Commission flow review: [`COMMISSION_FLOW_REVIEW.md`](marketplace/COMMISSION_FLOW_REVIEW.md)
- Settlement flow review: [`SETTLEMENT_FLOW_REVIEW.md`](marketplace/SETTLEMENT_FLOW_REVIEW.md)
- Payment/refund/settlement idempotency: [`IDEMPOTENCY_HARDENING.md`](marketplace/IDEMPOTENCY_HARDENING.md)
- Complaint/refund/replacement interaction: [`COMPLAINT_REFUND_INTERACTION.md`](marketplace/COMPLAINT_REFUND_INTERACTION.md)
- Marketplace manual checkpoint: [`MARKETPLACE_MANUAL_CHECKLIST.md`](marketplace/MARKETPLACE_MANUAL_CHECKLIST.md)
- Frontend route inventory: [`FRONTEND_ROUTE_INVENTORY.md`](FRONTEND_ROUTE_INVENTORY.md)
- Frontend code splitting: [`FRONTEND_CODE_SPLITTING.md`](FRONTEND_CODE_SPLITTING.md)
- Frontend route groups: [`FRONTEND_ROUTE_GROUPS.md`](FRONTEND_ROUTE_GROUPS.md)
- Frontend auth guards: [`FRONTEND_AUTH_GUARDS.md`](FRONTEND_AUTH_GUARDS.md)
- Frontend API error normalization: [`FRONTEND_API_ERROR_NORMALIZATION.md`](FRONTEND_API_ERROR_NORMALIZATION.md)
- Frontend quality commands: [`FRONTEND_QUALITY_COMMANDS.md`](FRONTEND_QUALITY_COMMANDS.md)
- Chatbot current engine freeze: [`CHATBOT_CURRENT_ENGINE_FREEZE.md`](CHATBOT_CURRENT_ENGINE_FREEZE.md)
- Coach reassignment decision: [`ADR_COACH_REASSIGNMENT_ASSIGNMENT_LIFECYCLE.md`](coach/ADR_COACH_REASSIGNMENT_ASSIGNMENT_LIFECYCLE.md)

- Assistant API / Chatbot V2: [ASSISTANT_API_CHATBOT_V2.md](ASSISTANT_API_CHATBOT_V2.md)

## Marketplace reference

Marketplace documentation is protected and is not edited, renamed, merged or archived by Coach documentation work. Use the existing [`MARKETPLACE_MVP_FINAL_HANDOVER.md`](marketplace/MARKETPLACE_MVP_FINAL_HANDOVER.md) and its existing supporting files as the Marketplace source set.

## Archive and history

`docs/archive/**` and `logs/**` preserve historical evidence only. They must not be linked as current implementation truth except through this Archive/History reference. Current milestones remain in [`logs/PROJECT_HISTORY.md`](../logs/PROJECT_HISTORY.md).

## Documentation governance

- Source code, migrations and verified database state override documentation conflicts.
- Keep one canonical handover per active module and one index here.
- Put historical evidence under `docs/archive/**` with a `HISTORICAL` header and `DO NOT USE AS CURRENT SOURCE OF TRUTH` marker.
- Keep logs concise and human-readable; never store secrets, passwords, raw tokens or raw acceptance payloads.
- Do not commit temporary prompts, generated packages, inventories or cleanup reports as active project documentation.
- When contracts or migration state change, update this index, the module handover and the root status documents together.
