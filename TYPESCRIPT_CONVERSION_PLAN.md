# Plan Chuyển Đổi imara-diff sang TypeScript

## 📋 Tổng Quan Dự Án

**imara-diff** là một thư viện diff algorithm hiệu suất cao được viết bằng Rust, cung cấp 2 thuật toán:
- **Myers Algorithm**: Thuật toán O((N+M)D) linear-space với preprocessing và heuristics
- **Histogram Algorithm**: Biến thể của patience diff, tối ưu hơn Myers 10-100%

### Các Module Chính

```
src/
├── lib.rs              # Entry point, Diff struct, Algorithm enum
├── intern.rs           # Token interning system (deduplicate tokens)
├── myers.rs            # Myers diff algorithm
│   ├── middle_snake.rs # Middle snake search (unsafe pointer operations)
│   ├── preprocess.rs   # Preprocessing để loại bỏ tokens không liên quan
│   └── slice.rs        # File slice operations
├── histogram.rs        # Histogram diff algorithm
│   ├── lcs.rs          # Longest Common Subsequence search
│   └── list_pool.rs    # Custom memory pool allocator
├── postprocess.rs      # Hậu xử lý để tạo human-readable diff
├── slider_heuristic.rs # Indent-based heuristics
├── sources.rs          # TokenSource implementations (lines, bytes)
├── util.rs             # Utility functions
└── unified_diff.rs     # Unified diff printer (git diff format)
```

---

## 🎯 Chiến Lược Chuyển Đổi

### Phase 1: Core Types & Infrastructure (Tuần 1-2)

#### 1.1 Token System (`intern.ts`)
```typescript
// Token type - u32 in Rust
export type Token = number; // 0 to 2^31-2

// Interner using Map instead of HashTable
export class Interner<T> {
  private tokens: T[] = [];
  private table: Map<string, Token> = new Map();
  
  intern(token: T): Token;
  clear(): void;
  numTokens(): number;
  get(token: Token): T;
}

// InternedInput
export class InternedInput<T> {
  before: Token[];
  after: Token[];
  interner: Interner<T>;
}
```

**⚠️ Potential Bugs:**
- **Hash collisions**: TypeScript Map uses structural equality, cần custom hash function cho complex types
- **Memory leaks**: Không có automatic memory management như Rust, cần manually clear
- **Token ID overflow**: JavaScript number an toàn đến 2^53, nhưng code giả định u32 (2^32)

#### 1.2 TokenSource Interface (`sources.ts`)
```typescript
export interface TokenSource<T> {
  tokenize(): Iterator<T>;
  estimateTokens(): number;
}

// Default implementation for strings (line-based)
export class StringLineSource implements TokenSource<string> {
  constructor(private data: string) {}
  // Split by \n, keeping newline chars
}
```

**⚠️ Potential Bugs:**
- **Unicode handling**: Rust str là valid UTF-8, JS string có thể chứa invalid surrogates
- **Line ending differences**: \r\n vs \n handling khác nhau giữa platforms
- **Performance**: String splitting trong JS chậm hơn memchr của Rust

---

### Phase 2: Core Algorithms (Tuần 3-5)

#### 2.1 Myers Algorithm (`myers/`)

**myers.ts - Main Entry**
```typescript
export class Myers {
  private kvec: Int32Array;  // Replace NonNull<[i32]>
  private kforward: number;  // Offset into kvec
  private kbackward: number; // Offset into kvec
  private maxCost: number;
  
  constructor(len1: number, len2: number) {
    const ndiags = len1 + len2 + 3;
    this.kvec = new Int32Array(2 * ndiags + 2);
    this.maxCost = Math.floor(Math.sqrt(ndiags));
  }
}
```

**⚠️ CRITICAL BUGS - Unsafe Code:**
1. **Pointer arithmetic**: Rust dùng `unsafe { ptr.offset(k) }`, TS cần index arithmetic cẩn thận
   ```rust
   // Rust
   unsafe { self.kvec.as_ptr().offset(k as isize).read() }
   
   // TypeScript - CẨN THẬN: phải tính offset chính xác
   this.kvec[this.kforward + k]  // Dễ sai offset
   ```

2. **Array bounds checking**: Rust có debug_assert!, TS không có compile-time checks
   - Cần thêm runtime validation trong development mode
   - Production mode có thể skip để tối ưu performance

3. **Integer overflow**: 
   ```rust
   // Rust checks overflow in debug mode
   let sum = a + b;  // Panics nếu overflow
   
   // TypeScript - KHÔNG CHECK
   const sum = a + b;  // Silent wraparound hoặc sai
   ```
   - **Solution**: Thêm assertion `assert(sum === (sum | 0))` để kiểm tra 32-bit range

