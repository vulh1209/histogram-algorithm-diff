# 📊 Phân Tích: Chỉ Implement Histogram Algorithm (Không Myers)

## 🔍 Dependencies Hiện Tại

### Myers được dùng ở 2 nơi trong code Rust:

1. **lib.rs** (dòng 286-287): Khi user chọn `Algorithm::Myers`
   ```rust
   Algorithm::Myers => myers::diff(before, after, removed, added, false),
   Algorithm::MyersMinimal => myers::diff(before, after, removed, added, true),
   ```
   ✅ **Có thể bỏ**: Chỉ hỗ trợ `Algorithm::Histogram`

2. **histogram.rs** (dòng 94-100): **CRITICAL FALLBACK**
   ```rust
   None => {
       // we are diffing two extremely large repetitive files
       // this is a worst case for histogram diff with O(N^2) performance
       // fallback to myers to maintain linear time complexity
       myers::diff(before, after, removed, added, false);
       return;
   }
   ```
   ⚠️ **QUAN TRỌNG**: Fallback khi gặp pathological case

---

## 🚨 Vấn Đề: Khi Nào Histogram Cần Fallback?

### Điều Kiện Trigger Fallback

**File**: `histogram/lcs.rs` (dòng 53-55)
```rust
fn success(&mut self) -> bool {
    !self.found_cs || self.min_occurrences <= MAX_CHAIN_LEN
}
```

**Giải thích**:
- `MAX_CHAIN_LEN = 63` (histogram.rs dòng 9)
- Nếu một token xuất hiện **> 63 lần** trong cả before VÀ after
- → LCS search trả về `None`
- → Trigger fallback to Myers

### Pathological Case Example

```typescript
// File có highly repetitive content
const before = "a\n".repeat(1000);  // 1000 dòng "a"
const after = "a\n".repeat(1000);   // 1000 dòng "a"

// Token "a\n" xuất hiện 1000 lần (> 63)
// → Histogram không thể xử lý efficiently
// → Cần fallback
```

**Tại sao cần fallback?**
- Histogram LCS với tokens lặp nhiều → O(N²) complexity
- Myers với heuristics → O(N) complexity (linear time)
- Không fallback → app bị "freeze" với large repetitive files

---

## 💡 Giải Pháp Nếu Bỏ Myers

### Option 1: ⚠️ Naive Approach (KHÔNG KHUYẾN KHÍCH)

**Cách làm**: Remove fallback, để Histogram xử lý mọi case
```typescript
if (lcs === null) {
  // OLD: myers::diff(before, after, removed, added, false);
  // NEW: Mark everything as changed
  removed.fill(true);
  added.fill(true);
  return;
}
```

**Hậu quả**:
- ❌ Với repetitive files: O(N²) complexity → CHẬM
- ❌ Files > 10MB có thể freeze browser/process
- ❌ Kết quả diff kém chất lượng (mark all as changed)
- ❌ Không maintain "solid" guarantee của imara-diff

**Khi nào acceptable**: 
- ✅ Biết chắc input không có repetitive content
- ✅ Files nhỏ (< 1MB)
- ✅ Có timeout mechanism bên ngoài

---

### Option 2: ✅ Implement Simplified Myers (KHUYẾN KHÍCH)

**Cách làm**: Implement Myers algorithm đơn giản hóa chỉ cho fallback case

```typescript
// Simplified Myers WITHOUT heuristics
// Chỉ dùng khi Histogram fail
function simpleMyers(
  before: Token[],
  after: Token[],
  removed: boolean[],
  added: boolean[]
): void {
  // Implement basic Myers algorithm
  // NO middle snake search
  // NO preprocessing
  // NO heuristics
  // Just basic O((N+M)D) algorithm
  
  // Đủ tốt cho fallback case vì:
  // 1. Chỉ trigger với repetitive content
  // 2. Repetitive content → D (edit distance) nhỏ
  // 3. Không cần optimal, chỉ cần linear time
}
```

**Ưu điểm**:
- ✅ Code đơn giản hơn nhiều (không cần middle snake, preprocessing)
- ✅ Vẫn đảm bảo không freeze
- ✅ ~200-300 LOC so với ~800 LOC full Myers
- ✅ Maintain "solid" guarantee

