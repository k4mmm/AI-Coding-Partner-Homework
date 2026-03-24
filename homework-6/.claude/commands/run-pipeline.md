Run the multi-agent banking pipeline end-to-end.

Steps:
1. Check that `sample-transactions.json` exists in the project root. If it is missing, stop and tell the user.
2. Clear all files inside `shared/input/`, `shared/processing/`, `shared/output/`, and `shared/results/` so the run starts clean (use the Bash tool: `find shared -type f -delete`).
3. Run the pipeline with the Bash tool: `node integrator.js`
4. After the pipeline completes, read every file in `shared/results/` and build a summary table with columns: `transaction_id`, `settlement_status`, `fraud_risk_level`, `fraud_risk_score`, `reason` (if rejected).
5. Report any transactions whose `settlement_status` is `"rejected"` — show the `transaction_id` and `reason`.
6. Report any transactions whose `settlement_status` is `"held_for_review"` — show the `transaction_id`, `fraud_risk_score`, and `fraud_risk_level`.
7. Print a final line: "Pipeline complete — N settled, N held, N rejected."