**middle_snake.ts**
```typescript
export class MiddleSnakeSearch<BACK extends boolean> {
  private kvec: Int32Array;
  private kvecOffset: number;  // Base offset for indexing
  
  // CRITICAL: Must validate bounds
  private writeXPosAtDiagonal(k: number, tokenIdx1: number): void {
    if (DEBUG) {
      assert(k >= this.dmin - 1 && k <= this.dmax + 1);
    }
    this.kvec[this.kvecOffset + k] = tokenIdx1;
  }
}
```

**⚠️ Potential Bugs:**
- **Generic const parameters**: Rust `const BACK: bool` không có equivalent trực tiếp trong TS
  - Solution: Dùng boolean flag hoặc hai class riêng biệt
- **Memory aliasing**: Rust borrow checker đảm bảo không có aliasing, TS không
- **Off-by-one errors**: Rất dễ xảy ra khi convert pointer arithmetic

#### 2.2 Histogram Algorithm (`histogram/`)

**list_pool.ts - Memory Pool**
```typescript
export class ListPool {
  private data: Uint32Array;
  private free: Uint32Array;  // Free list heads
  private generation: number;
  
  alloc(sizeClass: number): number;
  free(block: number, sizeClass: number): void;
}
```

**⚠️ CRITICAL BUGS - Memory Management:**
1. **Manual memory management**: Rust's Drop trait vs manual cleanup
   - Risk: Forgot to free blocks → memory leaks
   - Solution: Use `try/finally` hoặc RAII-like pattern với Symbol.dispose (TC39 proposal)

2. **Generation-based validation**: 
   ```rust
   if self.generation == pool.generation { /* valid */ }
   ```
   - Risk: Quên kiểm tra → use-after-free bugs
   - Solution: Strict checks với TypeScript strict mode

3. **Size class calculations**:
   ```rust
   const fn sclass_for_length(len: u32) -> u8 {
       30 - (len | 3).leading_zeros() as u8
   }
   ```
   - Risk: JavaScript bitwise operations convert to 32-bit signed integers
   - Solution: Use `>>> 0` để force unsigned

**lcs.ts - Longest Common Subsequence**
```typescript
export function findLcs(
  before: Token[],
  after: Token[],
  histogram: Histogram
): Lcs | null {
  // Histogram-based LCS search
  // Fall back to Myers if too many repetitions (>64)
}
```

**⚠️ Potential Bugs:**
- **Recursion depth**: Rust có tail-call optimization, JS không
  - Risk: Stack overflow với large files
  - Solution: Convert recursion sang loop (như code đã làm)

---

### Phase 3: Postprocessing & Heuristics (Tuần 6)

#### 3.1 Postprocessing (`postprocess.ts`)
```typescript
export class Postprocessor<H extends SliderHeuristic> {
  private slideUp(): boolean;
  private slideDown(): boolean;
}
```

**⚠️ Potential Bugs:**
- **Mutation tracking**: Rust borrow checker đảm bảo safe mutation, TS không
- **Debug assertions**: `debug_assert!(success)` bị loại bỏ trong TS production
  - Risk: Logic errors không được phát hiện

#### 3.2 Slider Heuristics (`slider_heuristic.ts`)
```typescript
export class IndentHeuristic {
  bestSliderEnd(tokens: Token[], hunk: Range, earliestEnd: number): number;
}

export class IndentLevel {
  static forAsciiLine(src: Uint8Array, tabWidth: number): IndentLevel;
}
```

**⚠️ Potential Bugs:**
- **Byte vs character indexing**: Rust &[u8] vs JS string
  - Risk: Unicode characters → wrong indent level
- **Magic constants**: Các penalty constants cần test kỹ

---

### Phase 4: Utilities & Output (Tuần 7)

#### 4.1 Utilities (`util.ts`)
```typescript
export function sqrt(val: number): number {
  // Rust: 1 << nbits
  // TS: Math.floor(Math.sqrt(val))
  const nbits = Math.floor((32 - Math.clz32(val)) / 2);
  return 1 << nbits;
}
```

**⚠️ Potential Bugs:**
- **Math.clz32() behavior**: Different semantics từ Rust's leading_zeros()
  - Must validate edge cases: clz32(0) = 32

#### 4.2 Unified Diff (`unified_diff.ts`)
```typescript
export class UnifiedDiff {
  toString(): string;  // Format như git diff
}
```

