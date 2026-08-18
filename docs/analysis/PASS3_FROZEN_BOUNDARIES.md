# GymFit Pass 3 Frozen Boundaries

Status: source review boundary for phases 133–204.

Pass 3 closes runtime schema ownership gaps. It does not rewrite these stable
areas. Any change below requires direct integration evidence and must preserve
the existing contract.

## Frozen application boundaries

- Auth registration, login, refresh-cookie rotation, logout, session revocation
  and access-token runtime memory;
- Coach structure, coach workspace, availability and member ownership;
- Marketplace checkout, Orders, ShopOrders and seller architecture;
- payment `FAILED` terminal behavior;
- inventory reservation, release and non-negative reserved quantity rules;
- Assistant identity, actor-specific read-only tools and rate limiting;
- Assistant circuit breaker and status truth;
- local chatbot engine, catalog, parser, normalizer, adapters, storage and
  delay semantics;
- chatbot green/red indicator and current orchestrator boundary.

## Frozen database boundaries

- applied migrations `0001`–`0017` and `0100`–`0111` are immutable;
- `db/bootstrap/foundation.sql` stays minimal and contains no demo data;
- `db/schema.sql` remains legacy/destructive/non-canonical;
- no automatic bootstrap, migration, adoption or startup database mutation;
- Marketplace order payment remains separate from membership billing unless
  current source proves an existing shared contract.

## Permitted Pass 3 changes

- additive migrations after `0111`, one clear ownership purpose per migration;
- narrow service/query changes required to repoint an active duplicate model;
- canonical schema for runtime objects that are actively mounted and otherwise
  orphaned;
- safe readiness/error/documentation updates;
- controlled Assistant recovery re-probe without background provider hammering.

## Prohibited shortcuts

Do not copy the full legacy schema into foundation, recreate duplicate models
merely to suppress SQL errors, invent unclear referral/coupon/loyalty rules,
replace the migration chain, add automated business tests, or introduce new
infrastructure architecture.

Unclear rules are labeled `BUSINESS_RULE_REQUIRES_CONFIRMATION`; uncertain
ownership is labeled `UNCLEAR_OWNER` until evidence is sufficient.
