Validate all transactions in sample-transactions.json without running the full pipeline.

Steps:
1. Check that `sample-transactions.json` exists. If missing, stop and tell the user.
2. Run the validator in dry-run mode using the Bash tool: `node agents/transaction_validator.js --dry-run`
3. Parse the output and display a results table with columns: `transaction_id`, `status`, `reason`.
4. Print a summary: total count, valid count, invalid count.
5. For each invalid transaction, explain why it was rejected (e.g. INVALID_CURRENCY, INVALID_AMOUNT, MISSING_FIELD).
