# 📊 Skill: Research Quality Measurement

## Overview

This skill defines standardized quality levels for evaluating bug research output. It provides a consistent framework for the Research Verifier agent to assess and communicate research reliability.

---

## Quality Levels

| Level | Label | Accuracy Range | Icon | Description |
|-------|-------|----------------|------|-------------|
| 5 | **EXCELLENT** | 95-100% | 🟢 | All references verified, code snippets match exactly, comprehensive coverage |
| 4 | **GOOD** | 80-94% | 🟡 | Minor discrepancies only, no critical errors, research is reliable |
| 3 | **ACCEPTABLE** | 60-79% | 🟠 | Some errors present but research is usable with caution |
| 2 | **POOR** | 40-59% | 🔴 | Significant errors found, requires re-research before use |
| 1 | **REJECTED** | 0-39% | ⛔ | Unusable research, requires complete redo |

---

## Verification Criteria

### What Gets Verified

1. **File References**
   - File path exists in the codebase
   - File is accessible and readable

2. **Line Number References**
   - Line numbers are within file bounds
   - Referenced content exists at specified lines

3. **Code Snippets**
   - Snippets match actual source code
   - Context (surrounding code) is accurate
   - No fabricated or hallucinated code

4. **Technical Claims**
   - Stated behaviors match actual code logic
   - Bug descriptions align with code reality

---

## Accuracy Calculation

```
Accuracy = (Verified Claims / Total Claims) × 100%
```

### Claim Types
- **File:Line Reference**: Each `file.js:42` style reference
- **Code Snippet**: Each block of quoted code
- **Technical Assertion**: Each statement about code behavior

---

## Quality Level Selection Rules

| Condition | Assigned Level |
|-----------|----------------|
| All claims verified, no discrepancies | 🟢 EXCELLENT (5) |
| 1-2 minor discrepancies (typos, off-by-one lines) | 🟡 GOOD (4) |
| 3-5 discrepancies OR 1 significant error | 🟠 ACCEPTABLE (3) |
| 6+ discrepancies OR 2+ significant errors | 🔴 POOR (2) |
| Critical errors OR fabricated content | ⛔ REJECTED (1) |

### Error Severity Classification

- **Minor**: Off-by-one line numbers, whitespace differences, typos
- **Significant**: Wrong file referenced, outdated code snippets, incorrect function names
- **Critical**: Non-existent files, fabricated code, completely wrong analysis

---

## Output Format Requirements

When using this skill, the verifier MUST include:

```markdown
## Research Quality Assessment

- **Quality Level**: [LEVEL_NUMBER] - [LEVEL_LABEL] [ICON]
- **Accuracy**: [X]%
- **Total Claims Verified**: [N] of [M]
- **Discrepancies Found**: [COUNT]

### Reasoning
[Explanation of why this quality level was assigned]
```

---

## Pass/Fail Threshold

| Quality Level | Verification Status |
|---------------|---------------------|
| EXCELLENT (5) | ✅ PASS |
| GOOD (4) | ✅ PASS |
| ACCEPTABLE (3) | ⚠️ PASS WITH WARNINGS |
| POOR (2) | ❌ FAIL |
| REJECTED (1) | ❌ FAIL |

**Rule**: Research with quality level 2 or below should NOT proceed to Bug Planner without re-research.

---

## Usage Example

```markdown
## Research Quality Assessment

- **Quality Level**: 4 - GOOD 🟡
- **Accuracy**: 87%
- **Total Claims Verified**: 13 of 15
- **Discrepancies Found**: 2

### Reasoning
Research is reliable with minor issues. Two line number references were off by 1-2 lines 
(likely due to recent code changes). All code snippets match source. Technical analysis 
of the bug is accurate. Safe to proceed to implementation planning.
```

---

## References

- Used by: `research-verifier.agent.md`
- Output: `research/verified-research.md`
