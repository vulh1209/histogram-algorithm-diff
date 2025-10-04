# Issue #5: Histogram State + Myers Prefix/Postfix Overlap

## 🐛 Priority: HIGH

## Problems

### Problem 1: Histogram State Not Cleared Between Recursive Calls

Histogram algorithm fails because recursive calls accumulate state without clearing.

### Problem 2: Common Prefix/Postfix Overlap in SimpleMyers

When calculating common prefix and postfix, they can overlap if prefix covers entire array, causing incorrect boundary calculations.

## Failing Tests
```typescript
// Test 1: Highly repetitive content  
const repeated = tokens(Array(70).fill(1));
histogramDiff(repeated, repeated, removed, added, 2);
// Expected: no changes
// Actual: some elements marked as removed/added ❌

// Test 2: Alternating pattern
const pattern = tokens([1, 2, 1, 2, 1, 2, 1, 2, 1, 2]);
histogramDiff(pattern, pattern, removed, added, 3);
// Expected: no changes  
// Actual: some elements marked as changed ❌
```

## Root Causes

### Root Cause 1: Dirty Histogram State

In `src/algorithms/histogram.ts`, the `run()` method is called recursively but doesn't clear state:

```typescript
run(before, after, removed, added, beforeOffset, afterOffset) {
  // ... edge cases ...
  
  // ❌ BUG: No clear() here!
  this.populate(before);  // Adds to existing histogram state!
  
  const lcs = this.findLcs(before, after);
  // ... recursive calls ...
}
```

**Problem Flow**:
1. Initial call: `populate([1,1,1...])` → histogram has positions [0,1,2,...,69]
2. Recursive call 1: `populate([1,1,1...])` → **ADDS MORE** → [0,1,2,...,69, 0,1,2,...]
3. Histogram now has duplicate data → LCS search gets confused

### Root Cause 2: Prefix/Postfix Overlap

In `src/algorithms/myers-simple.ts`, when array is fully matching:

```typescript
const prefix = commonPrefix(before, after);  // = 70 (full length!)
const postfix = commonPostfix(before, after); // Also tries to count from end!
```

When `prefix >= minLen`, calculating postfix on the full arrays causes overlap:
- Prefix counts: [0...69] = all 70 elements
- Postfix counts: [...69] = tries to count from end again
- Result: double-counted elements or negative ranges

## Solutions

### Fix 1: Clear Histogram State

```typescript:src/algorithms/histogram.ts
run(before, after, removed, added, beforeOffset, afterOffset) {
  if (before.length === 0) { ... }
  if (after.length === 0) { ... }
  
  // ✅ FIX: Clear state from previous recursive calls
  this.clear();
  
  // Now populate with current data only
  this.populate(before);
  const lcs = this.findLcs(before, after);
  // ...
}
```

### Fix 2: Prevent Prefix/Postfix Overlap

```typescript:src/algorithms/myers-simple.ts
const prefix = commonPrefix(before, after);
const minLen = Math.min(before.length, after.length);

// ✅ FIX: Don't calculate postfix if prefix already covers everything
let postfix = 0;
if (prefix < minLen) {
  postfix = commonPostfix(before.slice(prefix), after.slice(prefix));
}
```

This ensures:
1. If prefix covers entire array → postfix = 0 (no overlap)
2. If prefix is partial → calculate postfix only on remaining part

## Fixes Applied

```diff
diff --git a/src/algorithms/histogram.ts b/src/algorithms/histogram.ts
@@ -100,6 +100,9 @@ class Histogram {
     if (after.length === 0) {
       markRange(removed, beforeOffset, beforeOffset + before.length, true);
       return;
     }
     
+    // Clear histogram state from previous recursive calls
+    this.clear();
+    
     // Populate histogram with 'before' positions
     this.populate(before);

diff --git a/src/algorithms/myers-simple.ts b/src/algorithms/myers-simple.ts
@@ -53,8 +53,14 @@ export function simpleMyers(
   // Strip common prefix and postfix for efficiency
   const prefix = commonPrefix(before, after);
-  const postfix = commonPostfix(before, after);
+  const minLen = Math.min(before.length, after.length);
   
+  // Don't calculate postfix if prefix already covers everything
+  let postfix = 0;
+  if (prefix < minLen) {
+    postfix = commonPostfix(before.slice(prefix), after.slice(prefix));
+  }
+  
   const beforeStart = prefix;
   const beforeEnd = before.length - postfix;
```

## Why These Bugs Existed

1. **Histogram State**: Rust version likely creates new histogram per subproblem or has explicit state management. Our TypeScript port reuses instances for efficiency but forgot to clear.

2. **Prefix/Postfix**: Classic boundary bug when optimizing identical inputs. The overlap case wasn't tested in unit tests (only integration tests caught it).

## Testing

After fixes, both tests should pass:
```typescript
✓ falls back to Myers for highly repetitive content
✓ handles alternating pattern efficiently
```

## Impact
- **Severity**: High - affects correctness when inputs are identical or highly repetitive
- **Scope**: All diffs with repetitive content (common in real-world code)
- **Related**: None - isolated issues

## Status
✅ **FIXED** - Applied both fixes

---

**Fixed by**: AI Assistant  
**Date**: 2025-10-04  
**Commit**: (pending)
