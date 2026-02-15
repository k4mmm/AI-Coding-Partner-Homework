# Virtual Card Lifecycle Management — Specification

> Ingest the information from this file, implement the Low-Level Tasks, and generate the code that will satisfy the High and Mid-Level Objectives.

---

## High-Level Objective

- Build a **Virtual Card Lifecycle Management** service that allows end-users to create, freeze/unfreeze, configure spending limits, and view transactions for virtual payment cards, while providing internal operations and compliance teams with full auditability and regulatory controls suitable for a PCI-DSS and PSD2-regulated environment.

---

## Mid-Level Objectives

1. **Card Provisioning** — Enable authenticated users to create virtual cards tied to their account, generating a tokenised card number (PAN stored only as a vault reference), expiry, and CVV, with immediate activation or pending-approval states based on risk scoring.
2. **Card State Management** — Support lifecycle transitions (active → frozen → active, active → closed) with idempotent APIs, mandatory reason codes, and real-time event propagation to downstream fraud and notification systems.
3. **Spending Controls** — Allow users and ops to set per-card daily, monthly, and per-transaction limits denominated in the card's base currency, enforced synchronously at authorisation time, with configurable MCC (Merchant Category Code) allow/deny lists.
4. **Transaction Ledger** — Record every authorisation, clearing, reversal, and refund as an immutable, append-only ledger entry, queryable by card, date range, amount range, and status; expose paginated read endpoints for users and an enriched export for compliance.
5. **Audit & Compliance Trail** — Capture every state change, configuration update, and data-access event in a tamper-evident audit log with actor identity, timestamp (UTC, ISO-8601), IP, correlation ID, and before/after snapshots conforming to SOC 2 Type II evidence requirements.
6. **Security & Data Protection** — Enforce field-level encryption at rest (AES-256) for PAN and CVV vault references, TLS 1.3 in transit, RBAC with least-privilege, rate limiting, and PII masking in all log outputs; support GDPR right-to-erasure via cryptographic shredding.
7. **Observability** — Emit structured JSON logs, Prometheus-compatible metrics (latency p50/p95/p99, error rate, card-creation throughput), and OpenTelemetry traces for every request; expose a `/healthz` and `/readyz` endpoint.

---

## Implementation Notes

### Technical Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript (Node.js 20 LTS) | Strong typing reduces defect surface in financial logic |
| Framework | Fastify | Low-overhead HTTP; schema-based validation via JSON Schema |
| Database | PostgreSQL 16 | ACID transactions, row-level security, native JSON support |
| Sensitive-data vault | HashiCorp Vault (or AWS KMS) | HSM-backed key management for PAN tokenisation |
| Message bus | Apache Kafka | Durable, ordered event streaming for audit & downstream sync |
| Cache | Redis 7 (Cluster) | Rate-limit counters and idempotency-key store |
| Testing | Vitest + Supertest + Testcontainers | Fast unit tests + real DB/Kafka integration tests |
| CI/CD | GitHub Actions | Linting, tests, SAST (Semgrep), DAST (ZAP), image scanning |

### Coding Standards

- All monetary values use **integer minor units** (cents/pence). Never use floating-point for money.
- Every public function must have JSDoc with `@param`, `@returns`, `@throws`.
- Maximum cyclomatic complexity per function: **10**.
- All database access goes through a **repository pattern**; no raw SQL in service or route layers.
- Use `zod` schemas as the single source of truth for request/response validation and OpenAPI generation.
- Error responses follow **RFC 7807 Problem Details** format.
- All dates/times stored and transmitted as **UTC ISO-8601** strings.
- Environment-specific configuration via **dotenv + envalid** with fail-fast on missing vars.
- Feature flags via a `features.json` config or LaunchDarkly SDK for controlled rollouts.

### Regulatory & Compliance

- **PCI-DSS v4.0** — cardholder data never persists outside the vault; application only holds opaque token references.
- **PSD2 / SCA** — card creation and unfreeze operations require Strong Customer Authentication proof (JWT claim `sca_verified: true`).
- **GDPR** — personal data inventory documented; right-to-erasure implemented via cryptographic shredding of per-user encryption keys; data-access logging enabled.
- **SOC 2 Type II** — audit log immutability enforced by append-only table with `pg_partman` time-range partitioning and hash-chain integrity column.
- **AML / KYC** — card creation gated on `kyc_status = 'verified'` from the identity service; velocity checks on cumulative limits.

