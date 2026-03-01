# 🔍 Codebase Research Report

**Bug ID**: API-404
**Research Date**: 2026-02-24
**Researcher**: Bug Researcher Agent

---

## Bug Summary

**Issue**: GET /api/users/:id returns 404 for valid user IDs
**Reported Behavior**: All requests to fetch individual users return "User not found" even when users exist in the database.

---

## Codebase Analysis

### Relevant Files Identified

| File | Purpose | Relevance |
|------|---------|-----------|
| `demo-bug-fix/src/controllers/userController.js` | User API logic | **PRIMARY** - Contains bug |
| `demo-bug-fix/src/routes/users.js` | Route definitions | Secondary - Routes to controller |
| `demo-bug-fix/server.js` | Express server setup | Context only |

---

## Root Cause Analysis

### File: `demo-bug-fix/src/controllers/userController.js`

**Location**: Lines 18-24

**The Bug**: Type mismatch in comparison operation.

```javascript
async function getUserById(req, res) {
  const userId = req.params.id;

  // BUG: req.params.id returns a string, but users array uses numeric IDs
  // Strict equality (===) comparison will always fail: "123" !== 123
  const user = users.find(u => u.id === userId);
```

**Explanation**:
1. Express route parameters (`req.params.id`) are always **strings**
2. The `users` array stores IDs as **numbers** (e.g., `{ id: 123, ... }`)
3. Strict equality (`===`) compares both value AND type
4. `"123" === 123` evaluates to `false`
5. Therefore, `users.find()` never finds a match
6. Result: Always returns 404 "User not found"

### Data Structure Reference

**Location**: `demo-bug-fix/src/controllers/userController.js:7-11`

```javascript
const users = [
  { id: 123, name: 'Alice Smith', email: 'alice@example.com' },
  { id: 456, name: 'Bob Johnson', email: 'bob@example.com' },
  { id: 789, name: 'Charlie Brown', email: 'charlie@example.com' }
];
```

Note: All `id` values are **numeric** (123, 456, 789).

### Route Definition

**Location**: `demo-bug-fix/src/routes/users.js:13`

```javascript
router.get('/api/users/:id', userController.getUserById);
```

The `:id` parameter is extracted as a string by Express.

---

## Why Other Endpoints Work

**`GET /api/users`** works correctly because:
- It returns all users without any ID comparison
- No type coercion issue involved

```javascript
async function getAllUsers(req, res) {
  res.json(users);  // Returns entire array, no comparison needed
}
```

---

## Proposed Solution

Convert the string ID to a number before comparison:

```javascript
const userId = parseInt(req.params.id, 10);
```

Or use loose equality (not recommended):
```javascript
const user = users.find(u => u.id == userId);  // Works but not best practice
```

**Recommended fix**: Use `parseInt()` for explicit type conversion.

---

## Impact Assessment

| Aspect | Assessment |
|--------|------------|
| Severity | High |
| Scope | All getUserById calls affected |
| Fix Complexity | Low (single line change) |
| Risk | Low (straightforward fix) |

---

## References

- Bug Context: `demo-bug-fix/bugs/API-404/bug-context.md`
- Controller: `demo-bug-fix/src/controllers/userController.js`
- Routes: `demo-bug-fix/src/routes/users.js`
