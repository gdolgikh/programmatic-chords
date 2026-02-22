/**
 * Generate natural "How to Play" descriptions for every chord.
 *
 * Run:  node scripts/generate-how-to-play.js
 *
 * Reads chords.js, generates a howToPlay field for each chord,
 * and writes the updated file back.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHORDS_PATH = join(__dirname, '..', 'src', 'data', 'chords.js');

// ── String & finger names ──────────────────────────────────────────
const STRING_NAMES = ['low E', 'A', 'D', 'G', 'B', 'high E'];
const FINGER_NAMES = { 1: 'index finger', 2: 'middle finger', 3: 'ring finger', 4: 'pinky' };
const FINGER_NAMES_SHORT = { 1: 'index', 2: 'middle', 3: 'ring', 4: 'pinky' };

// Ordinals for frets
function fretOrd(f) {
  if (f === 1) return '1st fret';
  if (f === 2) return '2nd fret';
  if (f === 3) return '3rd fret';
  return `${f}th fret`;
}

// ── Barre description ──────────────────────────────────────────────
function descBarre(barre, frets) {
  // barre: { fret, fromString, toString }
  const fret = barre.fret;
  const from = barre.fromString;
  const to = barre.toString;

  // Determine which strings the barre actually covers
  const count = to - from + 1;

  let spanDesc;
  if (from === 0 && to === 5) {
    spanDesc = 'across all six strings';
  } else if (count === 5) {
    spanDesc = `from the ${STRING_NAMES[from]} to the ${STRING_NAMES[to]} string`;
  } else if (count === 4) {
    spanDesc = `from the ${STRING_NAMES[from]} to the ${STRING_NAMES[to]} string`;
  } else if (count === 3) {
    spanDesc = `across the ${STRING_NAMES[from]}, ${STRING_NAMES[to - 1]}, and ${STRING_NAMES[to]} strings`;
  } else {
    spanDesc = `across the ${STRING_NAMES[from]} and ${STRING_NAMES[to]} strings`;
  }

  const verbs = [
    `Lay your index finger flat ${spanDesc} at the ${fretOrd(fret)}`,
    `Barre ${spanDesc} at the ${fretOrd(fret)} with your index finger`,
    `Press your index finger flat ${spanDesc} at the ${fretOrd(fret)}`,
  ];

  return verbs[fret % verbs.length];
}

// ── Collect individual finger placements (non-barre) ───────────────
function collectPlacements(frets, fingers, barres) {
  const barreFret = barres.length > 0 ? barres[0].fret : null;
  const barreFrom = barres.length > 0 ? barres[0].fromString : -1;
  const barreTo = barres.length > 0 ? barres[0].toString : -1;

  const placements = []; // { finger, fret, stringIdx }
  for (let i = 0; i < 6; i++) {
    const f = frets[i];
    const fg = fingers[i];
    if (f <= 0 || fg === 0) continue;

    // Skip strings that are part of the barre (same fret, same finger=1, within range)
    if (barreFret !== null && f === barreFret && fg === 1 && i >= barreFrom && i <= barreTo) continue;

    placements.push({ finger: fg, fret: f, stringIdx: i });
  }

  // Sort by finger number for natural reading order
  placements.sort((a, b) => a.finger - b.finger);
  return placements;
}

// ── Describe open & muted strings ──────────────────────────────────
function descOpenMuted(frets, barres) {
  const barreFrom = barres.length > 0 ? barres[0].fromString : -1;
  const barreTo = barres.length > 0 ? barres[0].toString : -1;
  const barreFret = barres.length > 0 ? barres[0].fret : null;

  const muted = [];
  const open = [];

  for (let i = 0; i < 6; i++) {
    if (frets[i] === -1) muted.push(STRING_NAMES[i]);
    else if (frets[i] === 0) open.push(STRING_NAMES[i]);
  }

  const parts = [];

  if (muted.length === 1) {
    parts.push(`Mute the ${muted[0]} string`);
  } else if (muted.length === 2) {
    parts.push(`Mute the ${muted[0]} and ${muted[1]} strings`);
  } else if (muted.length > 2) {
    const last = muted.pop();
    parts.push(`Mute the ${muted.join(', ')}, and ${last} strings`);
  }

  if (open.length === 1) {
    parts.push(`let the ${open[0]} string ring open`);
  } else if (open.length === 2) {
    parts.push(`let the ${open[0]} and ${open[1]} strings ring open`);
  } else if (open.length === 3) {
    parts.push(`let the ${open[0]}, ${open[1]}, and ${open[2]} strings ring open`);
  } else if (open.length >= 4) {
    const last = open.pop();
    parts.push(`let the ${open.join(', ')}, and ${last} strings ring open`);
  }

  return parts;
}

// ── Describe placement of a single finger ──────────────────────────
function descPlacement(p, usePlaceYour) {
  const verb = usePlaceYour ? 'place your' : 'your';
  return `${verb} ${FINGER_NAMES[p.finger]} on the ${fretOrd(p.fret)} of the ${STRING_NAMES[p.stringIdx]} string`;
}

// ── Join placements into flowing prose ─────────────────────────────
function joinPlacements(placements) {
  if (placements.length === 0) return '';

  if (placements.length === 1) {
    return 'Place ' + descPlacement(placements[0], false) + '.';
  }

  // "Place your X on ..., your Y on ..., and your Z on ..."
  const parts = placements.map((p, i) => {
    if (i === 0) return 'Place ' + descPlacement(p, false);
    return descPlacement(p, false);
  });

  if (parts.length === 2) {
    return parts[0] + ', and ' + parts[1] + '.';
  }

  const last = parts.pop();
  return parts.join(', ') + ', and ' + last + '.';
}

// ── Strum direction hint ───────────────────────────────────────────
function strumHint(frets) {
  const firstPlayed = frets.indexOf(frets.find(f => f >= 0));
  if (firstPlayed === 0) return 'Strum all six strings.';
  if (firstPlayed === 1) return 'Strum from the A string down.';
  if (firstPlayed === 2) return 'Strum from the D string down.';
  return '';
}

// ── Common difficulty tips by chord quality / shape ────────────────
function difficultyTips(chord) {
  const { quality, name, frets, fingers, barres } = chord;
  const hasBarre = barres.length > 0;
  const isFullBarre = hasBarre && barres[0].fromString === 0 && barres[0].toString === 5;
  const isPartialBarre = hasBarre && !isFullBarre;

  // Detect big stretches (max fret distance between non-zero frets)
  const played = frets.filter(f => f > 0);
  const maxStretch = played.length > 1 ? Math.max(...played) - Math.min(...played) : 0;

  const tips = [];

  if (isFullBarre) {
    tips.push('If the barre feels difficult, focus on pressing with the side edge of your index finger rather than the flat pad — this helps get a clean sound on every string.');
  } else if (isPartialBarre) {
    tips.push('For the partial barre, tilt your index finger slightly to use its bony edge for cleaner contact.');
  }

  // Quality-specific tips
  if (quality === 'Major' && !hasBarre) {
    // Open major chords
    if (frets.includes(0) && played.length >= 3) {
      tips.push('Keep your fingers arched so the open strings ring clearly without being accidentally muted.');
    }
  }

  if (quality === 'Minor' && !hasBarre) {
    tips.push('Listen for a clean, even sound across all fretted strings — minor chords can lose their character if any note buzzes.');
  }

  if (quality === '7' || quality === 'dom7') {
    tips.push('Make sure the seventh note rings clearly — it gives this chord its bluesy character.');
  }

  if (quality === 'dim' || quality === 'dim7') {
    tips.push('This chord has a tight, clustered shape. Keep your fingers close together and perpendicular to the fretboard.');
  }

  if (quality === 'aug') {
    tips.push('The augmented sound should feel unresolved and slightly tense — if it sounds like a normal major chord, check that every note is ringing.');
  }

  if (quality === 'sus2') {
    tips.push('The open, airy quality of a sus2 chord depends on every note ringing clearly — avoid letting your fingers brush adjacent strings.');
  }

  if (quality === 'sus4') {
    tips.push('This chord wants to resolve. Try playing it followed by the major version of the same root to hear the natural pull.');
  }

  if (quality === 'maj7') {
    tips.push('The major seventh should ring with a smooth, jazzy sweetness. Take care that the seventh note is clear and not muffled.');
  }

  if (quality === 'm7') {
    tips.push('This chord should sound warm and mellow. If any notes buzz, adjust your finger angle until each string speaks clearly.');
  }

  if (quality === 'm7♭5') {
    tips.push('The half-diminished sound is dark and tense — essential in jazz ii–V–i progressions. Make sure the flattened fifth rings out.');
  }

  if (quality === 'mMaj7') {
    tips.push('This chord has an unusual, dramatic tension between the minor third and major seventh. Let both notes ring to hear its full color.');
  }

  if (quality === 'augMaj7') {
    tips.push('A rare, lush chord. The raised fifth and major seventh create a dreamy dissonance — check each note sounds clearly.');
  }

  if (quality === 'aug7') {
    tips.push('The augmented seventh has a restless, unstable quality. It wants to resolve — try following it with a chord a fourth higher.');
  }

  if (maxStretch >= 4 && !hasBarre) {
    tips.push('This shape requires a wide finger stretch. If it feels cramped, shift your thumb lower behind the neck to give your fingers more reach.');
  }

  return tips;
}

// ── Main generator ─────────────────────────────────────────────────
function generateHowToPlay(chord) {
  const { frets, fingers, barres, name } = chord;
  const sentences = [];

  const hasBarre = barres.length > 0 && typeof barres[0] === 'object';
  const validBarres = hasBarre ? barres : [];

  // 1. Barre instruction (if any) — lead with this
  if (validBarres.length > 0) {
    sentences.push(descBarre(validBarres[0], frets) + '.');
  }

  // 2. Individual finger placements
  const placements = collectPlacements(frets, fingers, validBarres);
  if (placements.length > 0) {
    sentences.push(joinPlacements(placements));
  }

  // 3. Open and muted strings
  const omParts = descOpenMuted(frets, validBarres);
  if (omParts.length > 0) {
    // Capitalize first part if it's the sentence start, otherwise combine
    const combined = omParts.join(', and ') + '.';
    sentences.push(combined.charAt(0).toUpperCase() + combined.slice(1));
  }

  // 4. Strum direction
  const strum = strumHint(frets);
  if (strum) sentences.push(strum);

  // 5. Difficulty tips
  const tips = difficultyTips(chord);
  tips.forEach(t => sentences.push(t));

  return sentences.join(' ');
}

// ── Read, transform, write ─────────────────────────────────────────
const src = readFileSync(CHORDS_PATH, 'utf-8');

// Parse chords from the export
const chordsMatch = src.match(/export const chords = (\[[\s\S]*?\]);?\s*\n\s*(\/\/|export|function|const|$)/);
if (!chordsMatch) {
  console.error('Could not parse chords array from chords.js');
  process.exit(1);
}

// Simpler approach: find the end of the chords array by bracket depth
let depth = 0;
let arrayStart = src.indexOf('export const chords = [') + 'export const chords = '.length;
let arrayEnd = arrayStart;
for (let i = arrayStart; i < src.length; i++) {
  if (src[i] === '[') depth++;
  if (src[i] === ']') depth--;
  if (depth === 0) {
    arrayEnd = i + 1;
    break;
  }
}

const arrayStr = src.slice(arrayStart, arrayEnd);
// Remove trailing commas before ] to make valid JSON
const cleanedArrayStr = arrayStr.replace(/,(\s*[\]}])/g, '$1');
const chords = JSON.parse(cleanedArrayStr);

console.log(`Processing ${chords.length} chords...`);

let count = 0;
for (const chord of chords) {
  chord.howToPlay = generateHowToPlay(chord);
  count++;
}

// Write back
const newArrayStr = JSON.stringify(chords, null, 2);
const newSrc = src.slice(0, arrayStart) + newArrayStr + src.slice(arrayEnd);
writeFileSync(CHORDS_PATH, newSrc, 'utf-8');

console.log(`Done! Added howToPlay to ${count} chords.`);

// Print a few samples
const samples = ['C Major', 'F Major', 'B Minor', 'A7', 'Dm7', 'Cm7♭5', 'Gsus2'];
for (const name of samples) {
  const c = chords.find(ch => ch.name === name);
  if (c) {
    console.log(`\n── ${c.name} ──`);
    console.log(c.howToPlay);
  }
}
