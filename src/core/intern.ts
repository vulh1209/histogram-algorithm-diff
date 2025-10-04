/**
 * Token interning system.
 * Ported from Rust imara-diff/src/intern.rs
 */

import { Token, token as createToken, tokenToNumber } from './types.js';
import type { TokenSource } from './sources.js';

/**
 * Hash function for values.
 * Must be consistent: same value always produces same hash.
 */
function hashValue<T>(value: T): string {
  // For primitive types, convert to string directly
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  // For Uint8Array, convert to base64-like string for efficiency
  if (value instanceof Uint8Array) {
    // Fast path for small arrays
    if (value.length < 100) {
      return Array.from(value).join(',');
    }
    // For larger arrays, use TextDecoder if valid UTF-8, else hex
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(value);
    } catch {
      // Not valid UTF-8, fall back to hex encoding
      return Array.from(value)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  }
  
  // Fallback: JSON stringify
  // This is slow but correct for complex objects
  return JSON.stringify(value);
}

/**
 * An interner that maps tokens to unique integer IDs.
 * This allows for fast comparison and storage using integers instead of full values.
 */
export class Interner<T> {
  private tokens: T[] = [];
  private table = new Map<string, Token>();
  
  /** Generation counter for invalidation tracking */
  generation: number = 0;
  
  /**
   * Create a new interner with optional initial capacity.
   */
  constructor(capacity?: number) {
    if (capacity !== undefined && capacity > 0) {
      this.tokens = new Array(capacity);
      this.tokens.length = 0; // Reset length but keep capacity
    }
  }
  
  /**
   * Create an interner with capacity estimated from TokenSource.
   */
  static newForTokenSource<T>(
    before: TokenSource<T>,
    after: TokenSource<T>
  ): Interner<T> {
    const capacity = before.estimateTokens() + after.estimateTokens();
    return new Interner<T>(capacity);
  }
  
  /**
   * Remove all interned tokens.
   */
  clear(): void {
    this.table.clear();
    this.tokens.length = 0;
    this.generation++;
  }
  
  /**
   * Get the total number of distinct tokens currently interned.
   */
  numTokens(): number {
    return this.tokens.length;
  }
  
  /**
   * Reserve capacity for additional tokens.
   */
  reserve(capacity: number): void {
    const newCapacity = this.tokens.length + capacity;
    if (this.tokens.length < newCapacity) {
      this.tokens.length = newCapacity;
      this.tokens.length = this.tokens.filter(x => x !== undefined).length;
    }
  }
  
  /**
   * Intern a token and return its unique ID.
   * If the token was already interned, returns the existing ID.
   */
  intern(tokenValue: T): Token {
    const key = hashValue(tokenValue);
    
    // Check if already interned
    const existing = this.table.get(key);
    if (existing !== undefined) {
      return existing;
    }
    
    // Create new token ID
    const id = createToken(this.tokens.length);
    this.table.set(key, id);
    this.tokens.push(tokenValue);
    
    return id;
  }
  
  /**
   * Get the value associated with a token ID.
   */
  get(tok: Token): T {
    const index = tokenToNumber(tok);
    const value = this.tokens[index];
    if (value === undefined) {
      throw new Error(`Token ${index} not found in interner`);
    }
    return value;
  }
  
  /**
   * Array access operator (like Rust's Index trait).
   */
  [Symbol.iterator]() {
    return this.tokens[Symbol.iterator]();
  }
  
  /**
   * Get token by index (for compatibility).
   */
  at(index: number): T | undefined {
    return this.tokens[index];
  }
}

/**
 * Two lists of interned tokens that a Diff can be computed from.
 */
export class InternedInput<T> {
  before: Token[] = [];
  after: Token[] = [];
  interner: Interner<T>;
  
  private constructor(interner: Interner<T>) {
    this.interner = interner;
  }
  
  /**
   * Create a new InternedInput from two TokenSources.
   */
  static new<T>(
    before: TokenSource<T>,
    after: TokenSource<T>
  ): InternedInput<T> {
    const interner = Interner.newForTokenSource(before, after);
    const input = new InternedInput(interner);
    
    input.updateBefore(before.tokenize());
    input.updateAfter(after.tokenize());
    
    return input;
  }
  
  /**
   * Create from string inputs (convenience method).
   */
  static fromStrings(before: string, after: string): InternedInput<string> {
    const { StringLines } = require('./sources.js');
    return InternedInput.new(
      new StringLines(before),
      new StringLines(after)
    );
  }
  
  /**
   * Clear all data.
   */
  clear(): void {
    this.before.length = 0;
    this.after.length = 0;
    this.interner.clear();
  }
  
  /**
   * Reserve capacity for tokens.
   */
  reserve(capacityBefore: number, capacityAfter: number): void {
    this.interner.reserve(capacityBefore + capacityAfter);
  }
  
  /**
   * Update the 'before' sequence with new tokens.
   * Note: This does not erase tokens from the interner.
   */
  updateBefore(tokens: IterableIterator<T>): void {
    this.before.length = 0;
    for (const tok of tokens) {
      this.before.push(this.interner.intern(tok));
    }
  }
  
  /**
   * Update the 'after' sequence with new tokens.
   * Note: This does not erase tokens from the interner.
   */
  updateAfter(tokens: IterableIterator<T>): void {
    this.after.length = 0;
    for (const tok of tokens) {
      this.after.push(this.interner.intern(tok));
    }
  }
}

