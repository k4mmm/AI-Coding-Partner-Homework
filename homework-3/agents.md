# Agent Configuration — Virtual Card Lifecycle Management

> This file defines how an AI coding agent should behave when working within this project. All AI-generated code, tests, and documentation must conform to these rules.

---

## 1. Project Identity

| Field | Value |
|---|---|
| Project name | `virtual-card-service` |
| Domain | FinTech — Payment Card Issuing |
| Regulatory scope | PCI-DSS v4.0, PSD2 / SCA, GDPR, SOC 2 Type II, AML/KYC |
| Primary language | TypeScript (strict mode, ESM) |
| Runtime | Node.js 20 LTS |

---

## 2. Tech Stack Rules

### Must Use

| Category | Technology | Notes |
|---|---|---|
| HTTP framework | Fastify 5.x | Do NOT use Express |
| Validation | Zod | Single source of truth for schemas; generate OpenAPI from Zod |
| Database | PostgreSQL 16 | Always parameterised queries; no ORMs (use raw `pg` with repository pattern) |
| Secrets / tokenisation | HashiCorp Vault (transit engine) | Never store raw PANs in the application database |
| Messaging | Apache Kafka (via `kafkajs`) | Transactional outbox for guaranteed delivery |
| Cache / rate-limit | Redis 7 (ioredis) | Atomic operations via Lua scripts |
| Testing | Vitest + Supertest + Testcontainers | Real containers for integration tests |
| Logging | Pino | Structured JSON; PII redaction mandatory |
| Metrics | prom-client (Prometheus) | Expose `/metrics` endpoint |
| Tracing | OpenTelemetry SDK | OTLP exporter; auto-instrument Fastify, pg, ioredis |

### Must NOT Use

- **Express** — Project uses Fastify; do not introduce Express middleware or patterns.
- **Sequelize / TypeORM / Prisma** — Use the repository pattern with raw parameterised SQL.
- **`parseFloat` / `Number` for money** — All monetary values are **integer minor units** (cents).
- **`eval()`, `Function()`, `vm.runInNewContext()`** — Forbidden for security.
- **`any` type** — Use `unknown` and narrow with type guards; `any` breaks type safety.
- **`console.log`** — Use the Pino logger instance from `src/shared/logger.ts`.

---

## 3. Domain Rules (Banking / FinTech)

### Money & Currency
- Represent all monetary amounts as **integers in minor units** (e.g., $12.50 → `1250`).
- Currency codes follow **ISO 4217** alpha-3 (e.g., `USD`, `EUR`, `GBP`).
- Never perform division on monetary amounts without explicit rounding rules.
- Use the `money.ts` utility functions; do not write ad-hoc arithmetic.

### Card Lifecycle
- Valid state transitions: `pending_activation → active`, `active → frozen`, `frozen → active`, `active → closed`, `frozen → closed`.
- Any other transition must throw `InvalidStateTransitionError`.
- Every state change must produce a domain event AND an audit-log entry.

### PAN / Sensitive Data
- Raw PAN must **never** be logged, stored in the DB, or returned in API responses.
- Use Vault transit encryption; the application only stores opaque **token references**.
- CVV must be generated at provision time and stored only in the vault; never cached.
- API responses for card details must return masked PAN: `**** **** **** 1234`.

### KYC / AML Gate
- Card creation requires `kyc_status === 'verified'` from the identity service.
- If KYC status is `pending` or `rejected`, return HTTP 403 with a clear reason code.
- Log all KYC check results (pass or fail) in the audit log.

### Strong Customer Authentication (PSD2)
- Card creation and unfreeze operations require the JWT claim `sca_verified: true`.
- If `sca_verified` is missing or `false`, return HTTP 403 with `sca_required` error type.

---

## 4. Code Style & Conventions

