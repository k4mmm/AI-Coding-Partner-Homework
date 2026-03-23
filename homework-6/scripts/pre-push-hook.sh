#!/usr/bin/env bash
# Claude Code PreToolUse hook — coverage gate for git push.
#
# Claude Code passes the tool input as JSON on stdin.
# This script reads the Bash command, checks if it's a git push,
# and blocks it if test coverage is below 80%.

set -euo pipefail

# Read stdin (tool input JSON from Claude Code)
INPUT=$(cat)

# Extract the bash command from the JSON input
BASH_CMD=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('command', ''))
except:
    print('')
" 2>/dev/null || echo "")

# Only run the gate if this is a git push command
if ! echo "$BASH_CMD" | grep -qE 'git\s+push'; then
  exit 0
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "[coverage-gate] git push detected — running coverage check..."
echo ""

# Run Jest coverage (text-summary goes to stderr, merge with stdout)
COVERAGE_OUTPUT=$(npx jest --coverage --coverageReporters=text-summary 2>&1) || true

# Extract the Lines coverage percentage
# Jest text-summary output: "Lines          : 85.71% ( 12/14 )"
LINES_PCT=$(echo "$COVERAGE_OUTPUT" | grep -E "^Lines\s*:" | grep -oE '[0-9]+(\.[0-9]+)?%' | head -1 | tr -d '%')

if [ -z "$LINES_PCT" ]; then
  echo "┌─────────────────────────────────────────────────────────┐"
  echo "│  COVERAGE GATE: Could not parse coverage output.        │"
  echo "│  Run 'npm test' and check for errors.                   │"
  echo "└─────────────────────────────────────────────────────────┘"
  exit 1
fi

THRESHOLD=80
BELOW=$(awk -v pct="$LINES_PCT" -v t="$THRESHOLD" 'BEGIN { print (pct+0 < t+0) ? "yes" : "no" }')

if [ "$BELOW" = "yes" ]; then
  echo "┌──────────────────────────────────────────────────────────────┐"
  echo "│  COVERAGE GATE: PUSH BLOCKED                                 │"
  echo "│                                                              │"
  printf "│  Line coverage: %5.1f%%  (required: >= %d%%)                   │\n" "$LINES_PCT" "$THRESHOLD"
  echo "│                                                              │"
  echo "│  Add more tests until coverage >= 80%%, then push again.     │"
  echo "└──────────────────────────────────────────────────────────────┘"
  exit 1
fi

echo "┌──────────────────────────────────────────────────────────────┐"
printf "│  COVERAGE GATE: PASSED  (%.1f%% >= %d%%)                         │\n" "$LINES_PCT" "$THRESHOLD"
echo "│  Proceeding with git push...                                 │"
echo "└──────────────────────────────────────────────────────────────┘"
exit 0
