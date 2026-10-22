# Engineering Guidelines — Production-Ready Car Rental Application

## 0. Current Project Decisions (2026-10-22)

- Monorepo (pnpm workspace): `apps/web` (Next.js 16 App Router, React 19, Tailwind 4, Radix), `apps/api` (Fastify, Clean Architecture modules), `packages/contracts` (shared Zod schemas / API types).
- Modular monolith — not microservices — until a concrete deployment or team requirement justifies extraction. Modules: identity, vehicles, bookings, payments, notifications. Async side effects go through an outbox table.
- PostgreSQL 17 + Drizzle ORM (SQL migrations). Booking overlap is prevented by a `btree_gist` exclusion constraint on `(vehicle_id, period)` for blocking statuses. Concurrency tests run against real Postgres (Docker), never PGlite.
- Rental interval is half-open `[pickupDate, returnDate)` in calendar days of the vehicle's timezone. Statuses: `PENDING_PAYMENT` (15-min hold), `CONFIRMED`, `CANCELLED`, `EXPIRED`. Blocking: `PENDING_PAYMENT`, `CONFIRMED`. Bookings are confirmed instantly on successful payment.
- Payments go through a provider port; a signed mock provider is used until a real provider is chosen.
- Redis only for distributed rate limiting in production; in-memory limiter for dev/test.
- Brand color `#FF7101` is kept as designed (known contrast gap for white-on-orange text — documented, not fixed).
- No AI features. Vehicle photos stay as `VehicleImage` placeholders.

## 1. Project Mission

Act as a senior full-stack engineer, software architect, and security engineer.

Develop the existing Car Rental application into a reliable, maintainable, secure, and production-ready product.

The application must follow the existing Figma design and use a modular frontend architecture, clean backend boundaries, reliable booking logic, and appropriate production engineering practices.

### Engineering priorities

1. Correctness and data integrity.
2. Security and authorization.
3. Figma design fidelity.
4. Readable, maintainable code.
5. Testability and reliability.
6. Performance and scalability.
7. Operational simplicity.

Do not introduce complexity merely to make the application appear advanced.

## 2. Existing Repository — Inspect First

Before changing anything:

1. Inspect the repository structure and existing Git status.
2. Read all relevant package manifests, configuration files, documentation, and environment examples.
3. Identify the frontend framework, backend framework, database, authentication system, API routes, and existing features.
4. Understand the current vehicle, user, booking, and payment models.
5. Identify existing components, hooks, utilities, tests, and reusable code.
6. Identify architectural problems and security or concurrency risks.
7. Prepare a prioritized implementation plan.

Do not assume the repository is empty or recreate functionality that already works.

Do not overwrite working code, delete files, or change the stack without understanding the consequences.

Initially, inspect and report. Do not perform a large migration before presenting the proposed changes and receiving approval.

## 3. Figma Is the Frontend Source of Truth

The application design already exists in Figma.

Figma file URL:

`https://www.figma.com/design/jECzlRVaxooXMqFDLPtL9W/Themeforest----AutoDeal----Car-Listing-Figma-Template`

(Pages: "Main" `0:1` — 27 desktop frames; "Component" `186:546` — 18 components. Local styles only, no variables.)

Before implementing the frontend:

1. Verify that Figma MCP is available.
2. Inspect the relevant Figma pages, frames, components, variables, and design tokens.
3. Identify all designed screens and their relationships.
4. Inspect component dimensions, spacing, typography, colors, borders, shadows, and responsive layouts.
5. Retrieve screenshots and design context for the screens being implemented.
6. Map Figma screens to application routes and reusable React components.
7. Identify missing interactions and ambiguous requirements.

Use Figma MCP to retrieve design information whenever possible.

Do not invent an alternative design or use generic layouts when the actual design is available.

### Design fidelity requirements

Match the reference design as closely as practical:

- Layout, alignment, and spacing.
- Typography, font weights, and line heights.
- Colors, backgrounds, borders, and shadows.
- Container dimensions and border radii.
- Navigation, sidebars, and responsive behavior.
- Buttons, inputs, cards, dialogs, and status indicators.
- Image containers and their dimensions.
- Hover, focus, active, disabled, loading, and error states.

