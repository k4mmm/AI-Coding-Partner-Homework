# GitHub Copilot Instructions — Virtual Card Lifecycle Management

## Project Context

You are working on **virtual-card-service**, a FinTech back-end for issuing and managing virtual payment cards. The system operates under PCI-DSS v4.0, PSD2, GDPR, and SOC 2 Type II requirements. Every suggestion you make must be compatible with a regulated banking environment.

---

## Language & Runtime

- **TypeScript** in strict mode (`"strict": true`) with ESM modules.
- **Node.js 20 LTS**. Do not use APIs removed or deprecated in Node 20.
- Target **ES2022** or later.

---

## Framework & Libraries

- Use **Fastify** (not Express). Register functionality as Fastify plugins.
- Use **Zod** for all input/output validation. Do not use `joi`, `yup`, or manual checks.
- Use **Pino** for logging. Never use `console.log`, `console.warn`, or `console.error`.
- Use **pg** (node-postgres) directly with parameterised queries. Do not use ORMs.
- Use **ioredis** for Redis. Do not use `redis` (node-redis).
- Use **kafkajs** for Kafka. Do not use `node-rdkafka`.

---

## Monetary Values — CRITICAL

- **Always** represent money as integers in minor units (cents). Example: `$42.99` → `4299`.
- **Never** use `parseFloat`, `Number()`, or floating-point arithmetic on money.
- Use the helper functions in `src/shared/money.ts` for all arithmetic.
- Currency codes must be ISO 4217 alpha-3 strings (e.g., `"USD"`, `"EUR"`).

---

## Sensitive Data — CRITICAL

- **Never** log, store, or return raw PAN (Primary Account Number) or CVV.
- PAN must be tokenised via Vault before any persistence; store only the opaque token.
- In API responses, always return masked PAN: `"**** **** **** 1234"`.
- Redact these fields in every log statement: `pan`, `cvv`, `cardNumber`, `email`, `phone`.
- When writing tests, use obviously fake PANs (e.g., `"4111111111111111"` Visa test number) and mark them with a comment `// test PAN — not real`.

---

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Files | `kebab-case.ts` | `card.service.ts` |
| Classes & types | `PascalCase` | `CardService` |
| Functions & variables | `camelCase` | `freezeCard` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_DAILY_LIMIT` |
| DB tables | `snake_case` plural | `transactions` |
| DB columns | `snake_case` | `pan_token` |
| Env vars | `VCS_` prefix, `UPPER_SNAKE_CASE` | `VCS_DB_HOST` |

---

## Code Patterns — DO

- Use the **repository pattern** for all database access.
- Use **RFC 7807 Problem Details** for all error responses via `problemDetail()` helper.
- Add **JSDoc** (`@param`, `@returns`, `@throws`) to every exported function.
- Use **UUIDv7** for all entity IDs (time-sortable).
- Use **cursor-based pagination** (keyset), never `OFFSET`.
- Wrap related DB + Kafka writes in a **transactional outbox**.
- Emit a **domain event** for every state change.
- Write an **audit-log entry** for every mutation.
- Group imports: (1) Node built-ins → (2) npm packages → (3) internal `@domain/`, `@infra/`, `@shared/`.
- Return early from functions to reduce nesting.

---

## Code Patterns — DO NOT

- ❌ Do not use `any`. Use `unknown` and narrow with type guards.
- ❌ Do not use `eval()`, `Function()`, or `vm.runInNewContext()`.
- ❌ Do not concatenate SQL strings. Always use parameterised queries (`$1`, `$2`, …).
- ❌ Do not hard-delete data. Use soft-delete (`closed` status) or archival.
- ❌ Do not expose stack traces in API error responses.
- ❌ Do not import from parent directories using `../../..`. Use path aliases.
- ❌ Do not add dependencies without checking for known vulnerabilities first.
- ❌ Do not skip error handling. Every `async` function must have proper `try/catch` or let errors propagate to a global handler.
- ❌ Do not store secrets in code or `.env` files committed to version control.

---

## Error Handling

- All domain errors must extend `DomainError` (defined in `src/shared/errors.ts`).
- API errors return RFC 7807 JSON: `{ type, title, status, detail, instance }`.
- Use appropriate HTTP status codes:
  - `400` — validation failure
  - `401` — missing/invalid token
  - `403` — insufficient role or SCA not verified
  - `404` — resource not found
  - `409` — state conflict (e.g., freezing an already-frozen card)
  - `429` — rate limit exceeded

---

## Testing

- Use **Vitest** for all tests.
- Every new service method → add unit tests (happy path + error paths).
- Every new route → add integration tests (success + 4xx/5xx paths).
- Use **Testcontainers** for Postgres and Redis in integration tests.
- Fixtures must be deterministic — no `Math.random()` without seed.
- Assert audit-log entries exist after every mutation test.
- Never make real network calls in tests.

---

## Security Checklist (apply to every suggestion)

1. ✅ Input validated with Zod schema before processing?
2. ✅ SQL queries parameterised (no string interpolation)?
3. ✅ Sensitive fields redacted in logs?
4. ✅ Auth + RBAC applied to the route?
5. ✅ Rate limiting in place for write endpoints?
6. ✅ Audit-log entry written for mutations?
7. ✅ No secrets hard-coded?

---

## Commit Messages

Follow **Conventional Commits**:
```
feat(card): add freeze/unfreeze endpoints
fix(auth): reject tokens missing sca_verified claim
test(transaction): add spending-limit decline scenario
docs(adr): add ADR-003 for append-only audit design
```

---

## When in Doubt

- Prefer **security over convenience**.
- Prefer **explicitness over magic**.
- Prefer **auditability over brevity**.
- Ask: "Would this pass a PCI-DSS audit?" If not, change the approach.
