# Agents — AI-Powered Banking Transaction Pipeline

**Project**: Homework 6 Capstone — Multi-Agent Banking Pipeline
**Author**: Kostia Chaikivskyi
**Stack**: Node.js (CommonJS), `decimal.js`, `uuid`, Jest

---

## Project Context

This project implements a file-based multi-agent pipeline for processing banking transactions. Agents communicate by passing JSON message envelopes through a shared directory structure (`shared/input/`, `shared/processing/`, `shared/output/`, `shared/results/`). The integrator (`integrator.js`) orchestrates the pipeline: it reads `sample-transactions.json`, wraps each transaction in a message envelope, and feeds it through the three agents in sequence.

---

## Standard Message Envelope

All inter-agent messages use this format:

```json
{
  "message_id": "<uuid4>",
  "timestamp": "<ISO 8601>",
  "source_agent": "<agent_name>",
  "target_agent": "<agent_name>",
  "message_type": "transaction",
  "data": {
    "transaction_id": "TXN001",
    "amount": "1500.00",
    "currency": "USD",
    "source_account": "ACC-1001",
    "destination_account": "ACC-2001",
    "transaction_type": "transfer",
    "description": "...",
    "metadata": { "channel": "online", "country": "US" },
    "status": "validated | rejected | held_for_review | settled",
    "reason": "<only on rejection>",
    "fraud_risk_score": 0,
    "fraud_risk_level": "LOW | MEDIUM | HIGH",
    "settlement_id": "<uuid4 or null>",
    "settlement_status": "settled | held_for_review | rejected",
    "processed_at": "<ISO 8601>"
  }
}
```

---

## Agent Roster

### Agent 1 — Transaction Validator

| Field | Value |
|-------|-------|
| **File** | `agents/transaction_validator.js` |
| **Role** | Validates raw transaction data for completeness and correctness |
| **Input** | Raw transaction from `sample-transactions.json` wrapped in message envelope |
| **Output** | Message with `data.status: "validated"` or `"rejected"` + `reason` |
| **Source agent** | `integrator` |
| **Target agent** | `fraud_detector` |

**Validation rules**:
- Required fields present: `transaction_id`, `amount`, `currency`, `source_account`, `destination_account`, `timestamp`, `transaction_type`
- Amount is a positive decimal (using `decimal.js`)
- Currency is a valid ISO 4217 code from the approved whitelist

**CLI flag**: `--dry-run` — prints validation report without writing files (used by `/validate-transactions` skill)

---

### Agent 2 — Fraud Detector

| Field | Value |
|-------|-------|
| **File** | `agents/fraud_detector.js` |
| **Role** | Scores validated transactions for fraud risk |
| **Input** | Validated message from Transaction Validator |
| **Output** | Message enriched with `fraud_risk_score` (0–10) and `fraud_risk_level` (LOW/MEDIUM/HIGH) |
| **Source agent** | `transaction_validator` |
| **Target agent** | `settlement_processor` |

**Scoring rules**:
| Condition | Points |
|-----------|--------|
| Amount > $10,000 | +3 |
| Amount > $50,000 | +4 (additional, total +7) |
| Hour 02:00–05:00 UTC | +2 |
| Cross-border (country ≠ US) | +1 |

**Risk levels**: LOW (0–2), MEDIUM (3–6), HIGH (7–10)

---

### Agent 3 — Settlement Processor

| Field | Value |
|-------|-------|
| **File** | `agents/settlement_processor.js` |
| **Role** | Makes final settlement decision and writes results |
| **Input** | Fraud-scored message from Fraud Detector |
| **Output** | Final result in `shared/results/{transaction_id}.json` |
| **Source agent** | `fraud_detector` |
| **Target agent** | `results` (terminal) |

**Settlement logic**:
| Condition | Outcome |
|-----------|---------|
| `status === "rejected"` | `settlement_status: "rejected"`, no settlement ID |
| `fraud_risk_level === "HIGH"` | `settlement_status: "held_for_review"`, no settlement ID |
| Otherwise | `settlement_status: "settled"`, UUID v4 `settlement_id` |

---

## Integrator / Orchestrator

| Field | Value |
|-------|-------|
| **File** | `integrator.js` |
| **Role** | Sets up directories, loads `sample-transactions.json`, runs agents in sequence |
| **Command** | `node integrator.js` or `npm run pipeline` |

**Flow**:
```
sample-transactions.json
        ↓
   integrator.js
        ↓
  transaction_validator  →  shared/output/
        ↓
    fraud_detector        →  shared/output/
        ↓
  settlement_processor   →  shared/results/
```

---

## Logging Convention

All agents use a shared logger that:
- Outputs `{ timestamp, agent, transaction_id, outcome }` to stdout
- Masks account numbers: `ACC-1001` → `****1001`
- Never logs `description` fields (may contain PII)

---

## Project-Specific Notes for Claude Code

- **Always use `decimal.js`** for monetary comparisons and arithmetic — never JavaScript native `Number` for amounts.
- **Always mask account numbers** in log output.
- **ISO 4217 whitelist** is defined in `agents/transaction_validator.js` and is the single source of truth.
- **Tests** live in `tests/` and use Jest with `--coverage`. Coverage gate blocks push if below 80%.
- **MCP server** at `mcp/server.py` exposes `get_transaction_status` and `list_pipeline_results` tools plus `pipeline://summary` resource.
