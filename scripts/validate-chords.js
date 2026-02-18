import { chords as migratedChords } from '../src/data/chords.js';
import { chords as backupChords } from '../src/data/chords.backup.js';
import fs from 'fs';

console.log('🔍 Validating migrated chord data...\n');

const errors = [];
const warnings = [];
const changes = [];

// Check basic structure
console.log('📋 Checking data structure...');

migratedChords.forEach((chord, index) => {
  // Check required fields
  if (!chord.name) errors.push(`Chord ${index}: missing name`);
  if (!chord.slug) errors.push(`Chord ${index}: missing slug`);
  if (!chord.root) errors.push(`Chord ${index}: missing root`);
  if (!chord.quality) errors.push(`Chord ${index}: missing quality`);
  if (!Array.isArray(chord.frets)) errors.push(`Chord ${index}: frets is not an array`);
  if (!Array.isArray(chord.fingers)) errors.push(`Chord ${index}: fingers is not an array`);
  if (!Array.isArray(chord.barres)) errors.push(`Chord ${index}: barres is not an array`);
  if (chord.description === undefined) errors.push(`Chord ${index}: missing description`);

  // Check array lengths
  if (chord.frets.length !== 6) {
    errors.push(`${chord.name}: frets array length is ${chord.frets.length}, expected 6`);
  }
  if (chord.fingers.length !== 6) {
    errors.push(`${chord.name}: fingers array length is ${chord.fingers.length}, expected 6`);
  }

  // Check fret values
  chord.frets.forEach((fret, stringIdx) => {
    if (typeof fret !== 'number' || fret < -1 || fret > 24) {
      errors.push(`${chord.name} string ${stringIdx}: invalid fret value ${fret}`);
    }
  });

  // Check finger values
  chord.fingers.forEach((finger, stringIdx) => {
    if (typeof finger !== 'number' || finger < 0 || finger > 4) {
      errors.push(`${chord.name} string ${stringIdx}: invalid finger value ${finger}`);
    }
  });

  // Validate barres
  chord.barres.forEach((barre, barreIdx) => {
    if (typeof barre.fret !== 'number') {
      errors.push(`${chord.name} barre ${barreIdx}: invalid fret`);
    }
    if (typeof barre.fromString !== 'number' || barre.fromString < 0 || barre.fromString > 5) {
      errors.push(`${chord.name} barre ${barreIdx}: invalid fromString ${barre.fromString}`);
    }
    if (typeof barre.toString !== 'number' || barre.toString < 0 || barre.toString > 5) {
      errors.push(`${chord.name} barre ${barreIdx}: invalid toString ${barre.toString}`);
    }
    if (barre.fromString > barre.toString) {
      errors.push(`${chord.name} barre ${barreIdx}: fromString > toString`);
    }
  });
});

console.log(`✅ Structure validation complete\n`);

// Check descriptions preserved
console.log('📝 Checking descriptions...');
let descriptionsPreserved = 0;
let descriptionsChanged = 0;
let descriptionsLost = 0;

migratedChords.forEach((migrated, index) => {
  const backup = backupChords[index];
  if (!backup) {
    warnings.push(`No backup for chord ${index}: ${migrated.name}`);
    return;
  }

  if (migrated.description === backup.description) {
    descriptionsPreserved++;
  } else if (migrated.description && migrated.description.length > 0) {
    descriptionsChanged++;
    console.log(`  ⚠️  ${migrated.name}: description changed`);
  } else {
    descriptionsLost++;
    errors.push(`${migrated.name}: description lost`);
  }
});

console.log(`✅ Descriptions: ${descriptionsPreserved} preserved, ${descriptionsChanged} changed, ${descriptionsLost} lost\n`);

// Check slugs unchanged
console.log('🔗 Checking URLs (slugs)...');
let slugsUnchanged = 0;
let slugsChanged = 0;

migratedChords.forEach((migrated, index) => {
  const backup = backupChords[index];
  if (!backup) {
    warnings.push(`No backup for chord ${index}: ${migrated.name}`);
    return;
  }

  if (migrated.slug === backup.slug) {
    slugsUnchanged++;
  } else {
    slugsChanged++;
    errors.push(`${migrated.name}: slug changed from ${backup.slug} to ${migrated.slug}`);
  }
});

console.log(`✅ Slugs: ${slugsUnchanged} unchanged, ${slugsChanged} changed\n`);

// Compare fingerings
console.log('🎸 Comparing fingerings (changes)...');
let fingersUnchanged = 0;
let fingersChanged = 0;

migratedChords.forEach((migrated, index) => {
  const backup = backupChords[index];
  if (!backup) return;

  const fretsMatch = JSON.stringify(migrated.frets) === JSON.stringify(backup.frets);
  const fingersMatch = JSON.stringify(migrated.fingers) === JSON.stringify(backup.fingers);

  if (fretsMatch && fingersMatch) {
    fingersUnchanged++;
  } else {
    fingersChanged++;
    changes.push({
      name: migrated.name,
      oldFrets: backup.frets,
      newFrets: migrated.frets,
      oldFingers: backup.fingers,
      newFingers: migrated.fingers
    });
  }
});

console.log(`✅ Fingerings: ${fingersUnchanged} unchanged, ${fingersChanged} changed\n`);

// Show significant changes
if (changes.length > 0) {
  console.log('📊 Significant fingering changes:\n');
  changes.slice(0, 10).forEach(change => {
    console.log(`   ${change.name}`);
    console.log(`      Old: frets=${JSON.stringify(change.oldFrets)}, fingers=${JSON.stringify(change.oldFingers)}`);
    console.log(`      New: frets=${JSON.stringify(change.newFrets)}, fingers=${JSON.stringify(change.newFingers)}\n`);
  });

  if (changes.length > 10) {
    console.log(`   ... and ${changes.length - 10} more changes\n`);
  }
}

// Final report
console.log('═'.repeat(60));
console.log('📋 VALIDATION REPORT\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All validations passed!\n');
} else {
  if (errors.length > 0) {
    console.log(`❌ ${errors.length} error(s):`);
    errors.slice(0, 10).forEach(err => console.log(`   • ${err}`));
    if (errors.length > 10) console.log(`   ... and ${errors.length - 10} more\n`);
  }

  if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} warning(s):`);
    warnings.slice(0, 5).forEach(warn => console.log(`   • ${warn}`));
    if (warnings.length > 5) console.log(`   ... and ${warnings.length - 5} more\n`);
  }
}

console.log(`📊 Statistics:`);
console.log(`   • Total chords: ${migratedChords.length}`);
console.log(`   • Descriptions preserved: ${descriptionsPreserved}/${migratedChords.length}`);
console.log(`   • Slugs unchanged: ${slugsUnchanged}/${migratedChords.length}`);
console.log(`   • Fingerings changed: ${fingersChanged}/${migratedChords.length} (${Math.round(fingersChanged / migratedChords.length * 100)}%)`);

const statusCode = errors.length > 0 ? 1 : 0;
process.exit(statusCode);