### Naming
- **Files**: `kebab-case` (e.g., `card.service.ts`, `spending-limit.entity.ts`).
- **Classes / Types / Interfaces**: `PascalCase` (e.g., `CardService`, `SpendingLimit`).
- **Functions / variables**: `camelCase` (e.g., `createCard`, `dailyLimitMinorUnits`).
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_DAILY_LIMIT`, `DEFAULT_RATE_LIMIT`).
- **Database tables**: `snake_case` plural (e.g., `cards`, `transactions`, `audit_log`).
- **Database columns**: `snake_case` (e.g., `user_id`, `pan_token`, `created_at`).
- **Environment variables**: `UPPER_SNAKE_CASE` prefixed with `VCS_` (e.g., `VCS_DB_HOST`).

### Structure
- Follow **domain-driven folder layout**: `src/domain/<aggregate>/`.
- Each domain folder contains: `entity.ts`, `repository.ts`, `service.ts`, `routes.ts`, `schema.ts`, `events.ts`.
- Infrastructure adapters live in `src/infrastructure/<system>/`.
- Shared utilities in `src/shared/`.

### Functions
- Maximum cyclomatic complexity: **10** per function.
- Maximum function length: **50 lines** (excluding JSDoc).
- Every exported function must have JSDoc with `@param`, `@returns`, `@throws`.
- Pure functions preferred; side-effectful functions must be documented with `@sideEffects`.

### Error Handling
- All API errors must conform to **RFC 7807 Problem Details**.
- Use the `problemDetail()` factory from `src/shared/errors.ts`.
- Never expose internal stack traces to the client in production.
- Domain errors extend a base `DomainError` class with a `code` property.

### Imports
- Use ESM `import` / `export`; never `require()`.
- Group imports: (1) Node built-ins, (2) external packages, (3) internal modules.
- Use path aliases configured in `tsconfig.json`: `@domain/`, `@infra/`, `@shared/`.

---

## 5. Testing Expectations

### Coverage Targets

| Scope | Minimum Coverage |
|---|---|
| Service layer (unit) | 90 % line coverage |
| Utility modules (unit) | 95 % line coverage |
| Routes (integration) | 80 % line coverage |
| Overall | 85 % line coverage |

### Test Types

| Type | Tool | Database | External Services |
|---|---|---|---|
| Unit | Vitest | Mocked | Mocked |
| Integration | Vitest + Supertest + Testcontainers | Real (Postgres container) | Mocked or containerised |
| E2E | Vitest + Testcontainers | Real | Containerised (Redpanda, Redis, Vault dev) |

### Test Rules
- Every service method must have tests for: happy path, validation failure, domain error, infrastructure failure.
- Every route must have tests for: 200/201, 400, 401, 403, 404, 409, 429 (where applicable).
- Fixtures must be deterministic (static data or seeded random).
- Tests must **not** access external networks.
- Audit-log tests must verify hash-chain integrity.
- Money tests must cover overflow edge cases.

---

## 6. Security & Compliance Constraints

### Authentication & Authorisation
- All endpoints (except `/healthz`, `/readyz`, `/metrics`) require a valid JWT (RS256).
- RBAC roles: `cardholder`, `ops_agent`, `compliance_officer`, `system_admin`.
- Every route must declare its allowed roles; default is **deny**.

### Data Protection
- PAN and CVV: field-level encryption via Vault; never in application DB.
- PII fields (email, phone, name): encrypted at rest (AES-256); redacted in logs.
- GDPR right-to-erasure: implemented via **cryptographic shredding** (destroy per-user key in Vault).

### Audit
- Every state change, configuration update, and data-access event must produce an audit entry.
- Audit entries are **immutable** (append-only table, no UPDATE/DELETE grants).
- Audit hash chain: `sha256(previous_hash || serialised_row)` for tamper evidence.
- Retention: 7 years (regulatory minimum); monthly partitioning via `pg_partman`.

### Rate Limiting
- Global: 100 req/min per authenticated user.
- Card creation: 20 req/min per user.
- Return `429 Too Many Requests` with `Retry-After` header.

### Dependency Security
- `npm audit` must pass with zero critical/high vulnerabilities in CI.
- Snyk or Dependabot for continuous monitoring.
- Docker images scanned with Trivy before push.

---

## 7. API Design Rules

- RESTful resource-oriented URLs: `/cards`, `/cards/:id`, `/cards/:id/transactions`.
- Use HTTP verbs semantically: `POST` (create), `GET` (read), `PATCH` (partial update), `PUT` (full replace), `DELETE` (close/archive, never hard-delete).
- Idempotency: `POST` endpoints accept `Idempotency-Key` header; duplicates return the original response.
- Pagination: cursor-based (keyset), not OFFSET-based. Return `nextCursor` in response body.
- Versioning: URL-based (`/v1/cards`); future versions coexist.
- All responses include `X-Correlation-Id` header.
- Dates: UTC, ISO-8601 format everywhere.

---

## 8. Git & Workflow

- Branch naming: `feat/<ticket>-<short-description>`, `fix/<ticket>-<short-description>`.
- Commit messages: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- PRs require: ≥ 1 approval, passing CI, no unresolved conversations.
- Squash-merge to `main`; semantic-release generates changelog and tags.
- Architecture Decision Records (ADRs) in `docs/adr/` for significant choices.

---

## 9. Documentation

- OpenAPI spec auto-generated from Zod schemas via `@fastify/swagger`.
- Every ADR follows the format: Title, Status, Context, Decision, Consequences.
- README must include: setup instructions, architecture overview, env-var reference.
- Inline code comments only for **why**, never **what** (code should be self-explanatory).
