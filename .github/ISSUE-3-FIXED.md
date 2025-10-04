# ✅ Issue #3: FIXED - Token validation off-by-one

**Status**: ✅ RESOLVED  
**Impact**: 1 test now should pass  
**File**: `src/core/types.ts`

## Problem
```typescript
if (n < 0 || n >= 0x7FFF_FFFF) {  // ❌ Excludes max value
  throw new RangeError(`Token ${n} out of valid range [0, ${0x7FFF_FFFF})`);
}
```

Test expected `0x7FFF_FFFF` (2147483647) to be valid, but it was rejected.

## Solution
```typescript
if (n < 0 || n > 0x7FFF_FFFF) {  // ✅ Includes max value
  throw new RangeError(`Token ${n} out of valid range [0, ${0x7FFF_FFFF}]`);
}
```

## Changes Made
- Line 20: Changed `>=` to `>` to allow max value
- Line 21: Updated error message from `[0, X)` to `[0, X]` (inclusive)

## Expected Result
- Test "should reject sequences larger than i32::MAX" should pass
- Token value 2147483647 (0x7FFF_FFFF) is now valid

---

_Fixed: Current session_

