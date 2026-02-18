import { useState } from 'react';
import { getScaleNotes, getPentatonicNotes, noteIndex, noteName, type NoteName } from '@/lib/musicTheory';
import { Switch } from '@/components/ui/switch';

interface Props {
  keyNote: string;
  scale: string;
  tuningNotes: number[];
  numFrets?: number;
}

const FRET_MARKERS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];

export default function FretboardMap({ keyNote, scale, tuningNotes, numFrets = 24 }: Props) {
  const [pentatonic, setPentatonic] = useState(false);
  const scaleNotes = pentatonic ? getPentatonicNotes(keyNote, scale) : getScaleNotes(keyNote, scale);
  const rootIdx = noteIndex(keyNote);
  const stringOrder = [5, 4, 3, 2, 1, 0];

  // Subtle progressive fret spacing (wider near fret 1, narrower near 24)
  const fretWidths = Array.from({ length: numFrets }, (_, i) => {
    const ratio = 1 / Math.pow(i + 1, 0.15); // very mild taper
    return ratio;
  });
  const totalWidth = fretWidths.reduce((a, b) => a + b, 0);
  const fretFlex = fretWidths.map(w => w / totalWidth * numFrets);

  const scaleLabel = pentatonic
    ? `${keyNote} ${scale.replace(/_/g, ' ')} pentatonic`
    : `${keyNote} ${scale.replace(/_/g, ' ')}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {scaleLabel} — Scale Map
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Pentatonic</span>
          <Switch checked={pentatonic} onCheckedChange={setPentatonic} />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card p-4">
        <div className="min-w-[800px]">
          {/* Fret numbers */}
          <div className="flex ml-10">
            {Array.from({ length: numFrets }, (_, i) => (
              <div key={i} style={{ flex: fretFlex[i] }} className="text-center text-[10px] text-muted-foreground font-mono pb-1">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Strings */}
          {stringOrder.map((sIdx) => {
            const openNote = tuningNotes[sIdx];
            const stringLabel = noteName(openNote);

            return (
              <div key={sIdx} className="flex items-center h-9">
                <div className="w-10 text-right pr-3 text-xs font-bold text-primary shrink-0">
                  {stringLabel}
                </div>
                <div className="flex flex-1 relative">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-fretboard-string" />
                  {Array.from({ length: numFrets }, (_, fIdx) => {
                    const fret = fIdx + 1;
                    const nIdx = (openNote + fret) % 12;
                    const note = noteName(nIdx) as NoteName;
                    const inScale = scaleNotes.includes(note);
                    const isRoot = nIdx === rootIdx;

                    return (
                      <div key={fret} style={{ flex: fretFlex[fIdx] }} className="flex items-center justify-center relative">
                        <div className="absolute right-0 top-0 bottom-0 w-px bg-fretboard-fret" />
                        {sIdx === 2 && FRET_MARKERS.includes(fret) && fret !== 12 && (
                          <div className="absolute w-1.5 h-1.5 rounded-full bg-fretboard-fret opacity-60" />
                        )}
                        {(sIdx === 1 || sIdx === 3) && fret === 12 && (
                          <div className="absolute w-1.5 h-1.5 rounded-full bg-fretboard-fret opacity-60" />
                        )}
                        {inScale && (
                          <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold
                            ${isRoot
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-primary/50 text-primary bg-card'
                            }`}>
                            {note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
