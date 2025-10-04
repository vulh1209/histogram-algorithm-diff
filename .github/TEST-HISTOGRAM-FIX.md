# 🧪 Test Plan - Histogram Fix

## 🎯 Quick Test

```bash
cd /Users/vule/SIPHER/imara-diff
pnpm test
```

---

## 📊 Expected Improvement

### Before Fix
- ❌ Failed: 16 tests
- ✅ Passed: 81 tests (83.5%)

### After Fix (Expected)
- ❌ Failed: ~5 tests  
- ✅ Passed: ~92 tests (**95%**) 🎯

**Improvement**: +11 tests passing

---

## 🎯 Specific Tests to Verify

### Histogram Unit Tests (4 tests)
```bash
pnpm test histogram
```

Should pass:
- ✅ detects single insertion
- ✅ detects single deletion
- ✅ detects replacement
- ✅ handles complex diff
- ✅ uses LCS to find longest match

### Integration Tests (5 tests)
```bash
pnpm test integration
```

Should pass:
- ✅ Scenario: Git commit diff simulation
- ✅ Scenario: Configuration file update
- ✅ Scenario: README documentation update
- ✅ Scenario: Mixed content types
- ✅ Benchmark: Many small hunks

### Edge Case Tests (2 tests)
```bash
pnpm test edge-cases
```

Should pass:
- ✅ should produce correct hunks for multiple changes
- ✅ should handle many small changes

---

## 🔴 Remaining Issues (Expected ~5)

After this fix, these should still fail:
- Generation counter tests (Issues #5, #6)
- Module import test (Issue #7)
- 1-2 dependent tests

---

## ✅ Success Criteria

**Minimum**: 90/97 tests passing (93%)  
**Target**: 92/97 tests passing (95%)  
**Perfect**: 97/97 tests passing (100%) - after fixing remaining issues

---

## 🐛 If Tests Still Fail

1. Check console for new errors
2. Verify offset calculations are correct
3. Test simple case manually
4. Compare with Rust implementation

---

_Ready to test!_ 🚀

