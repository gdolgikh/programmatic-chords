import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CHORD_TYPES, TUNINGS, type ChordData } from '@/lib/musicTheory';
import { type Voicing } from '@/lib/chordVoicings';
import { audioEngine } from '@/lib/audioEngine';

interface ChordDiagramProps {
  chord: ChordData;
  voicing: Voicing;
  voicingIndex: number;
  totalVoicings: number;
  isActive?: boolean;
  tuningNotes: number[];
  onDegreeChange: (delta: number) => void;
  onTypeChange: (type: string) => void;
  onVoicingChange: (delta: number) => void;
}

const W = 160;
const MARGIN = { top: 28, left: 24, right: 24 };
const STRINGS = 6;
const FRETS_SHOWN = 4;
const stringSpacing = (W - MARGIN.left - MARGIN.right) / (STRINGS - 1);
const fretSpacing = 28;
const gridH = FRETS_SHOWN * fretSpacing;
const DOT_R = 7;
const SVG_H = MARGIN.top + gridH + 8;

export default function ChordDiagram({
  chord, voicing, voicingIndex, totalVoicings, isActive, tuningNotes,
  onDegreeChange, onTypeChange, onVoicingChange,
}: ChordDiagramProps) {
  const played = voicing.frets.filter(f => f > 0);
  const minFret = played.length > 0 ? Math.min(...played) : 1;
  const startFret = minFret <= 2 ? 1 : minFret;
  const isOpen = startFret === 1;
  const chordSymbol = CHORD_TYPES[chord.type]?.symbol ?? chord.type;

  const tuningMidi = TUNINGS[Object.keys(TUNINGS).find(k => {
    const t = TUNINGS[k];
    return t.notes.length === tuningNotes.length && t.notes.every((n, i) => n === tuningNotes[i]);
  }) || 'standard']?.midi || TUNINGS.standard.midi;

  const handleNoteClick = (stringIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const fret = voicing.frets[stringIdx];
    if (fret === -1) return;
    const midi = tuningMidi[stringIdx] + fret;
    audioEngine.playNote(midi);
  };

  const handleStrumClick = () => {
    audioEngine.strumChord(voicing, tuningMidi);
  };

  const sx = (s: number) => MARGIN.left + s * stringSpacing;
  const fy = (f: number) => MARGIN.top + (f - startFret + 0.5) * fretSpacing;

  return (
    <div
      onClick={handleStrumClick}
      className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-colors cursor-pointer
      ${isActive ? 'border-primary/60 bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}>
      {/* Degree controls */}
      <button onClick={(e) => { e.stopPropagation(); onDegreeChange(1); }} className="text-muted-foreground hover:text-foreground transition-colors">
        <ChevronUp className="w-5 h-5" />
      </button>
      <span className="text-2xl font-bold font-mono tracking-wider">{chord.romanNumeral}</span>
      <button onClick={(e) => { e.stopPropagation(); onDegreeChange(-1); }} className="text-muted-foreground hover:text-foreground transition-colors">
        <ChevronDown className="w-5 h-5" />
      </button>

      {/* Chord name */}
      <span className="text-lg font-semibold">{chord.root}{chordSymbol}</span>

      {/* Chord type selector */}
      <div onClick={(e) => e.stopPropagation()}>
        <Select value={chord.type} onValueChange={onTypeChange}>
          <SelectTrigger className="w-24 h-7 text-xs bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {Object.entries(CHORD_TYPES).map(([key, { name }]) => (
              <SelectItem key={key} value={key}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* SVG chord grid */}
      <svg width={W} height={SVG_H} className="mt-1">
        {/* Open / muted indicators */}
        {voicing.frets.map((fret, i) => {
          const x = sx(i);
          if (fret === -1) return (
            <text key={`m${i}`} x={x} y={MARGIN.top - 10} textAnchor="middle"
              className="fill-muted-foreground text-[13px] font-medium">×</text>
          );
          if (fret === 0) return (
            <circle key={`o${i}`} cx={x} cy={MARGIN.top - 14} r={5}
              fill="transparent" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5}
              className="cursor-pointer hover:stroke-[hsl(var(--primary))]"
              onClick={(e) => handleNoteClick(i, e as unknown as React.MouseEvent)} />
          );
          return null;
        })}

        {/* Nut or fret position label */}
        <line x1={MARGIN.left - 2} y1={MARGIN.top} x2={W - MARGIN.right + 2} y2={MARGIN.top}
          stroke={isOpen ? 'hsl(var(--foreground))' : 'hsl(var(--fretboard-fret))'}
          strokeWidth={isOpen ? 3 : 1} />

        {!isOpen && (
          <text x={MARGIN.left - 14} y={MARGIN.top + fretSpacing * 0.5 + 4}
            className="fill-muted-foreground text-[10px]" textAnchor="middle">{startFret}</text>
        )}

        {/* Fret lines */}
        {Array.from({ length: FRETS_SHOWN }, (_, i) => (
          <line key={`f${i}`}
            x1={MARGIN.left} y1={MARGIN.top + (i + 1) * fretSpacing}
            x2={W - MARGIN.right} y2={MARGIN.top + (i + 1) * fretSpacing}
            stroke="hsl(var(--fretboard-fret))" strokeWidth={1} />
        ))}

        {/* String lines */}
        {Array.from({ length: STRINGS }, (_, i) => (
          <line key={`s${i}`}
            x1={sx(i)} y1={MARGIN.top}
            x2={sx(i)} y2={MARGIN.top + gridH}
            stroke="hsl(var(--fretboard-string))" strokeWidth={1} />
        ))}

        {/* Finger dots */}
        {voicing.frets.map((fret, i) => {
          if (fret <= 0) return null;
          const y = fy(fret);
          if (y < MARGIN.top || y > MARGIN.top + gridH) return null;
          return (
            <circle key={`d${i}`} cx={sx(i)} cy={y} r={DOT_R}
              fill="hsl(var(--chord-dot))"
              className="cursor-pointer hover:opacity-80"
              onClick={(e) => handleNoteClick(i, e as unknown as React.MouseEvent)} />
          );
        })}
      </svg>

      {/* Voicing navigation */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <button onClick={(e) => { e.stopPropagation(); onVoicingChange(-1); }} className="hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-mono text-xs">{voicingIndex + 1}/{totalVoicings}</span>
        <button onClick={(e) => { e.stopPropagation(); onVoicingChange(1); }} className="hover:text-foreground transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
