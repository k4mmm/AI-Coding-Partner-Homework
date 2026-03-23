#!/usr/bin/env bash
# Coverage gate — blocks git push if test coverage is below 80%.
# Invoked as a Claude Code PreToolUse hook before any Bash call containing "git push".

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "[coverage-gate] Running test suite with coverage..."

# Run Jest and capture the summary line (text-summary reporter writes to stderr)
COVERAGE_OUTPUT=$(npx jest --coverage --coverageReporters=text-summary 2>&1) || true

echo "$COVERAGE_OUTPUT"

# Extract the "Lines" coverage percentage from Jest text-summary output
# Example line: "Lines          : 85.71% ( 12/14 )"
LINES_PCT=$(echo "$COVERAGE_OUTPUT" | grep -E "^Lines\s*:" | grep -oE '[0-9]+(\.[0-9]+)?%' | head -1 | tr -d '%')

if [ -z "$LINES_PCT" ]; then
  echo ""
  echo "┌─────────────────────────────────────────────────────────┐"
  echo "│  COVERAGE GATE: Could not determine coverage percentage. │"
  echo "│  Run 'npm test' manually to check.                       │"
  echo "└─────────────────────────────────────────────────────────┘"
  exit 1
fi

THRESHOLD=80

# Use awk for float comparison (bash doesn't support floats natively)
BELOW=$(awk -v pct="$LINES_PCT" -v threshold="$THRESHOLD" 'BEGIN { print (pct < threshold) ? "yes" : "no" }')

if [ "$BELOW" = "yes" ]; then
  echo ""
  echo "┌──────────────────────────────────────────────────────────────┐"
  echo "│  COVERAGE GATE: PUSH BLOCKED                                 │"
  echo "│                                                              │"
  printf "│  Line coverage: %5.1f%%  (required: ≥ %d%%)                    │\n" "$LINES_PCT" "$THRESHOLD"
  echo "│                                                              │"
  echo "│  Fix: add tests until coverage reaches 80%, then push again. │"
  echo "└──────────────────────────────────────────────────────────────┘"
  exit 1
else
  echo ""
  echo "┌──────────────────────────────────────────────────────────────┐"
  printf "│  COVERAGE GATE: PASSED  (%.1f%% ≥ %d%%)                          │\n" "$LINES_PCT" "$THRESHOLD"
  echo "│  Proceeding with git push...                                 │"
  echo "└──────────────────────────────────────────────────────────────┘"
  exit 0
fi
