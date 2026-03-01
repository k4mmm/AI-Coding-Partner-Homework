# 🚀 How To Run

Step-by-step instructions for running the 4-agent bug fix pipeline.

---

## Prerequisites

- Node.js v18+ 
- npm
- VS Code with GitHub Copilot

---

## 1. Setup

```bash
# Clone/navigate to the project
cd homework-4

# Install demo app dependencies
cd demo-bug-fix
npm install
```

---

## 2. Run the Demo Application

```bash
# Start the server
npm start

# Server runs at http://localhost:3000
```

### Test the API

```bash
# Get all users
curl http://localhost:3000/api/users

# Get user by ID (fixed endpoint)
curl http://localhost:3000/api/users/123
```

---

## 3. Run Tests

```bash
cd demo-bug-fix
npm test
```

Expected output:
```
 PASS  tests/userController.test.js
  userController
    getUserById
      ✓ 10 tests
    getAllUsers
      ✓ 3 tests

Tests: 13 passed
Time:  0.271s
```

---

## 4. Run the Agent Pipeline

### Option A: Run Orchestrator (All at once)

```
@orchestrator Run bug fix pipeline for API-404

Bug context: demo-bug-fix/bugs/API-404/
```

### Option B: Run Agents Individually

#### Step 1: Research Verifier
```
@research-verifier Verify research for API-404

Context: demo-bug-fix/bugs/API-404/
```
**Output**: `research/verified-research.md`

#### Step 2: Bug Implementer
```
@bug-implementer Apply fix for API-404

Context: demo-bug-fix/bugs/API-404/
```
**Output**: `fix-summary.md` + code changes

#### Step 3: Security Verifier
```
@security-verifier Review API-404 fix

Context: demo-bug-fix/bugs/API-404/
```
**Output**: `security-report.md`

#### Step 4: Unit Test Generator
```
@unit-test-generator Generate tests for API-404

Context: demo-bug-fix/bugs/API-404/
```
**Output**: `test-report.md` + `tests/*.test.js`

---

## 5. Verify Results

### Check Generated Files

```
demo-bug-fix/bugs/API-404/
├── bug-context.md              ✅ Input
├── research/
│   ├── codebase-research.md    ✅ Input
│   └── verified-research.md    ✅ Agent 1 output
├── implementation-plan.md      ✅ Input
├── fix-summary.md              ✅ Agent 2 output
├── security-report.md          ✅ Agent 3 output
└── test-report.md              ✅ Agent 4 output
```

### Verify the Fix

```bash
# Before fix: returned 404
# After fix: returns user object

curl http://localhost:3000/api/users/123
# {"id":123,"name":"Alice Smith","email":"alice@example.com"}
```

---

## 6. Pipeline Summary

| Step | Agent | Input | Output |
|------|-------|-------|--------|
| 1 | Research Verifier | `codebase-research.md` | `verified-research.md` |
| 2 | Bug Implementer | `implementation-plan.md` | `fix-summary.md` |
| 3 | Security Verifier | `fix-summary.md` | `security-report.md` |
| 4 | Unit Test Generator | `fix-summary.md` | `test-report.md` |

---

## Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Tests failing
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
npm test
```

### Agent not found
Ensure you're in VS Code with the `.github/agents/` folder in workspace.

---

## Quick Commands Reference

```bash
# Setup
cd demo-bug-fix && npm install

# Run app
npm start

# Run tests
npm test

# Stop server
pkill -f "node server.js"
```
