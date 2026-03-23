# Research Notes — context7 Queries

**Project**: AI-Powered Banking Transaction Pipeline
**Author**: Kostia Chaikivskyi
**Stack**: Node.js (CommonJS)

These notes document context7 queries made during Agent 2 (code generation) to look up library APIs and patterns for the chosen framework.

---

## Query 1: Precise decimal arithmetic in Node.js

- **Search**: "decimal.js Node.js monetary arithmetic"
- **context7 library ID**: `/mikemcl/decimal.js`
- **What I looked up**: How to safely parse monetary string values, compare amounts against thresholds, and avoid floating-point rounding errors in financial calculations.
- **Key insight applied**:
  - Use `new Decimal(string)` to parse amounts from JSON (never cast to `Number` first).
  - Use `.gt()`, `.lte()`, `.eq()` for comparisons — never `>`, `<`, `===` on Decimal objects.
  - `Decimal` is immutable; arithmetic methods return new instances.
- **Applied in**: `agents/transaction_validator.js` (amount validation), `agents/fraud_detector.js` (threshold comparisons against `$10,000` and `$50,000`).

```js
// Pattern from context7 docs — safe amount validation
const Decimal = require('decimal.js');
const amount = new Decimal(data.amount); // parse from string
if (amount.lte(0)) { /* reject */ }
if (amount.gt(new Decimal('10000'))) { /* flag high-value */ }
```

---

## Query 2: UUID generation in Node.js (uuid v9)

- **Search**: "uuid npm v4 Node.js generation"
- **context7 library ID**: `/uuidjs/uuid`
- **What I looked up**: The correct import pattern for uuid v9 (named exports vs default export), and how to generate RFC 4122 v4 UUIDs for message IDs and settlement IDs.
- **Key insight applied**:
  - In uuid v9 (ESM/CJS), use `const { v4: uuidv4 } = require('uuid')` — there is no default export.
  - `uuidv4()` produces a cryptographically random UUID every call; no seeding needed.
  - UUID v4 is the correct choice for generated IDs (v1 is time-based, v5 is name-based).
- **Applied in**: All agent files and `integrator.js` for `message_id` and `settlement_id` fields.

```js
// Pattern from context7 docs
const { v4: uuidv4 } = require('uuid');
const messageId = uuidv4(); // e.g. "110e8400-e29b-41d4-a716-446655440000"
```

---

## Query 3: Node.js fs module — synchronous file I/O patterns

- **Search**: "Node.js fs writeFileSync mkdirSync recursive JSON"
- **context7 library ID**: `/nodejs/node` (fs module)
- **What I looked up**: How to safely create nested directories and write JSON files atomically in Node.js without external dependencies.
- **Key insight applied**:
  - `fs.mkdirSync(dir, { recursive: true })` is idempotent — safe to call even if the directory exists.
  - `fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')` writes synchronously, which is appropriate for a sequential pipeline (no concurrency issues).
  - Always specify encoding (`'utf8'`) to avoid writing a Buffer to a text file.
- **Applied in**: `agents/settlement_processor.js` (writing results), `integrator.js` (setup and error handling).

```js
// Pattern from context7 docs
fs.mkdirSync(resultsDir, { recursive: true });
fs.writeFileSync(
  path.join(resultsDir, `${txId}.json`),
  JSON.stringify(result, null, 2),
  'utf8'
);
```
