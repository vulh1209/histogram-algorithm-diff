# 🔍 Issue #4: Histogram Algorithm Bug Analysis

**Priority**: 🔴 Critical  
**Impact**: 11 tests failing  
**Status**: 🔬 ROOT CAUSE IDENTIFIED

---

## 🐛 The Bug

Histogram algorithm não marking changes trong `removed` và `added` arrays.

**Test Failures**:
```typescript
// Expected
expect(added).toEqual([false, true, false]);

// Actual  
expect(added).toEqual([false, false, false]);  // ❌ No changes marked!
```

---

## 🔍 Root Cause

**File**: `src/algorithms/histogram.ts:124-141`

**The Problem**: Array `slice()` creates copies in JavaScript!

```typescript
this.run(
  before.slice(0, lcs.beforeStart),
  after.slice(0, lcs.afterStart),
  removed.slice(0, lcs.beforeStart),  // ❌ Creates NEW array!
  added.slice(0, lcs.afterStart)      // ❌ Creates NEW array!
);
```

**Why It Fails**:
1. `slice()` creates a **copy** of the array
2. Recursive call modifies the **copy**
3. Original `removed`/`added` arrays remain unchanged
4. All values stay `false` ❌

**In Rust** (original):
```rust
// Rust slices are VIEWS, not copies
self.run(
  &before[..lcs.before_start],
  &after[..lcs.after_start],  
  &mut removed[..lcs.before_start],  // ✅ Modifies original!
  &mut added[..lcs.after_start]      // ✅ Modifies original!
);
```

---

## 💡 Solution

**Option 1: Pass offsets instead of slicing** (Recommended)

Change signature to include offset parameters:

```typescript
run(
  before: readonly Token[],
  after: readonly Token[],
  removed: boolean[],
  added: boolean[],
  beforeOffset: number = 0,
  afterOffset: number = 0
): void {
  // Use offsets when accessing/modifying arrays
  markRange(removed, beforeOffset, beforeOffset + lcs.beforeStart, true);
}
```

**Option 2: Return modifications and apply**

Return which indices to mark instead of modifying in-place.

**Option 3: Use views/proxies**

Create array views that modify the original (complex).

---

## 📝 Implementation Plan

### Step 1: Update `run()` signature
```typescript
private run(
  before: readonly Token[],
  after: readonly Token[],
  removed: boolean[],
  added: boolean[],
  beforeOffset: number = 0,
  afterOffset: number = 0
): void
```

### Step 2: Update recursive calls
```typescript
// Instead of slicing arrays:
this.run(
  before,  // Pass full array
  after,   // Pass full array
  removed, // Pass full array  
  added,   // Pass full array
  beforeOffset,  // Update offset
  afterOffset    // Update offset
);
```

### Step 3: Use offsets when accessing
```typescript
// Before
markRange(removed, 0, lcs.beforeStart, true);

// After
markRange(removed, beforeOffset, beforeOffset + lcs.beforeStart, true);
```

### Step 4: Update `markRange` calls
All `markRange()` calls need offset adjustment.

---

## 🎯 Expected Impact

**Tests to Fix**: 11 tests
- 4 histogram unit tests
- 5 integration tests
- 2 edge-case tests

**Pass Rate**: 83.5% → **95%** 🎯

---

## ⚠️ Complexity

**Difficulty**: Medium  
**Risk**: Medium (core algorithm change)  
**Lines Changed**: ~20-30 lines  
**Testing**: Must verify all histogram tests pass

---

## 📋 Checklist

- [ ] Update `run()` signature with offsets
- [ ] Update base case `markRange()` calls
- [ ] Update recursive calls (prefix)
- [ ] Update recursive calls (suffix)  
- [ ] Update `markRange()` for LCS matches
- [ ] Test with simple case (insertion)
- [ ] Test with deletion
- [ ] Test with replacement
- [ ] Run full test suite

---

_Analysis: Current session_  
_Ready to implement: YES_