### Performance Requirements

| Metric | Target |
|---|---|
| Card creation (p95) | < 500 ms |
| Freeze/unfreeze (p95) | < 200 ms |
| Transaction list (p95, 50 items) | < 300 ms |
| Authorisation sync check (p99) | < 100 ms |
| Availability | 99.95 % monthly |

### Security

- RBAC roles: `cardholder`, `ops_agent`, `compliance_officer`, `system_admin`.
- JWT access tokens (RS256, 15-min expiry) + opaque refresh tokens.
- Rate limiting: 100 req/min per user; 20 req/min on card-creation.
- Input sanitisation on every endpoint; parameterised queries only.
- Secrets managed via Vault; no secrets in environment variables in production.
- Dependency vulnerability scanning in CI (npm audit + Snyk).

---

## Context

### Beginning Context

```
homework-3/
├── specification.md          ← this file
├── agents.md                 ← agent behaviour rules
├── .github/
│   └── copilot-instructions.md  ← editor AI rules
└── README.md                 ← rationale & best-practices writeup
```

- No application code exists yet.
- The specification assumes a **greenfield** project.
- The identity/KYC service is an existing external dependency accessed via gRPC; its proto definitions are available.
- A PostgreSQL 16 instance and Kafka cluster are available in the staging environment.
- HashiCorp Vault is provisioned with a `transit` secrets engine for tokenisation.

### Ending Context

```
virtual-card-service/
├── src/
│   ├── index.ts                        # Fastify bootstrap, plugin registration
│   ├── config/
│   │   ├── env.ts                      # envalid schema
│   │   └── features.ts                 # feature-flag loader
│   ├── domain/
│   │   ├── card/
│   │   │   ├── card.entity.ts          # Card aggregate root
│   │   │   ├── card.repository.ts      # Repository interface
│   │   │   ├── card.service.ts         # Business logic
│   │   │   ├── card.routes.ts          # Fastify route handlers
│   │   │   ├── card.schema.ts          # Zod request/response schemas
│   │   │   └── card.events.ts          # Domain event definitions
│   │   ├── transaction/
│   │   │   ├── transaction.entity.ts
│   │   │   ├── transaction.repository.ts
│   │   │   ├── transaction.service.ts
│   │   │   ├── transaction.routes.ts
│   │   │   └── transaction.schema.ts
│   │   └── spending-limit/
│   │       ├── spendingLimit.entity.ts
│   │       ├── spendingLimit.service.ts
│   │       └── spendingLimit.schema.ts
│   ├── infrastructure/
│   │   ├── db/
│   │   │   ├── migrations/             # SQL migration files (node-pg-migrate)
│   │   │   ├── pg.client.ts            # Connection pool setup
│   │   │   └── repositories/           # Concrete repository implementations
│   │   ├── vault/
│   │   │   └── tokenisation.client.ts  # Vault transit encrypt/decrypt
│   │   ├── kafka/
│   │   │   ├── producer.ts
│   │   │   └── consumer.ts
│   │   ├── redis/
│   │   │   └── rateLimiter.ts
│   │   └── identity/
│   │       └── kyc.client.ts           # gRPC client to identity service
│   ├── shared/
│   │   ├── errors.ts                   # RFC 7807 error factory
│   │   ├── logger.ts                   # Pino structured logger
│   │   ├── audit.ts                    # Audit-log helper
│   │   ├── money.ts                    # Minor-unit arithmetic helpers
│   │   └── middleware/
│   │       ├── auth.ts                 # JWT verification + RBAC
│   │       ├── correlationId.ts        # X-Correlation-Id propagation
│   │       ├── rateLimiter.ts          # Token-bucket middleware
│   │       └── requestLogger.ts        # Per-request structured logging
│   └── types/
│       └── index.d.ts                  # Global type augmentations
├── tests/
│   ├── unit/
│   │   ├── card.service.test.ts
│   │   ├── transaction.service.test.ts
│   │   ├── spendingLimit.service.test.ts
│   │   └── money.test.ts
│   ├── integration/
│   │   ├── card.routes.test.ts
│   │   ├── transaction.routes.test.ts
│   │   └── audit.test.ts
│   ├── e2e/
│   │   └── cardLifecycle.e2e.test.ts
│   └── fixtures/
│       ├── cards.fixture.ts
│       └── transactions.fixture.ts
├── docs/
│   ├── openapi.yaml                    # Generated from Zod schemas
│   └── adr/                            # Architecture Decision Records
│       ├── 001-minor-units-for-money.md
│       ├── 002-vault-tokenisation.md
│       └── 003-append-only-audit.md
├── .env.example
├── docker-compose.yml                  # Local dev (Postgres, Kafka, Redis, Vault)
├── Dockerfile                          # Multi-stage production build
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── .github/
    └── workflows/
        ├── ci.yml                      # Lint → Test → SAST → Build
        └── release.yml                 # Semantic-release + image push
```

