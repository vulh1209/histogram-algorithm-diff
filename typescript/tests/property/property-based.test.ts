/**
 * Property-based tests using fast-check
 * Tests các properties mà diff algorithm phải thỏa mãn với random inputs
 */

import { describe, it, expect } from 'vitest';
import { fc } from 'fast-check';
import { Diff, Algorithm, HunkUtils } from '../../src/api/diff.js';
import { InternedInput } from '../../src/core/intern.js';
import { StringLines } from '../../src/core/sources.js';

describe('Property-Based Tests', () => {
  
  describe('🔍 Fundamental Properties', () => {
    
    it('PROPERTY: Identical inputs produce no changes', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          (text) => {
            const input = InternedInput.new(
              new StringLines(text),
              new StringLines(text)
            );
            
            const diff = Diff.compute(Algorithm.Histogram, input);
            
            // No changes expected
            expect(diff.countAdditions()).toBe(0);
            expect(diff.countRemovals()).toBe(0);
            expect(diff.getAllHunks()).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('PROPERTY: Empty before → all additions', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 1 }).map(lines => lines.join('\n') + '\n'),
          (text) => {
            const input = InternedInput.new(
              new StringLines(''),
              new StringLines(text)
            );
            
            const diff = Diff.compute(Algorithm.Histogram, input);
            
            // All tokens should be additions
            expect(diff.countRemovals()).toBe(0);
            expect(diff.countAdditions()).toBe(input.after.length);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('PROPERTY: Empty after → all removals', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 1 }).map(lines => lines.join('\n') + '\n'),
          (text) => {
            const input = InternedInput.new(
              new StringLines(text),
              new StringLines('')
            );
            
            const diff = Diff.compute(Algorithm.Histogram, input);
            
            // All tokens should be removals
            expect(diff.countAdditions()).toBe(0);
            expect(diff.countRemovals()).toBe(input.before.length);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('PROPERTY: Diff is deterministic', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          (text1, text2) => {
            const input = InternedInput.new(
              new StringLines(text1),
              new StringLines(text2)
            );
            
            // Compute twice
            const diff1 = Diff.compute(Algorithm.Histogram, input);
            const diff2 = Diff.compute(Algorithm.Histogram, input);
            
            // Should be identical
            expect(diff1.countAdditions()).toBe(diff2.countAdditions());
            expect(diff1.countRemovals()).toBe(diff2.countRemovals());
            expect(diff1.getAllHunks()).toEqual(diff2.getAllHunks());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('🔍 Hunk Properties', () => {
    
    it('PROPERTY: Hunks are monotonically increasing', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          (text1, text2) => {
            const input = InternedInput.new(
              new StringLines(text1),
              new StringLines(text2)
            );
            
            const diff = Diff.compute(Algorithm.Histogram, input);
            const hunks = diff.getAllHunks();
            
            // Each hunk should start after the previous one
            for (let i = 1; i < hunks.length; i++) {
              expect(hunks[i]!.before.start).toBeGreaterThanOrEqual(hunks[i-1]!.before.end);
              expect(hunks[i]!.after.start).toBeGreaterThanOrEqual(hunks[i-1]!.after.end);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('PROPERTY: Hunk ranges are valid', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          (text1, text2) => {
            const input = InternedInput.new(
              new StringLines(text1),
              new StringLines(text2)
            );
            
            const diff = Diff.compute(Algorithm.Histogram, input);
            const hunks = diff.getAllHunks();
            
            for (const hunk of hunks) {
              // Start <= End
              expect(hunk.before.start).toBeLessThanOrEqual(hunk.before.end);
              expect(hunk.after.start).toBeLessThanOrEqual(hunk.after.end);
              
              // Within bounds
              expect(hunk.before.start).toBeGreaterThanOrEqual(0);
              expect(hunk.before.end).toBeLessThanOrEqual(input.before.length);
              expect(hunk.after.start).toBeGreaterThanOrEqual(0);
              expect(hunk.after.end).toBeLessThanOrEqual(input.after.length);
              
              // Not empty hunk (at least one side has changes)
              expect(
                hunk.before.start < hunk.before.end || hunk.after.start < hunk.after.end
              ).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('PROPERTY: Total changes match hunks', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          (text1, text2) => {
            const input = InternedInput.new(
              new StringLines(text1),
              new StringLines(text2)
            );
            
            const diff = Diff.compute(Algorithm.Histogram, input);
            const hunks = diff.getAllHunks();
            
            // Sum of hunk sizes should match total changes
            const totalRemoved = hunks.reduce((sum, h) => sum + (h.before.end - h.before.start), 0);
            const totalAdded = hunks.reduce((sum, h) => sum + (h.after.end - h.after.start), 0);
            
            expect(totalRemoved).toBe(diff.countRemovals());
            expect(totalAdded).toBe(diff.countAdditions());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('🔍 Symmetry Properties', () => {
    
    it('PROPERTY: Inverted diff has swapped counts', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          (text1, text2) => {
            // Diff A→B
            const input1 = InternedInput.new(
              new StringLines(text1),
              new StringLines(text2)
            );
            const diff1 = Diff.compute(Algorithm.Histogram, input1);
            
            // Diff B→A (inverted)
            const input2 = InternedInput.new(
              new StringLines(text2),
              new StringLines(text1)
            );
            const diff2 = Diff.compute(Algorithm.Histogram, input2);
            
            // Additions and removals should be swapped
            expect(diff1.countAdditions()).toBe(diff2.countRemovals());
            expect(diff1.countRemovals()).toBe(diff2.countAdditions());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('🔍 Composition Properties', () => {
    
    it('PROPERTY: Adding then removing same lines', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          fc.array(fc.string(), { minLength: 1 }).map(lines => lines.join('\n') + '\n'),
          (original, addition) => {
            const modified = original + addition;
            
            // Original → Modified
            const input1 = InternedInput.new(
              new StringLines(original),
              new StringLines(modified)
            );
            const diff1 = Diff.compute(Algorithm.Histogram, input1);
            
            // Should be pure addition
            const additions1 = diff1.countAdditions();
            expect(additions1).toBeGreaterThan(0);
            
            // Modified → Original (undo)
            const input2 = InternedInput.new(
              new StringLines(modified),
              new StringLines(original)
            );
            const diff2 = Diff.compute(Algorithm.Histogram, input2);
            
            // Should be pure removal of same size
            expect(diff2.countRemovals()).toBe(additions1);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
  
  describe('🔍 Stress Properties', () => {
    
    it('PROPERTY: Never crashes with random input', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          fc.array(fc.string()).map(lines => lines.join('\n') + '\n'),
          (text1, text2) => {
            // Should never throw
            expect(() => {
              const input = InternedInput.new(
                new StringLines(text1),
                new StringLines(text2)
              );
              
              const diff = Diff.compute(Algorithm.Histogram, input);
              
              // Access all methods to ensure no crashes
              diff.countAdditions();
              diff.countRemovals();
              diff.getAllHunks();
              Array.from(diff.hunks());
            }).not.toThrow();
          }
        ),
        { numRuns: 200 }
      );
    });
    
    it('PROPERTY: Handles repetitive content', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 1, max: 100 }),
          (str, count) => {
            const text = (str + '\n').repeat(count);
            
            expect(() => {
              const input = InternedInput.new(
                new StringLines(text),
                new StringLines(text)
              );
              
              const diff = Diff.compute(Algorithm.Histogram, input);
              
              // Should match (no changes)
              expect(diff.countAdditions()).toBe(0);
              expect(diff.countRemovals()).toBe(0);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('PROPERTY: Handles unicode correctly', () => {
      fc.assert(
        fc.property(
          fc.unicodeString(),
          fc.unicodeString(),
          (text1, text2) => {
            expect(() => {
              const input = InternedInput.new(
                new StringLines(text1),
                new StringLines(text2)
              );
              
              Diff.compute(Algorithm.Histogram, input);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('🔍 Specific Edge Cases from Fuzzing', () => {
    
    it('PROPERTY: Single character differences', () => {
      fc.assert(
        fc.property(
          fc.char(),
          fc.char(),
          (char1, char2) => {
            const input = InternedInput.new(
              new StringLines(char1),
              new StringLines(char2)
            );
            
            const diff = Diff.compute(Algorithm.Histogram, input);
            
            if (char1 === char2) {
              expect(diff.getAllHunks()).toHaveLength(0);
            } else {
              expect(diff.countRemovals()).toBe(1);
              expect(diff.countAdditions()).toBe(1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('PROPERTY: Whitespace-only changes', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 10 }),
          (text, spaces1, spaces2) => {
            const text1 = ' '.repeat(spaces1) + text;
            const text2 = ' '.repeat(spaces2) + text;
            
            const input = InternedInput.new(
              new StringLines(text1),
              new StringLines(text2)
            );
            
            const diff = Diff.compute(Algorithm.Histogram, input);
            
            if (spaces1 === spaces2) {
              expect(diff.getAllHunks()).toHaveLength(0);
            }
            // Else: should detect whitespace change
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

