import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NOTES, SCALES, TUNINGS, STYLES } from '@/lib/musicTheory';
import { Shuffle } from 'lucide-react';

export interface ProgressionSettings {
  tuning: string;
  style: string;
  key: string;
  scale: string;
  numChords: number;
}

interface Props {
  settings: ProgressionSettings;
  onChange: (s: ProgressionSettings) => void;
  onGenerate: () => void;
}

export default function SettingsPanel({ settings, onChange, onGenerate }: Props) {
  const set = <K extends keyof ProgressionSettings>(k: K, v: ProgressionSettings[K]) =>
    onChange({ ...settings, [k]: v });

  return (
    <div className="flex flex-wrap items-end justify-center gap-3">
      <Field label="Tuning">
        <Select value={settings.tuning} onValueChange={v => set('tuning', v)}>
          <SelectTrigger className="w-44 bg-muted border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {Object.entries(TUNINGS).map(([k, t]) => (
              <SelectItem key={k} value={k}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Style">
        <Select value={settings.style} onValueChange={v => set('style', v)}>
          <SelectTrigger className="w-44 bg-muted border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {Object.entries(STYLES).map(([k, s]) => (
              <SelectItem key={k} value={k}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Key">
        <Select value={settings.key} onValueChange={v => set('key', v)}>
          <SelectTrigger className="w-24 bg-muted border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {NOTES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Scale">
        <Select value={settings.scale} onValueChange={v => set('scale', v)}>
          <SelectTrigger className="w-44 bg-muted border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {Object.entries(SCALES).map(([k, s]) => (
              <SelectItem key={k} value={k}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Chords">
        <Select value={String(settings.numChords)} onValueChange={v => set('numChords', Number(v))}>
          <SelectTrigger className="w-20 bg-muted border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {[2,3,4,5,6,7,8].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Button onClick={onGenerate} className="gap-2">
        <Shuffle className="w-4 h-4" />
        Generate
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</label>
      {children}
    </div>
  );
}
