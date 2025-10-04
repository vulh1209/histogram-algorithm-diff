/**
 * imara-diff - A high-performance diff library for TypeScript
 * Ported from Rust: https://github.com/pascalkuthe/imara-diff
 * 
 * @packageDocumentation
 */

// Core types
export { Token, Range, range, isEmptyRange, rangeLen, DEBUG, assert } from './core/types.js';

// Token sources
export { TokenSource, StringLines, ByteLines, lines, byteLines } from './core/sources.js';

// Interning
export { Interner, InternedInput } from './core/intern.js';

// Main diff API
export { Diff, Algorithm, Hunk, hunk, HunkUtils } from './api/diff.js';

// Utilities
export {
  commonPrefix,
  commonPostfix,
  commonEdges,
  stripCommonPrefix,
  stripCommonPostfix,
  sqrt
} from './core/util.js';

/**
 * Quick start example:
 * 
 * ```typescript
 * import { Diff, Algorithm, InternedInput, StringLines } from 'imara-diff';
 * 
 * const before = "line 1\nline 2\nline 3\n";
 * const after = "line 1\nmodified\nline 3\n";
 * 
 * const input = InternedInput.new(
 *   new StringLines(before),
 *   new StringLines(after)
 * );
 * 
 * const diff = Diff.compute(Algorithm.Histogram, input);
 * 
 * console.log(`Changes: +${diff.countAdditions()}/-${diff.countRemovals()}`);
 * 
 * for (const hunk of diff.hunks()) {
 *   console.log(`Changed lines ${hunk.before.start}-${hunk.before.end}`);
 * }
 * ```
 */
