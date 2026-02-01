#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# Install dependencies and start server
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

export PORT=${PORT:-3000}
echo "Starting Support Ticket API on port $PORT"
NODE_ENV=development node src/server.js &
PID=$!
trap 'echo "Stopping server"; kill $PID' EXIT
sleep 1

# Health check
echo "Health:"; curl -s "http://localhost:$PORT/health" | cat

echo "Tip: Run demo/requests.sh in another terminal to try APIs."
wait $PID
