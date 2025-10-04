# Issue #7: Histogram Fallback Off-by-One - FIXED ✅

## 🔴 Priority: HIGH

## Problem

Histogram didn't fallback to Myers when exactly `MAX_CHAIN_LEN` (63) occurrences detected.

### Symptom
```
Test: 70 identical elements [1,1,1,...,1]
Expected: Fallback to Myers
Actual: Found LCS with len=8 (WRONG!)
```

## Root Cause Analysis

### Part 1: ListPool Limitation
In `src/algorithms/list-pool.ts:104`:

```typescript
if (len >= MAX_CHAIN_LEN) {
  // Ignore elements beyond MAX_CHAIN_LEN
  return;  // ❌ Stops pushing after 63 elements!
}
```

**Result**: Input 70 occurrences → only 63 stored → elements 64-70 lost!

### Part 2: Off-by-One Check
In `src/algorithms/histogram.ts:211`:

```typescript
if (!foundCs || minOccurrences > MAX_CHAIN_LEN) {
  return null; // Fallback needed
}
```

**Problem**:
- `minOccurrences = 63` (only 63 stored due to ListPool limit)
- Check: `63 > 63`? → **FALSE** → no fallback!
- Should: `63 >= 63`? → **TRUE** → fallback!

## Solution

Change comparison from `>` to `>=`:

```typescript:src/algorithms/histogram.ts
// Check if we succeeded
// Use >= because exactly MAX_CHAIN_LEN occurrences also needs fallback
if (!foundCs || minOccurrences >= MAX_CHAIN_LEN) {
  return null; // Fallback needed
}
```

## Fix Applied

```diff
diff --git a/src/algorithms/histogram.ts b/src/algorithms/histogram.ts
@@ -208,7 +208,8 @@ class Histogram {
     this.clear();
     
     // Check if we succeeded
-    if (!foundCs || minOccurrences > MAX_CHAIN_LEN) {
+    // Use >= because exactly MAX_CHAIN_LEN occurrences also needs fallback
+    if (!foundCs || minOccurrences >= MAX_CHAIN_LEN) {
       return null; // Fallback needed
     }
```

## Why This Matters

Without this fix:
- 70 identical elements → 63 occurrences stored
- Check fails → no fallback
- Histogram tries to find LCS with incomplete data
- **INCORRECT DIFF OUTPUT**

With fix:
- 70 identical elements → 63 occurrences stored  
- Check succeeds → fallback to Myers
- Myers handles correctly
- **CORRECT DIFF OUTPUT** ✅

## Status
✅ **FIXED**

---

**Fixed by**: AI Assistant  
**Date**: 2025-10-04

