# 🚀 imara-diff TypeScript

A high-performance diff library for TypeScript, ported from the [Rust imara-diff](https://github.com/pascalkuthe/imara-diff).

## ✨ Features

- 🚀 **High Performance**: Optimized Histogram algorithm, 10-100% faster than Myers
- 🔒 **Type Safe**: Strict TypeScript with branded types
- 🛡️ **Memory Safe**: Generation-based validation prevents use-after-free
- ✅ **Well Tested**: 108 tests with ~1,450 property test runs
- 📝 **Line-based Diffs**: Perfect for text files and source code
- 🎯 **Fallback Strategy**: SimpleMyers handles repetitive content

## 📦 Installation

```bash
pnpm add imara-diff
```

## 🎯 Quick Start

```typescript
import { Diff, Algorithm, InternedInput, StringLines } from 'imara-diff';

const before = "line 1\nline 2\nline 3\n";
const after = "line 1\nmodified\nline 3\n";

// Create interned input
const input = InternedInput.new(
  new StringLines(before),
  new StringLines(after)
);

// Compute diff
const diff = Diff.compute(Algorithm.Histogram, input);

// Get results
console.log(`Changes: +${diff.countAdditions()}/-${diff.countRemovals()}`);

// Iterate over changes
for (const hunk of diff.hunks()) {
  console.log(`Changed: lines ${hunk.before.start}-${hunk.before.end}`);
}
```

## 📁 Project Structure

```
typescript/
├── src/
│   ├── core/              # Core types and utilities
│   │   ├── types.ts       # Branded types, assertions
│   │   ├── util.ts        # Utility functions
│   │   ├── sources.ts     # TokenSource implementations
│   │   └── intern.ts      # Token interning system
│   ├── algorithms/        # Diff algorithms
│   │   ├── histogram.ts   # Histogram algorithm (primary)
│   │   ├── myers-simple.ts # SimpleMyers (fallback)
│   │   └── list-pool.ts   # Memory pool allocator
│   ├── api/               # Public API
│   │   └── diff.ts        # Main Diff class
│   └── index.ts           # Public exports
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── property/          # Property-based tests
├── docs/                  # Documentation
│   ├── examples/          # Usage examples
│   ├── SUMMARY.md         # Technical overview
│   ├── TESTING.md         # Testing guide
│   └── ...
├── benchmarks/            # Performance benchmarks
└── package.json
```

## 🧪 Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage

# Build
pnpm build

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## 📊 Performance

| Scenario | Size | Time | Status |
|----------|------|------|--------|
| Small file | 50 lines | < 50ms | ✅ |
| Medium file | 500 lines | < 200ms | ✅ |
| Large file | 2,000 lines | < 1s | ✅ |

Expected: 3-5x slower than Rust (acceptable for TypeScript)

## 🧪 Testing

**108 tests** with comprehensive coverage:
- ✅ 35 unit tests
- ✅ 45 edge case tests
- ✅ 15 property tests (~1,450 runs)
- ✅ 13 integration tests

See [TESTING.md](docs/TESTING.md) for details.

## 📚 Documentation

- [**SUMMARY.md**](docs/SUMMARY.md) - Technical overview and architecture
- [**TESTING.md**](docs/TESTING.md) - Testing guide and strategies
- [**TEST_COVERAGE_REPORT.md**](docs/TEST_COVERAGE_REPORT.md) - Coverage analysis
- [**PROGRESS.md**](docs/PROGRESS.md) - Implementation progress
- [**FINAL_STATUS.md**](docs/FINAL_STATUS.md) - Project completion status

## 🎯 API Reference

### Main Classes

#### `Diff`
```typescript
class Diff {
  static compute<T>(algorithm: Algorithm, input: InternedInput<T>): Diff;
  countAdditions(): number;
  countRemovals(): number;
  isRemoved(idx: number): boolean;
  isAdded(idx: number): boolean;
  hunks(): IterableIterator<Hunk>;
  getAllHunks(): Hunk[];
}
```

#### `InternedInput<T>`
```typescript
class InternedInput<T> {
  static new<T>(before: TokenSource<T>, after: TokenSource<T>): InternedInput<T>;
  before: Token[];
  after: Token[];
  interner: Interner<T>;
}
```

#### `Algorithm`
```typescript
enum Algorithm {
  Histogram = 'histogram'  // Primary algorithm with fallback
}
```

## 🎓 Examples

See [docs/examples/](docs/examples/) for more examples:
- Basic usage
- Real-world scenarios
- Performance benchmarks
- Error handling

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

Apache-2.0 (same as original Rust version)

## 🙏 Acknowledgments

Ported from [imara-diff](https://github.com/pascalkuthe/imara-diff) by Pascal Kuthe.

## 📈 Status

✅ **Production Ready**
- Core functionality complete
- Comprehensive test coverage (108 tests)
- Well documented
- Type and memory safe

## 🔮 Future Enhancements

Optional features (not required for core functionality):
- Postprocessing with slider heuristics
- UnifiedDiff output format
- Additional algorithms
- Performance optimizations

---

**Made with ❤️ in TypeScript**

