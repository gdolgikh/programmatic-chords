import { useState, useCallback, useEffect, useRef } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { useSavedProgressions } from '@/hooks/useSavedProgressions';

export default function Index() {
  const { user, signIn, signOut } = useAuth();
  const { progressions, saveProgression, deleteProgression } = useSavedProgressions(user);

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
  const [showSaved, setShowSaved] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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

  const handleSaveProgression = async () => {
    if (!saveName.trim() || chords.length === 0) return;
    await saveProgression(saveName.trim(), settings as unknown as Record<string, unknown>, chords, selectedVoicings);
    setSaveName('');
    setShowSaveInput(false);
  };

  const handleLoadProgression = (prog: typeof progressions[0]) => {
    const loadedChords = prog.chords as unknown as ChordData[];
    const loadedSettings = prog.settings as unknown as ProgressionSettings;
    setSettings(loadedSettings);
    setChords(loadedChords);
    setSelectedVoicings(prog.voicings ?? new Array(loadedChords.length).fill(0));
    setShowSaved(false);
  };

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
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-foreground">Prog</span>
              <span className="text-primary">Chord</span>
            </h1>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
                    className="flex items-center gap-2 cursor-pointer"
                    style={{ background: 'none', border: 'none', padding: 0 }}
                  >
                    <img
                      src={user.user_metadata?.avatar_url || user.user_metadata?.picture || ''}
                      alt={user.user_metadata?.full_name || 'User'}
                      className="w-9 h-9 rounded-full transition-all"
                      style={{ border: showUserMenu ? '2px solid rgba(103,232,249,0.7)' : '2px solid rgba(103,232,249,0.4)' }}
                    />
                  </button>
                  {showUserMenu && (
                    <div
                      className="absolute right-0 z-[120] min-w-[220px] p-2 rounded-[14px]"
                      style={{
                        top: 'calc(100% + 10px)',
                        background: 'rgba(5, 20, 32, 0.95)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(6, 182, 212, 0.2)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                      }}
                    >
                      <div className="flex flex-col px-3 py-2">
                        <span className="text-sm font-semibold text-white">
                          {user.user_metadata?.full_name || user.user_metadata?.name || 'User'}
                        </span>
                        <span className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {user.email || ''}
                        </span>
                      </div>
                      <div className="my-1.5" style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                      <button
                        onClick={() => { setShowSaved(true); setShowUserMenu(false); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all text-left"
                        style={{ color: 'rgba(255,255,255,0.75)', background: 'none', border: 'none' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'none'; }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        My Progressions
                      </button>
                      <button
                        onClick={() => { signOut(); setShowUserMenu(false); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all text-left"
                        style={{ color: 'rgba(255,255,255,0.75)', background: 'none', border: 'none' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'none'; }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={signIn}
                className="flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}
              >
                <svg width="16" height="16" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Sign in
              </button>
            )}
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

        {/* Save progression controls */}
        {user && chords.length > 0 && (
          <section className="flex justify-center">
            <div className="flex items-center gap-3">
              {showSaveInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveProgression()}
                    placeholder="Progression name..."
                    className="px-3 py-1.5 rounded-lg text-sm bg-transparent text-white"
                    style={{ border: '1px solid rgba(255,255,255,0.15)', outline: 'none', width: '200px' }}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveProgression}
                    className="text-sm font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowSaveInput(false); setSaveName(''); }}
                    className="text-sm px-2 py-1.5 rounded-lg"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveInput(true)}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all"
                  style={{ background: 'rgba(103,232,249,0.08)', border: '1px solid rgba(103,232,249,0.2)', color: '#67e8f9' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                  Save Progression
                </button>
              )}
            </div>
          </section>
        )}

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

        {/* Saved Progressions Panel */}
        {showSaved && user && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowSaved(false)}
          >
            <div
              className="w-full max-w-lg max-h-[70vh] overflow-y-auto rounded-2xl p-6"
              style={{
                background: 'rgba(5, 20, 32, 0.95)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">My Progressions</h3>
                <button
                  onClick={() => setShowSaved(false)}
                  className="text-white/50 hover:text-white text-xl leading-none"
                >&times;</button>
              </div>

              {progressions.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-8">
                  No saved progressions yet. Generate one and save it!
                </p>
              ) : (
                <div className="space-y-2">
                  {progressions.map(prog => {
                    const progChords = prog.chords as unknown as ChordData[];
                    return (
                      <div
                        key={prog.id}
                        className="flex items-center justify-between rounded-xl px-4 py-3 transition-all cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                        onClick={() => handleLoadProgression(prog)}
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">{prog.name}</div>
                          <div className="text-xs text-white/40 mt-0.5">
                            {progChords.map(c => `${c.root}${c.type === 'major' ? '' : c.type}`).join(' → ')}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteProgression(prog.id); }}
                          className="text-white/30 hover:text-red-400 text-sm px-2 py-1 rounded transition-colors"
                          title="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