Use actual Figma assets and design tokens when available.

If a value cannot be determined, make a consistent, documented assumption rather than inventing random values.

Do not claim pixel-perfect implementation without comparing the running application with the reference.

## 4. Vehicle Images — Add Later

The Figma file does not currently contain the actual vehicle photographs.

**Do not source, generate, download, or integrate real car images during the initial implementation.**

Instead:

- Preserve every image container's intended dimensions and aspect ratio.
- Use neutral placeholders or skeletons where vehicle photographs are expected.
- Create a reusable `VehicleImage` component.
- Make image sources configurable through vehicle data or API responses.
- Ensure the layout does not shift when actual photographs are added.
- Keep image handling separate from vehicle-card layout and business logic.

Do not delay the implementation of other features because the photographs are unavailable.

Future task: replace placeholders with appropriately licensed vehicle images and connect them to the vehicle inventory API.

## 5. Frontend Technology and Architecture

Inspect the existing frontend before selecting or changing technologies.

Use React and TypeScript when compatible with the current application. Preserve existing framework and styling conventions unless a migration is justified.

Separate the frontend into clear business domains:

- Authentication and user profile.
- Vehicle discovery and catalog.
- Vehicle details and availability.
- Booking and reservation history.
- Owner dashboard and vehicle management.
- Payments.
- Shared UI and application infrastructure.

### Microfrontend strategy

Design domain boundaries so they can support independently developed and deployed microfrontends when justified.

If the application already uses a microfrontend framework, follow its conventions.

If it does not, initially implement isolated domain modules within the existing frontend. Consider Module Federation or another suitable integration mechanism only when independent deployment, team ownership, or release requirements justify it.

Do not create a separate application for every screen or component.

Define clear ownership of routes, shared dependencies, authentication, shared state, and design-system components.

## 6. Reusable Components

Build components around repeated UI patterns.

Examples:

- `Button`
- `Input`
- `Select`
- `DatePicker`
- `FormField`
- `Modal`
- `ConfirmDialog`
- `LoadingSpinner`
- `Skeleton`
- `EmptyState`
- `ErrorState`
- `VehicleCard`
- `VehicleImage`
- `VehicleGallery`
- `VehicleFilters`
- `BookingSummary`
- `BookingStatus`
- `Pagination`
- `DataTable`
- `DashboardMetric`
- `Notification`
- `Navbar`
- `Sidebar`

Reuse components when they represent genuinely shared behavior or appearance.

Avoid creating excessive abstractions for one-off elements.

Reusable components must have clear responsibilities, appropriately typed props, accessible behavior, and predictable styling.

## 7. Custom React Hooks

Encapsulate reusable stateful behavior in custom hooks.

Potential hooks include:

- `useAuth` — authentication state and session behavior.
- `useVehicles` — vehicle fetching and catalog state.
- `useVehicleAvailability` — availability queries.
- `useBooking` — booking creation and booking status.
- `useDebounce` — debounced search.
- `usePagination` — pagination state.
- `useFormValidation` — reusable validation behavior where appropriate.
- Domain-specific query and mutation hooks.

Use existing data-fetching libraries when the project already has a suitable solution.

Requirements:

- Follow the Rules of Hooks.
- Handle loading, errors, and stale responses.
- Clean up subscriptions and requests when appropriate.
- Avoid duplicated API logic.
- Keep business rules out of presentation-only hooks.
- Do not create a hook for every trivial expression.

## 8. File Size and Readability

Keep files small, cohesive, and easy to understand.

Use approximately 100–200 lines as a practical warning threshold, not a strict limit.

Split files when they contain unrelated responsibilities or become difficult to navigate.

Organize code by feature and responsibility rather than creating large generic folders.

Avoid:

- Giant components.
- Giant controllers.
- Giant service classes.
- Functions with too many responsibilities.
- Deeply nested conditional logic.
- Circular imports.
- Duplicated business rules.
- Generic utility files that accumulate unrelated functions.
- Unnecessary abstractions and premature optimization.

Use meaningful names and explicit TypeScript types.

A developer should be able to understand a file without reading the entire application.

## 9. Backend Clean Architecture

Preserve the existing backend stack unless there is a strong reason to change it.

Organize backend code using Clean Architecture principles.

