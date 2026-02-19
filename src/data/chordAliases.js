/**
 * Generates all common spelling variants for a chord.
 * Used as visible tags on chord pages for SEO.
 */

const rootAliases = {
  'C#': ['C#', 'C-sharp', 'Db', 'D-flat'],
  'D#': ['D#', 'D-sharp', 'Eb', 'E-flat'],
  'F#': ['F#', 'F-sharp', 'Gb', 'G-flat'],
  'G#': ['G#', 'G-sharp', 'Ab', 'A-flat'],
  'A#': ['A#', 'A-sharp', 'Bb', 'B-flat'],
};

const qualityAliases = {
  Major: [
    ['major', 'maj', 'M', ''],
    ['major'],
  ],
  Minor: [
    ['minor', 'min', 'm', '-'],
    ['minor'],
  ],
  '7': [
    ['7', 'dom7'],
    ['dominant seventh', 'dominant 7th'],
  ],
  '5': [
    ['5'],
    ['power chord', 'fifth'],
  ],
  dim: [
    ['dim', 'diminished', '\u00B0'],
    ['diminished'],
  ],
  dim7: [
    ['dim7', '\u00B07'],
    ['diminished seventh', 'diminished 7th'],
  ],
  aug: [
    ['aug', 'augmented', '+'],
    ['augmented'],
  ],
  sus2: [
    ['sus2'],
    ['suspended second', 'suspended 2nd'],
  ],
  sus4: [
    ['sus4'],
    ['suspended fourth', 'suspended 4th'],
  ],
  maj7: [
    ['maj7', 'M7', '\u0394', '\u03947'],
    ['major seventh', 'major 7th'],
  ],
  m7: [
    ['m7', 'min7', '-7'],
    ['minor seventh', 'minor 7th'],
  ],
  '7sus4': [
    ['7sus4'],
    ['dominant 7th suspended 4th'],
  ],
};

/**
 * @param {string} root - e.g. "C#"
 * @param {string} quality - e.g. "dim7"
 * @returns {string[]} Unique alias strings, excluding the chord's own name
 */
export function getChordAliases(root, quality, chordName) {
  const roots = rootAliases[root] || [root];
  const qData = qualityAliases[quality];
  if (!qData) return [];

  const [shortForms, longForms] = qData;

  const aliases = new Set();

  // Short forms: "C#dim7", "Dbdim7", etc.
  for (const r of roots) {
    for (const q of shortForms) {
      aliases.add(r + q);
      // Also add spaced version for readability: "C# dim7"
      if (q && !['', '-'].includes(q)) {
        aliases.add(r + ' ' + q);
      }
    }
  }

  // Long forms: "C-sharp diminished seventh", etc.
  for (const r of roots) {
    for (const q of longForms) {
      aliases.add(r + ' ' + q);
    }
  }

  // Remove the chord's own display name to avoid duplication
  aliases.delete(chordName);

  return [...aliases].sort((a, b) => a.length - b.length);
}