---

## Low-Level Tasks

---

### Task 1 — Project Scaffold & Configuration

**Prompt:**
> Initialise a new Fastify + TypeScript project with the folder structure defined in the Ending Context. Set up `tsconfig.json` (strict mode, ESM), `vitest.config.ts`, `docker-compose.yml` (Postgres 16, Kafka via Redpanda, Redis 7, Vault dev mode), and `.env.example` with all required variables validated by `envalid`.

**Files to CREATE:**
`package.json`, `tsconfig.json`, `vitest.config.ts`, `docker-compose.yml`, `.env.example`, `src/config/env.ts`, `src/config/features.ts`, `src/index.ts`

**Functions / Modules to CREATE:**
- `loadConfig()` in `env.ts` — validates env vars, returns typed config object.
- `loadFeatures()` in `features.ts` — reads `features.json`, exposes typed getters.
- `buildApp()` in `index.ts` — creates Fastify instance, registers plugins (cors, helmet, jwt, swagger).

**Driving Details:**
- Use `envalid` validators: `str()`, `port()`, `url()`, `bool()` for every config key.
- `docker-compose.yml` must expose standard ports and use named volumes for data persistence.
- Fastify must register `@fastify/swagger` auto-generating OpenAPI 3.1 docs from Zod schemas.
- Include npm scripts: `dev`, `build`, `start`, `test`, `test:integration`, `lint`, `migrate`.

---

### Task 2 — Shared Utilities (Logger, Errors, Money, Audit)

**Prompt:**
> Create the shared utilities layer: a Pino-based structured logger that masks PII fields, an RFC 7807 error factory, minor-unit money arithmetic helpers, and an audit-log helper that writes to both the database and Kafka.

**Files to CREATE:**
`src/shared/logger.ts`, `src/shared/errors.ts`, `src/shared/money.ts`, `src/shared/audit.ts`

**Functions / Modules to CREATE:**
- `createLogger(service: string)` — returns a Pino instance with `redact` paths for PAN, CVV, email.
- `problemDetail(status, type, title, detail, extensions?)` — builds an RFC 7807 response object.
- `addMinorUnits(a, b)`, `subtractMinorUnits(a, b)`, `formatMajorUnits(minorUnits, currency)` — safe integer arithmetic; throws on overflow.
- `writeAuditEntry({ actor, action, resource, before, after, correlationId, ip })` — inserts row into `audit_log` table and publishes to `audit.events` Kafka topic.

**Driving Details:**
- Money helpers must throw `MoneyOverflowError` if result exceeds `Number.MAX_SAFE_INTEGER`.
- Audit entries must include a SHA-256 hash of the previous entry to form a hash chain (tamper evidence).
- Logger must never output raw PAN, CVV, or full email; use redaction paths `['pan', 'cvv', 'cardNumber', 'email']`.
- All functions must be pure or clearly side-effectful; document which via JSDoc `@sideEffects` tag.

---

### Task 3 — Middleware Layer (Auth, RBAC, Rate Limiter, Correlation ID)

**Prompt:**
> Implement Fastify middleware (hooks/plugins): JWT verification using RS256 public key, role-based access control with a permission map, a Redis-backed sliding-window rate limiter, correlation-ID propagation, and a per-request structured-logging decorator.

**Files to CREATE:**
`src/shared/middleware/auth.ts`, `src/shared/middleware/rateLimiter.ts`, `src/shared/middleware/correlationId.ts`, `src/shared/middleware/requestLogger.ts`

