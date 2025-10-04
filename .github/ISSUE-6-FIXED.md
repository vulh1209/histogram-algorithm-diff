# Issue #6: Myers Prefix/Postfix Overlap - FIXED ✅

## 🔴 Priority: HIGH

## Problem

SimpleMyers algorithm had overlap when calculating common prefix and postfix for identical arrays.

### Symptom
When `before === after` (same reference), Myers detected incorrect changes.

## Root Cause

In `src/algorithms/myers-simple.ts`:

```typescript
const prefix = commonPrefix(before, after);  // = 70 (full length!)
const postfix = commonPostfix(before, after); // Also counts from end!
```

**Problem**: When prefix covers entire array, postfix calculation on full arrays causes overlap:
- Prefix counts: [0...69] = all 70 elements
- Postfix counts: [...69] = tries to count from end again  
- Result: double-counted elements or negative ranges

## Solution

Calculate postfix only on remaining part after removing prefix:

```typescript:src/algorithms/myers-simple.ts
const prefix = commonPrefix(before, after);
const minLen = Math.min(before.length, after.length);

// ✅ FIX: Don't calculate postfix if prefix already covers everything
let postfix = 0;
if (prefix < minLen) {
  postfix = commonPostfix(before.slice(prefix), after.slice(prefix));
}
```

## Fix Applied

```diff
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

## Status
✅ **FIXED**

---

**Fixed by**: AI Assistant  
**Date**: 2025-10-04

