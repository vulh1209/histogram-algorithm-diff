# 📝 Tóm Tắt Plan Chuyển Đổi imara-diff sang TypeScript

## 🎯 Mục Tiêu
Chuyển đổi thư viện diff algorithm hiệu suất cao từ Rust sang TypeScript, duy trì hiệu năng và độ chính xác.

## ⚡ Strategy: Histogram + Simplified Myers
- **Chính**: Histogram algorithm (tối ưu, 90%+ cases)
- **Fallback**: Simplified Myers (cho repetitive content)
- **KHÔNG implement**: Full Myers với middle snake search, preprocessing phức tạp

---

## 📊 Tổng Quan Dự Án

### Thông Tin Cơ Bản
- **Ngôn ngữ hiện tại**: Rust (safe + unsafe code)
- **Ngôn ngữ đích**: TypeScript (strict mode)
- **Kích thước code**: ~1,450 LOC (giảm 30% từ full implementation)
- **Độ phức tạp**: Trung bình (bỏ phần unsafe code phức tạp nhất)
- **Thời gian ước tính**: 5-6 tuần (tiết kiệm 2 tuần)

### Cấu Trúc Module
```
lib.rs              → index.ts           (API chính)
intern.rs           → intern.ts          (Token interning)
myers.rs            → myers/simple.ts    (✨ Simplified Myers - fallback only)
histogram.rs        → histogram/index.ts (Histogram algorithm - primary)
postprocess.rs      → postprocess.ts     (Hậu xử lý)
slider_heuristic.rs → heuristic.ts       (Indent heuristics)
sources.rs          → sources.ts         (Tokenizers)
util.rs             → util.ts            (Utilities)
unified_diff.rs     → unified-diff.ts    (Output formatter)
```

**✅ Simplified (không cần implement)**:
- ❌ `myers/middle_snake.rs` - Complex pointer arithmetic
- ❌ `myers/preprocess.rs` - Preprocessing optimization
- ❌ `myers/slice.rs` - Complex slice operations
- ❌ Myers heuristics - Early abort logic

---

## ⚠️ PHẦN CÓ KHẢ NĂNG GÂY BUGS CAO

### ✅ Đã Loại Bỏ: Pointer Arithmetic (Middle Snake)
**Không cần implement** nữa do dùng Simplified Myers!
- ~~Pointer arithmetic với offset âm~~
- ~~Complex middle snake search~~
- ~~Unsafe operations~~

### 🔴 Mức Độ Nguy Hiểm Cao (Còn Lại)

#### 1. **Simplified Myers - Basic Algorithm**
**File**: `myers/simple.ts` (mới)
```typescript
// Đơn giản hơn nhiều - chỉ basic O((N+M)D) algorithm
function simpleMyers(before: Token[], after: Token[]) {
  const v = new Int32Array(2 * MAX + 1);
  // Basic Myers without complex optimizations
  // Chỉ dùng cho fallback (< 1% cases)
}
```

**Vấn đề**:
- ⚠️ Array indexing với v[d + MAX] format
- ⚠️ Backtracking logic

**Ưu điểm**:
- ✅ KHÔNG có unsafe pointer operations
- ✅ Đơn giản hơn 70% so với full Myers
- ✅ Dễ test và debug

---

#### 2. **Memory Pool Management** 
**File**: `histogram/list_pool.rs` (toàn bộ)
**Priority**: 🔴 VẪN CRITICAL (Histogram cần memory pool)

**Vấn đề**:
- ❌ Manual memory allocation/deallocation
- ❌ No automatic Drop trait như Rust
- ❌ Risk: use-after-free, memory leaks
- ❌ Generation-based validation có thể bị skip

**Solution**:
```typescript
class ListPool {
  private generation = 1;
  
  clear() {
    this.data = new Uint32Array();
    this.generation++; // Invalidate all old handles
  }
}

class ListHandle {
  len(pool: ListPool): number {
    // CRITICAL: Always check generation
    if (this.generation !== pool.generation) {
      return 0; // Handle invalidated
    }
    return this.length;
  }
}
```

