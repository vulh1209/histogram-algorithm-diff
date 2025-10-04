/**
 * Tests for simplified Myers algorithm
 */

import { describe, it, expect } from 'vitest';
import { simpleMyers } from '../../src/algorithms/myers-simple.js';
import { token } from '../../src/core/types.js';
import type { Token } from '../../src/core/types.js';

function tokens(nums: number[]): Token[] {
  return nums.map(n => token(n));
}

describe('simpleMyers', () => {
  it('handles empty inputs', () => {
    const removed: boolean[] = [];
    const added: boolean[] = [false, false];
    
    simpleMyers([], tokens([1, 2]), removed, added);
    
    expect(added).toEqual([true, true]);
  });
  
  it('handles pure deletion', () => {
    const removed: boolean[] = [false, false];
    const added: boolean[] = [];
    
    simpleMyers(tokens([1, 2]), [], removed, added);
    
    expect(removed).toEqual([true, true]);
  });
  
  it('handles no changes', () => {
    const removed: boolean[] = [false, false, false];
    const added: boolean[] = [false, false, false];
    
    simpleMyers(tokens([1, 2, 3]), tokens([1, 2, 3]), removed, added);
    
    expect(removed).toEqual([false, false, false]);
    expect(added).toEqual([false, false, false]);
  });
  
  it('detects single insertion', () => {
    const removed: boolean[] = [false, false];
    const added: boolean[] = [false, false, false];
    
    simpleMyers(tokens([1, 3]), tokens([1, 2, 3]), removed, added);
    
    expect(removed).toEqual([false, false]);
    expect(added).toEqual([false, true, false]);
  });
  
  it('detects single deletion', () => {
    const removed: boolean[] = [false, false, false];
    const added: boolean[] = [false, false];
    
    simpleMyers(tokens([1, 2, 3]), tokens([1, 3]), removed, added);
    
    expect(removed).toEqual([false, true, false]);
    expect(added).toEqual([false, false]);
  });
  
  it('detects replacement', () => {
    const removed: boolean[] = [false, false, false];
    const added: boolean[] = [false, false, false];
    
    simpleMyers(tokens([1, 2, 3]), tokens([1, 4, 3]), removed, added);
    
    expect(removed).toEqual([false, true, false]);
    expect(added).toEqual([false, true, false]);
  });
  
  it('handles complex diff', () => {
    const removed: boolean[] = [false, false, false, false, false];
    const added: boolean[] = [false, false, false, false];
    
    // Before: [1, 2, 3, 4, 5]
    // After:  [1, 3, 6, 5]
    simpleMyers(
      tokens([1, 2, 3, 4, 5]),
      tokens([1, 3, 6, 5]),
      removed,
      added
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
  
  it('handles repetitive content', () => {
    // This is the case where Histogram would fallback to Myers
    const repeated = tokens(Array(10).fill(1));
    const removed = Array(10).fill(false);
    const added = Array(10).fill(false);
    
    simpleMyers(repeated, repeated, removed, added);
    
    // All should match, no changes
    expect(removed.every(x => !x)).toBe(true);
    expect(added.every(x => !x)).toBe(true);
  });
});

