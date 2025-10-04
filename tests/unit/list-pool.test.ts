/**
 * Tests for ListPool memory allocator
 */

import { describe, it, expect } from 'vitest';
import { ListPool, ListHandle } from '../../src/algorithms/list-pool.js';

describe('ListPool', () => {
  it('creates empty pool', () => {
    const pool = new ListPool();
    expect(pool.data.length).toBe(0);
    expect(pool.generation).toBe(1);
  });
  
  it('handles single element', () => {
    const pool = new ListPool();
    const handle = new ListHandle();
    
    handle.push(42, pool);
    
    expect(handle.len(pool)).toBe(1);
    expect(handle.asSlice(pool)).toEqual([42]);
  });
  
  it('handles multiple elements', () => {
    const pool = new ListPool();
    const handle = new ListHandle();
    
    handle.push(1, pool);
    handle.push(2, pool);
    handle.push(3, pool);
    
    expect(handle.len(pool)).toBe(3);
    expect(handle.asSlice(pool)).toEqual([1, 2, 3]);
  });
  
  it('handles many elements with reallocation', () => {
    const pool = new ListPool();
    const handle = new ListHandle();
    
    // Push 10 elements (will trigger reallocations)
    for (let i = 0; i < 10; i++) {
      handle.push(i, pool);
    }
    
    expect(handle.len(pool)).toBe(10);
    expect(handle.asSlice(pool)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  
  it('ignores elements beyond MAX_CHAIN_LEN', () => {
    const pool = new ListPool();
    const handle = new ListHandle();
    
    // Push more than 63 elements
    for (let i = 0; i < 70; i++) {
      handle.push(i, pool);
    }
    
    // Should stop at 63
    expect(handle.len(pool)).toBe(63);
  });
  
  it('invalidates handles after clear', () => {
    const pool = new ListPool();
    const handle = new ListHandle();
    
    handle.push(1, pool);
    handle.push(2, pool);
    
    expect(handle.len(pool)).toBe(2);
    
    // Clear pool
    pool.clear();
    
    // Handle should be invalid now
    expect(handle.len(pool)).toBe(0);
    expect(handle.asSlice(pool)).toEqual([]);
  });
  
  it('handles multiple lists independently', () => {
    const pool = new ListPool();
    const handle1 = new ListHandle();
    const handle2 = new ListHandle();
    
    handle1.push(1, pool);
    handle1.push(2, pool);
    
    handle2.push(10, pool);
    handle2.push(20, pool);
    handle2.push(30, pool);
    
    expect(handle1.asSlice(pool)).toEqual([1, 2]);
    expect(handle2.asSlice(pool)).toEqual([10, 20, 30]);
  });
  
  it('generation wraps around safely', () => {
    const pool = new ListPool();
    
    // Force generation to high value
    pool.generation = 0xFFFFFFFE;
    pool.clear();
    
    expect(pool.generation).toBe(0xFFFFFFFF);
    
    pool.clear();
    expect(pool.generation).toBe(1); // Wrapped around
  });
});