### Domain layer

Contains:

- Business entities and value objects.
- Domain rules and invariants.
- Domain-specific errors.
- Rules governing valid state transitions.

The domain layer must not depend on Express, database drivers, or external providers.

### Application layer

Contains:

- Use cases.
- Application services.
- Repository interfaces.
- Transaction and workflow boundaries.
- Application-level validation and authorization coordination.

### Infrastructure layer

Contains:

- Database connections.
- Repository implementations.
- External service clients.
- Payment-provider integrations.
- Message queues and cache adapters.
- Logging and persistence implementations.

### Presentation layer

Contains:

- HTTP routes.
- Controllers.
- Request validation.
- Authentication and authorization middleware.
- Response formatting.

Typical request flow:

`Route → Middleware → Controller → Use Case → Repository Interface → Repository Implementation → Database`

Controllers should remain thin.

Business rules must not live exclusively in controllers or database models.

## 10. Repository Pattern and Dependency Injection

Use repository interfaces to isolate persistence from business logic.

Potential repositories:

- `UserRepository`
- `VehicleRepository`
- `BookingRepository`
- `PaymentRepository`

Define interfaces at the appropriate application or domain boundary and implement them in infrastructure.

Repository operations should express meaningful application needs.

For example, booking-related operations should make concurrency and consistency requirements explicit instead of exposing arbitrary database queries to every controller.

Use dependency injection at application boundaries where it improves testability.

Avoid unnecessary dependency injection frameworks or abstractions when simple composition is sufficient.

## 11. Backend Microservices

Evaluate whether the current application should remain a modular monolith or evolve into independently deployed services.

Potential business services:

1. Identity Service.
2. Vehicle Service.
3. Booking Service.
4. Payment Service.
5. Notification Service.

Each service should have explicit responsibilities and data ownership.

### Service communication

- Use HTTP APIs for appropriate synchronous interactions.
- Use asynchronous messaging for workflows that benefit from decoupling.
- Define versioned contracts and error behavior.
- Apply timeouts and bounded retries.
- Use idempotent message consumers.
- Propagate correlation IDs.
- Implement health and readiness checks.
- Avoid unnecessary synchronous dependency chains.
- Do not allow multiple services to modify another service's private data directly.

If microservices are not justified by the current deployment and business requirements, implement modular boundaries first and extract services incrementally.

Do not introduce Kubernetes, Kafka, service meshes, or other infrastructure merely to make the application look production-ready.

## 12. Critical Requirement — Booking Concurrency

Booking integrity is a non-negotiable business invariant.

Two users must never successfully reserve the same vehicle for overlapping rental periods.

A frontend button being disabled is not concurrency protection.

A preliminary availability query alone is not concurrency protection.

### Rental dates

Use a consistent rental interval, preferably half-open:

`[startDate, endDate)`

For example, a rental from October 22 through a return date of October 25 occupies the interval from October 22 up to, but not including, October 25.

A new booking beginning on October 25 may therefore be allowed, subject to the application's return-time policy.

Validate:

- Start and end dates exist and are valid.
- Start date is earlier than end date.
- Dates follow the documented timezone and rental-day policy.
- The vehicle exists and can be rented.
- The user is authorized to book.
- The rental duration satisfies business rules.
- The price is calculated or verified by the backend.
- No conflicting confirmed reservation or active temporary hold exists.

Never trust the browser's availability result, price, role, or booking status.

### Race-condition prevention

A typical unsafe implementation is:

1. Query for overlapping bookings.
2. If none are found, insert a booking.

Two simultaneous requests may both observe no conflict and insert overlapping bookings.

Implement a strategy that creates a real concurrency-control boundary.

Depending on the existing database and data model, evaluate:

- Atomic conditional writes.
- Database transactions with a correctly designed conflict boundary.
- Vehicle-level reservation or locking documents.
- Reservation-slot models and suitable unique constraints.
- Optimistic concurrency or version checks where appropriate.

For MongoDB, do not assume that wrapping an overlap query and insert in a transaction automatically prevents write skew or conflicting inserts.

Test the chosen strategy against simultaneous requests and prove that overlapping reservations cannot both succeed.

All booking creation paths must use the same invariant-enforcing workflow.

