/**
 * Custom memory pool for efficient list allocation.
 * Ported from Rust imara-diff/src/histogram/list_pool.rs
 * 
 * This provides LIFO allocation with generation-based validation
 * to detect use-after-free bugs.
 */

import { assert, toU32 } from '../core/types.js';

/** Maximum chain length before fallback to Myers */
const MAX_CHAIN_LEN = 63;

/** Size classes are powers of 2, starting from 4 */
type SizeClass = number;

/** Get the size of a size class (4 << sclass) */
function sclassSize(sclass: SizeClass): number {
  return 4 << sclass;
}

/** Get the size class for a given length */
function sclassForLength(len: number): SizeClass {
  // Port of: 30 - (len | 3).leading_zeros() as u8
  // JavaScript equivalent using clz32
  const val = len | 3;
  return 30 - Math.clz32(val);
}

/** Check if length is at the maximum of its size class */
function isSclassMaxLength(len: number): boolean {
  return len > 3 && (len & (len - 1)) === 0; // Power of 2
}

/** Calculate maximum size class we need */
const MAX_SIZE_CLASS = sclassForLength(MAX_CHAIN_LEN - 1);
const NUM_SIZE_CLASS = MAX_SIZE_CLASS + 1;

/**
 * A handle to a list stored in the pool.
 * Uses generation-based validation to detect use-after-free.
 */
export class ListHandle {
  private index: number = 0;
  private generation: number = 0;
  private length: number = 0;
  
  /**
   * Get the number of elements in the list.
   * Returns 0 if the handle is invalid (wrong generation).
   */
  len(pool: ListPool): number {
    if (this.generation !== pool.generation) {
      return 0; // Handle invalidated
    }
    return this.length;
  }
  
  /**
   * Get the list as a readonly array.
   * Returns empty array if handle is invalid.
   */
  asSlice(pool: ListPool): readonly number[] {
    const len = this.len(pool);
    
    if (len === 0) {
      return [];
    } else if (len === 1) {
      // Special case: single element stored directly in index
      return [this.index];
    } else {
      // Multiple elements stored in pool
      const idx = this.index;
      return pool.data.slice(idx, idx + len);
    }
  }
  
  /**
   * Push an element to the list.
   * Allocates or reallocates as needed.
   */
  push(element: number, pool: ListPool): void {
    const len = this.len(pool);
    
    switch (len) {
      case 0:
        // Empty list: store element directly in index
        this.generation = pool.generation;
        this.index = element;
        this.length = 1;
        break;
      
      case 1: {
        // Single element: need to allocate block
        const block = pool.alloc(0); // Size class 0 (size 4)
        pool.data[block] = this.index; // Old element
        pool.data[block + 1] = element; // New element
        this.index = block;
        this.length = 2;
        break;
      }
      
      default: {
        if (len >= MAX_CHAIN_LEN) {
          // Ignore elements beyond MAX_CHAIN_LEN
          // Will trigger fallback to Myers
          return;
        }
        
        // Check if we need to reallocate to larger size class
        let block = this.index;
        
        if (isSclassMaxLength(len)) {
          // Need to grow to next size class
          const sclass = sclassForLength(len);
          block = pool.realloc(this.index, sclass - 1, sclass, len);
          this.index = block;
        }
        
        pool.data[block + len] = element;
        this.length++;
        break;
      }
    }
  }
}

/**
 * Memory pool for storing lists efficiently.
 * Uses LIFO allocation with free lists per size class.
 */
export class ListPool {
  /** Main data array */
  data: number[] = [];
  
  /** Free list heads for each size class */
  private freeList: Uint32Array;
  
  /** Current generation (for validation) */
  generation: number = 1;
  
  constructor(capacity?: number) {
    this.freeList = new Uint32Array(NUM_SIZE_CLASS);
    this.freeList.fill(0xFFFFFFFF); // All empty
    
    if (capacity) {
      this.data = new Array(capacity);
      this.data.length = 0;
    }
  }
  
  /**
   * Clear the pool, invalidating all handles.
   */
  clear(): void {
    this.data.length = 0;
    this.freeList.fill(0xFFFFFFFF);
    
    // Increment generation and wrap if needed
    if (this.generation === 0xFFFFFFFF) {
      this.generation = 1;
    } else {
      this.generation++;
    }
  }
  
  /**
   * Allocate a block of given size class.
   * Returns the starting index.
   */
  alloc(sclass: SizeClass): number {
    const freeHead = this.freeList[sclass];
    
    if (freeHead === 0xFFFFFFFF) {
      // No free blocks, allocate new
      const offset = this.data.length;
      const size = sclassSize(sclass);
      
      // Grow array
      for (let i = 0; i < size; i++) {
        this.data.push(0xFFFFFFFF);
      }
      
      return offset;
    } else {
      // Reuse from free list
      const nextFree = this.data[freeHead!];
      this.freeList[sclass] = toU32(nextFree!);
      return freeHead!;
    }
  }
  
  /**
   * Free a block back to the pool.
   */
  free(block: number, sclass: SizeClass): void {
    // Add to free list (single-linked)
    this.data[block] = this.freeList[sclass]!;
    this.freeList[sclass] = toU32(block);
  }
  
  /**
   * Reallocate a block to a different size class.
   * Copies elemsToCopy elements from old to new block.
   */
  realloc(
    block: number,
    fromSclass: SizeClass,
    toSclass: SizeClass,
    elemsToCopy: number
  ): number {
    assert(elemsToCopy <= sclassSize(fromSclass), 'elemsToCopy too large for fromSclass');
    assert(elemsToCopy <= sclassSize(toSclass), 'elemsToCopy too large for toSclass');
    
    // Allocate new block
    const newBlock = this.alloc(toSclass);
    
    // Copy elements
    for (let i = 0; i < elemsToCopy; i++) {
      this.data[newBlock + i] = this.data[block + i]!;
    }
    
    // Free old block
    this.free(block, fromSclass);
    
    return newBlock;
  }
}

