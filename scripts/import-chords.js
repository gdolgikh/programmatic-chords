#!/usr/bin/env node
/**
 * Import 48 new chord voicings from tombatossals/chords-db (MIT license)
 * Qualities: m7b5, mmaj7, maj7#5 (augMaj7), aug7
 * Outputs JSON entries ready to insert into src/data/chords.js
 */

import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_URL = 'https://raw.githubusercontent.com/tombatossals/chords-db/master/lib/guitar.json';

// Map from DB suffix → our quality, display name pattern, slug suffix
const QUALITY_MAP = {
  m7b5:     { quality: 'm7♭5',    nameSuffix: 'Half-Diminished',        slugSuffix: 'm7b5' },
  mmaj7:    { quality: 'mMaj7',    nameSuffix: 'Minor-Major 7th',       slugSuffix: 'mmaj7' },
  'maj7#5': { quality: 'augMaj7',  nameSuffix: 'Augmented Major 7th',   slugSuffix: 'augmaj7' },
  aug7:     { quality: 'aug7',     nameSuffix: 'Augmented 7th',         slugSuffix: 'aug7' },
};

// DB key names for root notes (the chords-db uses "Csharp" not "C#", "Eb" not "D#", etc.)
const ROOT_MAP = {
  C:  { dbKey: 'C',      root: 'C',  noteSlug: 'c' },
  'C#': { dbKey: 'Csharp', root: 'C#', noteSlug: 'c-sharp' },
  D:  { dbKey: 'D',      root: 'D',  noteSlug: 'd' },
  Eb: { dbKey: 'Eb',     root: 'D#', noteSlug: 'd-sharp' },
  E:  { dbKey: 'E',      root: 'E',  noteSlug: 'e' },
  F:  { dbKey: 'F',      root: 'F',  noteSlug: 'f' },
  'F#': { dbKey: 'Fsharp', root: 'F#', noteSlug: 'f-sharp' },
  G:  { dbKey: 'G',      root: 'G',  noteSlug: 'g' },
  Ab: { dbKey: 'Ab',     root: 'G#', noteSlug: 'g-sharp' },
  A:  { dbKey: 'A',      root: 'A',  noteSlug: 'a' },
  Bb: { dbKey: 'Bb',     root: 'A#', noteSlug: 'a-sharp' },
  B:  { dbKey: 'B',      root: 'B',  noteSlug: 'b' },
};

// Description templates per quality
const DESCRIPTIONS = {
  'm7♭5': (name) =>
    `A half-diminished seventh chord with a dark, restless quality. ${name} appears naturally in minor keys and is essential for jazz ii-V-i progressions.`,
  mMaj7: (name) =>
    `A minor-major seventh chord combining the darkness of minor with a bright major seventh. ${name} creates a sophisticated, tense color found in film scores and jazz harmony.`,
  augMaj7: (name) =>
    `An augmented major seventh chord with a dreamy, floating quality. ${name} appears in harmonic minor harmony and adds lush tension to jazz voicings.`,
  aug7: (name) =>
    `An augmented seventh chord with an unstable, restless character. ${name} creates strong pull toward resolution and appears in melodic minor harmony.`,
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function transformChord(dbEntry, qualityCfg, rootCfg) {
  const { quality, nameSuffix, slugSuffix } = qualityCfg;
  const { root, noteSlug } = rootCfg;

  const name = `${root} ${nameSuffix}`;
  const slug = `${noteSlug}-${slugSuffix}-chord-guitar`;

  const positions = dbEntry.positions;
  const primary = positions[0];

  return {
    name,
    slug,
    root,
    quality,
    frets: primary.frets,
    fingers: primary.fingers,
    barres: primary.barres,
    description: DESCRIPTIONS[quality](name),
    baseFret: primary.baseFret,
    allPositions: positions.map(pos => {
      const entry = {
        frets: pos.frets,
        fingers: pos.fingers,
        baseFret: pos.baseFret,
        barres: pos.barres,
        midi: pos.midi,
      };
      if (pos.capo) entry.capo = true;
      return entry;
    }),
  };
}

async function main() {
  console.log('Fetching guitar chord database...');
  const db = await fetchJSON(DB_URL);
  console.log(`Found ${db.keys.length} keys, ${db.suffixes.length} suffixes`);

  // Our root order matches the project
  const rootOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Map our root names to DB keys
  const ourRootToDbKey = {};
  for (const [, cfg] of Object.entries(ROOT_MAP)) {
    ourRootToDbKey[cfg.root] = cfg;
  }

  // DB keys → lookup in chords object
  // The DB uses: C, Csharp, D, Eb, E, F, Fsharp, G, Ab, A, Bb, B
  const dbKeyMap = {};
  for (const [, cfg] of Object.entries(ROOT_MAP)) {
    dbKeyMap[cfg.root] = cfg.dbKey;
  }

  const allChords = {}; // root → array of chord objects

  for (const ourRoot of rootOrder) {
    const cfg = ourRootToDbKey[ourRoot];
    const dbKey = dbKeyMap[ourRoot];
    const rootChords = db.chords[dbKey];

    if (!rootChords) {
      console.error(`No chords found for DB key: ${dbKey} (root: ${ourRoot})`);
      continue;
    }

    allChords[ourRoot] = [];

    for (const [dbSuffix, qualityCfg] of Object.entries(QUALITY_MAP)) {
      const dbEntry = rootChords.find(c => c.suffix === dbSuffix);
      if (!dbEntry) {
        console.error(`Missing: ${ourRoot} ${dbSuffix} (DB key: ${dbKey})`);
        continue;
      }

      const chord = transformChord(dbEntry, qualityCfg, cfg);
      allChords[ourRoot].push(chord);
    }
  }

  // Output as JSON ready for insertion
  const outputPath = path.join(__dirname, 'imported-chords.json');
  const flatChords = rootOrder.flatMap(r => allChords[r] || []);

  fs.writeFileSync(outputPath, JSON.stringify(flatChords, null, 2));
  console.log(`\nWrote ${flatChords.length} chord entries to ${outputPath}`);

  // Also output grouped by root for insertion reference
  console.log('\nChords per root:');
  for (const root of rootOrder) {
    const chords = allChords[root] || [];
    console.log(`  ${root}: ${chords.map(c => c.quality).join(', ')}`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
