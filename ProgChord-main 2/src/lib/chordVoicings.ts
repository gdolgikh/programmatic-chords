import { noteIndex, CHORD_TYPES } from './musicTheory';

export interface Voicing {
  frets: number[]; // 6 values, -1 = muted, 0 = open, 1+ = fret
}

// Standard tuning intervals between adjacent strings: 5,5,5,4,5
const STD_TUNING = [4, 9, 2, 7, 11, 4]; // E A D G B E as note indices

interface VoicingTemplate {
  shape: number[];       // frets in standard tuning (-1 = muted)
  rootString: number;    // which string has the root
}

const TEMPLATES: Record<string, VoicingTemplate[]> = {
  maj:  [
    { shape: [0,2,2,1,0,0], rootString: 0 },
    { shape: [-1,0,2,2,2,0], rootString: 1 },
  ],
  min:  [
    { shape: [0,2,2,0,0,0], rootString: 0 },
    { shape: [-1,0,2,2,1,0], rootString: 1 },
  ],
  '5':  [
    { shape: [0,2,2,-1,-1,-1], rootString: 0 },
    { shape: [-1,0,2,2,-1,-1], rootString: 1 },
  ],
  '7':  [
    { shape: [0,2,0,1,0,0], rootString: 0 },
    { shape: [-1,0,2,0,2,0], rootString: 1 },
  ],
  maj7: [
    { shape: [0,2,1,1,0,0], rootString: 0 },
    { shape: [-1,0,2,1,2,0], rootString: 1 },
  ],
  min7: [
    { shape: [0,2,0,0,0,0], rootString: 0 },
    { shape: [-1,0,2,0,1,0], rootString: 1 },
  ],
  sus2: [
    { shape: [0,2,2,0,0,-1], rootString: 0 },
    { shape: [-1,0,2,2,0,0], rootString: 1 },
  ],
  sus4: [
    { shape: [0,2,2,2,0,0], rootString: 0 },
    { shape: [-1,0,2,2,3,0], rootString: 1 },
  ],
  dim:  [
    { shape: [-1,0,1,2,1,-1], rootString: 1 },
  ],
  aug:  [
    { shape: [-1,0,3,2,2,1], rootString: 1 },
  ],
  dim7: [
    { shape: [-1,0,1,2,1,2], rootString: 1 },
  ],
  add9: [
    { shape: [0,2,2,1,0,2], rootString: 0 },
  ],
  '9':  [
    { shape: [-1,0,2,1,2,2], rootString: 1 },
  ],
  min9: [
    { shape: [-1,0,2,0,1,2], rootString: 1 },
  ],
};

/**
 * Convert a standard-tuning template shape into the actual pitches it produces,
 * then re-derive the frets for the given (possibly non-standard) tuning.
 */
function adaptShapeToTuning(
  shape: number[],
  rootString: number,
  rootIdx: number,
  tuningNotes: number[]
): number[] {
  // Step 1: Compute the target pitch (note index) for each string from the standard template
  const targetPitches: (number | null)[] = shape.map((fret, i) => {
    if (fret === -1) return null;
    return (STD_TUNING[i] + fret) % 12;
  });

  // Step 2: Compute the transposition offset the template needs
  // In standard tuning, the root string at its template fret produces note X
  // We need to shift so it produces rootIdx instead
  const templateRootPitch = targetPitches[rootString];
  if (templateRootPitch === null) {
    // Shouldn't happen but fallback
    return shape.map(() => -1);
  }
  const shift = ((rootIdx - templateRootPitch) + 12) % 12;

  // Step 3: Shift all target pitches
  const shiftedPitches = targetPitches.map(p => p === null ? null : (p + shift) % 12);

  // Step 4: For each string in the actual tuning, find the fret that produces the target pitch
  return shiftedPitches.map((pitch, i) => {
    if (pitch === null) return -1;
    const openNote = tuningNotes[i];
    return ((pitch - openNote) + 12) % 12;
  });
}

