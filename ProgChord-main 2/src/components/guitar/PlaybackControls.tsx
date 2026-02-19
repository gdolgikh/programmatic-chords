import { Play, Square, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  tempo: number;
  onTempoChange: (t: number) => void;
  timeSignature: string;
  onTimeSignatureChange: (ts: string) => void;
  pattern: 'strum' | 'arpeggio';
  onPatternChange: (p: 'strum' | 'arpeggio') => void;
  loop: boolean;
  onLoopChange: (l: boolean) => void;
  metronome: boolean;
  onMetronomeChange: (m: boolean) => void;
  disabled?: boolean;
}

const TIME_SIGS = ['4/4', '3/4', '6/8', '7/8', '5/4'];

export default function PlaybackControls({
  isPlaying, onPlay, onStop, tempo, onTempoChange,
  timeSignature, onTimeSignatureChange, pattern, onPatternChange,
  loop, onLoopChange, metronome, onMetronomeChange, disabled,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-5 p-4 rounded-xl border border-border bg-card">
      {/* Play / Stop */}
      <Button
        size="icon"
        variant={isPlaying ? 'destructive' : 'default'}
        onClick={isPlaying ? onStop : onPlay}
        disabled={disabled}
      >
        {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>

      {/* Tempo */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">BPM</span>
        <Slider
          value={[tempo]}
          onValueChange={([v]) => onTempoChange(v)}
          min={40}
          max={240}
          step={1}
          className="w-32"
        />
        <span className="text-sm font-mono w-8 text-right">{tempo}</span>
      </div>

      {/* Time Signature */}
      <Select value={timeSignature} onValueChange={onTimeSignatureChange}>
        <SelectTrigger className="w-20 bg-muted border-border h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border z-50">
          {TIME_SIGS.map(ts => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Pattern */}
      <Select value={pattern} onValueChange={v => onPatternChange(v as 'strum' | 'arpeggio')}>
        <SelectTrigger className="w-28 bg-muted border-border h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border z-50">
          <SelectItem value="strum">Strum</SelectItem>
          <SelectItem value="arpeggio">Arpeggio</SelectItem>
        </SelectContent>
      </Select>

      {/* Loop */}
      <div className="flex items-center gap-2">
        <Repeat className={`w-4 h-4 ${loop ? 'text-primary' : 'text-muted-foreground'}`} />
        <Switch checked={loop} onCheckedChange={onLoopChange} />
      </div>

      {/* Metronome */}
      <div className="flex items-center gap-2">
        <svg
          className={`w-4 h-4 ${metronome ? 'text-primary' : 'text-muted-foreground'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Base */}
          <line x1="6" y1="22" x2="18" y2="22" />
          {/* Body (tapered trapezoid) */}
          <path d="M7.5 22L10 4h4l2.5 18" />
          {/* Pendulum arm */}
          <line x1="12" y1="18" x2="17" y2="5" />
          {/* Pendulum weight */}
          <rect x="14.5" y="9" width="5" height="2.5" rx="1" fill="currentColor" stroke="currentColor" strokeWidth="1" />
          {/* Scale tick marks */}
          <line x1="10.8" y1="12" x2="13.2" y2="12" strokeWidth="0.8" />
          <line x1="10.5" y1="15" x2="13.5" y2="15" strokeWidth="0.8" />
          <line x1="10.2" y1="18" x2="13.8" y2="18" strokeWidth="0.8" />
        </svg>
        <Switch checked={metronome} onCheckedChange={onMetronomeChange} />
      </div>
    </div>
  );
}
