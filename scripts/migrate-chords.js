import { chords as currentChords } from '../src/data/chords.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const guitarDbPath = path.join(path.dirname(__filename), '../node_modules/@tombatossals/chords-db/lib/guitar.json');
const guitarDb = JSON.parse(fs.readFileSync(guitarDbPath, 'utf8'));


// Quality mapping from our format to chords-db suffix format
const qualityToSuffix = {
  'Major': 'major',
  'Minor': 'minor',
  '7': '7',
  '5': '5',
  'dim': 'dim',
  'dim7': 'dim7',
  'aug': 'aug',
  'sus2': 'sus2',
  'sus4': 'sus4',
  'maj7': 'maj7',
  'm7': 'm7',
  '7sus4': '7sus4'
};

// Root note mapping (handle enharmonic equivalents)
// Database uses: C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B
const rootMapping = {
  'C': 'C',
  'C#': 'C#',  // Db is also C#
  'D': 'D',
  'D#': 'Eb',  // D# is enharmonically Eb
  'E': 'E',
  'F': 'F',
  'F#': 'F#',  // Gb is also F#
  'G': 'G',
  'G#': 'Ab',  // G# is enharmonically Ab
  'A': 'A',
  'A#': 'Bb',  // A# is enharmonically Bb
  'B': 'B'
};

/**
 * Ensure frets is a numeric array
 * In guitar.json, frets is already an array of numbers
 */
function ensureFretArray(frets) {
  if (Array.isArray(frets)) {
    return frets;
  }
  // Fallback: handle hex string format if present
  return frets.split('').map(char => {
    if (char === 'x') return -1;
    return parseInt(char, 16);
  });
}

/**
 * Ensure fingers is a numeric array
 * In guitar.json, fingers might be a string that needs to be converted
 */
function ensureFingerArray(fingers) {
  if (Array.isArray(fingers)) {
    return fingers;
  }
  // Fallback: handle string format
  return fingers.split('').map(c => parseInt(c));
}

/**
 * Convert simple barres array to detailed objects
 * Analyzes fret array to determine fromString and toString
 */
function convertBarres(barreNumbers, fretsArray) {
  if (!barreNumbers || barreNumbers.length === 0) {
    return [];
  }

  return barreNumbers.map(fret => {
    const stringIndices = fretsArray
      .map((f, i) => f === fret ? i : -1)
      .filter(i => i !== -1);

    if (stringIndices.length === 0) {
      return { fret, fromString: 0, toString: 0 };
    }

    return {
      fret,
      fromString: Math.min(...stringIndices),
      toString: Math.max(...stringIndices)
    };
  });
}

/**
 * Find chord in chords-db by root and suffix
 */
function findChordInDb(root, suffix) {
  try {
    const mappedRoot = rootMapping[root];
    if (!mappedRoot) {
      console.warn(`  ⚠️  Unknown root: ${root}`);
      return null;
    }

    const chordArray = guitarDb.chords[mappedRoot];
    if (!chordArray) {
      console.warn(`  ⚠️  No chords found for root: ${mappedRoot}`);
      return null;
    }

    // Find chord with matching suffix in the array
    const chord = chordArray.find(c => c.suffix === suffix);
    return chord;
  } catch (e) {
    console.warn(`  ⚠️  Error finding chord ${root} ${suffix}:`, e.message);
    return null;
  }
}

/**
 * Migrate a single chord with data from chords-db
 */
function migrateChord(currentChord) {
  const suffix = qualityToSuffix[currentChord.quality];
  if (!suffix) {
    console.warn(`  ⚠️  Unknown quality mapping: ${currentChord.quality}`);
    return currentChord; // Keep original
  }

  const dbChord = findChordInDb(currentChord.root, suffix);

  if (!dbChord || !dbChord.positions || dbChord.positions.length === 0) {
    console.warn(`  ⚠️  No fingering found for ${currentChord.name} (${currentChord.root} ${suffix})`);
    return currentChord; // Keep original
  }

  // Use first position (typically the most common/open)
  const position = dbChord.positions[0];

  const newFrets = ensureFretArray(position.frets);
  const newFingers = ensureFingerArray(position.fingers);
  const newBarres = convertBarres(position.barres, newFrets);

  return {
    ...currentChord,
    frets: newFrets,
    fingers: newFingers,
    barres: newBarres,
    baseFret: position.baseFret || 0,
    allPositions: dbChord.positions // Store all positions for future use
  };
}

console.log('🎸 Starting chord data migration...\n');

// Create backup
const __dirname = path.dirname(__filename);
const chordsPath = path.join(__dirname, '../src/data/chords.js');
const backupPath = path.join(__dirname, '../src/data/chords.backup.js');

console.log('📦 Backing up current chords.js...');
const currentContent = fs.readFileSync(chordsPath, 'utf8');
fs.writeFileSync(backupPath, currentContent);
console.log(`✅ Backup created at: ${backupPath}\n`);

// Migrate chords
console.log(`🔄 Migrating ${currentChords.length} chords...\n`);

const migratedChords = currentChords.map(chord => {
  const migrated = migrateChord(chord);
  const status = migrated.baseFret !== undefined ? '✅' : '⚠️';
  console.log(`${status} ${migrated.name}`);
  return migrated;
});

// Generate new chords.js file with helper functions
const output = `export const chords = ${JSON.stringify(migratedChords, null, 2)};

// Group chords by root note for navigation
export function getChordsByRoot() {
  const groups = {};
  for (const chord of chords) {
    if (!groups[chord.root]) groups[chord.root] = [];
    groups[chord.root].push(chord);
  }
  return groups;
}

// Note order for navigation
export const rootOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
`;

fs.writeFileSync(chordsPath, output);

console.log(`\n✨ Migration complete! Updated ${migratedChords.length} chords.`);
console.log(`📁 File written to: ${chordsPath}\n`);

// Summary
const withAllPositions = migratedChords.filter(c => c.allPositions).length;
console.log(`📊 Summary:`);
console.log(`   • Total chords: ${migratedChords.length}`);
console.log(`   • With alternate positions: ${withAllPositions}`);
console.log(`   • Backup location: ${backupPath}\n`);