**Test cần thiết**:
- [ ] Test use-after-clear detection
- [ ] Test memory leak với valgrind-like tool
- [ ] Test với large datasets (GB-level)

---

#### 3. **Integer Overflow & Bitwise Operations**
**Files**: `myers.rs:61`, `util.rs:46-48`, `list_pool.rs:104-106`

**Vấn đề**:
```rust
// Rust: Checks overflow in debug mode
let result = a + b;  // Panics if overflow

// Rust: Unsigned operations
30 - (len | 3).leading_zeros() as u8
```

**TypeScript Issues**:
```typescript
// ❌ WRONG: No overflow check
const result = a + b;  // Silent wraparound

// ❌ WRONG: Bitwise ops convert to signed 32-bit
const result = x << 1;  // Có thể thành số âm!

// ✅ CORRECT: Force unsigned
const result = (x << 1) >>> 0;

// ✅ CORRECT: Add validation
function safeAdd(a: number, b: number): number {
  const result = a + b;
  if (result > 0x7FFF_FFFF) {
    throw new RangeError('Integer overflow');
  }
  return result | 0;  // Ensure 32-bit int
}
```

**Critical locations cần check**:
- `sqrt()` function - bit shifts
- `sclass_for_length()` - leading zeros calculation
- Mọi nơi làm arithmetic với Token (u32)
- Array length calculations

---

### 🟡 Mức Độ Nguy Hiểm Trung Bình

#### 4. **Array Bounds Checking**
**Files**: Khắp nơi

**Vấn đề**:
```rust
// Rust: Panics nếu out of bounds
let x = arr[index];

// TypeScript: Returns undefined (SILENT BUG!)
const x = arr[index];  // undefined nếu out of bounds
```

**Solution**:
```typescript
// Option 1: Enable noUncheckedIndexedAccess
// tsconfig.json: "noUncheckedIndexedAccess": true
const x = arr[index];  // Type: T | undefined (bắt buộc check)

// Option 2: Safe accessor
function at<T>(arr: T[], index: number): T {
  if (index < 0 || index >= arr.length) {
    throw new RangeError(`Index ${index} out of bounds [0, ${arr.length})`);
  }
  return arr[index];
}

// Option 3: Hot path - skip checks in production
function atUnchecked<T>(arr: T[], index: number): T {
  if (DEBUG) {
    assert(index >= 0 && index < arr.length);
  }
  return arr[index];
}
```

---

#### 5. **Mutable Reference Aliasing**
**Files**: `postprocess.rs`, `myers.rs`

**Vấn đề**:
```rust
// Rust: Borrow checker prevents aliasing
fn process(removed: &mut [bool], added: &[bool]) {
  removed[0] = added[0];  // OK if removed != added
}

// TypeScript: NO PROTECTION
function process(removed: boolean[], added: boolean[]) {
  removed[0] = added[0];  // Nếu removed === added → potential bug
}
```

**Solution**:
- Document assumptions rõ ràng
- Add assertions nếu có thể
- Defensive copy nếu cần thiết

---

#### 6. **Hash Function Consistency**
**File**: `intern.rs` (hash table operations)

**Vấn đề**:
```rust
// Rust: hashbrown với high-quality hash
HashMap<T, Token>

// TypeScript Map: Built-in hash
const map = new Map<string[], number>();
map.set(['a'], 1);
map.get(['a']);  // undefined! (khác array instance)
```

**Solution**:
```typescript
class Interner<T> {
  private table = new Map<string, Token>();  // Hash to string key
  
  private hash(token: T): string {
    // Must be consistent và fast
    if (typeof token === 'string') {
      return token;
    }
    // Fallback: JSON (slow but correct)
    return JSON.stringify(token);
    
    // Better: Use fast-hash library
    // import { hash } from 'fast-hash';
    // return hash(token).toString();
  }
  
  intern(token: T): Token {
    const key = this.hash(token);
    if (this.table.has(key)) {
      return this.table.get(key)!;
    }
    const id = this.tokens.length;
    this.table.set(key, id);
    this.tokens.push(token);
    return id;
  }
}
```

---

#### 7. **Type Safety - Branded Types**
**File**: `intern.rs`

