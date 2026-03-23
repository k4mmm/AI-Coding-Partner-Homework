"""
MCP Pipeline Status Server
--------------------------
Exposes the banking pipeline's shared/results/ directory via two tools
and one resource, queryable by Claude Code or any MCP client.

Tools:
  - get_transaction_status(transaction_id)  → status of one transaction
  - list_pipeline_results()                 → summary of all processed transactions

Resource:
  - pipeline://summary                      → latest run summary as plain text

Usage:
  python mcp/server.py
"""

import json
import os
from pathlib import Path
from datetime import datetime, timezone

from mcp.server.fastmcp import FastMCP

# Locate shared/results/ relative to this file (mcp/server.py → project root)
PROJECT_ROOT = Path(__file__).parent.parent
RESULTS_DIR = PROJECT_ROOT / "shared" / "results"

mcp = FastMCP("pipeline-status")


# ---------------------------------------------------------------------------
# Tool: get_transaction_status
# ---------------------------------------------------------------------------

@mcp.tool()
def get_transaction_status(transaction_id: str) -> dict:
    """
    Return the current pipeline status for a single transaction.

    Args:
        transaction_id: The transaction ID to look up (e.g. "TXN001").

    Returns:
        A dict with transaction details, or an error message if not found.
    """
    result_file = RESULTS_DIR / f"{transaction_id}.json"

    if not result_file.exists():
        # Check if the results directory itself is empty / missing
        if not RESULTS_DIR.exists() or not any(RESULTS_DIR.iterdir()):
            return {
                "error": "No pipeline results found. Run 'node integrator.js' first.",
                "transaction_id": transaction_id,
            }
        return {
            "error": f"Transaction '{transaction_id}' not found in results.",
            "transaction_id": transaction_id,
            "available": [f.stem for f in RESULTS_DIR.glob("*.json")],
        }

    data = json.loads(result_file.read_text())["data"]

    return {
        "transaction_id": data.get("transaction_id"),
        "settlement_status": data.get("settlement_status"),
        "settlement_id": data.get("settlement_id"),
        "fraud_risk_score": data.get("fraud_risk_score"),
        "fraud_risk_level": data.get("fraud_risk_level"),
        "status": data.get("status"),
        "reason": data.get("reason"),
        "currency": data.get("currency"),
        "amount": data.get("amount"),
        "transaction_type": data.get("transaction_type"),
        "processed_at": data.get("processed_at"),
    }


# ---------------------------------------------------------------------------
# Tool: list_pipeline_results
# ---------------------------------------------------------------------------

@mcp.tool()
def list_pipeline_results() -> dict:
    """
    Return a summary of all transactions processed in the last pipeline run.

    Returns:
        A dict with totals and a list of result records.
    """
    if not RESULTS_DIR.exists() or not any(RESULTS_DIR.glob("*.json")):
        return {
            "error": "No pipeline results found. Run 'node integrator.js' first.",
            "results": [],
        }

    results = []
    counts = {"settled": 0, "held_for_review": 0, "rejected": 0}

    for result_file in sorted(RESULTS_DIR.glob("*.json")):
        data = json.loads(result_file.read_text())["data"]
        settlement_status = data.get("settlement_status", "unknown")

        record = {
            "transaction_id": data.get("transaction_id"),
            "settlement_status": settlement_status,
            "fraud_risk_level": data.get("fraud_risk_level", "N/A"),
            "fraud_risk_score": data.get("fraud_risk_score", "N/A"),
            "amount": data.get("amount"),
            "currency": data.get("currency"),
            "reason": data.get("reason"),
        }
        results.append(record)

        if settlement_status in counts:
            counts[settlement_status] += 1

    return {
        "total": len(results),
        "settled": counts["settled"],
        "held_for_review": counts["held_for_review"],
        "rejected": counts["rejected"],
        "results": results,
    }


# ---------------------------------------------------------------------------
# Resource: pipeline://summary
# ---------------------------------------------------------------------------

@mcp.resource("pipeline://summary")
def pipeline_summary() -> str:
    """
    Return the latest pipeline run summary as plain text.
    """
    if not RESULTS_DIR.exists() or not any(RESULTS_DIR.glob("*.json")):
        return "No pipeline results found. Run 'node integrator.js' to generate results."

    results = []
    for result_file in sorted(RESULTS_DIR.glob("*.json")):
        data = json.loads(result_file.read_text())["data"]
        results.append(data)

    counts = {"settled": 0, "held_for_review": 0, "rejected": 0}
    for r in results:
        s = r.get("settlement_status", "unknown")
        if s in counts:
            counts[s] += 1

    lines = [
        "=" * 50,
        "  BANKING PIPELINE — LATEST RUN SUMMARY",
        "=" * 50,
        f"  Generated : {datetime.now(timezone.utc).isoformat()}",
        f"  Total     : {len(results)}",
        f"  Settled   : {counts['settled']}",
        f"  Held      : {counts['held_for_review']}",
        f"  Rejected  : {counts['rejected']}",
        "-" * 50,
    ]

    for r in results:
        txid = r.get("transaction_id", "?")
        status = r.get("settlement_status", "?")
        risk = r.get("fraud_risk_level", "N/A")
        score = r.get("fraud_risk_score", "N/A")
        reason = r.get("reason", "")
        amount = r.get("amount", "?")
        currency = r.get("currency", "?")

        line = f"  {txid:<8} | {status:<18} | risk={risk:<6} score={score:<4} | {amount} {currency}"
        if reason:
            line += f" | reason={reason}"
        lines.append(line)

    lines.append("=" * 50)
    return "\n".join(lines)


if __name__ == "__main__":
    mcp.run()
