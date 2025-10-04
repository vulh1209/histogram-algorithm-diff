/**
 * Basic usage example for imara-diff
 */

import { Diff, Algorithm, InternedInput, StringLines } from '../src/index.js';

// Example 1: Simple text diff
console.log('=== Example 1: Simple Text Diff ===\n');

const before1 = `function hello() {
  console.log("Hello");
  return true;
}`;

const after1 = `function hello() {
  console.log("Hello, World!");
  console.log("Modified");
  return true;
}`;

const input1 = InternedInput.new(
  new StringLines(before1),
  new StringLines(after1)
);

const diff1 = Diff.compute(Algorithm.Histogram, input1);

console.log(`Total changes: +${diff1.countAdditions()}/-${diff1.countRemovals()}\n`);

for (const hunk of diff1.hunks()) {
  console.log(`Hunk:`);
  console.log(`  Before lines: ${hunk.before.start}-${hunk.before.end}`);
  console.log(`  After lines: ${hunk.after.start}-${hunk.after.end}`);
  
  // Show the actual changed lines
  if (hunk.before.end > hunk.before.start) {
    console.log(`  Removed:`);
    for (let i = hunk.before.start; i < hunk.before.end; i++) {
      const token = input1.before[i];
      if (token !== undefined) {
        console.log(`    - ${input1.interner.get(token).trim()}`);
      }
    }
  }
  
  if (hunk.after.end > hunk.after.start) {
    console.log(`  Added:`);
    for (let i = hunk.after.start; i < hunk.after.end; i++) {
      const token = input1.after[i];
      if (token !== undefined) {
        console.log(`    + ${input1.interner.get(token).trim()}`);
      }
    }
  }
  console.log();
}

// Example 2: Comparing file versions
console.log('\n=== Example 2: File Versions ===\n');

const version1 = `README.md
Version 1.0

Features:
- Basic functionality
- Simple API`;

const version2 = `README.md
Version 2.0

Features:
- Basic functionality
- Advanced functionality
- Simple API
- Documentation`;

const input2 = InternedInput.new(
  new StringLines(version1),
  new StringLines(version2)
);

const diff2 = Diff.compute(Algorithm.Histogram, input2);

console.log(`File has ${diff2.getAllHunks().length} changed regions`);
console.log(`Lines added: ${diff2.countAdditions()}`);
console.log(`Lines removed: ${diff2.countRemovals()}`);

// Example 3: Performance test with repetitive content
console.log('\n=== Example 3: Performance Test ===\n');

const repetitive = 'line\n'.repeat(100);
const modified = 'line\n'.repeat(50) + 'MODIFIED\n' + 'line\n'.repeat(49);

const startTime = Date.now();
const input3 = InternedInput.new(
  new StringLines(repetitive),
  new StringLines(modified)
);

const diff3 = Diff.compute(Algorithm.Histogram, input3);
const endTime = Date.now();

console.log(`Diffed ${input3.before.length} vs ${input3.after.length} lines`);
console.log(`Found ${diff3.getAllHunks().length} changes`);
console.log(`Time: ${endTime - startTime}ms`);

// Example 4: Empty files
console.log('\n=== Example 4: Edge Cases ===\n');

const empty = '';
const content = 'Some content\n';

const input4a = InternedInput.new(
  new StringLines(empty),
  new StringLines(content)
);

const diff4a = Diff.compute(Algorithm.Histogram, input4a);
console.log(`Empty -> Content: ${diff4a.countAdditions()} additions`);

const input4b = InternedInput.new(
  new StringLines(content),
  new StringLines(empty)
);

const diff4b = Diff.compute(Algorithm.Histogram, input4b);
console.log(`Content -> Empty: ${diff4b.countRemovals()} removals`);

console.log('\n=== All examples completed successfully! ===');

