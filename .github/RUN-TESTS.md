# 🧪 Test Execution Plan

## Quick Test

```bash
cd /Users/vule/SIPHER/imara-diff
pnpm test
```

## Expected Results After Fixes

### High Priority Fixes (Completed)
- ✅ Issue #1: 15 property-based tests should pass
- ✅ Issue #2: 5 ListPool/Histogram tests should pass  
- ✅ Issue #3: 1 token validation test should pass

**Total Fixed**: ~21 tests (60% improvement)

### Remaining Failures (Expected)
- 🟡 ~8 Histogram algorithm tests (Issue #4)
- 🟡 1-2 Generation counter tests (Issue #5, #6)
- 🟡 1 Module import test (Issue #7)
- 🟡 2-3 Edge case tests (dependent on above)

**Expected Remaining**: ~14 failed tests

---

## Test by Priority

### Test Critical Fixes
```bash
# Property-based tests (Issue #1)
pnpm test property-based

# ListPool tests (Issue #2)
pnpm test list-pool

# Token validation (Issue #3)
pnpm test edge-cases -t "integer overflow"
```

### Test Remaining Issues
```bash
# Histogram tests (Issue #4)
pnpm test histogram

# Integration tests
pnpm test integration
```

---

## Success Criteria

✅ **Minimal Success**: 80+ tests passing (82%)  
✅ **Good Success**: 85+ tests passing (87%)  
🎯 **Full Success**: 97 tests passing (100%)

---

## If Tests Still Fail

1. Check error messages
2. Verify all file changes were saved
3. Clear cache: `rm -rf node_modules/.vite`
4. Reinstall: `pnpm install`
5. Review issue files in `.github/` directory

---

_Ready to test!_ 🚀

