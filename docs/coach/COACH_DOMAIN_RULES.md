# Coach Domain Rules

Status: CANONICAL FOR `coach1`

These rules apply only to the Coach completion work. They do not change Marketplace, Seller, Auth, Video or the migrations `0100`–`0111`.

## Ownership and roles

- The authenticated JWT/session is the source of the acting user. Request-body `userId`, `coachId`, `memberId` and ownership fields are never authoritative.
- A Coach may read or mutate only Coach-owned Programs, Assignments, Schedules, Sessions, Availability and the active Coach–Member scope.
- A Member may mutate only their own Booking and Member Workout state. The Member route never creates a Booking on behalf of another Member.
- Admin actions use Admin routes and do not impersonate a Coach through Coach self-service routes.
- A Booking does not create or transfer Coach–Member ownership. Ownership is established by CRM assignment/reassignment and concrete workout Assignment lifecycle.

## Time and lifecycle

- Coach booking and quota boundaries use `Asia/Ho_Chi_Minh` and explicit ISO date/time values.
- A Coach Appointment/Booking is a service reservation. A Workout Schedule is a generated program execution date. They are different aggregates and must not be joined by ID or treated as the same lifecycle.
- Assignment transitions are explicit and conditional: `ACTIVE → PAUSED|COMPLETED|CANCELLED`, `PAUSED → ACTIVE|COMPLETED|CANCELLED`; terminal states have no outgoing transition.
- `PAUSED` blocks new Member Session starts. Reassignment is a new ownership lifecycle; old execution history remains attached to the old Assignment.

## Membership and quota

- Coach Booking requires an active Membership with the structured Coach entitlement. Frontend visibility is not authorization.
- The monthly quota window is the calendar month of the Booking date in `Asia/Ho_Chi_Minh`.
- Default quota policy: every successfully created Booking consumes one quota unit regardless of `pending`, `confirmed`, `completed`, `cancelled` or `no_show` status. A failed/rolled-back insert consumes nothing. Cancellation does not refund quota.
- A pending Payment is exposed as `PENDING_PAYMENT`; no Membership is active until explicit simulated confirmation succeeds. The server validates Plan identity and price from the database.

## Availability and Booking

- Availability Rules and Exceptions determine whether a slot is open. Booking rows determine whether an open slot is occupied.
- Availability reads are not reservations. Booking creation must re-check availability and overlap inside its transaction and return `409` on a race.
- An active Coach profile and `booking_enabled` flag are required for public booking. Suspended/inactive Coaches expose no bookable slots.

## Workout consistency

- A Session Snapshot is the execution contract. Changes to a source Exercise or Program must not mutate an existing Session Snapshot.
- An Exercise must be active when added to a Program. Once referenced by an existing Program/Snapshot, it is soft-deactivated rather than hard-deleted.
- A Session may complete only when it has at least one Session Exercise and at least one completed Set with a measurement. It is not necessary to complete every target.
- Published Program versions are immutable when assigned. Changes use Clone New Version; an existing Assignment keeps its referenced version.

## Private context and notifications

- Coach Goals/Limitations/Private Notes are Coach-owned context. Members cannot read private notes. The former Coach becomes read-only after reassignment; the new Coach gets a new context according to policy.
- Medical diagnosis, treatment or health-risk inference is outside scope.
- Notifications are basic in-app records only. They are recipient-scoped, deduplicated on retries and do not require email, WebSocket or realtime chat.

## API and failure semantics

- Use `400` for invalid input, `401` for unauthenticated access, `403` for insufficient role/entitlement, `404` for out-of-scope/not-found resources and `409` for state/concurrency conflicts.
- New production queries use explicit columns, parameter binding and server-side pagination. No new API may rely on `SELECT *`, client-side ownership filtering or unbounded list fetches.
- Mutating aggregate state uses a transaction and conditional/optimistic concurrency where concurrent requests can change the result.
