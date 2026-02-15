# Homework 3 — Specification-Driven Design

**Student:** Kostia Chaikivskyi  
**Date:** 14 February 2026

---

## Summary

This homework delivers a **specification package** for a **Virtual Card Lifecycle Management** service — a FinTech back-end that lets users create virtual payment cards, freeze/unfreeze them, configure spending limits, and browse transactions, while giving internal operations and compliance teams full auditability and regulatory controls.

No code is implemented. The deliverables are purely documentary:

| File | Purpose |
|---|---|
| `specification.md` | Full product specification (objectives → context → 10 low-level implementation tasks) |
| `agents.md` | AI agent behaviour rules (tech stack, domain constraints, testing, security) |
| `.github/copilot-instructions.md` | Editor-level AI rules for GitHub Copilot (naming, patterns, do's & don'ts) |
| `README.md` | This file — rationale and industry best-practice mapping |

---

## Rationale — Why the Specification Was Written This Way

### 1. Three-tier Objective Hierarchy

The spec is structured as **High-Level Objective → Mid-Level Objectives → Low-Level Tasks** because this mirrors how product requirements are decomposed in regulated FinTech teams:

- **High-Level** gives the "what" in one sentence — enough for an executive or auditor to understand scope.
- **Mid-Level** (7 objectives) breaks the feature into testable, independently deliverable slices. Each objective maps roughly to a sprint deliverable and can be assigned to a different engineer or AI agent.
- **Low-Level** (10 tasks) provides prompt-ready instructions that an AI coding partner can execute sequentially, with clear inputs (files to create), outputs (functions), and constraints (driving details).

This three-tier approach was chosen because it prevents the common failure mode of AI-generated code: when the prompt is too vague, the agent hallucinates structure; when it's too prescriptive, small spec errors cascade. The mid-level acts as a "contract layer" that constrains the agent without over-specifying.

### 2. Domain-Driven Folder Layout

The Ending Context defines a `src/domain/<aggregate>/` structure (Card, Transaction, SpendingLimit) because:

- It keeps bounded contexts isolated, making it safe for an AI to modify one aggregate without affecting another.
- It mirrors how payment platforms (Stripe, Adyen, Marqeta) organise their internal codebases.
- It makes compliance reviews easier: an auditor can inspect `card/` to see every file that touches cardholder data.

### 3. Separate `agents.md` vs `.github/copilot-instructions.md`

Two complementary files serve different purposes:

- **`agents.md`** is a comprehensive reference document — tech stack decisions, domain rules, testing expectations, and compliance constraints. A human developer or an AI agent planning a multi-file change reads this.
- **`.github/copilot-instructions.md`** is a quick-fire ruleset optimised for inline code generation — naming conventions, do/don't patterns, and a security checklist. Copilot ingests this on every keystroke.

Splitting them avoids overloading the editor AI with lengthy context while still keeping a deep reference available.

### 4. Task Granularity

Each of the 10 low-level tasks follows a consistent template (Prompt, Files, Functions, Driving Details) because:

- The consistent structure lets any AI agent (Copilot, Claude, Cursor) parse and execute them with minimal prompt engineering.
- Driving Details contain the "guardrails" — the non-obvious constraints (e.g., "never log plaintext PAN", "use integer minor units") that prevent the most common FinTech coding mistakes.
- Tasks are ordered by dependency: scaffold → shared utilities → middleware → domains → infrastructure → tests → CI/CD. An AI agent can execute them in sequence without circular dependencies.

---

## Industry Best Practices — Where They Appear