**Functions / Modules to CREATE:**
- `authPlugin` — Fastify plugin; verifies `Authorization: Bearer <token>`, decodes claims, attaches `request.user`.
- `rbac(requiredRoles: Role[])` — preHandler that checks `request.user.role` against allowed roles; returns 403 on mismatch.
- `rateLimiterPlugin(config: { windowMs, maxRequests })` — uses Redis `INCR` + `PEXPIRE` per user key; returns 429 with `Retry-After` header.
- `correlationIdPlugin` — reads `X-Correlation-Id` header or generates UUIDv7; sets on request and reply.
- `requestLoggerPlugin` — logs method, URL, status, duration, correlationId on `onResponse`.

**Driving Details:**
- Auth plugin must reject tokens with `sca_verified !== true` on protected mutation routes (PSD2 SCA compliance).
- Rate limiter keys must be namespaced per endpoint group (e.g., `rl:card-create:<userId>`).
- RBAC permission map defined as a const object: `{ 'POST /cards': ['cardholder'], 'PATCH /cards/:id/freeze': ['cardholder', 'ops_agent'], ... }`.
- Correlation ID must be UUIDv7 (time-ordered) for log-correlation efficiency.

---

### Task 4 — Card Domain (Entity, Repository, Service, Routes)

**Prompt:**
> Build the Card domain: aggregate entity with lifecycle state machine, a PostgreSQL repository using parameterised queries, a service layer enforcing business rules (KYC gate, SCA check, idempotency), and Fastify routes with Zod-validated request/response schemas.

**Files to CREATE:**
`src/domain/card/card.entity.ts`, `src/domain/card/card.repository.ts`, `src/domain/card/card.service.ts`, `src/domain/card/card.routes.ts`, `src/domain/card/card.schema.ts`, `src/domain/card/card.events.ts`

**Functions / Modules to CREATE:**
- `Card` class — properties: `id (UUIDv7)`, `userId`, `panToken`, `expiryMonth`, `expiryYear`, `status` (enum: `pending_activation | active | frozen | closed`), `spendingLimits`, `createdAt`, `updatedAt`. Methods: `freeze(reason)`, `unfreeze(reason)`, `close(reason)` — enforce valid transitions or throw `InvalidStateTransitionError`.
- `CardRepository` (interface) + `PgCardRepository` (implementation) — `create`, `findById`, `findByUserId`, `updateStatus`, `setLimits`.
- `CardService` — orchestrates KYC check → Vault tokenise → persist → emit event. Uses idempotency key (Redis, 24 h TTL) to prevent duplicate creation.
- Route handlers: `POST /cards`, `GET /cards`, `GET /cards/:id`, `PATCH /cards/:id/freeze`, `PATCH /cards/:id/unfreeze`, `PATCH /cards/:id/close`, `PUT /cards/:id/limits`.
- `CardCreatedEvent`, `CardFrozenEvent`, `CardUnfrozenEvent`, `CardClosedEvent` — published to Kafka `card.lifecycle` topic.

**Driving Details:**
- State machine transitions must be validated before DB update; log rejected transitions at `warn` level.
- `POST /cards` must verify `kyc_status === 'verified'` via gRPC call to identity service; return 403 with reason if not.
- `panToken` is obtained by calling Vault `transit/encrypt`; raw PAN never touches application memory beyond the initial generation function.
- All write operations wrap DB + Kafka publish in a transactional outbox pattern (insert event row → poll + publish → mark published) to guarantee exactly-once delivery.
- Zod schemas must include `.openapi()` metadata for auto-generated docs.

---

### Task 5 — Transaction Domain (Entity, Repository, Service, Routes)

**Prompt:**
> Build the Transaction domain: an immutable ledger entity, a repository that enforces append-only writes, a service that records authorisations/clearings/reversals/refunds, and paginated read routes with filtering.

**Files to CREATE:**
`src/domain/transaction/transaction.entity.ts`, `src/domain/transaction/transaction.repository.ts`, `src/domain/transaction/transaction.service.ts`, `src/domain/transaction/transaction.routes.ts`, `src/domain/transaction/transaction.schema.ts`

**Functions / Modules to CREATE:**
- `Transaction` class — properties: `id`, `cardId`, `type` (enum: `authorisation | clearing | reversal | refund`), `amountMinorUnits`, `currency`, `merchantName`, `mcc`, `status` (enum: `pending | settled | reversed | declined`), `createdAt`. No update methods (immutable).
- `TransactionRepository` — `insert` (no UPDATE or DELETE methods), `findByCardId(cardId, filters, pagination)`, `sumByCardAndPeriod(cardId, period)`.
- `TransactionService` — `recordAuthorisation` (checks spending limits synchronously, declines if exceeded), `recordClearing`, `recordReversal`, `recordRefund`.
- Route handlers: `GET /cards/:cardId/transactions` (paginated, filterable by date range, amount range, type, status), `GET /cards/:cardId/transactions/:txId`.

