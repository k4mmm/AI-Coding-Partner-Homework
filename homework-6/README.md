# AI-Powered Multi-Agent Banking Transaction Pipeline

**Created by Kostia Chaikivskyi**

---

## What This System Does

This project implements a three-agent Node.js pipeline that processes raw banking transactions end-to-end. Each transaction from `sample-transactions.json` is validated for correctness, scored for fraud risk, and either settled, held for review, or rejected — with every outcome written as a JSON result file to `shared/results/`.

The pipeline is orchestrated by a central integrator (`integrator.js`) that routes each transaction through the agents in sequence using a standard JSON message envelope. Agents communicate through a file-based protocol via the `shared/` directory tree, and all agent operations are audit-logged with ISO 8601 timestamps and masked account numbers.

---

## Agent Responsibilities

- **Transaction Validator** (`agents/transaction_validator.js`) — checks required fields, validates currency codes against an ISO 4217 whitelist, and rejects negative or zero amounts. Supports `--dry-run` mode for the `/validate-transactions` skill.
- **Fraud Detector** (`agents/fraud_detector.js`) — scores each validated transaction 0–10 for fraud risk using four signal rules: high amount (+3/+7), unusual hour 02:00–05:00 UTC (+2), and cross-border (+1). Assigns LOW / MEDIUM / HIGH risk level.
- **Settlement Processor** (`agents/settlement_processor.js`) — makes the final settlement decision: settles LOW/MEDIUM-risk validated transactions (assigning a UUID settlement ID), holds HIGH-risk transactions for review, and propagates rejections. Writes the final result file to `shared/results/`.

---

## Architecture

```
sample-transactions.json
          │
          ▼
    integrator.js          (orchestrator — wraps each tx in a message envelope)
          │
          ▼
 transaction_validator     validates fields, currency, amount
          │
          ▼ message envelope (status: "validated" | "rejected")
          │
 fraud_detector            scores 0–10, assigns LOW/MEDIUM/HIGH
          │
          ▼ message envelope (+ fraud_risk_score, fraud_risk_level)
          │
 settlement_processor      settle / hold / reject → writes JSON to shared/results/
          │
          ▼
   shared/results/
   ├── TXN001.json  (settled)
   ├── TXN002.json  (settled)
   ├── TXN003.json  (settled)
   ├── TXN004.json  (settled)
   ├── TXN005.json  (held_for_review — HIGH risk)
   ├── TXN006.json  (rejected — INVALID_CURRENCY)
   ├── TXN007.json  (rejected — INVALID_AMOUNT)
   └── TXN008.json  (settled)
```

### Shared directory protocol

```
shared/
├── input/       ← integrator drops initial messages here
├── processing/  ← agent moves message here while working
├── output/      ← agent writes result here for next agent
└── results/     ← final outcomes land here
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ (CommonJS) |
| Monetary arithmetic | `decimal.js` v10 — never native float |
| ID generation | `uuid` v9 (v4 random UUIDs) |
| Test framework | Jest 29 with coverage |
| MCP server | Python 3 + FastMCP (`mcp` package) |
| MCP client integration | context7 (`@upstash/context7-mcp`) |
| Skills / automation | Claude Code custom commands |
| Coverage gate | Claude Code `PreToolUse` hook on `git push` |

---

## Quick Start

```bash
# Install dependencies
npm install

# Run the full pipeline
npm run pipeline          # or: node integrator.js

# Validate transactions only (dry-run, no files written)
npm run validate          # or: node agents/transaction_validator.js --dry-run

# Run tests with coverage
npm test
```

See [HOWTORUN.md](HOWTORUN.md) for the full step-by-step guide.

---

## Skills (Claude Code slash commands)

| Command | What it does |
|---------|-------------|
| `/run-pipeline` | Clears shared dirs, runs the pipeline, shows a results table |
| `/validate-transactions` | Dry-run validation report without processing |
| `/write-spec` | Regenerates `specification.md` from the template |

---

## MCP Servers

| Server | Purpose |
|--------|---------|
| `context7` | Library docs lookup during development |
| `pipeline-status` | Query transaction results via `get_transaction_status` / `list_pipeline_results` tools and `pipeline://summary` resource |

Configure both in `mcp.json` (already included).

---

## Project Structure

```
homework-6/
├── agents/
│   ├── logger.js                  # Shared audit logger (account masking)
│   ├── transaction_validator.js   # Agent 1
│   ├── fraud_detector.js          # Agent 2
│   └── settlement_processor.js    # Agent 3
├── mcp/
│   └── server.py                  # FastMCP pipeline-status server
├── scripts/
│   ├── check-coverage.sh          # Coverage check (standalone)
│   └── pre-push-hook.sh           # Coverage gate hook for git push
├── tests/
│   ├── transaction_validator.test.js
│   ├── fraud_detector.test.js
│   ├── settlement_processor.test.js
│   ├── integration.test.js
│   └── logger.test.js
├── .claude/
│   ├── commands/
│   │   ├── run-pipeline.md
│   │   ├── validate-transactions.md
│   │   └── write-spec.md
│   └── settings.json              # Coverage gate hook configuration
├── shared/                        # Runtime message directories (git-ignored)
├── integrator.js                  # Orchestrator / entry point
├── sample-transactions.json       # Input: 8 raw transactions
├── specification.md               # Technical specification (Agent 1 output)
├── agents.md                      # Agent roster and message format
├── research-notes.md              # context7 queries (Task 4)
├── mcp.json                       # MCP server configuration
├── package.json
├── HOWTORUN.md
└── README.md
```
