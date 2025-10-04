/**
 * Utility functions ported from Rust imara-diff
 */

import { Token } from './types.js';

/**
 * Find the common prefix length of two token sequences.
 */
export function commonPrefix(file1: readonly Token[], file2: readonly Token[]): number {
  let off = 0;
  const minLen = Math.min(file1.length, file2.length);
  
  for (let i = 0; i < minLen; i++) {
    if (file1[i] !== file2[i]) {
      break;
    }
    off++;
  }
  
  return off;
}

/**
 * Find the common postfix length of two token sequences.
 */
export function commonPostfix(file1: readonly Token[], file2: readonly Token[]): number {
  let off = 0;
  const minLen = Math.min(file1.length, file2.length);
  
  for (let i = 1; i <= minLen; i++) {
    if (file1[file1.length - i] !== file2[file2.length - i]) {
      break;
    }
    off++;
  }
  
  return off;
}

/**
 * Find both common prefix and postfix lengths.
 */
export function commonEdges(
  file1: readonly Token[],
  file2: readonly Token[]
): [prefix: number, postfix: number] {
  const prefix = commonPrefix(file1, file2);
  const postfix = commonPostfix(
    file1.slice(prefix),
    file2.slice(prefix)
  );
  return [prefix, postfix];
}

/**
 * Strip common prefix from both sequences.
 * Returns the prefix length and modified slices.
 */
export function stripCommonPrefix(
  file1: readonly Token[],
  file2: readonly Token[]
): [offset: number, newFile1: readonly Token[], newFile2: readonly Token[]] {
  const off = commonPrefix(file1, file2);
  return [off, file1.slice(off), file2.slice(off)];
}

/**
 * Strip common postfix from both sequences.
 * Returns the postfix length and modified slices.
 */
export function stripCommonPostfix(
  file1: readonly Token[],
  file2: readonly Token[]
): [offset: number, newFile1: readonly Token[], newFile2: readonly Token[]] {
  const off = commonPostfix(file1, file2);
  return [
    off,
    file1.slice(0, file1.length - off),
    file2.slice(0, file2.length - off)
  ];
}

/**
 * Fast integer square root approximation.
 * Ported from Rust version which uses bit manipulation.
 * 
 * @param val - Input value
 * @returns Approximate square root (1 << nbits)
 */
export function sqrt(val: number): number {
  if (val <= 0) return 0;
  
  // Calculate number of bits: (32 - leading_zeros(val)) / 2
  // Math.clz32() returns the number of leading zero bits
  const nbits = Math.floor((32 - Math.clz32(val)) / 2);
  
  return 1 << nbits;
}

/**
 * Find the next position where a change occurs.
 * Returns undefined if no change is found.
 */
export function findNextChange(changes: readonly boolean[], pos: number): number | undefined {
  for (let i = pos; i < changes.length; i++) {
    if (changes[i]) {
      return i;
    }
  }
  return undefined;
}

/**
 * Find the end position of a hunk starting at pos.
 * Returns the index after the last changed element.
 */
export function findHunkEnd(changes: readonly boolean[], pos: number): number {
  let end = pos;
  while (end < changes.length && changes[end]) {
    end++;
  }
  return end;
}

/**
 * Find the start position of a hunk ending at pos.
 * Returns the index of the first changed element.
 */
export function findHunkStart(changes: readonly boolean[], pos: number): number {
  let start = pos;
  while (start > 0 && changes[start - 1]) {
    start--;
  }
  return start;
}

/**
 * Mark a range of elements as changed.
 */
export function markRange(arr: boolean[], start: number, end: number, value: boolean): void {
  for (let i = start; i < end; i++) {
    arr[i] = value;
  }
}

