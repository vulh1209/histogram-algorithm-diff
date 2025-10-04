/**
 * Integration tests - End-to-end scenarios
 * Tests realistic use cases và workflows
 */

import { describe, it, expect } from 'vitest';
import { Diff, Algorithm } from '../../src/api/diff.js';
import { InternedInput } from '../../src/core/intern.js';
import { StringLines } from '../../src/core/sources.js';

describe('Integration Tests', () => {
  
  describe('📝 Real-World Scenarios', () => {
    
    it('Scenario: Git commit diff simulation', () => {
      const before = `function hello(name) {
  console.log("Hello " + name);
  return true;
}

function goodbye() {
  console.log("Goodbye");
}`;

      const after = `function hello(name, greeting = "Hello") {
  console.log(greeting + " " + name);
  return true;
}

function goodbye(name) {
  console.log("Goodbye " + name);
}

function welcome() {
  console.log("Welcome!");
}`;

      const input = InternedInput.new(
        new StringLines(before),
        new StringLines(after)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      const hunks = diff.getAllHunks();
      
      // Should detect:
      // 1. Modified function hello signature
      // 2. Modified function goodbye signature
      // 3. Added function welcome
      expect(hunks.length).toBeGreaterThanOrEqual(2);
      expect(diff.countAdditions()).toBeGreaterThan(0);
      expect(diff.countRemovals()).toBeGreaterThan(0);
    });
    
    it('Scenario: Configuration file update', () => {
      const before = `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^17.0.0"
  }
}`;

      const after = `{
  "name": "my-app",
  "version": "2.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}`;

      const input = InternedInput.new(
        new StringLines(before),
        new StringLines(after)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Version changed, dependencies changed
      expect(diff.countRemovals()).toBeGreaterThan(0);
      expect(diff.countAdditions()).toBeGreaterThan(0);
      
      // Should preserve unchanged lines (name, opening/closing braces)
      expect(diff.isRemoved(0)).toBe(false); // "{"
      expect(diff.isRemoved(1)).toBe(false); // "name" line
    });
    
    it('Scenario: README documentation update', () => {
      const before = `# My Project

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

Simple usage example.`;

      const after = `# My Project

A cool new project!

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

Simple usage example.

## Contributing

Please read CONTRIBUTING.md`;

      const input = InternedInput.new(
        new StringLines(before),
        new StringLines(after)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Added description and Contributing section
      expect(diff.countAdditions()).toBeGreaterThan(0);
      expect(diff.countRemovals()).toBe(0); // No removals, only additions
    });
    
    it('Scenario: Refactoring with renamed variables', () => {
      const before = `function process(data) {
  const result = data.map(x => x * 2);
  const filtered = result.filter(x => x > 10);
  return filtered;
}`;

      const after = `function process(inputData) {
  const doubled = inputData.map(x => x * 2);
  const filtered = doubled.filter(x => x > 10);
  return filtered;
}`;

      const input = InternedInput.new(
        new StringLines(before),
        new StringLines(after)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Lines with renamed variables should be detected as changed
      expect(diff.countRemovals()).toBeGreaterThan(0);
      expect(diff.countAdditions()).toBeGreaterThan(0);
    });
  });
  
  describe('📊 Performance Benchmarks', () => {
    
    it('Benchmark: Small file (< 100 lines)', () => {
      const lines = 50;
      const text = Array(lines).fill(0).map((_, i) => `line ${i}\n`).join('');
      
      const start = Date.now();
      
      const input = InternedInput.new(
        new StringLines(text),
        new StringLines(text)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      diff.getAllHunks();
      
      const elapsed = Date.now() - start;
      
      // Should be very fast
      expect(elapsed).toBeLessThan(50);
      expect(diff.countAdditions()).toBe(0);
    });
    
    it('Benchmark: Medium file (< 1000 lines)', () => {
      const lines = 500;
      const text = Array(lines).fill(0).map((_, i) => `line ${i}\n`).join('');
      
      const start = Date.now();
      
      const input = InternedInput.new(
        new StringLines(text),
        new StringLines(text)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      diff.getAllHunks();
      
      const elapsed = Date.now() - start;
      
      // Should still be fast
      expect(elapsed).toBeLessThan(200);
    });
    
    it('Benchmark: Large file (< 5000 lines)', () => {
      const lines = 2000;
      const text = Array(lines).fill(0).map((_, i) => `line ${i}\n`).join('');
      
      const start = Date.now();
      
      const input = InternedInput.new(
        new StringLines(text),
        new StringLines(text)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      diff.getAllHunks();
      
      const elapsed = Date.now() - start;
      
      // Acceptable performance
      expect(elapsed).toBeLessThan(1000);
      
      console.log(`  ⏱️  Large file (${lines} lines): ${elapsed}ms`);
    });
    
    it('Benchmark: Repetitive content (fallback to Myers)', () => {
      // This triggers Myers fallback
      const repetitive = 'same\n'.repeat(70);
      
      const start = Date.now();
      
      const input = InternedInput.new(
        new StringLines(repetitive),
        new StringLines(repetitive)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      diff.getAllHunks();
      
      const elapsed = Date.now() - start;
      
      // Should still be fast even with fallback
      expect(elapsed).toBeLessThan(100);
      
      console.log(`  ⏱️  Repetitive (70 lines, Myers fallback): ${elapsed}ms`);
    });
    
    it('Benchmark: Many small hunks', () => {
      // Every 10th line is different
      const lines = 500;
      const before = Array(lines).fill(0).map((_, i) => `line ${i}\n`).join('');
      const after = Array(lines).fill(0).map((_, i) => 
        i % 10 === 0 ? `modified ${i}\n` : `line ${i}\n`
      ).join('');
      
      const start = Date.now();
      
      const input = InternedInput.new(
        new StringLines(before),
        new StringLines(after)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      const hunks = diff.getAllHunks();
      
      const elapsed = Date.now() - start;
      
      expect(hunks.length).toBeGreaterThan(40); // ~50 changes
      expect(elapsed).toBeLessThan(300);
      
      console.log(`  ⏱️  Many hunks (${hunks.length} hunks): ${elapsed}ms`);
    });
  });
  
  describe('🔄 Round-Trip Tests', () => {
    
    it('Should maintain consistency after multiple diffs', () => {
      const v1 = 'version 1\ndata\nmore data\n';
      const v2 = 'version 2\ndata\neven more data\n';
      const v3 = 'version 3\ndata\neven more data\nfinal\n';
      
      // v1 → v2
      const input12 = InternedInput.new(
        new StringLines(v1),
        new StringLines(v2)
      );
      const diff12 = Diff.compute(Algorithm.Histogram, input12);
      
      // v2 → v3
      const input23 = InternedInput.new(
        new StringLines(v2),
        new StringLines(v3)
      );
      const diff23 = Diff.compute(Algorithm.Histogram, input23);
      
      // v1 → v3 (direct)
      const input13 = InternedInput.new(
        new StringLines(v1),
        new StringLines(v3)
      );
      const diff13 = Diff.compute(Algorithm.Histogram, input13);
      
      // Direct diff should have at least as many changes as sum of intermediate
      const intermediateChanges = 
        diff12.countAdditions() + diff12.countRemovals() +
        diff23.countAdditions() + diff23.countRemovals();
      
      const directChanges = 
        diff13.countAdditions() + diff13.countRemovals();
      
      // Direct diff should be more efficient or equal
      expect(directChanges).toBeLessThanOrEqual(intermediateChanges);
    });
  });
  
  describe('🎯 Correctness Validation', () => {
    
    it('Should produce valid hunks for complex changes', () => {
      const before = `line1
line2
line3
line4
line5
line6
line7
line8
line9
line10`;

      const after = `line1
modified2
line3
line4
inserted4.5
line5
modified6
line7
line8
inserted8.5
line10`;

      const input = InternedInput.new(
        new StringLines(before),
        new StringLines(after)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      const hunks = diff.getAllHunks();
      
      // Verify all hunks are valid
      for (const hunk of hunks) {
        // Ranges should be valid
        expect(hunk.before.start).toBeGreaterThanOrEqual(0);
        expect(hunk.before.end).toBeGreaterThanOrEqual(hunk.before.start);
        expect(hunk.after.start).toBeGreaterThanOrEqual(0);
        expect(hunk.after.end).toBeGreaterThanOrEqual(hunk.after.start);
        
        // Should have at least one change
        const hasChange = 
          (hunk.before.end > hunk.before.start) ||
          (hunk.after.end > hunk.after.start);
        expect(hasChange).toBe(true);
      }
      
      // Total changes should add up
      const totalRemoved = hunks.reduce((sum, h) => 
        sum + (h.before.end - h.before.start), 0
      );
      const totalAdded = hunks.reduce((sum, h) => 
        sum + (h.after.end - h.after.start), 0
      );
      
      expect(totalRemoved).toBe(diff.countRemovals());
      expect(totalAdded).toBe(diff.countAdditions());
    });
  });
  
  describe('🛡️ Defensive Programming', () => {
    
    it('Should handle malformed input gracefully', () => {
      // Input without newlines
      const input = InternedInput.new(
        new StringLines('no newline here'),
        new StringLines('no newline here either')
      );
      
      expect(() => {
        const diff = Diff.compute(Algorithm.Histogram, input);
        diff.getAllHunks();
      }).not.toThrow();
    });
    
    it('Should handle very long lines', () => {
      const longLine = 'x'.repeat(100000);
      
      const input = InternedInput.new(
        new StringLines(longLine + '\n'),
        new StringLines(longLine + '\n')
      );
      
      expect(() => {
        const diff = Diff.compute(Algorithm.Histogram, input);
        expect(diff.countAdditions()).toBe(0);
      }).not.toThrow();
    });
    
    it('Should handle mixed content types', () => {
      // Mix of code, comments, empty lines
      const before = `// Comment
function test() {

  const x = 1;
  
  return x;
}`;

      const after = `// Updated comment
function test() {

  const y = 2;
  
  return y;
}`;

      const input = InternedInput.new(
        new StringLines(before),
        new StringLines(after)
      );
      
      const diff = Diff.compute(Algorithm.Histogram, input);
      
      // Should detect the changes
      expect(diff.countRemovals()).toBeGreaterThan(0);
      expect(diff.countAdditions()).toBeGreaterThan(0);
    });
  });
});

