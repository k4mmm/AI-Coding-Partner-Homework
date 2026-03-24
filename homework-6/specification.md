# Specification: AI-Powered Multi-Agent Banking Transaction Pipeline

**Created by**: Kostia Chaikivskyi

---

## 1. High-Level Objective

Build a 3-agent Node.js pipeline that validates, scores for fraud risk, and processes settlement for banking transactions using file-based JSON message passing, writing all outcomes to `shared/results/`.

---

## 2. Mid-Level Objectives

- Transactions missing required fields (`transaction_id`, `amount`, `currency`, `source_account`, `destination_account`) are rejected with status `"rejected"` and a descriptive `reason` field.
- Transactions with an invalid or unknown ISO 4217 currency code (e.g. `"XYZ"`) are rejected with reason `"INVALID_CURRENCY"`.
- Transactions with a negative or zero amount are rejected with reason `"INVALID_AMOUNT"`.
- Transactions above $10,000 are assigned `fraud_risk_level: "HIGH"` and `fraud_risk_score >= 7` by the Fraud Detector.
- Transactions initiated between 02:00–05:00 UTC receive a +2 fraud risk score penalty for unusual timing.
- Cross-border transactions (metadata.country !== "US") receive a +1 fraud risk score penalty.
- The Settlement Processor assigns each validated, non-high-risk transaction a `settlement_id` and marks it `"settled"`; HIGH-risk transactions are marked `"held_for_review"`.
- All 8 sample transactions are processed and produce exactly 8 result files in `shared/results/`.
- Every agent operation is logged with an ISO 8601 timestamp, agent name, `transaction_id`, and outcome — account numbers are masked in all log output.

---

## 3. Implementation Notes

- **Monetary values**: Use `string` representation for amounts in JSON (already the case in input); use JavaScript's `BigDecimal`-equivalent library (e.g. `decimal.js`) for arithmetic — never native `float`.
- **Currency validation**: ISO 4217 whitelist at minimum: `USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, SEK, NOK, DKK, SGD, HKD, NZD, MXN, BRL, INR, KRW, ZAR, RUB`.
- **Logging**: Audit trail with `{ timestamp, agent, transaction_id, outcome }` — mask account numbers (show only last 4 chars, e.g. `****1001`).
- **PII**: Never log full account numbers or descriptions that may contain names.
- **File protocol**: Agents communicate via JSON files in `shared/input/ → shared/processing/ → shared/output/ → shared/results/`.
- **Message format**: Every inter-agent message wraps the transaction in a standard envelope (see Task 2 format).
- **Error handling**: Any unhandled exception during agent processing writes a `"system_error"` result to `shared/results/` rather than crashing the pipeline.

---

## 4. Context

- **Beginning state**: `sample-transactions.json` exists with 8 raw transaction records. No agent files exist. No `shared/` directories exist. No `node_modules/` exists.
- **Ending state**: All 8 transactions processed. Results written to `shared/results/` as individual JSON files. Test coverage ≥ 80% (gate) and target ≥ 90%. `README.md` and `HOWTORUN.md` complete. MCP server queryable. Custom skills operational.

---

## 5. Low-Level Tasks

### Task: Transaction Validator

**Prompt**:
> "Context: Node.js project. File `sample-transactions.json` contains 8 banking transactions. Messages are passed as JSON envelope objects (see format below). Use `decimal.js` for monetary arithmetic. Rules: never use float, mask account numbers in logs, validate ISO 4217 currency against a whitelist, reject negatives/zero amounts, reject missing required fields.
> Task: Build `agents/transaction_validator.js` exporting a `processMessage(message)` function. It reads the `data` field of the incoming message, validates it, and returns a new message with `status: 'validated'` or `status: 'rejected'` plus a `reason` field on rejection.
> Output: CommonJS module with `processMessage(message: object): object` and a `--dry-run` CLI flag that reads `sample-transactions.json` directly and prints a validation report without writing files."

**File to CREATE**: `agents/transaction_validator.js`
**Function to CREATE**: `processMessage(message: object): object`
**Details**:
- Check required fields: `transaction_id`, `amount`, `currency`, `source_account`, `destination_account`, `timestamp`, `transaction_type`
- Validate `amount` is a positive decimal string parseable by `decimal.js`
- Validate `currency` against ISO 4217 whitelist
- Return updated message with `data.status: "validated"` or `data.status: "rejected"` + `data.reason`
- Support `--dry-run` CLI flag for `/validate-transactions` skill

---

### Task: Fraud Detector

**Prompt**:
> "Context: Node.js project. Receives a validated message from the Transaction Validator via the shared/output/ directory. Use decimal.js for amount comparisons. Rules: never float, mask accounts in logs.
> Task: Build `agents/fraud_detector.js` exporting `processMessage(message)`. Score the transaction 0–10 for fraud risk. Scoring: amount > $10,000 → +3 pts; amount > $50,000 → +4 pts (cumulative with prior); hour between 02:00–05:00 UTC → +2 pts; cross-border (metadata.country !== 'US') → +1 pt. Risk levels: LOW (0–2), MEDIUM (3–6), HIGH (7–10).
> Output: CommonJS module returning an enriched message with `data.fraud_risk_score` (number) and `data.fraud_risk_level` ('LOW'|'MEDIUM'|'HIGH')."

**File to CREATE**: `agents/fraud_detector.js`
**Function to CREATE**: `processMessage(message: object): object`
**Details**:
- Parse UTC hour from `data.timestamp`
- Use `decimal.js` to compare amounts against thresholds
- Accumulate score from all applicable rules
- Clamp score to maximum 10
- Attach `fraud_risk_score` and `fraud_risk_level` to `message.data`

---

### Task: Settlement Processor

**Prompt**:
> "Context: Node.js project. Receives a fraud-scored message from the Fraud Detector. Rules: transactions with fraud_risk_level 'HIGH' must NOT be settled — mark them 'held_for_review'. All others get a UUID settlement_id and status 'settled'. Log all outcomes with masked account numbers.
> Task: Build `agents/settlement_processor.js` exporting `processMessage(message)`. It assigns settlement outcome and writes the final result to shared/results/.
> Output: CommonJS module returning a message with `data.settlement_id` (uuid or null), `data.settlement_status` ('settled'|'held_for_review'|'rejected'), and `data.processed_at` (ISO 8601 timestamp)."

**File to CREATE**: `agents/settlement_processor.js`
**Function to CREATE**: `processMessage(message: object): object`
**Details**:
- If `data.status === "rejected"` → `settlement_status: "rejected"`, no settlement ID
- If `data.fraud_risk_level === "HIGH"` → `settlement_status: "held_for_review"`, no settlement ID
- Otherwise → `settlement_status: "settled"`, generate UUID v4 as `settlement_id`
- Attach `processed_at` ISO 8601 timestamp
- Write final result JSON to `shared/results/{transaction_id}.json`
