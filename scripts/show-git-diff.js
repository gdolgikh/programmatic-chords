import { chords as currentChords } from '../src/data/chords.js';
import { chords as backupChords } from '../src/data/chords.backup.js';
import { execSync } from 'child_process';

// Create a temp CommonJS file to eval the git version
const fs = require('fs');
const gitOutput = execSync('git show HEAD:src/data/chords.js', { encoding: 'utf8' });
const tmpFile = '/tmp/orig_chords.mjs';
fs.writeFileSync(tmpFile, gitOutput);

const { chords: originalChords } = await import('file://' + tmpFile);

console.log('🎸 Comparison: Original (Git) vs Migrated\n');

const changes = [];
currentChords.forEach((current, index) => {
  const original = originalChords[index];
  if (!original) return;

  const fretsMatch = JSON.stringify(current.frets) === JSON.stringify(original.frets);
  const fingersMatch = JSON.stringify(current.fingers) === JSON.stringify(original.fingers);
  
  if (!fretsMatch || !fingersMatch) {
    changes.push({
      name: current.name,
      oldFrets: original.frets,
      newFrets: current.frets,
      oldFingers: original.fingers,
      newFingers: current.fingers
    });
  }
});

console.log(`📊 Total changes: ${changes.length} out of ${currentChords.length} chords\n`);

if (changes.length > 0) {
  console.log('Sample of improved fingerings:\n');
  changes.slice(0, 10).forEach((change, i) => {
    console.log(`${i + 1}. ${change.name}`);
    console.log(`   Frets:   ${JSON.stringify(change.oldFrets)} → ${JSON.stringify(change.newFrets)}`);
    console.log(`   Fingers: ${JSON.stringify(change.oldFingers)} → ${JSON.stringify(change.newFingers)}\n`);
  });

  if (changes.length > 10) {
    console.log(`... and ${changes.length - 10} more improvements\n`);
  }
}
