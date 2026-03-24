# How to Run — Banking Transaction Pipeline

**Created by Kostia Chaikivskyi**

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18 or later |
| npm | 8 or later |
| Python | 3.9 or later (for MCP server) |
| FastMCP | installed via `pip install mcp` |

---

## Step 1 — Clone and enter the project

```bash
cd "homework-6"
```

---

## Step 2 — Install Node.js dependencies

```bash
npm install
```

This installs `decimal.js`, `uuid`, and `jest`.

---

## Step 3 — Run the full pipeline

```bash
npm run pipeline
```

Or equivalently:

```bash
node integrator.js
```

**What happens:**
1. `shared/` directories are created and cleared.
2. All 8 transactions from `sample-transactions.json` are loaded.
3. Each transaction passes through the three agents in sequence.
4. Result files are written to `shared/results/TXN00*.json`.
5. A summary is printed to the terminal.

**Expected output summary:**
```
  Total processed : 8
  Settled         : 5
  Held for review : 1
  Rejected        : 2

  Rejected transactions:
    TXN006 — INVALID_CURRENCY
    TXN007 — INVALID_AMOUNT:must_be_positive

  Held for review:
    TXN005 — risk score 7 (HIGH)
```

---

## Step 4 — Validate transactions without processing

```bash
npm run validate
```

Or:

```bash
node agents/transaction_validator.js --dry-run
```

Prints a validation table without writing any files.

---

## Step 5 — Run the test suite

```bash
npm test
```

Jest runs all 5 test suites (77 tests) and prints a coverage report.

**Coverage targets:**
- Gate (blocks push): ≥ 80%
- Current: ~86% statements, ~81% branches, 100% functions

---

## Step 6 — Start the MCP pipeline-status server

```bash
pip install mcp        # once, if not already installed
python3 mcp/server.py
```

The server exposes:
- **Tool** `get_transaction_status("TXN001")` — returns the result for one transaction
- **Tool** `list_pipeline_results()` — returns summary of all results
- **Resource** `pipeline://summary` — plain-text run summary

To use both MCP servers in Claude Code, the `mcp.json` file is already configured with `context7` and `pipeline-status`.

---

## Step 7 — Use Claude Code skills

Inside Claude Code (this project directory):

| Skill | What it does |
|-------|-------------|
| `/run-pipeline` | Clears dirs, runs pipeline, shows results table |
| `/validate-transactions` | Dry-run validation report |
| `/write-spec` | Regenerates `specification.md` |

---

## Step 8 — Coverage gate (automatic on git push)

The `.claude/settings.json` configures a `PreToolUse` hook that intercepts every `git push` Bash call and runs `scripts/pre-push-hook.sh`. If line coverage is below 80%, the push is blocked with a clear message.

To test the gate manually:

```bash
bash scripts/check-coverage.sh
```

---

## Viewing results

After running the pipeline, inspect individual results:

```bash
cat shared/results/TXN005.json    # HIGH-risk, held for review
cat shared/results/TXN006.json    # Rejected — invalid currency
cat shared/results/TXN007.json    # Rejected — negative amount
```

Each result file is a JSON message envelope with the full transaction data and settlement decision.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot find module 'decimal.js'` | Run `npm install` |
| `ModuleNotFoundError: No module named 'mcp'` | Run `pip install mcp` |
| `sample-transactions.json not found` | Make sure you are in the `homework-6/` directory |
| Coverage gate blocks push | Run `npm test` to see which lines are uncovered, add tests |