**Nhược điểm**:
- ⚠️ Vẫn phải implement một phần Myers
- ⚠️ Performance không tối ưu như full Myers (nhưng OK vì fallback)

**Complexity**:
- Full Myers: ⭐⭐⭐⭐⭐ (5/5)
- Simplified Myers: ⭐⭐⭐ (3/5)
- Reduction: ~60% effort

---

### Option 3: 🔄 Hybrid Approach

**Cách làm**: Combine Histogram + simple greedy algorithm

```typescript
function greedyDiff(
  before: Token[],
  after: Token[],
  removed: boolean[],
  added: boolean[]
): void {
  // Simple greedy matching
  // For each line in 'after', find best match in 'before'
  // Not minimal, but fast and reasonable for repetitive content
  
  const used = new Set<number>();
  
  for (let i = 0; i < after.length; i++) {
    let bestMatch = -1;
    let bestScore = -1;
    
    for (let j = 0; j < before.length; j++) {
      if (used.has(j)) continue;
      if (before[j] === after[i]) {
        // Found exact match
        const score = proximityScore(i, j);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = j;
        }
      }
    }
    
    if (bestMatch === -1) {
      added[i] = true;
    } else {
      used.add(bestMatch);
    }
  }
  
  // Mark remaining before lines as removed
  for (let j = 0; j < before.length; j++) {
    if (!used.has(j)) {
      removed[j] = true;
    }
  }
}
```

**Ưu điểm**:
- ✅ Không cần implement Myers
- ✅ Đơn giản, dễ hiểu
- ✅ O(N×M) nhưng fast với repetitive content
- ✅ Kết quả "reasonably good"

**Nhược điểm**:
- ⚠️ Không optimal diff
- ⚠️ Worst case vẫn O(N²)
- ⚠️ Không guarantee linear time

---

## 📊 So Sánh Options

| Tiêu chí | Option 1: No Fallback | Option 2: Simple Myers | Option 3: Greedy |
|----------|----------------------|------------------------|------------------|
| **Code complexity** | ⭐ (rất đơn giản) | ⭐⭐⭐ (trung bình) | ⭐⭐ (đơn giản) |
| **Effort** | 0 LOC | ~300 LOC | ~150 LOC |
| **Performance (normal)** | ✅ Good | ✅ Good | ✅ Good |
| **Performance (repetitive)** | ❌ O(N²) freeze | ✅ Linear | ⚠️ O(N²) but faster |
| **Diff quality** | ❌ All changed | ✅ Optimal | ⚠️ Reasonable |
| **Risk level** | 🔴 High | 🟢 Low | 🟡 Medium |
| **"Solid" guarantee** | ❌ No | ✅ Yes | ⚠️ Partial |

---

## 🎯 Recommendation

### ✅ **Option 2: Implement Simplified Myers**

**Lý do**:
1. **Code không quá phức tạp**: ~60% effort so với full Myers
2. **Maintain guarantees**: Vẫn đảm bảo không freeze
3. **Professional library**: Đáng tin cậy cho production use
4. **Future-proof**: Có thể optimize sau nếu cần

### 📝 Simplified Myers Implementation Plan

#### Các Component CẦN Implement
```
myers/
├── simple.ts          # Main simple Myers algorithm (~200 LOC)
└── common.ts          # Common prefix/postfix removal (~50 LOC)
```

#### Các Component KHÔNG CẦN
```
❌ myers/middle_snake.rs   # Complex snake search
❌ myers/preprocess.rs     # Preprocessing optimization
❌ myers/slice.rs          # Complex slice operations
❌ Heuristics              # Early abort logic
```

