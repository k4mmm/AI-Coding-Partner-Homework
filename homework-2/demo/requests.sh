#!/usr/bin/env bash
set -euo pipefail
BASE_URL=${BASE_URL:-http://localhost:3000}

echo "Health:"; curl -s "$BASE_URL/health"; echo

echo "Create ticket (auto-classify)..."
CREATE_RES=$(curl -s -X POST "$BASE_URL/tickets?auto_classify=true" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "D1",
    "customer_email": "d1@example.com",
    "customer_name": "Demo One",
    "subject": "Critical crash in production",
    "description": "App crashes when saving settings",
    "category": "other",
    "priority": "medium",
    "status": "new",
    "metadata": { "source": "api", "browser": "Chrome", "device_type": "desktop" }
  }')
echo "$CREATE_RES" | cat; echo

# Extract ID using Node (fallback to grep/sed if Node fails)
ID=$(echo "$CREATE_RES" | node -e 'process.stdin.once("data",d=>{try{const o=JSON.parse(d);console.log(o.id||"");}catch(e){console.log("")}})')
if [ -z "$ID" ]; then
  ID=$(echo "$CREATE_RES" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
fi

echo "Created ticket id: $ID"

if [ -n "$ID" ]; then
  echo "Auto-classify ticket..."
  curl -s -X POST "$BASE_URL/tickets/$ID/auto-classify" | cat; echo
else
  echo "Warning: Could not extract ticket ID; skipping auto-classify step."; echo
fi

echo "Bulk import (JSON) with auto_classify..."
JSON_CONTENT='[{"customer_id":"J1","customer_email":"j1@example.com","customer_name":"J1","subject":"Login","description":"Cannot login due to 2FA","category":"other","priority":"medium","status":"new","metadata":{"source":"api","device_type":"desktop"}}]'
curl -s -X POST "$BASE_URL/tickets/import" -H "Content-Type: application/json" \
  -d "{ \"format\": \"json\", \"content\": \"${JSON_CONTENT//\"/\\\"}\", \"auto_classify\": true }" | cat; echo

echo "List tickets filtered (technical_issue + urgent)..."
curl -s "$BASE_URL/tickets?category=technical_issue&priority=urgent" | cat; echo

echo "Create 20 concurrent tickets..."
for i in $(seq 1 20); do
  (
    curl -s -X POST "$BASE_URL/tickets" -H "Content-Type: application/json" -d "{\"customer_id\":\"C$i\",\"customer_email\":\"c$i@example.com\",\"customer_name\":\"C$i\",\"subject\":\"Minor cosmetic\",\"description\":\"Minor cosmetic suggestion\",\"category\":\"other\",\"priority\":\"low\",\"status\":\"new\",\"metadata\":{\"source\":\"api\",\"device_type\":\"desktop\"}}" >/dev/null &
  )
done
wait

echo "Done."
