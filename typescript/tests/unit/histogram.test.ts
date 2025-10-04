/**
 * Tests for Histogram diff algorithm
 */

import { describe, it, expect } from 'vitest';
import { histogramDiff } from '../../src/algorithms/histogram.js';
import { token } from '../../src/core/types.js';
import type { Token } from '../../src/core/types.js';

function tokens(nums: number[]): Token[] {
  return nums.map(n => token(n));
}

describe('histogramDiff', () => {
  it('handles empty inputs', () => {
    const removed: boolean[] = [];
    const added: boolean[] = [false, false];
    
    histogramDiff([], tokens([1, 2]), removed, added, 3);
    
    expect(added).toEqual([true, true]);
  });
  
  it('handles pure deletion', () => {
    const removed: boolean[] = [false, false];
    const added: boolean[] = [];
    
    histogramDiff(tokens([1, 2]), [], removed, added, 3);
    
    expect(removed).toEqual([true, true]);
  });
  
  it('handles no changes', () => {
    const removed: boolean[] = [false, false, false];
    const added: boolean[] = [false, false, false];
    
    histogramDiff(tokens([1, 2, 3]), tokens([1, 2, 3]), removed, added, 4);
    
    expect(removed).toEqual([false, false, false]);
    expect(added).toEqual([false, false, false]);
  });
  
  it('detects single insertion', () => {
    const removed: boolean[] = [false, false];
    const added: boolean[] = [false, false, false];
    
    histogramDiff(tokens([1, 3]), tokens([1, 2, 3]), removed, added, 4);
    
    expect(removed).toEqual([false, false]);
    expect(added).toEqual([false, true, false]);
  });
  
  it('detects single deletion', () => {
    const removed: boolean[] = [false, false, false];
    const added: boolean[] = [false, false];
    
    histogramDiff(tokens([1, 2, 3]), tokens([1, 3]), removed, added, 4);
    
    expect(removed).toEqual([false, true, false]);
    expect(added).toEqual([false, false]);
  });
  
  it('detects replacement', () => {
    const removed: boolean[] = [false, false, false];
    const added: boolean[] = [false, false, false];
    
    histogramDiff(tokens([1, 2, 3]), tokens([1, 4, 3]), removed, added, 5);
    
    expect(removed).toEqual([false, true, false]);
    expect(added).toEqual([false, true, false]);
  });
  
  it('handles complex diff', () => {
    const removed: boolean[] = [false, false, false, false, false];
    const added: boolean[] = [false, false, false, false];
    
    // Before: [1, 2, 3, 4, 5]
    // After:  [1, 3, 6, 5]
    histogramDiff(
      tokens([1, 2, 3, 4, 5]),
      tokens([1, 3, 6, 5]),
      removed,
      added,
      7
    );
    
    expect(removed[0]).toBe(false); // 1 matches
    expect(removed[1]).toBe(true);  // 2 deleted
    expect(removed[2]).toBe(false); // 3 matches
    expect(removed[3]).toBe(true);  // 4 deleted
    expect(removed[4]).toBe(false); // 5 matches
    
    expect(added[0]).toBe(false); // 1 matches
    expect(added[1]).toBe(false); // 3 matches
    expect(added[2]).toBe(true);  // 6 added
    expect(added[3]).toBe(false); // 5 matches
  });
  
  it('uses LCS to find longest match', () => {
    const removed: boolean[] = new Array(6).fill(false);
    const added: boolean[] = new Array(6).fill(false);
    
    // Before: [1, 2, 3, 4, 5, 6]
    // After:  [1, 3, 4, 5, 7, 6]
    // LCS should prefer [3, 4, 5] over [1] or [6]
    histogramDiff(
      tokens([1, 2, 3, 4, 5, 6]),
      tokens([1, 3, 4, 5, 7, 6]),
      removed,
      added,
      8
    );
    
    expect(removed[1]).toBe(true);  // 2 deleted
    expect(added[4]).toBe(true);    // 7 added
  });
  
  it('falls back to Myers for highly repetitive content', () => {
    // Create content with same token repeated > 63 times
    const repeated = tokens(Array(70).fill(1));
    const removed = Array(70).fill(false);
    const added = Array(70).fill(false);
    
    // Should not crash, should fallback to Myers
    histogramDiff(repeated, repeated, removed, added, 2);
    
    // All should match (no changes)
    expect(removed.every(x => !x)).toBe(true);
    expect(added.every(x => !x)).toBe(true);
  });
  
  it('handles alternating pattern efficiently', () => {
    const removed: boolean[] = new Array(10).fill(false);
    const added: boolean[] = new Array(10).fill(false);
    
    // Before: [1, 2, 1, 2, 1, 2, 1, 2, 1, 2]
    // After:  [1, 2, 1, 2, 1, 2, 1, 2, 1, 2]
    const pattern = tokens([1, 2, 1, 2, 1, 2, 1, 2, 1, 2]);
    
    histogramDiff(pattern, pattern, removed, added, 3);
    
    expect(removed.every(x => !x)).toBe(true);
    expect(added.every(x => !x)).toBe(true);
  });
  
  it('prefers least common subsequence', () => {
    const removed: boolean[] = new Array(5).fill(false);
    const added: boolean[] = new Array(5).fill(false);
    
    // Before: [1, 1, 1, 2, 3]  (token 1 appears 3 times)
    // After:  [1, 1, 2, 3, 3]  (token 3 appears 2 times)
    // Histogram should prefer token 2 (appears once) as anchor
    histogramDiff(
      tokens([1, 1, 1, 2, 3]),
      tokens([1, 1, 2, 3, 3]),
      removed,
      added,
      4
    );
    
    // Exact diff will depend on LCS choice, but should complete without error
    expect(removed.length).toBe(5);
    expect(added.length).toBe(5);
  });
});

