/**
 * Tests for main Diff class
 */

import { describe, it, expect } from 'vitest';
import { Diff, Algorithm, HunkUtils } from '../../src/api/diff.js';
import { InternedInput } from '../../src/core/intern.js';
import { StringLines } from '../../src/core/sources.js';

describe('Diff', () => {
  it('computes empty diff for identical strings', () => {
    const input = InternedInput.new(
      new StringLines('line1\nline2\nline3\n'),
      new StringLines('line1\nline2\nline3\n')
    );
    
    const diff = Diff.compute(Algorithm.Histogram, input);
    
    expect(diff.countAdditions()).toBe(0);
    expect(diff.countRemovals()).toBe(0);
    expect(diff.getAllHunks()).toHaveLength(0);
  });
  
  it('detects pure addition', () => {
    const input = InternedInput.new(
      new StringLines('line1\n'),
      new StringLines('line1\nline2\n')
    );
    
    const diff = Diff.compute(Algorithm.Histogram, input);
    
    expect(diff.countAdditions()).toBe(1);
    expect(diff.countRemovals()).toBe(0);
    expect(diff.isAdded(1)).toBe(true);
    expect(diff.isRemoved(0)).toBe(false);
    
    const hunks = diff.getAllHunks();
    expect(hunks).toHaveLength(1);
    expect(HunkUtils.isPureInsertion(hunks[0]!)).toBe(true);
  });
  
  it('detects pure removal', () => {
    const input = InternedInput.new(
      new StringLines('line1\nline2\n'),
      new StringLines('line1\n')
    );
    
    const diff = Diff.compute(Algorithm.Histogram, input);
    
    expect(diff.countAdditions()).toBe(0);
    expect(diff.countRemovals()).toBe(1);
    expect(diff.isRemoved(1)).toBe(true);
    
    const hunks = diff.getAllHunks();
    expect(hunks).toHaveLength(1);
    expect(HunkUtils.isPureRemoval(hunks[0]!)).toBe(true);
  });
  
  it('detects modification', () => {
    const input = InternedInput.new(
      new StringLines('line1\nline2\nline3\n'),
      new StringLines('line1\nmodified\nline3\n')
    );
    
    const diff = Diff.compute(Algorithm.Histogram, input);
    
    expect(diff.countAdditions()).toBe(1);
    expect(diff.countRemovals()).toBe(1);
    expect(diff.isRemoved(1)).toBe(true);
    expect(diff.isAdded(1)).toBe(true);
    
    const hunks = diff.getAllHunks();
    expect(hunks).toHaveLength(1);
    expect(HunkUtils.isModification(hunks[0]!)).toBe(true);
  });
  
  it('handles multiple hunks', () => {
    const input = InternedInput.new(
      new StringLines('line1\nline2\nline3\nline4\n'),
      new StringLines('line1\nmodified2\nline3\nmodified4\n')
    );
    
    const diff = Diff.compute(Algorithm.Histogram, input);
    
    const hunks = diff.getAllHunks();
    expect(hunks).toHaveLength(2);
    
    // First hunk: line2 modified
    expect(hunks[0]!.before.start).toBe(1);
    expect(hunks[0]!.before.end).toBe(2);
    
    // Second hunk: line4 modified
    expect(hunks[1]!.before.start).toBe(3);
    expect(hunks[1]!.before.end).toBe(4);
  });
  
  it('handles empty before', () => {
    const input = InternedInput.new(
      new StringLines(''),
      new StringLines('line1\nline2\n')
    );
    
    const diff = Diff.compute(Algorithm.Histogram, input);
    
    expect(diff.countAdditions()).toBe(2);
    expect(diff.countRemovals()).toBe(0);
  });
  
  it('handles empty after', () => {
    const input = InternedInput.new(
      new StringLines('line1\nline2\n'),
      new StringLines('')
    );
    
    const diff = Diff.compute(Algorithm.Histogram, input);
    
    expect(diff.countAdditions()).toBe(0);
    expect(diff.countRemovals()).toBe(2);
  });
  
  it('strips common prefix efficiently', () => {
    const input = InternedInput.new(
      new StringLines('same1\nsame2\nsame3\nchanged\n'),
      new StringLines('same1\nsame2\nsame3\nmodified\n')
    );
    
    const diff = Diff.compute(Algorithm.Histogram, input);
    
    // Only the last line should be marked as changed
    expect(diff.isRemoved(3)).toBe(true);
    expect(diff.isAdded(3)).toBe(true);
    expect(diff.isRemoved(0)).toBe(false);
    expect(diff.isRemoved(1)).toBe(false);
    expect(diff.isRemoved(2)).toBe(false);
  });
  
  it('produces monotonic hunks', () => {
    const input = InternedInput.new(
      new StringLines('a\nb\nc\nd\ne\n'),
      new StringLines('a\nX\nc\nY\ne\n')
    );
    
    const diff = Diff.compute(Algorithm.Histogram, input);
    const hunks = diff.getAllHunks();
    
    // Check hunks are in order
    for (let i = 1; i < hunks.length; i++) {
      expect(hunks[i]!.before.start).toBeGreaterThan(hunks[i-1]!.before.end);
      expect(hunks[i]!.after.start).toBeGreaterThan(hunks[i-1]!.after.end);
    }
  });
  
  it('hunk utils work correctly', () => {
    const insertion = { before: { start: 5, end: 5 }, after: { start: 5, end: 7 } };
    const removal = { before: { start: 3, end: 5 }, after: { start: 3, end: 3 } };
    const modification = { before: { start: 1, end: 2 }, after: { start: 1, end: 2 } };
    
    expect(HunkUtils.isPureInsertion(insertion)).toBe(true);
    expect(HunkUtils.isPureRemoval(removal)).toBe(true);
    expect(HunkUtils.isModification(modification)).toBe(true);
    
    const inverted = HunkUtils.invert(insertion);
    expect(inverted.before).toEqual(insertion.after);
    expect(inverted.after).toEqual(insertion.before);
  });
});

