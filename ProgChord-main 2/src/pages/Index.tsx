import { useState, useCallback } from 'react';
import SettingsPanel, { type ProgressionSettings } from '@/components/guitar/SettingsPanel';
import ChordProgressionDisplay from '@/components/guitar/ChordProgressionDisplay';
import PlaybackControls from '@/components/guitar/PlaybackControls';
import FretboardMap from '@/components/guitar/FretboardMap';
import {
  generateProgression, getScaleDegreeNote, getDefaultChordType,
  getRomanNumeral, TUNINGS, type ChordData,
} from '@/lib/musicTheory';
import { getVoicings } from '@/lib/chordVoicings';
import { audioEngine } from '@/lib/audioEngine';

export default function Index() {
  const [settings, setSettings] = useState<ProgressionSettings>({
    tuning: 'standard', style: 'prog_rock', key: 'E', scale: 'natural_minor', numChords: 4,
  });
  const [chords, setChords] = useState<ChordData[]>([]);
  const [selectedVoicings, setSelectedVoicings] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(100);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [pattern, setPattern] = useState<'strum' | 'arpeggio'>('strum');
  const [loop, setLoop] = useState(false);
  const [metronome, setMetronome] = useState(false);
  const [activeChord, setActiveChord] = useState(-1);

  const tuning = TUNINGS[settings.tuning];

  const handleGenerate = useCallback(() => {
    if (isPlaying) { audioEngine.stop(); setIsPlaying(false); setActiveChord(-1); }
    const newChords = generateProgression(settings.key, settings.scale, settings.style, settings.numChords);
    setChords(newChords);
    setSelectedVoicings(new Array(newChords.length).fill(0));
  }, [settings, isPlaying]);

  const handleDegreeChange = useCallback((idx: number, delta: number) => {
    setChords(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      const newDeg = ((c.degree - 1 + delta + 7) % 7) + 1;
      const root = getScaleDegreeNote(settings.key, settings.scale, newDeg);
      const type = getDefaultChordType(settings.scale, newDeg, settings.style);
      return { root, type, degree: newDeg, romanNumeral: getRomanNumeral(newDeg, type) };
    }));
    setSelectedVoicings(prev => { const n = [...prev]; n[idx] = 0; return n; });
  }, [settings]);

  const handleTypeChange = useCallback((idx: number, type: string) => {
    setChords(prev => prev.map((c, i) =>
      i !== idx ? c : { ...c, type, romanNumeral: getRomanNumeral(c.degree, type) }
    ));
    setSelectedVoicings(prev => { const n = [...prev]; n[idx] = 0; return n; });
  }, []);

  const handleVoicingChange = useCallback((idx: number, delta: number) => {
    setSelectedVoicings(prev => {
      const n = [...prev];
      const chord = chords[idx];
      if (!chord) return prev;
      const total = getVoicings(chord.root, chord.type, tuning.notes).length;
      n[idx] = ((n[idx] + delta) % total + total) % total;
      return n;
    });
  }, [chords, tuning]);

  const handlePlay = useCallback(async () => {
    if (chords.length === 0) return;
    await audioEngine.init();

    const voicingsList = chords.map((chord, i) => {
      const vs = getVoicings(chord.root, chord.type, tuning.notes);
      return vs[(selectedVoicings[i] ?? 0) % vs.length];
    });

    setIsPlaying(true);
    audioEngine.playProgression(voicingsList, {
      tempo, timeSignature, pattern, loop, metronome,
      tuningMidi: tuning.midi,
      onChordChange: setActiveChord,
      onStop: () => { setIsPlaying(false); setActiveChord(-1); },
    });
  }, [chords, selectedVoicings, tuning, tempo, timeSignature, pattern, loop, metronome]);

  const handleStop = useCallback(() => {
    audioEngine.stop();
    setIsPlaying(false);
    setActiveChord(-1);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 px-6 pt-3">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between rounded-[20px] px-6"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <a href="/" className="flex items-center gap-2 text-white no-underline font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
            <span style={{ fontSize: '1.4rem', background: 'linear-gradient(135deg, #67e8f9, #0369a1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>&#9835;</span>
            <span>Chord Library</span>
          </a>
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-foreground">Prog</span>
              <span className="text-primary">Chord</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <section className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Chord Progression Generator</h2>
          <p className="mt-2 text-muted-foreground">
            Instantly generate guitar chord progressions in any key and scale. Experiment with different styles, tweak voicings, and play them back — a quick way to find inspiration for your next song.
          </p>
        </section>

        <section className="flex justify-center">
          <SettingsPanel settings={settings} onChange={setSettings} onGenerate={handleGenerate} />
        </section>

        <section className="flex justify-center">
          <ChordProgressionDisplay
            chords={chords}
            tuningNotes={tuning.notes}
            selectedVoicings={selectedVoicings}
            activeChordIndex={activeChord}
            onDegreeChange={handleDegreeChange}
            onTypeChange={handleTypeChange}
            onVoicingChange={handleVoicingChange}
          />
        </section>

        <section className="flex justify-center">
          <PlaybackControls
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onStop={handleStop}
            tempo={tempo}
            onTempoChange={setTempo}
            timeSignature={timeSignature}
            onTimeSignatureChange={setTimeSignature}
            pattern={pattern}
            onPatternChange={setPattern}
            loop={loop}
            onLoopChange={setLoop}
            metronome={metronome}
            onMetronomeChange={setMetronome}
            disabled={chords.length === 0}
          />
        </section>

        <section className="flex justify-center">
          <FretboardMap
            keyNote={settings.key}
            scale={settings.scale}
            tuningNotes={tuning.notes}
          />
        </section>
      </main>
    </div>
  );
}
