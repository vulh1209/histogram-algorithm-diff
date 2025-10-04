/**
 * Histogram diff algorithm.
 * Ported from Rust imara-diff/src/histogram.rs
 * 
 * This is the primary diff algorithm, using a histogram-based LCS search.
 * Falls back to SimpleMyers for highly repetitive content (tokens appearing > 63 times).
 */

import { Token } from '../core/types.js';
import { ListPool, ListHandle } from './list-pool.js';
import { simpleMyers } from './myers-simple.js';
import { markRange } from '../core/util.js';

/** Maximum chain length before fallback to Myers */
const MAX_CHAIN_LEN = 63;

/**
 * Longest Common Subsequence result.
 */
interface Lcs {
  /** Start position in before sequence */
  beforeStart: number;
  /** Start position in after sequence */
  afterStart: number;
  /** Length of the common subsequence */
  len: number;
}

/**
 * Main histogram diff implementation.
 * Internal state for the algorithm.
 */
class Histogram {
  /** Token occurrences: indexed by token ID */
  private tokenOccurrences: ListHandle[];
  /** Memory pool for lists */
  private pool: ListPool;
  
  constructor(numTokens: number) {
    this.tokenOccurrences = new Array(numTokens);
    for (let i = 0; i < numTokens; i++) {
      this.tokenOccurrences[i] = new ListHandle();
    }
    this.pool = new ListPool(2 * numTokens);
  }
  
  /**
   * Clear the histogram state for reuse.
   */
  clear(): void {
    this.pool.clear();
  }
  
  /**
   * Get occurrences of a token.
   */
  getTokenOccurrences(token: Token): readonly number[] {
    const handle = this.tokenOccurrences[token as number];
    if (!handle) return [];
    return handle.asSlice(this.pool);
  }
  
  /**
   * Get number of occurrences of a token.
   */
  getNumTokenOccurrences(token: Token): number {
    const handle = this.tokenOccurrences[token as number];
    if (!handle) return 0;
    return handle.len(this.pool);
  }
  
  /**
   * Populate histogram with positions from a file.
   */
  populate(file: readonly Token[]): void {
    for (let i = 0; i < file.length; i++) {
      const token = file[i]!;
      const handle = this.tokenOccurrences[token as number]!;
      handle.push(i, this.pool);
    }
  }
  
  /**
   * Run histogram diff recursively.
   */
  run(
    before: readonly Token[],
    after: readonly Token[],
    removed: boolean[],
    added: boolean[],
    beforeOffset: number = 0,
    afterOffset: number = 0
  ): void {
    // Handle base cases
    if (before.length === 0) {
      markRange(added, afterOffset, afterOffset + after.length, true);
      return;
    }
    
    if (after.length === 0) {
      markRange(removed, beforeOffset, beforeOffset + before.length, true);
      return;
    }
    
    // Optimization: if arrays are identical (same reference), no changes
    if (before === after) {
      return;
    }
    
    // Clear histogram state from previous recursive calls
    this.clear();
    
    // Populate histogram with 'before' positions
    this.populate(before);
    
    // Find longest common subsequence
    const lcs = this.findLcs(before, after);
    
    if (!lcs) {
      // No LCS found (too many repetitions)
      // Fall back to Myers algorithm
      const beforeSlice = before.slice();
      const afterSlice = after.slice();
      const removedSlice = new Array(before.length).fill(false);
      const addedSlice = new Array(after.length).fill(false);
      
      simpleMyers(beforeSlice, afterSlice, removedSlice, addedSlice);
      
      // Copy results back with offset
      for (let i = 0; i < removedSlice.length; i++) {
        if (removedSlice[i]) removed[beforeOffset + i] = true;
      }
      for (let i = 0; i < addedSlice.length; i++) {
        if (addedSlice[i]) added[afterOffset + i] = true;
      }
      return;
    }
    
    if (lcs.len === 0) {
      // No common elements at all
      markRange(removed, beforeOffset, beforeOffset + before.length, true);
      markRange(added, afterOffset, afterOffset + after.length, true);
      return;
    }
    
    // Recursively diff the parts before the LCS
    this.run(
      before.slice(0, lcs.beforeStart),
      after.slice(0, lcs.afterStart),
      removed,
      added,
      beforeOffset,
      afterOffset
    );
    
    // Continue with the parts after the LCS (tail recursion -> loop)
    const beforeEnd = lcs.beforeStart + lcs.len;
    const afterEnd = lcs.afterStart + lcs.len;
    
    // Recursively process remainder
    this.run(
      before.slice(beforeEnd),
      after.slice(afterEnd),
      removed,
      added,
      beforeOffset + beforeEnd,
      afterOffset + afterEnd
    );
  }
  