| Practice | Where in the Spec | Why It Matters |
|---|---|---|
| **Integer minor units for money** | `specification.md` → Implementation Notes → Coding Standards; `agents.md` §3 (Money & Currency); `copilot-instructions.md` → Monetary Values section | Floating-point arithmetic causes rounding errors that silently lose or create money. Every major payment processor (Stripe, Adyen, Square) uses integer cents internally. This is the single most impactful FinTech coding rule. |
| **PAN tokenisation (PCI-DSS)** | `specification.md` → Mid-Level Objective 6, Task 4 (Card Domain), Task 7 (Vault client); `agents.md` §3 (PAN / Sensitive Data), §6 (Data Protection); `copilot-instructions.md` → Sensitive Data section | PCI-DSS v4.0 Requirement 3 mandates that stored PAN be rendered unreadable. Using Vault transit encryption means the application never persists raw card numbers, reducing PCI scope from SAQ D to SAQ A-EP. |
| **Append-only audit log with hash chain** | `specification.md` → Mid-Level Objective 5, Task 2 (Audit utility), Task 8 (Migration with RLS); `agents.md` §6 (Audit) | SOC 2 Type II CC7.2 and PCI-DSS Requirement 10 require tamper-evident logging. The hash chain (each row includes SHA-256 of the previous row) provides cryptographic proof that no entry was modified or deleted after the fact. Combined with `REVOKE UPDATE, DELETE` on the table, this gives auditors high assurance. |
| **Strong Customer Authentication (PSD2 SCA)** | `specification.md` → Implementation Notes → Regulatory; Task 3 (Auth middleware); `agents.md` §3 (PSD2 SCA); `copilot-instructions.md` → Security Checklist | PSD2 Article 97 requires SCA for remote electronic payments. The spec enforces this by requiring a `sca_verified: true` JWT claim on card creation and unfreeze operations, which maps to a real-world 3DS or biometric verification flow upstream. |
| **GDPR right-to-erasure via cryptographic shredding** | `specification.md` → Mid-Level Objective 6; `agents.md` §6 (Data Protection) | GDPR Article 17 requires data deletion on request, but audit and AML regulations require 7-year retention. Cryptographic shredding resolves the conflict: destroy the per-user encryption key in Vault, rendering all encrypted PII unreadable without actually deleting audit records. This is the approach used by major European banks. |
| **Transactional outbox pattern** | `specification.md` → Task 4 (Driving Details), Task 7 (Kafka producer); `agents.md` §7 (API Design) | Dual writes (DB + Kafka) without coordination cause data inconsistency. The outbox pattern (write event to an `outbox` table in the same DB transaction, then poll and publish) guarantees exactly-once delivery — critical when an authorisation event triggers downstream fraud or accounting systems. |
| **RFC 7807 Problem Details for errors** | `specification.md` → Implementation Notes → Coding Standards; Task 2 (Errors utility); `agents.md` §4 (Error Handling); `copilot-instructions.md` → Error Handling section | RFC 7807 provides a machine-readable, standardised error format that front-end teams and partner integrations can handle generically. It replaces ad-hoc error shapes that vary by endpoint — a common source of integration bugs. |
| **Repository pattern (no ORM)** | `specification.md` → Implementation Notes → Coding Standards; `agents.md` §2 (Must NOT Use); `copilot-instructions.md` → Code Patterns — DO | ORMs obscure the SQL being executed, making it harder to audit for injection vulnerabilities and performance. In PCI-scoped applications, being able to review every query is a compliance requirement. The repository pattern provides a clean abstraction without hiding the SQL. |
| **Cursor-based (keyset) pagination** | `specification.md` → Task 5 (Driving Details); `agents.md` §7 (API Design); `copilot-instructions.md` → Code Patterns — DO | OFFSET pagination degrades linearly with page depth and produces inconsistent results when rows are inserted during traversal. For a transaction ledger that may contain millions of rows, keyset pagination (using `WHERE created_at > :cursor`) provides O(1) performance at any depth. |
| **Rate limiting with `Retry-After`** | `specification.md` → Mid-Level Objective 6, Task 3 (Rate Limiter); `agents.md` §6 (Rate Limiting); `copilot-instructions.md` → Error Handling (429) | Protects the service from abuse and credential-stuffing attacks. The `Retry-After` header is an IETF standard (RFC 6585) that allows well-behaved clients to back off gracefully, reducing thundering-herd effects. |
| **RBAC with least privilege** | `specification.md` → Implementation Notes → Security; Task 3 (RBAC middleware); `agents.md` §6 (Authentication & Authorisation) | PCI-DSS Requirement 7 mandates restricting access to cardholder data on a need-to-know basis. The spec defines four roles (`cardholder`, `ops_agent`, `compliance_officer`, `system_admin`) with per-route permission maps, defaulting to **deny** — so a missing permission declaration is a safe failure. |
| **UUIDv7 for primary keys** | `specification.md` → Task 4 (Card entity), Task 8 (Migrations); `agents.md` §4 (Code Patterns — DO) | UUIDv7 (RFC 9562) embeds a Unix-millisecond timestamp, providing time-sortable unique IDs without sequential leakage. Unlike auto-increment, it doesn't reveal entity counts (information disclosure), and unlike UUIDv4, it maintains B-tree index locality for range queries. |
| **Structured JSON logging with PII redaction** | `specification.md` → Task 2 (Logger); `agents.md` §2 (Logging), §3 (PAN / Sensitive Data); `copilot-instructions.md` → Sensitive Data section | PCI-DSS Requirement 10.3 requires comprehensive logging, but Requirement 3.4 forbids logging PAN in the clear. Pino's `redact` option strips sensitive fields at serialisation time, so even if a developer accidentally passes a PAN to a log call, it never reaches the log sink. |
| **Conventional Commits + semantic-release** | `specification.md` → Task 10 (Release workflow); `agents.md` §8 (Git & Workflow); `copilot-instructions.md` → Commit Messages | Automated versioning from commit messages ensures that every release is traceable to specific changes — a requirement for SOC 2 change-management controls (CC8.1). It also generates changelogs automatically, reducing manual documentation overhead. |
| **Docker rootless container (UID 1001)** | `specification.md` → Task 10 (Driving Details) | CIS Docker Benchmark 4.1 recommends running containers as a non-root user. If the container is compromised, the attacker has limited privileges on the host. This is a standard hardening practice for financial-services deployments. |

---

## File Map

```
homework-3/
├── README.md                       ← You are here
├── specification.md                ← Full feature specification (10 tasks)
├── agents.md                       ← AI agent behaviour configuration
├── .github/
│   └── copilot-instructions.md     ← GitHub Copilot editor rules
└── specification-TEMPLATE-example.md  ← Provided template (reference only)
```