/**
 * Check if a voicing is physically playable (max 4 fingers).
 * Open strings (0) don't need fingers. Barre (lowest fret across multiple strings) = 1 finger.
 * Each additional fretted note above the barre = 1 finger.
 */
function countFingersNeeded(frets: number[]): number {
  const fretted = frets.filter(f => f > 0);
  if (fretted.length === 0) return 0;

  const minFret = Math.min(...fretted);
  const barreCount = fretted.filter(f => f === minFret).length;
  const aboveBarreCount = fretted.filter(f => f > minFret).length;

  // If multiple strings at the lowest fret, that's a barre (1 finger)
  // If only one string at lowest fret, that's still 1 finger
  return 1 + aboveBarreCount;
}

/**
 * Try to make an unplayable voicing playable by muting strings
 * that require extra fingers, prioritizing keeping the root and
 * outer strings.
 */
function makePlayable(frets: number[]): number[] | null {
  if (countFingersNeeded(frets) <= 4) return frets;

  const played = frets.map((f, i) => ({ fret: f, idx: i })).filter(x => x.fret > 0);
  if (played.length === 0) return frets;

  const minFret = Math.min(...played.map(p => p.fret));

  // Keep barre notes and try removing the highest-fret notes from the treble side
  const aboveBarre = played
    .filter(p => p.fret > minFret)
    .sort((a, b) => b.idx - a.idx); // treble strings first for muting

  const result = [...frets];
  for (const note of aboveBarre) {
    if (countFingersNeeded(result) <= 4) break;
    result[note.idx] = -1;
  }

  // Verify we still have at least 2 notes sounding
  const remaining = result.filter(f => f >= 0);
  if (remaining.length < 2) return null;
  if (countFingersNeeded(result) > 4) return null;

  return result;
}

function isValidSpread(frets: number[]): boolean {
  const played = frets.filter(f => f > 0);
  if (played.length === 0) return true;
  const maxFret = Math.max(...played);
  const minFret = Math.min(...played);
  return maxFret <= 18 && (maxFret - minFret) <= 4;
}

export function getVoicings(root: string, type: string, tuningNotes: number[]): Voicing[] {
  const templates = TEMPLATES[type] || TEMPLATES.maj;
  const rootIdx = noteIndex(root);
  const voicings: Voicing[] = [];

  for (const tpl of templates) {
    const baseFrets = adaptShapeToTuning(tpl.shape, tpl.rootString, rootIdx, tuningNotes);

    for (const octaveOffset of [0, 12]) {
      const frets = baseFrets.map(f => f === -1 ? -1 : f + octaveOffset);

      if (!isValidSpread(frets)) continue;

      if (countFingersNeeded(frets) <= 4) {
        voicings.push({ frets });
      } else {
        // Try to fix by muting excess strings
        const fixed = makePlayable(frets);
        if (fixed && isValidSpread(fixed)) {
          voicings.push({ frets: fixed });
        }
      }
    }
  }

  if (voicings.length === 0) {
    // Fallback: simple power chord shape
    const chordIntervals = CHORD_TYPES[type]?.intervals || [0, 7];
    const frets: number[] = [-1, -1, -1, -1, -1, -1];
    // Place root on lowest available string
    const rootFret = ((rootIdx - tuningNotes[0]) + 12) % 12;
    frets[0] = rootFret;
    if (chordIntervals.length > 1) {
      const fifthPitch = (rootIdx + chordIntervals[1]) % 12;
      frets[1] = ((fifthPitch - tuningNotes[1]) + 12) % 12;
    }
    voicings.push({ frets });
  }

  return voicings;
}

export function voicingToMidiNotes(voicing: Voicing, tuningMidi: number[]): (number | null)[] {
  return voicing.frets.map((fret, i) => {
    if (fret === -1) return null;
    return tuningMidi[i] + fret;
  });
}