---

## 🐛 Critical Bug Risks - Tổng Hợp

### 1. **Memory Safety Issues** ⚠️⚠️⚠️
| Risk | Rust | TypeScript | Mitigation |
|------|------|------------|------------|
| Use-after-free | Prevented by borrow checker | Possible | Generation-based validation |
| Buffer overflow | Prevented by bounds checking | Possible | Explicit bounds checks |
| Memory leaks | Automatic (Drop) | Manual | Clear documentation, testing |
| Null pointer deref | Prevented by Option<T> | Possible | Strict null checks enabled |

### 2. **Integer Arithmetic** ⚠️⚠️
```typescript
// WRONG: JavaScript bitwise ops are signed 32-bit
function wrong(x: number): number {
  return x << 1;  // Overflow → negative
}

// CORRECT: Force unsigned
function correct(x: number): number {
  return (x << 1) >>> 0;
}

// VALIDATION: Add assertions
function safe(x: number): number {
  assert(x >= 0 && x < 0x7FFF_FFFF, "Value out of u32 range");
  return (x << 1) >>> 0;
}
```

**Locations cần check:**
- `sclass_for_length()` - bitwise ops
- `Token` arithmetic - array indexing
- `sqrt()` - bit shifts
- All array length calculations

### 3. **Array Indexing** ⚠️⚠️
```typescript
// Rust: Panics on out-of-bounds
let x = arr[index];

// TypeScript: Returns undefined (SILENT BUG)
const x = arr[index];  // Có thể undefined!

// Solution: Use strict access pattern
function safeGet<T>(arr: T[], index: number): T {
  if (index < 0 || index >= arr.length) {
    throw new RangeError(`Index ${index} out of bounds`);
  }
  return arr[index];
}
```

### 4. **Pointer Arithmetic → Array Indexing** ⚠️⚠️⚠️
```rust
// Rust: kvec.as_ptr().offset(k)
// k có thể âm → pointer có thể point backwards

// TypeScript WRONG:
this.kvec[k]  // Nếu k < 0 → sai!

// TypeScript CORRECT:
this.kvec[this.baseOffset + k]  // baseOffset dương, k có thể âm
```

**Critical locations:**
- `MiddleSnakeSearch`: kforward, kbackward offsets
- `ListPool`: block indexing

### 5. **Mutable References** ⚠️⚠️
```rust
// Rust: Borrow checker prevents
fn foo(a: &mut Vec<bool>, b: &[bool]) {
    a[0] = b[0];  // OK nếu a != b
}

// TypeScript: NO PROTECTION
function foo(a: boolean[], b: boolean[]): void {
  a[0] = b[0];  // a và b có thể là cùng array → race condition
}
```

**Solution**: Document assumptions, defensive copying nếu cần

### 6. **Type Safety Gaps** ⚠️
```typescript
// Rust: Token(u32) is distinct type
// TypeScript: Token is just number → no type safety

type Token = number;  // ❌ Có thể mix với number thường
type TokenIdx = number;  // ❌ Có thể mix với Token

// Better: Branded types
type Token = number & { readonly __brand: 'Token' };
type TokenIdx = number & { readonly __brand: 'TokenIdx' };

function token(n: number): Token {
  return n as Token;
}
```

### 7. **Hash Function Inconsistency** ⚠️⚠️
```typescript
// Rust: hashbrown uses high-quality hash (SipHash, etc)
// TypeScript Map: Uses === equality + built-in hash

// Problem: Complex objects
const map = new Map<string[], number>();
map.set(['a', 'b'], 1);
map.get(['a', 'b']);  // undefined! (Different array instance)

// Solution: Custom hash + equality
class Interner<T> {
  private hash(token: T): string {
    // Must be consistent with equality
    return JSON.stringify(token);  // Simple but slow
    // Better: Use fast-hash library
  }
}
```

### 8. **Unicode & Text Encoding** ⚠️
```rust
// Rust: &str guaranteed valid UTF-8
// TypeScript: string có thể contain invalid surrogates

// Example:
const str = '\uD800';  // Invalid surrogate (no pair)
// Có thể gây bugs trong byte-level operations
```

**Affected functions:**
- `IndentLevel.forAsciiLine()` - assumes valid ASCII/UTF-8
- Line splitting - \r\n handling

---

## 📦 Dependencies & Tooling

### NPM Dependencies
```json
{
  "dependencies": {
    "fast-hash": "^3.0.0"  // Thay thế hashbrown
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",  // Testing
    "@types/node": "^20.0.0"
  }
}
```