**Driving Details:**
- The `transactions` table must have no `UPDATE` or `DELETE` grants for the application DB role; enforce append-only at the database level.
- `recordAuthorisation` must call `TransactionRepository.sumByCardAndPeriod` and compare against card's daily/monthly limits; decline within < 100 ms (p99).
- Pagination uses keyset (cursor-based) pagination, not OFFSET, for stable performance on large datasets.
- Monetary amounts always in minor units; `currency` field is ISO 4217 alpha-3.
- MCC filtering supports both allow-list and deny-list modes per card configuration.

---

### Task 6 — Spending Limits Domain

**Prompt:**
> Implement the Spending Limits sub-domain: entity, validation service, and integration with the Card aggregate, allowing per-card daily, monthly, and per-transaction limits with MCC restrictions.

**Files to CREATE:**
`src/domain/spending-limit/spendingLimit.entity.ts`, `src/domain/spending-limit/spendingLimit.service.ts`, `src/domain/spending-limit/spendingLimit.schema.ts`

**Functions / Modules to CREATE:**
- `SpendingLimit` value object — `dailyLimitMinorUnits`, `monthlyLimitMinorUnits`, `perTransactionLimitMinorUnits`, `allowedMccs: string[]`, `blockedMccs: string[]`, `currency`.
- `SpendingLimitService` — `validate(card, proposedTransaction): { allowed: boolean; reason?: string }`, `updateLimits(cardId, newLimits, actor)`.
- Zod schemas for limit update request/response.

**Driving Details:**
- Limits must be positive integers; zero means "no limit" for that dimension.
- MCC lists are mutually exclusive: a card may have an allow-list OR a deny-list, never both.
- `updateLimits` must write an audit entry with before/after snapshots.
- Validation must be called synchronously during authorisation (Task 5) and must not add > 10 ms overhead.

---

### Task 7 — Infrastructure Clients (Vault, Kafka, Redis, KYC)

**Prompt:**
> Implement infrastructure adapter clients: Vault transit encryption/decryption for PAN tokenisation, Kafka producer/consumer with schema registry, Redis connection with rate-limiter helpers, and a gRPC client for the external KYC/identity service.

**Files to CREATE:**
`src/infrastructure/vault/tokenisation.client.ts`, `src/infrastructure/kafka/producer.ts`, `src/infrastructure/kafka/consumer.ts`, `src/infrastructure/redis/rateLimiter.ts`, `src/infrastructure/identity/kyc.client.ts`

**Functions / Modules to CREATE:**
- `VaultClient` — `encrypt(plaintext): token`, `decrypt(token): plaintext`. Wraps Vault HTTP API; caches transit key version.
- `KafkaProducer` — `publish(topic, key, value, headers)` with retry (3×, exponential backoff). Serialises with Avro via schema registry.
- `KafkaConsumer` — `subscribe(topic, groupId, handler)` with at-least-once delivery and manual offset commit.
- `RedisRateLimiter` — `check(key, windowMs, maxRequests): { allowed: boolean; retryAfterMs?: number }`.
- `KycClient` — `getKycStatus(userId): Promise<'verified' | 'pending' | 'rejected'>` via gRPC; circuit-breaker with 5 s timeout.

**Driving Details:**
- Vault client must never log the plaintext PAN; only the token.
- Kafka producer must use the transactional outbox pattern described in Task 4.
- Redis operations must be atomic (Lua script or `MULTI/EXEC`).
- KYC client must implement circuit-breaker (open after 5 consecutive failures, half-open after 30 s).
- All clients must expose a `healthCheck()` method used by `/readyz`.

---

### Task 8 — Database Migrations & Row-Level Security

**Prompt:**
> Create PostgreSQL migration files for all tables (cards, transactions, audit_log, spending_limits, outbox), enforce row-level security so the application role cannot UPDATE or DELETE transactions or audit entries, and set up `pg_partman` for time-based partitioning of audit_log.