### Booking lifecycle

Define explicit states as appropriate:

- `PENDING_PAYMENT`
- `CONFIRMED`
- `CANCELLED`
- `EXPIRED`

Define exactly which states block availability.

Temporary holds must expire safely.

Prevent invalid state transitions, duplicate bookings, and duplicate charges.

Use idempotency keys or an equivalent mechanism to make request retries safe.

### Payments and distributed workflows

When payments are implemented:

- Verify payment-provider webhooks.
- Make webhook processing idempotent.
- Handle delayed and duplicated callbacks.
- Define behavior for payment success, failure, cancellation, and timeout.
- Reconcile uncertain payment outcomes.
- Avoid assuming a distributed transaction exists across microservices.
- Use an explicit workflow or saga where necessary.
- Release temporary holds according to a safe, documented policy.

### Required concurrency tests

Test:

1. Two users booking the same vehicle for overlapping dates simultaneously.
2. Two users booking the same vehicle for non-overlapping dates.
3. Two users booking different vehicles simultaneously.
4. Duplicate booking requests.
5. Payment failure after a hold is created.
6. Hold expiration followed by a new reservation.
7. Database failure during booking.
8. Delayed or duplicated payment callbacks.

For overlapping concurrent requests, no more than one conflicting reservation may succeed.

## 13. Database Engineering

Inspect the existing schema and queries before modifying them.

Requirements:

- Validate persisted data.
- Define clear ownership of collections or tables.
- Add indexes for frequent filters, lookups, and sorting.
- Use bounded pagination.
- Retrieve only the fields needed.
- Avoid N+1 queries and unnecessary round trips.
- Use transactions when multi-record atomicity is required.
- Apply optimistic concurrency where concurrent updates could overwrite data.
- Use consistent timestamps and timezone handling.
- Plan migrations and schema changes safely.
- Define deletion and retention behavior.
- Verify query plans before adding indexes indiscriminately.

Ensure transaction retries do not duplicate external side effects.

## 14. API Engineering

Follow consistent REST conventions when using REST.

- Separate request DTOs from database documents and domain entities.
- Validate request bodies, route parameters, and query strings.
- Use an established schema validation library compatible with the stack.
- Apply consistent HTTP status codes and response structures.
- Implement centralized error handling.
- Return safe and useful error messages.
- Do not leak internal stack traces.
- Add pagination, filtering, and bounded sorting.
- Restrict request sizes and file uploads.
- Document APIs with OpenAPI where appropriate.
- Maintain compatibility where required.

Never silently swallow errors or report success after a failed operation.

## 15. Authentication and Security

Implement security appropriate to the application's authentication and deployment model.

- Hash passwords with a modern password-hashing algorithm.
- Protect private routes with authentication.
- Enforce role-based authorization and resource ownership on the backend.
- Validate token signatures, expiry, issuer, and audience as appropriate.
- Use secure session or token storage according to the authentication design.
- Apply CSRF protections when required.
- Configure CORS for trusted origins.
- Apply security headers.
- Prevent injection and mass-assignment vulnerabilities.
- Validate uploaded files and their sizes.
- Never expose secrets in source code or frontend bundles.
- Use HTTPS in production.
- Verify payment-provider signatures.
- Keep dependencies updated and check for known vulnerabilities.
- Avoid logging tokens, passwords, personal information, or sensitive payment data.

Hiding a button in the frontend is not authorization.

## 16. Rate Limiting and Abuse Prevention

Apply rate limits based on endpoint risk.

Prioritize:

- Login and registration.
- Password recovery.
- Vehicle search.
- Booking creation and cancellation.
- Payment initiation.
- File uploads.
- Expensive database operations.

Requirements:

- Return HTTP 429 when a limit is exceeded.
- Include `Retry-After` where appropriate.
- Use per-account, per-user, per-IP, or other suitable keys.
- Configure trusted proxies correctly.
- Use a shared store such as Redis when distributed instances require coordinated limits.
- Avoid in-memory counters as the only production limit across multiple instances.
- Define safe behavior when the limiter store becomes unavailable.

Rate limiting does not replace authentication, authorization, or input validation.

## 17. Performance and Scalability

Measure bottlenecks before optimizing.

Evaluate:

