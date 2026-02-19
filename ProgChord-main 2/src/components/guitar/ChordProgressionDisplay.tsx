import ChordDiagram from './ChordDiagram';
import { type ChordData } from '@/lib/musicTheory';
import { getVoicings, type Voicing } from '@/lib/chordVoicings';

interface Props {
  chords: ChordData[];
  tuningNotes: number[];
  selectedVoicings: number[];
  activeChordIndex: number;
  onDegreeChange: (chordIdx: number, delta: number) => void;
  onTypeChange: (chordIdx: number, type: string) => void;
  onVoicingChange: (chordIdx: number, delta: number) => void;
}

export default function ChordProgressionDisplay({
  chords, tuningNotes, selectedVoicings, activeChordIndex,
  onDegreeChange, onTypeChange, onVoicingChange,
}: Props) {
  if (chords.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Configure settings above and hit Generate
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 justify-center">
      {chords.map((chord, i) => {
        const voicings = getVoicings(chord.root, chord.type, tuningNotes);
        const vIdx = (selectedVoicings[i] ?? 0) % voicings.length;
        const voicing: Voicing = voicings[vIdx] || { frets: [0,0,0,0,0,0] };

        return (
          <ChordDiagram
            key={i}
            chord={chord}
            voicing={voicing}
            voicingIndex={vIdx}
            totalVoicings={voicings.length}
            isActive={activeChordIndex === i}
            tuningNotes={tuningNotes}
            onDegreeChange={(d) => onDegreeChange(i, d)}
            onTypeChange={(t) => onTypeChange(i, t)}
            onVoicingChange={(d) => onVoicingChange(i, d)}
          />
        );
      })}
    </div>
  );
}
