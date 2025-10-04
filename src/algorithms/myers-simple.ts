/**
 * Simplified Myers diff algorithm (fallback only).
 * This is a basic implementation of the O((N+M)D) Myers algorithm
 * without the complex middle-snake search, preprocessing, or heuristics.
 * 
 * This is only used as a fallback when Histogram algorithm encounters
 * highly repetitive content (tokens appearing > 63 times).
 * 
 * Ported from Myers' paper: "An O(ND) Difference Algorithm and its Variations"
 */

import { Token } from '../core/types.js';
import { commonPrefix, commonPostfix, markRange } from '../core/util.js';

/**
 * Simplified Myers diff algorithm.
 * Computes a diff without optimizations - suitable for fallback cases.
 * 
 * @param before - Before sequence
 * @param after - After sequence
 * @param removed - Output array marking removed tokens
 * @param added - Output array marking added tokens
 */
export function simpleMyers(
  before: readonly Token[],
  after: readonly Token[],
  removed: boolean[],
  added: boolean[]
): void {
  // Handle edge cases
  if (before.length === 0) {
    markRange(added, 0, after.length, true);
    return;
  }
  
  if (after.length === 0) {
    markRange(removed, 0, before.length, true);
    return;
  }
  
  // Strip common prefix and postfix for efficiency
  const prefix = commonPrefix(before, after);
  const minLen = Math.min(before.length, after.length);
  
  // Don't calculate postfix if prefix already covers everything
  let postfix = 0;
  if (prefix < minLen) {
    postfix = commonPostfix(before.slice(prefix), after.slice(prefix));
  }
  
  const beforeStart = prefix;
  const beforeEnd = before.length - postfix;
  const afterStart = prefix;
  const afterEnd = after.length - postfix;
  
  // If everything matches after stripping, we're done
  if (beforeStart >= beforeEnd && afterStart >= afterEnd) {
    return;
  }
  
  // Handle pure insertion/deletion after stripping
  if (beforeStart >= beforeEnd) {
    markRange(added, afterStart, afterEnd, true);
    return;
  }
  
  if (afterStart >= afterEnd) {
    markRange(removed, beforeStart, beforeEnd, true);
    return;
  }
  
  // Run Myers algorithm on the stripped sequences
  const N = beforeEnd - beforeStart;
  const M = afterEnd - afterStart;
  const MAX = N + M;
  
  // V array: indexed by diagonal k (from -MAX to +MAX)
  // We offset by MAX to make indexing work with non-negative indices
  const V = new Int32Array(2 * MAX + 1);
  const offset = MAX;
  
  // Trace stores the V array at each D iteration
  const trace: Int32Array[] = [];
  
  // Forward search
  let found = false;
  let D = 0;
  
  for (D = 0; D <= MAX && !found; D++) {
    // Save current V for backtracking
    trace.push(new Int32Array(V));
    
    for (let k = -D; k <= D; k += 2) {
      // Determine if we came from k-1 (move right) or k+1 (move down)
      let x: number;
      
      if (k === -D || (k !== D && V[offset + k - 1]! < V[offset + k + 1]!)) {
        // Move down from k+1
        x = V[offset + k + 1]!;
      } else {
        // Move right from k-1
        x = V[offset + k - 1]! + 1;
      }
      
      let y = x - k;
      
      // Follow diagonal as far as possible
      while (
        x < N &&
        y < M &&
        before[beforeStart + x] === after[afterStart + y]
      ) {
        x++;
        y++;
      }
      
      V[offset + k] = x;
      
      // Check if we reached the end
      if (x >= N && y >= M) {
        found = true;
        break;
      }
    }
  }
  
  // Backtrack to find the edit path
  backtrack(
    trace,
    D - 1,
    N,
    M,
    offset,
    before,
    after,
    beforeStart,
    afterStart,
    removed,
    added
  );
}

/**
 * Backtrack through the trace to mark added/removed tokens.
 */
function backtrack(
  trace: Int32Array[],
  D: number,
  N: number,
  M: number,
  offset: number,
  _before: readonly Token[],
  _after: readonly Token[],
  beforeStart: number,
  afterStart: number,
  removed: boolean[],
  added: boolean[]
): void {
  let x = N;
  let y = M;
  
  for (let d = D; d >= 0; d--) {
    const V = trace[d];
    if (!V) break;
    
    const k = x - y;
    
    // Determine which direction we came from
    let prevK: number;
    
    if (k === -d || (k !== d && V[offset + k - 1]! < V[offset + k + 1]!)) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    
    const prevX = V[offset + prevK]!;
    const prevY = prevX - prevK;
    
    // Walk backward along diagonal
    while (x > prevX && y > prevY) {
      x--;
      y--;
      // This token matches, no change needed
    }
    
    // Mark the edit operation
    if (d > 0) {
      if (x === prevX) {
        // Insertion (moved down)
        added[afterStart + prevY] = true;
      } else {
        // Deletion (moved right)
        removed[beforeStart + prevX] = true;
      }
    }
    
    x = prevX;
    y = prevY;
  }
}

/**
 * Alternative: simpler but less optimal greedy diff.
 * This is even simpler than Myers but produces longer edit scripts.
 * Kept for reference but not used.
 */
export function greedyDiff(
  before: readonly Token[],
  after: readonly Token[],
  removed: boolean[],
  added: boolean[]
): void {
  const used = new Set<number>();
  
  // For each token in 'after', find best match in 'before'
  for (let i = 0; i < after.length; i++) {
    let bestMatch = -1;
    let bestDist = Infinity;
    
    for (let j = 0; j < before.length; j++) {
      if (used.has(j)) continue;
      
      if (before[j] === after[i]) {
        // Found match, prefer closest position
        const dist = Math.abs(i - j);
        if (dist < bestDist) {
          bestDist = dist;
          bestMatch = j;
        }
      }
    }
    
    if (bestMatch === -1) {
      // No match found, mark as added
      added[i] = true;
    } else {
      // Found match
      used.add(bestMatch);
    }
  }
  
  // Mark remaining 'before' tokens as removed
  for (let j = 0; j < before.length; j++) {
    if (!used.has(j)) {
      removed[j] = true;
    }
  }
}

