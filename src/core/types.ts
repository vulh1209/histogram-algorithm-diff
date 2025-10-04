/**
 * Core types for imara-diff
 */

/**
 * A token represented as an interned integer.
 * Uses branded type pattern to prevent mixing with regular numbers.
 * 
 * Token represents the smallest possible unit of change during a diff.
 * For text, this is usually a line, word, or single character.
 */
export type Token = number & { readonly __brand: 'Token' };

/**
 * Create a Token from a number.
 * @internal
 */
export function token(n: number): Token {
  // Validate token is in valid range (u32 in Rust: 0 to 2^31-2)
  if (n < 0 || n >= 0x7FFF_FFFF) {
    throw new RangeError(`Token ${n} out of valid range [0, ${0x7FFF_FFFF})`);
  }
  return n as Token;
}

/**
 * Convert Token to number.
 * @internal
 */
export function tokenToNumber(t: Token): number {
  return t as number;
}

/**
 * A range of positions in a sequence.
 */
export interface Range {
  readonly start: number;
  readonly end: number;
}

/**
 * Create a range.
 */
export function range(start: number, end: number): Range {
  return { start, end };
}

/**
 * Check if a range is empty.
 */
export function isEmptyRange(r: Range): boolean {
  return r.start >= r.end;
}

/**
 * Get the length of a range.
 */
export function rangeLen(r: Range): number {
  return Math.max(0, r.end - r.start);
}

/**
 * Debug mode flag - enables runtime assertions.
 * Set to true in development, false in production.
 */
export const DEBUG = process.env.NODE_ENV !== 'production';

/**
 * Assert a condition in debug mode.
 * Throws an error if condition is false.
 */
export function assert(condition: boolean, message?: string): asserts condition {
  if (DEBUG && !condition) {
    throw new Error(`Assertion failed: ${message ?? 'condition is false'}`);
  }
}

/**
 * Ensure a number is a valid 32-bit signed integer.
 */
export function toI32(n: number): number {
  // JavaScript bitwise operations convert to 32-bit signed integers
  return n | 0;
}

/**
 * Ensure a number is a valid 32-bit unsigned integer.
 */
export function toU32(n: number): number {
  // Force unsigned by using unsigned right shift
  return n >>> 0;
}

/**
 * Safe array access that throws on out-of-bounds.
 * Use this in hot paths where performance matters but we want safety checks.
 */
export function at<T>(arr: readonly T[], index: number): T {
  if (DEBUG) {
    if (index < 0 || index >= arr.length) {
      throw new RangeError(`Index ${index} out of bounds [0, ${arr.length})`);
    }
  }
  return arr[index]!;
}

/**
 * Safe array write that throws on out-of-bounds.
 */
export function setAt<T>(arr: T[], index: number, value: T): void {
  if (DEBUG) {
    if (index < 0 || index >= arr.length) {
      throw new RangeError(`Index ${index} out of bounds [0, ${arr.length})`);
    }
  }
  arr[index] = value;
}