#### Core Algorithm (Simplified)
```typescript
export function simpleMyers(
  before: Token[],
  after: Token[],
  removed: boolean[],
  added: boolean[]
): void {
  // 1. Strip common prefix/postfix
  const prefix = commonPrefix(before, after);
  const postfix = commonPostfix(before, after);
  
  before = before.slice(prefix, before.length - postfix);
  after = after.slice(prefix, after.length - postfix);
  
  // 2. Handle edge cases
  if (before.length === 0) {
    markRange(added, prefix, prefix + after.length, true);
    return;
  }
  if (after.length === 0) {
    markRange(removed, prefix, prefix + before.length, true);
    return;
  }
  
  // 3. Simple Myers O((N+M)D) without optimizations
  const N = before.length;
  const M = after.length;
  const MAX = N + M;
  
  const v = new Int32Array(2 * MAX + 1);
  const trace: Int32Array[] = [];
  
  // Forward search
  for (let d = 0; d <= MAX; d++) {
    // ... basic Myers logic ...
    // No heuristics, no early abort
    // Just find the edit path
  }
  
  // 4. Backtrack to mark changes
  backtrack(trace, before, after, removed, added, prefix);
}
```

**Complexity**: ~250-300 LOC total

---

## 📋 Updated Implementation Checklist (Histogram Only + Simple Myers)

### Week 1-2: Core Infrastructure ✅ (Unchanged)
- [ ] Token system
- [ ] Interner
- [ ] TokenSource

### Week 3-4: ~~Myers Algorithm~~ → Simplified Myers
- [ ] ~~Full Myers with middle snake~~ ❌
- [ ] ~~Preprocessing~~ ❌
- [ ] ~~Complex heuristics~~ ❌
- [ ] **Simple Myers algorithm** (~250 LOC) ✅
- [ ] Common prefix/postfix
- [ ] Basic backtracking

### Week 5: Histogram Algorithm ✅ (Unchanged)
- [ ] ListPool
- [ ] LCS search
- [ ] **Fallback to Simple Myers**

### Week 6-7: Postprocessing & Polish ✅ (Unchanged)

---

## ⏱️ Time Savings

| Component | Original Effort | With Simple Myers | Saved |
|-----------|-----------------|-------------------|-------|
| Myers middle snake | 1.5 weeks | 0 weeks | 1.5 weeks |
| Myers preprocessing | 0.5 weeks | 0 weeks | 0.5 weeks |
| Myers heuristics | 1 week | 0 weeks | 1 week |
| Simple Myers | 0 weeks | 1 week | -1 week |
| **Total** | **7-8 weeks** | **5-6 weeks** | **2 weeks** |

**Time reduction**: ~25-30%

---

## 🎓 Final Recommendation

### ✅ Implement: Histogram + Simplified Myers

**Rationale**:
- Code complexity giảm đáng kể (~60% less than full Myers)
- Vẫn maintain "solid" guarantee (không freeze)
- Professional quality library
- Time savings: 2 weeks

**Trade-offs**:
- Fallback case không optimal như full Myers
- Nhưng fallback case hiếm gặp (< 1% real-world diffs)
- Performance vẫn acceptable

### ❌ KHÔNG Recommend: No Fallback

**Lý do**:
- Risk cao: có thể freeze với repetitive files
- Mất guarantee chính của imara-diff
- Không suitable cho production use

---

## 🚀 Quick Start Code

```typescript
// index.ts - Main API
export enum Algorithm {
  Histogram = 'histogram',
  // Myers = 'myers',  // Không expose
}

export class Diff {
  static compute(algorithm: Algorithm, input: InternedInput): Diff {
    if (algorithm === Algorithm.Histogram) {
      return histogramDiff(input);
    }
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
}

// histogram.ts
function histogramDiff(input: InternedInput): Diff {
  // ... histogram logic ...
  
  if (lcs === null) {
    // Fallback to simple Myers
    simpleMyers(before, after, removed, added);
    return;
  }
  
  // ... continue histogram ...
}

// myers/simple.ts
export function simpleMyers(
  before: Token[],
  after: Token[],
  removed: boolean[],
  added: boolean[]
): void {
  // Basic Myers algorithm
  // No optimizations
  // ~250 LOC
}
```

---

## ✅ Summary

**Decision**: Implement **Histogram + Simplified Myers**

**Benefits**:
- ✅ Giảm 60% complexity của Myers
- ✅ Tiết kiệm 2 weeks development
- ✅ Vẫn maintain quality guarantees
- ✅ Suitable cho production

**Code size**:
- Full implementation: ~2,500 LOC
- Histogram + Simple Myers: ~1,800 LOC
- Reduction: ~30%

