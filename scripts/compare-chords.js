import { chords as migratedChords } from '../src/data/chords.js';
import { chords as backupChords } from '../src/data/chords.backup.js';

console.log('🎸 Comparing Original vs Migrated Fingerings\n');

const changes = [];
migratedChords.forEach((migrated, index) => {
  const backup = backupChords[index];
  if (!backup) return;

  const fretsMatch = JSON.stringify(migrated.frets) === JSON.stringify(backup.frets);
  
  if (!fretsMatch) {
    changes.push({
      name: migrated.name,
      oldFrets: backup.frets,
      newFrets: migrated.frets
    });
  }
});

console.log(`📊 Total changes: ${changes.length} out of ${migratedChords.length} chords\n`);

if (changes.length > 0) {
  console.log('Sample of improved fingerings:\n');
  changes.slice(0, 5).forEach((change, i) => {
    console.log(`${i + 1}. ${change.name}`);
    console.log(`   Old: ${JSON.stringify(change.oldFrets)}`);
    console.log(`   New: ${JSON.stringify(change.newFrets)}\n`);
  });
}
