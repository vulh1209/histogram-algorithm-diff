/**
 * Demo showing different types of changes: ADD, REMOVE, MODIFY
 */

import { Diff, Algorithm, InternedInput, StringLines } from '../index.js';
import { HunkUtils } from '../api/diff.js';

console.log('🎯 Demonstrating Different Change Types\n');

// Example with all 3 types of changes
const before = `line 1
line 2 - will be modified
line 3 - will be deleted
line 4
line 5`;

const after = `line 1
line 2 - MODIFIED VERSION
line 4
line 5
line 6 - newly added`;

const input = InternedInput.new(
  new StringLines(before),
  new StringLines(after)
);

const diff = Diff.compute(Algorithm.Histogram, input);

console.log(`Total hunks: ${diff.getAllHunks().length}`);
console.log(`Total additions: ${diff.countAdditions()}`);
console.log(`Total removals: ${diff.countRemovals()}\n`);

// Analyze each hunk
for (const hunk of diff.hunks()) {
  let changeType = '';
  let icon = '';
  
  if (HunkUtils.isPureInsertion(hunk)) {
    changeType = 'PURE ADDITION';
    icon = '✅';
  } else if (HunkUtils.isPureRemoval(hunk)) {
    changeType = 'PURE REMOVAL';
    icon = '❌';
  } else if (HunkUtils.isModification(hunk)) {
    changeType = 'MODIFICATION (REMOVE + ADD)';
    icon = '✏️';
  }
  
  console.log(`${icon} ${changeType}`);
  console.log(`   Before: lines ${hunk.before.start}-${hunk.before.end}`);
  console.log(`   After: lines ${hunk.after.start}-${hunk.after.end}`);
  
  // Show removed content
  if (hunk.before.end > hunk.before.start) {
    console.log(`   Removed:`);
    for (let i = hunk.before.start; i < hunk.before.end; i++) {
      const token = input.before[i];
      if (token !== undefined) {
        const line = input.interner.get(token).trim();
        console.log(`     - ${line}`);
      }
    }
  }
  
  // Show added content
  if (hunk.after.end > hunk.after.start) {
    console.log(`   Added:`);
    for (let i = hunk.after.start; i < hunk.after.end; i++) {
      const token = input.after[i];
      if (token !== undefined) {
        const line = input.interner.get(token).trim();
        console.log(`     + ${line}`);
      }
    }
  }
  
  console.log();
}

console.log('🎉 Demo complete!\n');
console.log('📝 Summary:');
console.log('   - Pure Addition: new content added (no removal)');
console.log('   - Pure Removal: content deleted (no addition)');
console.log('   - Modification: content changed (removal + addition in same hunk)');