**Vấn đề**:
```rust
// Rust: Token(u32) là distinct type
#[repr(transparent)]
pub struct Token(pub u32);

// TypeScript: Just an alias
type Token = number;  // Có thể mix với number bất kỳ!
```

**Solution**:
```typescript
// Branded type pattern
type Token = number & { readonly __brand: 'Token' };
type LineNumber = number & { readonly __brand: 'LineNumber' };

function createToken(n: number): Token {
  return n as Token;
}

// Compile error nếu mix types
const tok: Token = createToken(5);
const line: LineNumber = tok;  // ❌ Error!
```

---

### 🟢 Mức Độ Nguy Hiểm Thấp (Nhưng Cần Chú Ý)

#### 8. **Unicode & Text Encoding**
```rust
// Rust: &str guaranteed valid UTF-8
// TypeScript: string có thể chứa invalid surrogates
const invalid = '\uD800';  // Lone surrogate
```

**Solution**: Validate input nếu xử lý byte-level

#### 9. **Recursion Depth**
```rust
// Rust: Có tail-call optimization (đôi khi)
// TypeScript: KHÔNG có TCO
```

**Solution**: Code đã convert thành loop → OK

#### 10. **Debug Assertions**
```rust
debug_assert!(condition);  // Compiled out in release
```

**Solution**:
```typescript
if (DEBUG) {
  assert(condition);
}
```

---

## 🧪 Testing Strategy - Checklist

### Unit Tests
- [ ] Port tất cả tests từ Rust (`tests/` directory)
- [ ] Verify output giống hệt Rust version
- [ ] Test với fixtures: `helix_syntax.rs.before/after`

### Property-Based Tests
```typescript
import { fc } from 'fast-check';

test('diff consistency', () => {
  fc.assert(fc.property(
    fc.string(), fc.string(),
    (before, after) => {
      const diff = computeDiff(before, after);
      const patched = applyDiff(before, diff);
      expect(patched).toBe(after);
    }
  ));
});
```

### Edge Cases Tests
- [ ] Empty files
- [ ] Single line files
- [ ] Files với repetitive content (pathological case)
- [ ] Files > 100MB (memory stress)
- [ ] Unicode: emoji, multi-byte chars, invalid surrogates
- [ ] Line endings: \n, \r\n, \r mixed

### Fuzz Testing
```typescript
test('never crash on random input', () => {
  for (let i = 0; i < 10000; i++) {
    const before = randomString();
    const after = randomString();
    expect(() => computeDiff(before, after)).not.toThrow();
  }
});
```

### Performance Benchmarks
- [ ] Linux kernel diff (v5.7 → v6.0)
- [ ] Rust compiler diff (1.50.0 → 1.64.0)
- [ ] VSCode diff (1.41.0 → 1.72.2)
- [ ] Target: < 5x slower than Rust

---

## 📦 Setup & Dependencies

### TypeScript Config (tsconfig.json)
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

### Package.json
```json
{
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "fast-check": "^3.0.0",
    "@types/node": "^20.0.0"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "bench": "vitest bench"
  }
}
```

---

## 📋 Implementation Checklist

### Week 1-2: Core Infrastructure
- [ ] Setup TypeScript project với strict mode
- [ ] Token type với branded type pattern
- [ ] Interner class với custom hash
- [ ] InternedInput class
- [ ] TokenSource interface
- [ ] String line tokenizer
- [ ] Byte line tokenizer
- [ ] Basic tests cho interning

### Week 3: Simplified Myers (Fallback Only)
- [ ] ~~Myers class với complex middle snake~~ ❌ KHÔNG CẦN
- [ ] ~~Offset calculation logic~~ ❌ KHÔNG CẦN
- [ ] ~~MiddleSnakeSearch implementation~~ ❌ KHÔNG CẦN
- [ ] ~~Preprocess module~~ ❌ KHÔNG CẦN
- [ ] ~~FileSlice~~ ❌ KHÔNG CẦN
- [ ] **✅ Simple Myers algorithm** (~250 LOC)
- [ ] Common prefix/postfix utilities
- [ ] Basic backtracking logic
- [ ] Tests với repetitive content cases