- Efficient database queries and indexes.
- Bounded pagination and payload sizes.
- Connection pooling.
- Request and downstream timeouts.
- Caching for appropriate read-heavy data.
- Cache invalidation after inventory changes.
- Bounded concurrency for expensive operations.
- Background processing for non-critical work.
- Image optimization when vehicle assets become available.
- Graceful shutdown.
- Health checks and resource cleanup.

Never use stale cached availability as the final authority for creating a booking.

Introduce Redis, message brokers, queues, and other infrastructure only when justified by correctness or operational requirements.

## 18. Logging and Observability

Implement suitable production observability:

- Structured logs.
- Request and correlation IDs.
- Centralized error handling.
- Latency and error-rate metrics.
- Database and downstream service monitoring.
- Health and readiness endpoints.
- Alerts for booking conflicts and payment failures.
- Safe log redaction.

Use consistent error categories for validation failures, authentication failures, authorization failures, conflicts, rate limits, and internal errors.

## 19. Testing Strategy

Use the existing testing framework where practical.

Implement:

- Unit tests for domain rules and use cases.
- Repository integration tests.
- API integration tests.
- Frontend component and custom-hook tests.
- End-to-end customer and owner journeys.
- Security and authorization tests.
- Booking concurrency and idempotency tests.
- Payment failure and retry tests.
- Performance tests for identified bottlenecks.

Prioritize registration, login, vehicle discovery, vehicle management, availability, booking, cancellation, payment handling, and booking history.

Run the relevant tests and report actual results.

## 20. Suggested Project Structure

Adapt the structure to the existing repository.

### Frontend

```text
frontend/
  src/
    app/
      router/
      providers/
    shell/
      layout/
      navigation/
    domains/
      auth/
      vehicles/
      bookings/
      owner/
      payments/
    shared/
      components/
      hooks/
      api/
      types/
      utils/
      styles/
    tests/
```

Each domain should own its domain-specific components, hooks, API integration, and types.

The `domains` structure can support future microfrontend extraction without requiring independently deployed applications immediately.

### Backend

```text
backend/
  src/
    modules/
      identity/
        domain/
        application/
        infrastructure/
        presentation/
      vehicles/
        domain/
        application/
        infrastructure/
        presentation/
      bookings/
        domain/
        application/
        infrastructure/
        presentation/
      payments/
        domain/
        application/
        infrastructure/
        presentation/
    shared/
      config/
      errors/
      logging/
      contracts/
    tests/
  docs/
```

If independent microservices already exist, organize them according to their existing deployment boundaries rather than forcing them into one deployable application.

Do not create empty directories or placeholder services merely to match this example.

## 21. Development Workflow

Implement the application incrementally.

For each feature:

1. Inspect the relevant existing code and Figma screen.
2. Identify requirements and acceptance criteria.
3. Reuse existing components and services where appropriate.
4. Implement the smallest coherent change.
5. Add relevant validation, error handling, and tests.
6. Run linting, type checking, tests, and builds as applicable.
7. Compare the frontend against the Figma reference.
8. Review security, concurrency, and data integrity implications.
9. Summarize changes, verification results, and outstanding work.

Do not implement the entire application in one giant code-generation step.

Do not silently modify unrelated modules or introduce unnecessary dependencies.

## 22. Definition of Done

A feature is complete when:

- Business rules are implemented correctly.
- Backend authorization is enforced.
- Inputs are validated.
- Error and loading states are handled.
- Relevant tests pass.
- Booking integrity is preserved.
- The UI matches the intended Figma screen.
- Responsive behavior is checked where applicable.
- Type checking, linting, and relevant builds pass.
- Database indexes and migrations have been considered.
- Documentation and environment examples are updated where necessary.
- No known unresolved issue is represented as completed.

Clearly report anything that remains unimplemented or unverified.

## 23. First Task — Repository Assessment

Completed 2026-10-22 (assessment + milestone plan M0–M7 approved).

## Final Engineering Principle

Build a correct and maintainable Car Rental application first. Preserve the Figma design, keep code readable, enforce booking invariants, and introduce advanced infrastructure only when it provides a measurable benefit.

Every architectural decision must improve correctness, maintainability, security, or a clearly identified scalability requirement.
