/**
 * Computes a difficulty score and label for a guitar chord voicing.
 *
 * Factors:
 *  - Barre chords (full vs partial)
 *  - Fret-hand stretch (span between lowest and highest fretted positions)
 *  - Inner muted strings (muted strings between played strings)
 *  - Pinky finger usage
 *  - Open string bonus (more open strings = easier)
 *  - High fretted-string count
 *
 * @param {{ frets: number[], fingers: number[], barres: (number | {fret:number, fromString:number, toString:number})[] }} voicing
 * @returns {{ score: number, difficulty: 'Easy' | 'Medium' | 'Hard' }}
 */
export function getVoicingDifficulty({ frets, fingers, barres }) {
  let score = 0;

  // --- Barre (0-4 points) ---
  if (barres && barres.length > 0) {
    const barreSpan = getBarreSpan(frets, fingers, barres);
    if (barreSpan >= 5) {
      score += 4; // full barre
    } else if (barreSpan >= 3) {
      score += 3;
    } else {
      score += 2; // partial barre
    }
  }

  // --- Fret-hand stretch (0-3 points) ---
  const fretted = frets.filter((f) => f > 0);
  if (fretted.length >= 2) {
    const span = Math.max(...fretted) - Math.min(...fretted);
    if (span >= 4) score += 3;
    else if (span === 3) score += 2;
    else if (span === 2) score += 1;
  }

  // --- Inner muted strings (0-2 points) ---
  score += countInnerMuted(frets);

  // --- Pinky usage (0-1 point) ---
  if (fingers.includes(4)) {
    score += 1;
  }

  // --- Open string bonus (0 to -2 points) ---
  const openCount = frets.filter((f) => f === 0).length;
  if (openCount >= 3) score -= 2;
  else if (openCount >= 1) score -= 1;

  // --- High fretted-string count (0-1 point) ---
  if (fretted.length >= 5) {
    score += 1;
  }

  // Clamp to minimum 0
  score = Math.max(0, score);

  let difficulty;
  if (score <= 1) difficulty = 'Easy';
  else if (score <= 4) difficulty = 'Medium';
  else difficulty = 'Hard';

  return { score, difficulty };
}

/**
 * Determines how many strings a barre covers.
 * Handles both formats:
 *   - Detailed: { fret, fromString, toString }
 *   - Simplified: just a fret number (common in allPositions)
 */
function getBarreSpan(frets, fingers, barres) {
  let maxSpan = 0;

  for (const barre of barres) {
    if (typeof barre === 'object' && barre.fromString != null) {
      // Detailed format — span is directly available
      const span = Math.abs(barre.toString - barre.fromString) + 1;
      maxSpan = Math.max(maxSpan, span);
    } else {
      // Simplified format — barre is just a fret number.
      // Count how many strings the index finger (1) covers at that fret.
      const barreFret = typeof barre === 'object' ? barre.fret : barre;
      const barreStrings = [];
      for (let i = 0; i < frets.length; i++) {
        if (frets[i] === barreFret && fingers[i] === 1) {
          barreStrings.push(i);
        }
      }
      if (barreStrings.length >= 2) {
        const span =
          barreStrings[barreStrings.length - 1] - barreStrings[0] + 1;
        maxSpan = Math.max(maxSpan, span);
      }
    }
  }

  return maxSpan;
}

/**
 * Counts muted strings that sit between two played (open or fretted) strings.
 * e.g., [x, 3, 2, -1, 1, 0] has 1 inner muted string.
 */
function countInnerMuted(frets) {
  // Find the first and last played string indices
  let first = -1;
  let last = -1;
  for (let i = 0; i < frets.length; i++) {
    if (frets[i] >= 0) {
      if (first === -1) first = i;
      last = i;
    }
  }
  if (first === -1) return 0;

  let count = 0;
  for (let i = first + 1; i < last; i++) {
    if (frets[i] === -1) count++;
  }
  return count;
}

/**
 * Returns the difficulty of a chord's primary (first displayed) voicing.
 * @param {{ frets: number[], fingers: number[], barres: any[] }} chord
 * @returns {{ score: number, difficulty: 'Easy' | 'Medium' | 'Hard' }}
 */
export function getChordDifficulty(chord) {
  return getVoicingDifficulty(chord);
}
