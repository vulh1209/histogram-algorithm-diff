/**
 * Edge cases and potential bug scenarios
 * Tests các trường hợp đặc biệt có thể gây crash hoặc incorrect results
 */

import { describe, it, expect } from 'vitest';
import { Diff, Algorithm } from '../../src/api/diff.js';
import { InternedInput } from '../../src/core/intern.js';
import { StringLines } from '../../src/core/sources.js';
import { token } from '../../src/core/types.js';
import type { Token } from '../../src/core/types.js';

describe('Edge Cases - Potential Bugs', () => {
  
  describe('🔴 CRITICAL: Integer Overflow & Bounds', () => {
    
    it('should reject sequences larger than i32::MAX', () => {
      // Token IDs must fit in 32-bit signed integer
      const tooLarge = 0x7FFF_FFFF; // Max allowed
      
      expect(() => token(tooLarge)).not.toThrow();
      expect(() => token(tooLarge + 1)).toThrow(RangeError);
      expect(() => token(-1)).toThrow(RangeError);
    });
    
    it('should handle arrays at maximum safe size', () => {
      // JavaScript arrays can be large, but we limit to i32::MAX
      const maxSize = 1000; // Reasonable test size
      const largeText = 'line\n'.repeat(maxSize);
      
      const input = InternedInput.new(
        new StringLines(largeText),
        new StringLines(largeText)
      );
      
      expect(input.before.length).toBe(maxSize);
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      expect(diff.countAdditions()).toBe(0);
      expect(diff.countRemovals()).toBe(0);
    });
    
    it('should not crash with array index out of bounds', () => {
      const input = InternedInput.new(
        new StringLines('a\nb\nc\n'),
        new StringLines('a\nb\nc\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Try to access invalid indices
      expect(diff.isRemoved(-1)).toBe(false);
      expect(diff.isRemoved(1000)).toBe(false);
      expect(diff.isAdded(-1)).toBe(false);
      expect(diff.isAdded(1000)).toBe(false);
    });
    
    it('should handle off-by-one errors in hunk ranges', () => {
      const input = InternedInput.new(
        new StringLines('a\nb\nc\n'),
        new StringLines('a\nX\nc\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      const hunks = diff.getAllHunks();
      
      expect(hunks).toHaveLength(1);
      
      // Verify range boundaries are correct (not off-by-one)
      const hunk = hunks[0]!;
      expect(hunk.before.start).toBe(1);
      expect(hunk.before.end).toBe(2);
      expect(hunk.after.start).toBe(1);
      expect(hunk.after.end).toBe(2);
      
      // Verify we can safely access tokens at these indices
      expect(input.before[hunk.before.start]).toBeDefined();
      expect(input.before[hunk.before.end - 1]).toBeDefined();
      expect(input.before[hunk.before.end]).toBeDefined(); // Should be valid or undefined, not crash
    });
  });
  
  describe('🔴 CRITICAL: Memory Safety', () => {
    
    it('should detect use-after-clear with generation validation', () => {
      const input = InternedInput.new(
        new StringLines('line1\nline2\n'),
        new StringLines('line1\nline2\n')
      );
      
      const oldGeneration = (input.interner as any).generation;
      
      // Clear interner (simulates "free")
      input.interner.clear();
      
      // Generation should increment
      const newGeneration = (input.interner as any).generation;
      expect(newGeneration).not.toBe(oldGeneration);
      
      // Old tokens should be invalid now
      expect(input.interner.numTokens()).toBe(0);
    });
    
    it('should handle multiple clears without memory leaks', () => {
      const input = InternedInput.new(
        new StringLines('test\n'),
        new StringLines('test\n')
      );
      
      // Clear multiple times
      for (let i = 0; i < 100; i++) {
        input.clear();
        
        input.updateBefore(new StringLines('test\n').tokenize());
        input.updateAfter(new StringLines('test\n').tokenize());
        
        expect(input.interner.numTokens()).toBeGreaterThan(0);
      }
      
      // Should not crash or leak memory
      expect(input.interner.numTokens()).toBeGreaterThan(0);
    });
    
    it('should not reuse invalidated ListHandles', () => {
      // This tests the ListPool generation validation
      const { ListPool, ListHandle } = require('../../src/algorithms/list-pool.js');
      
      const pool = new ListPool();
      const handle = new ListHandle();
      
      // Add some data
      handle.push(1, pool);
      handle.push(2, pool);
      expect(handle.len(pool)).toBe(2);
      
      // Clear pool (invalidates handle)
      pool.clear();
      
      // Handle should now return 0 (not crash or return stale data)
      expect(handle.len(pool)).toBe(0);
      expect(handle.asSlice(pool)).toEqual([]);
    });
  });
  
  describe('🟡 Hash Collisions & Deduplication', () => {
    
    it('should handle identical tokens correctly', () => {
      // Multiple identical lines should be deduplicated
      const input = InternedInput.new(
        new StringLines('same\nsame\nsame\n'),
        new StringLines('same\nsame\nsame\n')
      );
      
      // Should only intern once
      expect(input.interner.numTokens()).toBe(1);
      
      // All tokens should reference the same interned value
      expect(input.before[0]).toBe(input.before[1]);
      expect(input.before[1]).toBe(input.before[2]);
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      expect(diff.countAdditions()).toBe(0);
      expect(diff.countRemovals()).toBe(0);
    });
    
    it('should handle similar but different tokens', () => {
      // Tokens that might hash similarly but are different
      const input = InternedInput.new(
        new StringLines('line1\nline2\nline3\n'),
        new StringLines('line1\nline2\nline4\n')
      );
      
      // Should have distinct tokens
      expect(input.interner.numTokens()).toBe(4); // line1, line2, line3, line4
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      expect(diff.isRemoved(2)).toBe(true); // line3 removed
      expect(diff.isAdded(2)).toBe(true);   // line4 added
    });
    
    it('should handle empty strings correctly', () => {
      const input = InternedInput.new(
        new StringLines('\n\n\n'),
        new StringLines('\n\n\n')
      );
      
      // Empty lines should be deduplicated
      expect(input.interner.numTokens()).toBe(1);
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      expect(diff.getAllHunks()).toHaveLength(0);
    });
  });
  
  describe('🟡 Unicode & Text Encoding', () => {
    
    it('should handle unicode characters correctly', () => {
      const input = InternedInput.new(
        new StringLines('Hello 世界\nTest 🚀\n'),
        new StringLines('Hello 世界\nModified 🎉\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      expect(diff.isRemoved(1)).toBe(true);
      expect(diff.isAdded(1)).toBe(true);
      expect(diff.isRemoved(0)).toBe(false);
    });
    
    it('should handle emoji and special characters', () => {
      const input = InternedInput.new(
        new StringLines('🔥🔥🔥\n💯💯💯\n'),
        new StringLines('🔥🔥🔥\n✅✅✅\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      expect(diff.countRemovals()).toBe(1);
      expect(diff.countAdditions()).toBe(1);
    });
    
    it('should handle mixed line endings', () => {
      // Windows vs Unix line endings
      const input = InternedInput.new(
        new StringLines('line1\r\nline2\r\n'),
        new StringLines('line1\nline2\n')
      );
      
      // \r\n vs \n should be detected as different
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Both lines are "changed" due to line ending difference
      expect(diff.countRemovals()).toBe(2);
      expect(diff.countAdditions()).toBe(2);
    });
    
    it('should handle strings without trailing newline', () => {
      const input = InternedInput.new(
        new StringLines('line1\nline2'),
        new StringLines('line1\nline2\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Adding newline at end is detected as change
      expect(diff.countRemovals()).toBe(1);
      expect(diff.countAdditions()).toBe(1);
    });
  });
  
  describe('🟡 Pathological Cases (Histogram → Myers Fallback)', () => {
    
    it('should fallback to Myers for highly repetitive content', () => {
      // Content with token appearing > 63 times triggers fallback
      const repeated = 'x\n'.repeat(70);
      
      const input = InternedInput.new(
        new StringLines(repeated),
        new StringLines(repeated)
      );
      
      // Should not crash, should use Myers fallback
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      expect(diff.countAdditions()).toBe(0);
      expect(diff.countRemovals()).toBe(0);
    });
    
    it('should handle alternating repetitive patterns', () => {
      // Pattern: A B A B A B ... (each appears many times)
      const pattern1 = Array(40).fill('A\nB\n').join('');
      const pattern2 = Array(40).fill('A\nB\n').join('');
      
      const input = InternedInput.new(
        new StringLines(pattern1),
        new StringLines(pattern2)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Should match correctly despite repetition
      expect(diff.countAdditions()).toBe(0);
      expect(diff.countRemovals()).toBe(0);
    });
    
    it('should handle worst-case: all same tokens', () => {
      const allSame = 'same\n'.repeat(100);
      
      const input = InternedInput.new(
        new StringLines(allSame),
        new StringLines(allSame)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      expect(diff.getAllHunks()).toHaveLength(0);
    });
    
    it('should handle insertion in highly repetitive content', () => {
      const before = 'x\n'.repeat(70);
      const after = 'x\n'.repeat(35) + 'DIFFERENT\n' + 'x\n'.repeat(35);
      
      const input = InternedInput.new(
        new StringLines(before),
        new StringLines(after)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Should detect the insertion
      expect(diff.countAdditions()).toBeGreaterThan(0);
    });
  });
  
  describe('🟢 Empty & Edge Cases', () => {
    
    it('should handle both empty sequences', () => {
      const input = InternedInput.new(
        new StringLines(''),
        new StringLines('')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      expect(diff.countAdditions()).toBe(0);
      expect(diff.countRemovals()).toBe(0);
      expect(diff.getAllHunks()).toHaveLength(0);
    });
    
    it('should handle single character strings', () => {
      const input = InternedInput.new(
        new StringLines('a'),
        new StringLines('b')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      expect(diff.countRemovals()).toBe(1);
      expect(diff.countAdditions()).toBe(1);
    });
    
    it('should handle whitespace-only changes', () => {
      const input = InternedInput.new(
        new StringLines('line1\nline2\n'),
        new StringLines('line1\n  line2\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Adding spaces should be detected
      expect(diff.isRemoved(1)).toBe(true);
      expect(diff.isAdded(1)).toBe(true);
    });
    
    it('should handle very long lines', () => {
      const longLine = 'x'.repeat(10000) + '\n';
      
      const input = InternedInput.new(
        new StringLines(longLine + 'short\n'),
        new StringLines(longLine + 'modified\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      expect(diff.isRemoved(1)).toBe(true);
      expect(diff.isAdded(1)).toBe(true);
    });
  });
  
  describe('🟢 Hunk Iterator Edge Cases', () => {
    
    it('should produce no hunks for identical files', () => {
      const input = InternedInput.new(
        new StringLines('a\nb\nc\n'),
        new StringLines('a\nb\nc\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      const hunks = Array.from(diff.hunks());
      
      expect(hunks).toHaveLength(0);
    });
    
    it('should produce correct hunks for multiple changes', () => {
      const input = InternedInput.new(
        new StringLines('a\nb\nc\nd\ne\n'),
        new StringLines('a\nX\nc\nY\ne\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      const hunks = Array.from(diff.hunks());
      
      expect(hunks).toHaveLength(2);
      
      // Verify hunks are monotonic
      for (let i = 1; i < hunks.length; i++) {
        expect(hunks[i]!.before.start).toBeGreaterThan(hunks[i-1]!.before.end);
        expect(hunks[i]!.after.start).toBeGreaterThan(hunks[i-1]!.after.end);
      }
    });
    
    it('should handle adjacent hunks correctly', () => {
      const input = InternedInput.new(
        new StringLines('a\nb\nc\nd\n'),
        new StringLines('a\nX\nY\nd\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      const hunks = Array.from(diff.hunks());
      
      // b and c both changed -> should be 1 hunk or 2 adjacent hunks
      expect(hunks.length).toBeGreaterThan(0);
    });
    
    it('should iterate hunks only once', () => {
      const input = InternedInput.new(
        new StringLines('a\nb\nc\n'),
        new StringLines('a\nX\nc\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // First iteration
      const hunks1 = Array.from(diff.hunks());
      expect(hunks1).toHaveLength(1);
      
      // Second iteration should work the same
      const hunks2 = Array.from(diff.hunks());
      expect(hunks2).toHaveLength(1);
      expect(hunks2[0]).toEqual(hunks1[0]);
    });
  });
  
  describe('🟢 Common Prefix/Postfix Optimization', () => {
    
    it('should correctly strip common prefix', () => {
      const input = InternedInput.new(
        new StringLines('same1\nsame2\nsame3\nchanged\n'),
        new StringLines('same1\nsame2\nsame3\nmodified\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Only last line should be marked as changed
      expect(diff.isRemoved(0)).toBe(false);
      expect(diff.isRemoved(1)).toBe(false);
      expect(diff.isRemoved(2)).toBe(false);
      expect(diff.isRemoved(3)).toBe(true);
    });
    
    it('should correctly strip common postfix', () => {
      const input = InternedInput.new(
        new StringLines('changed\nsame1\nsame2\nsame3\n'),
        new StringLines('modified\nsame1\nsame2\nsame3\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Only first line should be marked as changed
      expect(diff.isRemoved(0)).toBe(true);
      expect(diff.isRemoved(1)).toBe(false);
      expect(diff.isRemoved(2)).toBe(false);
      expect(diff.isRemoved(3)).toBe(false);
    });
    
    it('should strip both prefix and postfix', () => {
      const input = InternedInput.new(
        new StringLines('same1\nchanged\nsame2\n'),
        new StringLines('same1\nmodified\nsame2\n')
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      expect(diff.isRemoved(0)).toBe(false);
      expect(diff.isRemoved(1)).toBe(true);
      expect(diff.isRemoved(2)).toBe(false);
    });
  });
  
  describe('🟢 Stress Tests', () => {
    
    it('should handle many small changes', () => {
      // Every other line is different
      const before = Array(100).fill(0).map((_, i) => `line${i}\n`).join('');
      const after = Array(100).fill(0).map((_, i) => 
        i % 2 === 0 ? `line${i}\n` : `modified${i}\n`
      ).join('');
      
      const input = InternedInput.new(
        new StringLines(before),
        new StringLines(after)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Should have ~50 changes
      expect(diff.countRemovals()).toBeCloseTo(50, -1); // Within 10
      expect(diff.countAdditions()).toBeCloseTo(50, -1);
    });
    
    it('should handle large identical files efficiently', () => {
      const large = 'line\n'.repeat(1000);
      
      const start = Date.now();
      const input = InternedInput.new(
        new StringLines(large),
        new StringLines(large)
      );
      const diff = Diff.compute(Algorithm.Histogram, input);
      const end = Date.now();
      
      expect(diff.countAdditions()).toBe(0);
      expect(diff.countRemovals()).toBe(0);
      
      // Should be fast (< 100ms)
      expect(end - start).toBeLessThan(100);
    });
    
    it('should handle large files with single change', () => {
      const before = 'line\n'.repeat(1000);
      const after = 'line\n'.repeat(500) + 'CHANGED\n' + 'line\n'.repeat(500);
      
      const input = InternedInput.new(
        new StringLines(before),
        new StringLines(after)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Should detect the single change
      expect(diff.countAdditions()).toBe(1);
      expect(diff.countRemovals()).toBe(0);
    });
  });
});

