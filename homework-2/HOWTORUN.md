# HOW TO RUN

Step-by-step guide to run the Support Ticket API locally.

## Prerequisites
- Node.js 18+ and npm
- macOS/Linux shell (Windows supported via PowerShell/`run.bat`)

## Start the API

```bash
cd "homework-2"
npm install
npm run dev
```

The server listens on `http://localhost:3000`.

Health check:
```bash
curl http://localhost:3000/health
```

## Quick Demo

- Shell script (macOS/Linux):
```bash
bash demo/run.sh
```

- Windows batch:
```bat
demo\run.bat
```

## Sample API Requests

- VS Code HTTP file:
  Open [homework-2/demo/test-requests.http](homework-2/demo/test-requests.http) and click "Send" (requires REST Client extension).

- Shell script:
```bash
bash demo/requests.sh
```

This script will:
- Create a ticket and auto-classify it
- Run auto-classification on a specific ticket
- Bulk import JSON
- List tickets filtered by category and priority
- Issue multiple concurrent create requests

## Run Tests & Coverage

```bash
cd "homework-2"
npm test
```

Open coverage report: [homework-2/coverage/lcov-report/index.html](homework-2/coverage/lcov-report/index.html).

## Troubleshooting
- If port 3000 is taken, run `PORT=3001 npm run dev` and update demo scripts `BASE_URL` accordingly.
- Use `npm cache verify` if install issues occur.