### TypeScript Config
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,  // arr[i] returns T | undefined
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

---

## 🧪 Testing Strategy

### 1. Port Existing Tests
- Convert tests từ `tests/` directory
- Verify identical output cho các test cases

### 2. Property-Based Testing
```typescript
import { fc } from 'fast-check';

test('diff is consistent', () => {
  fc.assert(
    fc.property(fc.string(), fc.string(), (before, after) => {
      const diff = computeDiff(before, after);
      // Apply diff to before → should equal after
      expect(applyDiff(before, diff)).toBe(after);
    })
  );
});
```

### 3. Fuzz Testing
- Tạo random inputs để tìm edge cases
- Test với pathological cases:
  - Very repetitive text (worst case for Histogram)
  - Very large files (memory stress test)
  - Unicode edge cases

### 4. Performance Benchmarks
```typescript
// Compare với Rust version
benchmark('linux-kernel-diff', () => {
  diff(linuxV5_7, linuxV6_0);
});

// Expect: 2-5x slower than Rust (acceptable)
// Red flag: >10x slower → algorithm bug
```

---

## 📊 Migration Checklist

### Core Infrastructure
- [ ] Token type với branded type
- [ ] Interner với custom hash
- [ ] InternedInput
- [ ] TokenSource interface
- [ ] Line/byte tokenizers

### Myers Algorithm
- [ ] Myers main struct với Int32Array
- [ ] MiddleSnakeSearch với proper offset handling
- [ ] Preprocess module
- [ ] FileSlice
- [ ] Integer overflow checks
- [ ] Bounds validation (debug mode)

### Histogram Algorithm
- [ ] ListPool với generation validation
- [ ] ListHandle
- [ ] LCS search
- [ ] Fallback to Myers logic

### Postprocessing
- [ ] Postprocessor
- [ ] Slider heuristics
- [ ] IndentLevel calculation

### Output & Utilities
- [ ] Hunk iterator
- [ ] Unified diff formatter
- [ ] Utility functions
- [ ] Common prefix/postfix

### Testing
- [ ] Port existing Rust tests
- [ ] Add property-based tests
- [ ] Unicode edge case tests
- [ ] Performance benchmarks
- [ ] Memory leak detection

### Documentation
- [ ] API documentation (TSDoc)
- [ ] Migration notes từ Rust version
- [ ] Known limitations
- [ ] Performance characteristics

---

## 🎓 Recommendations

### DO:
✅ Use strict TypeScript config (strict, noUncheckedIndexedAccess)
✅ Add runtime validation trong development mode
✅ Use branded types cho Token, etc
✅ Document all unsafe assumptions
✅ Test extensively với property-based tests
✅ Benchmark so với Rust version
✅ Use typed arrays (Int32Array, Uint32Array) cho performance

### DON'T:
❌ Assume array access is safe (`arr[i]` có thể undefined)
❌ Ignore integer overflow (use assertions)
❌ Skip bounds checking
❌ Mix Token với regular number
❌ Forget to clear memory pools
❌ Rely on implicit coercion
❌ Use plain objects cho performance-critical code

---

## 🚀 Performance Considerations

### Expected Performance vs Rust
- **Best case**: 2-3x slower (khá tốt cho JS)
- **Typical case**: 3-5x slower
- **Worst case**: 5-10x slower
- **Red flag**: >10x slower → có bug logic

### Optimization Targets
1. **Hot paths**: Myers middle snake search, LCS loop
2. **Memory allocation**: Reuse buffers, avoid GC pressure
3. **Array access**: Minimize bounds checks trong hot loops
4. **Hash operations**: Use fast hash function

### JS-Specific Optimizations
```typescript
// Use typed arrays
const kvec = new Int32Array(size);  // Faster than number[]

// Avoid array resizing
arr.length = 0;  // Clear without realloc
arr.push(...items);  // Better than concat

// Inline hot functions (may help JIT)
// Avoid megamorphic call sites
```

---

## 📌 Conclusion

Conversion sang TypeScript là **feasible** nhưng có **significant risks** liên quan đến:
1. Memory safety (no borrow checker)
2. Integer arithmetic (no overflow detection)
3. Pointer arithmetic → array indexing
4. Type safety (weaker than Rust)

**Success requires**:
- Extensive testing (unit + property + fuzz)
- Runtime validation (debug mode)
- Careful code review
- Performance benchmarking

**Estimated effort**: 7-8 tuần với 1 experienced developer

**Risk level**: ⚠️⚠️⚠️ MEDIUM-HIGH (due to unsafe operations trong original code)

