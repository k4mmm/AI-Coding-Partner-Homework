Generate a complete technical specification for the AI-powered banking transaction pipeline following the project template.

Steps:
1. Read `specification-TEMPLATE-hint.md` to recall the required structure.
2. Read `sample-transactions.json` to understand the input data shape, field names, and edge cases present (invalid currency, negative amount, unusual hour, cross-border, high-value).
3. Read `agents.md` for the agent roster, message envelope format, and project-specific constraints.
4. Write (or overwrite) `specification.md` with all five required sections:
   - **1. High-Level Objective** — one sentence describing what the pipeline does.
   - **2. Mid-Level Objectives** — 4–5 concrete, testable requirements derived from the sample data (e.g. rejection reasons, fraud thresholds, settlement outcomes).
   - **3. Implementation Notes** — monetary types, ISO 4217 whitelist, logging rules, PII masking, error handling.
   - **4. Context** — beginning state (files that exist, directories that don't) and ending state (all results written, coverage ≥ 80%, docs complete).
   - **5. Low-Level Tasks** — one entry per agent using this exact format:
     ```
     Task: [Agent Name]
     Prompt: "[Exact prompt to give Claude Code]"
     File to CREATE: agents/[name].js
     Function to CREATE: processMessage(message: object): object
     Details: [What the agent checks, transforms, or decides]
     ```
5. Confirm that `specification.md` includes entries for all three agents: Transaction Validator, Fraud Detector, and Settlement Processor.
6. Report: "Specification written to specification.md — [N] sections, [N] agents defined."