**Files to CREATE:**
`src/infrastructure/db/migrations/001_create_cards.sql`, `002_create_transactions.sql`, `003_create_audit_log.sql`, `004_create_spending_limits.sql`, `005_create_outbox.sql`, `src/infrastructure/db/pg.client.ts`

**Functions / Modules to CREATE:**
- Migration SQL files with `CREATE TABLE`, indexes, constraints, RLS policies.
- `createPool()` in `pg.client.ts` — returns a `pg.Pool` with SSL, connection limits, and idle timeout.

**Driving Details:**
- `transactions` table: `REVOKE UPDATE, DELETE ON transactions FROM app_role;`
- `audit_log` table: append-only; `hash_chain` column = `sha256(previous_hash || row_data)`; partitioned monthly by `created_at`.
- All tables use `UUIDv7` primary keys (time-sortable).
- Indexes: `cards(user_id)`, `transactions(card_id, created_at)`, `audit_log(resource_id, created_at)`.
- `pg.client.ts` must set `statement_timeout = '5s'` and `idle_in_transaction_session_timeout = '10s'`.

---

### Task 9 — Unit & Integration Tests

**Prompt:**
> Write comprehensive test suites: unit tests for Card, Transaction, and SpendingLimit services (mocked dependencies), integration tests for routes using Testcontainers (real Postgres, Redis), and an end-to-end card-lifecycle test.

**Files to CREATE:**
`tests/unit/card.service.test.ts`, `tests/unit/transaction.service.test.ts`, `tests/unit/spendingLimit.service.test.ts`, `tests/unit/money.test.ts`, `tests/integration/card.routes.test.ts`, `tests/integration/transaction.routes.test.ts`, `tests/integration/audit.test.ts`, `tests/e2e/cardLifecycle.e2e.test.ts`, `tests/fixtures/cards.fixture.ts`, `tests/fixtures/transactions.fixture.ts`

**Functions / Modules to CREATE:**
- Unit test functions covering: valid state transitions, invalid state transitions (expect throw), KYC gate rejection, spending-limit enforcement (allow/decline), money overflow, audit hash-chain integrity.
- Integration test functions: route-level happy paths, 400/401/403/404/429 error paths, pagination correctness, idempotency-key deduplication.
- E2E test: create card → set limits → record authorisation → freeze → attempt authorisation (expect decline) → unfreeze → close → verify audit trail completeness.

**Driving Details:**
- Unit tests must achieve **≥ 90 % line coverage** on service and utility modules.
- Integration tests use `testcontainers` to spin up Postgres and Redis; Kafka tests use `testcontainers/redpanda`.
- Fixtures must produce deterministic data (seeded faker or static objects).
- E2E test must assert that the audit log contains exactly the expected number of entries with correct `action` values.
- No test may depend on external network access; all external services are mocked or containerised.

---

### Task 10 — CI/CD Pipeline & Observability

**Prompt:**
> Create GitHub Actions CI workflow (lint, unit tests, integration tests, SAST, Docker build) and a release workflow (semantic-release, image push). Add Prometheus metrics endpoint and OpenTelemetry trace instrumentation to the Fastify app.

**Files to CREATE:**
`.github/workflows/ci.yml`, `.github/workflows/release.yml`, `src/shared/metrics.ts`, `src/shared/tracing.ts`

**Functions / Modules to CREATE:**
- CI workflow jobs: `lint` (ESLint + Prettier check), `unit-test` (Vitest), `integration-test` (Vitest + Testcontainers, services via `docker-compose`), `sast` (Semgrep), `build` (Docker multi-stage).
- Release workflow: triggers on `main` merge; runs `semantic-release`; pushes image to GHCR.
- `metricsPlugin` — registers Fastify plugin exposing `/metrics` (Prometheus format) with `http_request_duration_seconds`, `cards_created_total`, `authorisations_total{outcome}`.
- `tracingSetup()` — initialises `@opentelemetry/sdk-node` with OTLP exporter; auto-instruments Fastify, `pg`, and `ioredis`.

**Driving Details:**
- CI must block merge if any step fails; integration tests run in a GitHub-hosted runner with Docker.
- SAST rules must include `semgrep/javascript` and custom rules for `eval`, `Function()`, and SQL-string concatenation.
- Docker image must be rootless, use `node:20-slim`, and run as UID 1001.
- Metrics endpoint must be excluded from auth middleware and rate limiting.
- Traces must propagate `correlation_id` as a span attribute for cross-service correlation.