### Week 4: Histogram Algorithm
- [ ] ListPool implementation (critical!)
- [ ] ListHandle với generation check
- [ ] LCS search algorithm
- [ ] Histogram main logic
- [ ] **Fallback to Simplified Myers**
- [ ] Tests với repetitive inputs
- [ ] Tests fallback trigger logic

### Week 5: Postprocessing
- [ ] Postprocessor class
- [ ] slideUp/slideDown logic
- [ ] IndentHeuristic implementation
- [ ] IndentLevel calculation
- [ ] Score calculation với magic constants
- [ ] Tests cho readability improvements

### Week 6: Output & Final Testing
- [ ] Hunk iterator
- [ ] UnifiedDiff formatter
- [ ] All utility functions
- [ ] Complete test suite
- [ ] Property-based tests
- [ ] Fuzz testing (especially fallback cases)
- [ ] Performance benchmarks
- [ ] Documentation (TSDoc)
- [ ] Code review toàn bộ
- [ ] Fix performance bottlenecks
- [ ] Memory leak detection
- [ ] Final benchmarks

---

## 🎯 Success Criteria

### Correctness
✅ Pass tất cả ported Rust tests
✅ Pass property-based tests (10,000+ iterations)
✅ No crashes trong fuzz testing
✅ Output giống hệt Rust version

### Performance
✅ < 5x slower than Rust (typical case)
✅ < 10x slower than Rust (worst case)
✅ Memory usage < 2x Rust

### Quality
✅ 100% TypeScript strict mode
✅ No `any` types
✅ No `as` casts (trừ branded types)
✅ Full TSDoc documentation
✅ Code coverage > 90%

---

## 🚨 Red Flags - Khi Nào Cần Review

1. **Performance > 10x slower than Rust** → Logic bug
2. **Memory leak trong tests** → Missing cleanup
3. **Crashes với random input** → Bounds checking issue
4. **Wrong diff output** → Algorithm translation error
5. **Inconsistent behavior** → Type safety issue

---

## 💡 Best Practices Summary

### DO ✅
- Use strict TypeScript config
- Use branded types cho Token, etc
- Add runtime validation trong DEBUG mode
- Test extensively với property-based tests
- Benchmark regularly vs Rust version
- Use typed arrays (Int32Array, Uint32Array)
- Document all assumptions
- Check generation before using ListHandle

### DON'T ❌
- Assume array access is safe
- Ignore integer overflow
- Skip bounds checking
- Mix Token với regular number
- Forget to clear memory pools
- Use plain objects cho hot paths
- Rely on implicit coercion
- Skip testing edge cases

---

## 📚 Resources

- [Rust source code](https://github.com/pascalkuthe/imara-diff)
- [Myers algorithm paper](http://www.xmailserver.org/diff2.pdf)
- [TypeScript strict mode guide](https://www.typescriptlang.org/tsconfig#strict)
- [fast-check documentation](https://github.com/dubzzz/fast-check)

---

## 🎓 Conclusion

**Khả năng thực hiện**: ✅ Rất Cao (simplified strategy)

**Rủi ro chính** (đã giảm đáng kể):
1. Memory pool management (vẫn cần cẩn thận)
2. Integer arithmetic bugs (vẫn cần validation)
3. ~~Pointer arithmetic~~ ❌ ĐÃ LOẠI BỎ

**Đã loại bỏ**:
- ✅ Complex unsafe pointer operations (middle snake)
- ✅ Complex preprocessing logic
- ✅ Offset calculation nightmare
- ✅ ~60% complexity của Myers

**Chiến lược giảm thiểu rủi ro**:
- Extensive testing (unit + property + fuzz)
- Runtime validation trong development
- Focus testing on fallback cases
- Regular benchmarking

**Thời gian**: 5-6 tuần (giảm 2 tuần, tiết kiệm 25-30%)

**Độ khó**: ⭐⭐⭐ (3/5) - Trung bình, khả thi cao

**Code size**: ~1,450 LOC (giảm 30% từ 2,000 LOC)

