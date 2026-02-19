export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = typeof NOTES[number];

export const SCALES: Record<string, { name: string; intervals: number[] }> = {
  major: { name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  natural_minor: { name: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  harmonic_minor: { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  dorian: { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  mixolydian: { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  phrygian: { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  phrygian_dominant: { name: 'Phrygian Dominant', intervals: [0, 1, 4, 5, 7, 8, 10] },
};

export const TUNINGS: Record<string, { name: string; notes: number[]; midi: number[] }> = {
  standard:       { name: 'Standard (EADGBE)',   notes: [4,9,2,7,11,4],   midi: [40,45,50,55,59,64] },
  drop_d:         { name: 'Drop D',              notes: [2,9,2,7,11,4],   midi: [38,45,50,55,59,64] },
  drop_c:         { name: 'Drop C',              notes: [0,7,0,5,9,2],    midi: [36,43,48,53,57,62] },
  dadgad:         { name: 'DADGAD',              notes: [2,9,2,7,9,2],    midi: [38,45,50,55,57,62] },
  open_g:         { name: 'Open G',              notes: [2,7,2,7,11,2],   midi: [38,43,50,55,59,62] },
  open_d:         { name: 'Open D',              notes: [2,9,2,6,9,2],    midi: [38,45,50,54,57,62] },
  half_step_down: { name: 'Half Step Down',      notes: [3,8,1,6,10,3],   midi: [39,44,49,54,58,63] },
};

export const CHORD_TYPES: Record<string, { name: string; intervals: number[]; symbol: string }> = {
  maj:  { name: 'Major',       intervals: [0,4,7],       symbol: '' },
  min:  { name: 'Minor',       intervals: [0,3,7],       symbol: 'm' },
  '5':  { name: 'Power',       intervals: [0,7],         symbol: '5' },
  '7':  { name: 'Dom 7',       intervals: [0,4,7,10],    symbol: '7' },
  maj7: { name: 'Maj 7',       intervals: [0,4,7,11],    symbol: 'maj7' },
  min7: { name: 'Min 7',       intervals: [0,3,7,10],    symbol: 'm7' },
  sus2: { name: 'Sus 2',       intervals: [0,2,7],       symbol: 'sus2' },
  sus4: { name: 'Sus 4',       intervals: [0,5,7],       symbol: 'sus4' },
  dim:  { name: 'Dim',         intervals: [0,3,6],       symbol: 'dim' },
  aug:  { name: 'Aug',         intervals: [0,4,8],       symbol: 'aug' },
  dim7: { name: 'Dim 7',       intervals: [0,3,6,9],     symbol: 'dim7' },
  add9: { name: 'Add 9',       intervals: [0,4,7,14],    symbol: 'add9' },
  '9':  { name: 'Dom 9',       intervals: [0,4,7,10,14], symbol: '9' },
  min9: { name: 'Min 9',       intervals: [0,3,7,10,14], symbol: 'm9' },
};

export const STYLES: Record<string, { name: string; preferredTypes: string[][] }> = {
  prog_rock: {
    name: 'Progressive Rock',
    preferredTypes: [
      ['sus2','maj','add9'], ['min','sus4','min7'], ['min','sus2'],
      ['maj','add9','sus4'], ['sus4','maj','7'], ['min','min7','maj7'], ['dim','min7'],
    ],
  },
  prog_metal: {
    name: 'Progressive Metal',
    preferredTypes: [
      ['5','min'], ['5','dim','min'], ['5','min'],
      ['5','maj','sus4'], ['5','maj','7'], ['5','min','min7'], ['5','dim'],
    ],
  },
  jazz: {
    name: 'Jazz',
    preferredTypes: [
      ['maj7','9','add9'], ['min7','min9'], ['min7'],
      ['maj7','add9'], ['7','9'], ['min7','min9'], ['min7','dim7'],
    ],
  },
  fusion: {
    name: 'Fusion',
    preferredTypes: [
      ['maj7','9'], ['min9','min7'], ['min7','7'],
      ['maj7','add9'], ['7','9','aug'], ['min7','min9'], ['dim7','min7'],
    ],
  },
  neo_soul: {
    name: 'Neo Soul',
    preferredTypes: [
      ['maj7','9'], ['min7','min9'], ['min7'],
      ['maj7','min7'], ['7','9'], ['min7','min9'], ['dim7'],
    ],
  },
  djent: {
    name: 'Djent',
    preferredTypes: [
      ['5','min'], ['5'], ['5'],
      ['5','maj'], ['5'], ['5','min'], ['5','dim'],
    ],
  },
};

export const ROMAN_NUMERALS = ['I','II','III','IV','V','VI','VII'];

export function noteIndex(note: string): number {
  return NOTES.indexOf(note as NoteName);
}

export function noteName(index: number): NoteName {
  return NOTES[((index % 12) + 12) % 12];
}

export function getScaleNotes(key: string, scale: string): NoteName[] {
  const keyIdx = noteIndex(key);
  const intervals = SCALES[scale]?.intervals || SCALES.major.intervals;
  return intervals.map(i => noteName(keyIdx + i));
}

export function getPentatonicNotes(key: string, scale: string): NoteName[] {
  const keyIdx = noteIndex(key);
  const isMinor = ['natural_minor', 'harmonic_minor', 'dorian', 'phrygian', 'phrygian_dominant'].includes(scale);
  const intervals = isMinor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
  return intervals.map(i => noteName(keyIdx + i));
}

export function getScaleDegreeNote(key: string, scale: string, degree: number): NoteName {
  const notes = getScaleNotes(key, scale);
  return notes[((degree - 1) % 7 + 7) % 7];
}

export function getDefaultChordType(scale: string, degree: number, style: string): string {
  const styleData = STYLES[style];
  if (!styleData) return 'maj';
  const degreeIdx = ((degree - 1) % 7 + 7) % 7;
  return styleData.preferredTypes[degreeIdx]?.[0] || 'maj';
}

function isMinorType(type: string): boolean {
  return ['min','min7','min9','dim','dim7'].includes(type);
}

export function getRomanNumeral(degree: number, type: string): string {
  const base = ROMAN_NUMERALS[((degree - 1) % 7 + 7) % 7];
  return isMinorType(type) ? base.toLowerCase() : base;
}

export interface ChordData {
  root: NoteName;
  type: string;
  degree: number;
  romanNumeral: string;
}

export function generateProgression(key: string, scale: string, style: string, numChords: number): ChordData[] {
  const scaleNotes = getScaleNotes(key, scale);

  const patterns: Record<string, number[][]> = {
    prog_rock:  [[1,4,5,6],[1,5,6,4],[1,3,4,5],[6,4,1,5],[1,7,4,5]],
    prog_metal: [[1,5,6,4],[1,4,7,6],[1,6,3,7],[1,5,7,4]],
    jazz:       [[2,5,1,6],[1,6,2,5],[3,6,2,5],[1,4,3,6]],
    fusion:     [[1,4,2,5],[1,3,6,2],[2,5,1,7],[1,4,7,3]],
    neo_soul:   [[1,4,6,5],[1,6,4,5],[2,5,1,6],[1,4,3,6]],
    djent:      [[1,5,6,4],[1,7,6,5],[1,4,5,7],[1,6,7,4]],
  };

  const stylePatterns = patterns[style] || patterns.prog_rock;
  const pattern = stylePatterns[Math.floor(Math.random() * stylePatterns.length)];

  const degrees: number[] = [];
  for (let i = 0; i < numChords; i++) {
    degrees.push(pattern[i % pattern.length]);
  }

  return degrees.map(degree => {
    const root = scaleNotes[degree - 1];
    const type = getDefaultChordType(scale, degree, style);
    const romanNumeral = getRomanNumeral(degree, type);
    return { root, type, degree, romanNumeral };
  });
}
