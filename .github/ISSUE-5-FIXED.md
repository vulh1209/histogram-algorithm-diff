# Issue #5: Histogram State Not Cleared - FIXED ✅

## 🔴 Priority: HIGH

## Problem

Histogram algorithm accumulated state across recursive calls, causing incorrect diffs.

### Test Failures
- `falls back to Myers for highly repetitive content`
- `handles alternating pattern efficiently`

## Root Cause

In `src/algorithms/histogram.ts`, the `run()` method didn't clear histogram state before populating:

```typescript
run(before, after, removed, added, beforeOffset, afterOffset) {
  // ❌ BUG: No clear here!
  this.populate(before);  // Adds to existing state
  
  const lcs = this.findLcs(before, after);
  // ...recursive calls...
}
```

**Problem Flow**:
1. Call 1: `populate([1,1,1...])` → histogram has positions [0,1,2,...,69]
2. Recursive call: `populate([1,1,1...])` → **ADDS MORE** → [0,1,2,...,69,0,1,2,...]
3. LCS search gets confused by duplicate positions
4. Incorrect diff!

## Solution

Clear histogram state at the start of each `run()` call:

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

## Fix Applied

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
```

## Status
✅ **FIXED**

---

**Fixed by**: AI Assistant  
**Date**: 2025-10-04