  /**
   * Find the longest common subsequence using histogram.
   */
  private findLcs(before: readonly Token[], after: readonly Token[]): Lcs | null {
    let lcs: Lcs = {
      beforeStart: 0,
      afterStart: 0,
      len: 0
    };
    
    let minOccurrences = MAX_CHAIN_LEN + 1;
    let foundCs = false;
    
    let pos = 0;
    while (pos < after.length) {
      const token = after[pos]!;
      const occurrences = this.getNumTokenOccurrences(token);
      
      if (occurrences !== 0) {
        foundCs = true;
        
        if (occurrences <= minOccurrences) {
          pos = this.updateLcs(pos, token, before, after, lcs, minOccurrences);
          minOccurrences = Math.min(minOccurrences, occurrences);
          continue;
        }
      }
      
      pos++;
    }
    
    this.clear();
    
    // Check if we succeeded
    // Use >= because exactly MAX_CHAIN_LEN occurrences also needs fallback
    if (!foundCs || minOccurrences >= MAX_CHAIN_LEN) {
      return null; // Fallback needed
    }
    
    return lcs;
  }
  
  /**
   * Update LCS with a new candidate.
   * Returns the next position to check in 'after'.
   */
  private updateLcs(
    afterPos: number,
    token: Token,
    before: readonly Token[],
    after: readonly Token[],
    lcs: Lcs,
    minOccurrences: number
  ): number {
    let nextTokenIdx2 = afterPos + 1;
    const occurrencesList = this.getTokenOccurrences(token);
    
    for (const tokenIdx1 of occurrencesList) {
      let occurrences = this.getNumTokenOccurrences(token);
      let start1 = tokenIdx1;
      let start2 = afterPos;
      
      // Extend backwards
      while (start1 > 0 && start2 > 0) {
        const token1 = before[start1 - 1];
        const token2 = after[start2 - 1];
        
        if (token1 === token2) {
          start1--;
          start2--;
          const newOccurrences = this.getNumTokenOccurrences(token1!);
          occurrences = Math.min(occurrences, newOccurrences);
        } else {
          break;
        }
      }
      
      // Extend forwards
      let end1 = tokenIdx1 + 1;
      let end2 = afterPos + 1;
      
      while (end1 < before.length && end2 < after.length) {
        const token1 = before[end1];
        const token2 = after[end2];
        
        if (token1 === token2) {
          const newOccurrences = this.getNumTokenOccurrences(token1!);
          occurrences = Math.min(occurrences, newOccurrences);
          end1++;
          end2++;
        } else {
          break;
        }
      }
      
      if (nextTokenIdx2 < end2) {
        nextTokenIdx2 = end2;
      }
      
      const len = end2 - start2;
      
      // Update LCS if this is better
      if (lcs.len < len || minOccurrences > occurrences) {
        lcs.beforeStart = start1;
        lcs.afterStart = start2;
        lcs.len = len;
      }
    }
    
    return nextTokenIdx2;
  }
}

/**
 * Compute histogram diff.
 * Public API function.
 * 
 * @param before - Before token sequence
 * @param after - After token sequence  
 * @param removed - Output array marking removed tokens
 * @param added - Output array marking added tokens
 * @param numTokens - Total number of distinct tokens in interner
 */
export function histogramDiff(
  before: readonly Token[],
  after: readonly Token[],
  removed: boolean[],
  added: boolean[],
  numTokens: number
): void {
  const histogram = new Histogram(numTokens);
  histogram.run(before, after, removed, added);
}

