# ✅ Issue #2: FIXED - ListPool.free method not found

**Status**: ✅ RESOLVED  
**Impact**: 5 tests now should pass  
**File**: `src/algorithms/list-pool.ts`

## Problem
```typescript
class ListPool {
  private free: Uint32Array;  // ❌ Property
  
  free(block: number, sclass: SizeClass): void {  // ❌ Method with same name
    // ...
  }
  
  realloc(...) {
    this.free(block, fromSclass);  // ❌ Calls property, not method!
  }
}
```

**Root Cause**: Name conflict between property `free` and method `free()`

When calling `this.free(...)`, JavaScript resolves it to the Uint32Array property, not the method, causing "this.free is not a function" error.

## Solution
Rename property to avoid conflict:

```typescript
class ListPool {
  private freeList: Uint32Array;  // ✅ Renamed property
  
  free(block: number, sclass: SizeClass): void {  // ✅ Method works now
    this.data[block] = this.freeList[sclass]!;
    this.freeList[sclass] = toU32(block);
  }
  
  realloc(...) {
    this.free(block, fromSclass);  // ✅ Now calls method correctly
  }
}
```

## Changes Made
- Renamed `this.free` property → `this.freeList`
- Updated all references (8 occurrences)
- Method `free()` now accessible without conflict

## Expected Result
- 3 histogram tests should pass
- 2 list-pool tests should pass  
- Total: 5 tests fixed

---

_Fixed: Current session_

