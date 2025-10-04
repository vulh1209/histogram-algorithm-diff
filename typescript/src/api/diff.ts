/**
 * Main Diff class and API.
 * Ported from Rust imara-diff/src/lib.rs
 */

import { Token, Range, range, isEmptyRange, rangeLen } from '../core/types.js';
import { InternedInput } from '../core/intern.js';
import { histogramDiff } from '../algorithms/histogram.js';
import { stripCommonPrefix, stripCommonPostfix } from '../core/util.js';

/**
 * Supported diff algorithms.
 */
export enum Algorithm {
  /**
   * Histogram algorithm - primary, faster and more readable output.
   * Automatically falls back to Myers for highly repetitive content.
   */
  Histogram = 'histogram'
}

/**
 * A single change (hunk) in a diff.
 * Represents a range of tokens in 'before' that were replaced
 * by a different range in 'after'.
 */
export interface Hunk {
  /** Range in before sequence */
  readonly before: Range;
  /** Range in after sequence */
  readonly after: Range;
}

/**
 * Create a hunk.
 */
export function hunk(before: Range, after: Range): Hunk {
  return { before, after };
}

/**
 * A computed diff between two sequences.
 * Contains information about which tokens were added/removed.
 */
export class Diff {
  private removed: boolean[];
  private added: boolean[];
  
  private constructor() {
    this.removed = [];
    this.added = [];
  }
  
  /**
   * Compute a diff using the specified algorithm.
   * 
   * @param algorithm - Diff algorithm to use
   * @param input - Interned input containing both sequences
   * @returns Computed diff
   */
  static compute<T>(algorithm: Algorithm, input: InternedInput<T>): Diff {
    const diff = new Diff();
    diff.computeWith(
      algorithm,
      input.before,
      input.after,
      input.interner.numTokens()
    );
    return diff;
  }
  
  /**
   * Compute a diff with pre-tokenized sequences.
   * 
   * @param algorithm - Diff algorithm to use
   * @param before - Before token sequence
   * @param after - After token sequence
   * @param numTokens - Number of distinct tokens
   */
  computeWith(
    algorithm: Algorithm,
    before: readonly Token[],
    after: readonly Token[],
    numTokens: number
  ): void {
    // Validate input sizes
    if (before.length >= 0x7FFF_FFFF) {
      throw new RangeError(`Before sequence too large: ${before.length} (max: ${0x7FFF_FFFF})`);
    }
    if (after.length >= 0x7FFF_FFFF) {
      throw new RangeError(`After sequence too large: ${after.length} (max: ${0x7FFF_FFFF})`);
    }
    
    // Clear and resize arrays
    this.removed = new Array(before.length).fill(false);
    this.added = new Array(after.length).fill(false);
    
    // Strip common prefix/postfix for efficiency
    const [prefix, before2, after2] = stripCommonPrefix(before, after);
    const [postfix, before3, after3] = stripCommonPostfix(before2, after2);
    
    // Get slices of the removed/added arrays (excluding common parts)
    const removedSlice = this.removed.slice(prefix, this.removed.length - postfix);
    const addedSlice = this.added.slice(prefix, this.added.length - postfix);
    
    // Run the diff algorithm
    switch (algorithm) {
      case Algorithm.Histogram:
        histogramDiff(before3, after3, removedSlice, addedSlice, numTokens);
        break;
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
    
    // Copy results back
    for (let i = 0; i < removedSlice.length; i++) {
      this.removed[prefix + i] = removedSlice[i]!;
    }
    for (let i = 0; i < addedSlice.length; i++) {
      this.added[prefix + i] = addedSlice[i]!;
    }
  }
  
  /**
   * Count the number of additions.
   */
  countAdditions(): number {
    return this.added.filter(x => x).length;
  }
  
  /**
   * Count the number of removals.
   */
  countRemovals(): number {
    return this.removed.filter(x => x).length;
  }
  
  /**
   * Check if a token at the given index was removed.
   */
  isRemoved(tokenIdx: number): boolean {
    return this.removed[tokenIdx] ?? false;
  }
  
  /**
   * Check if a token at the given index was added.
   */
  isAdded(tokenIdx: number): boolean {
    return this.added[tokenIdx] ?? false;
  }
  
  /**
   * Iterate over all hunks (changed regions) in the diff.
   * Hunks are returned in monotonically increasing order.
   */
  *hunks(): IterableIterator<Hunk> {
    let posBefore = 0;
    let posAfter = 0;
    let idxRemoved = 0;
    let idxAdded = 0;
    
    while (idxRemoved < this.removed.length || idxAdded < this.added.length) {
      // Skip unchanged tokens
      while (idxRemoved < this.removed.length && !this.removed[idxRemoved]) {
        idxRemoved++;
        posBefore++;
      }
      
      while (idxAdded < this.added.length && !this.added[idxAdded]) {
        idxAdded++;
        posAfter++;
      }
      
      // Check if we're done
      if (idxRemoved >= this.removed.length && idxAdded >= this.added.length) {
        break;
      }
      
      // Found a change - collect the hunk
      const startBefore = posBefore;
      const startAfter = posAfter;
      
      // Collect all consecutive removed tokens
      while (idxRemoved < this.removed.length && this.removed[idxRemoved]) {
        idxRemoved++;
        posBefore++;
      }
      
      // Collect all consecutive added tokens
      while (idxAdded < this.added.length && this.added[idxAdded]) {
        idxAdded++;
        posAfter++;
      }
      
      yield hunk(
        range(startBefore, posBefore),
        range(startAfter, posAfter)
      );
    }
  }
  
  /**
   * Get all hunks as an array.
   */
  getAllHunks(): Hunk[] {
    return Array.from(this.hunks());
  }
  
  /**
   * Convert to string (for debugging).
   */
  toString(): string {
    const hunks = this.getAllHunks();
    return `Diff(${hunks.length} hunks, +${this.countAdditions()}/-${this.countRemovals()})`;
  }
}

/**
 * Utility functions for hunks.
 */
export namespace HunkUtils {
  /**
   * Check if a hunk is a pure insertion (no deletions).
   */
  export function isPureInsertion(h: Hunk): boolean {
    return isEmptyRange(h.before);
  }
  
  /**
   * Check if a hunk is a pure removal (no insertions).
   */
  export function isPureRemoval(h: Hunk): boolean {
    return isEmptyRange(h.after);
  }
  
  /**
   * Check if a hunk is a modification (both additions and deletions).
   */
  export function isModification(h: Hunk): boolean {
    return !isEmptyRange(h.before) && !isEmptyRange(h.after);
  }
  
  /**
   * Invert a hunk (swap before and after).
   */
  export function invert(h: Hunk): Hunk {
    return hunk(h.after, h.before);
  }
  
  /**
   * Get the size of a hunk (total tokens affected).
   */
  export function size(h: Hunk): number {
    return rangeLen(h.before) + rangeLen(h.after);
  }
}

