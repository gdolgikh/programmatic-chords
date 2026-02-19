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
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
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

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

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
      <header className="sticky top-0 z-50"
        style={{
          background: 'var(--th-bg)',
          borderBottom: '3px solid var(--th-text)',
        }}
      >
        <div className="max-w-7xl mx-auto h-14 flex items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2 no-underline font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
            style={{ color: 'var(--th-text)', fontFamily: "'Playfair Display', serif", fontWeight: 900 }}
          >
            <span style={{ fontSize: '1.4rem', color: 'var(--th-accent)' }}>&#9835;</span>
            <span>Chord Library</span>
          </a>
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span style={{ color: 'var(--th-text)' }}>Prog</span>
              <span style={{ color: 'var(--th-accent)' }}>Chord</span>
            </h1>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="flex items-center justify-center shrink-0"
              style={{
                width: 34, height: 34,
                background: 'none',
                border: '1px solid var(--th-rule)',
                borderRadius: '50%',
                color: 'var(--th-text-dim)',
                cursor: 'pointer',
              }}
            >
              {isDark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

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
                      style={{ border: `2px solid var(--th-rule)` }}
                    />
                  </button>
                  {showUserMenu && (
                    <div
                      className="absolute right-0 z-[120] min-w-[220px] p-2"
                      style={{
                        top: 'calc(100% + 10px)',
                        background: 'var(--th-bg)',
                        border: '1px solid var(--th-rule)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      }}
                    >
                      <div className="flex flex-col px-3 py-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--th-text)' }}>
                          {user.user_metadata?.full_name || user.user_metadata?.name || 'User'}
                        </span>
                        <span className="text-xs mt-0.5" style={{ color: 'var(--th-text-dim)' }}>
                          {user.email || ''}
                        </span>
                      </div>
                      <div className="my-1.5" style={{ height: '1px', background: 'var(--th-rule)' }} />
                      <button
                        onClick={() => { setShowSaved(true); setShowUserMenu(false); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium transition-all text-left"
                        style={{ color: 'var(--th-text-dim)', background: 'none', border: 'none' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--th-text)'; e.currentTarget.style.background = 'var(--th-surface)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--th-text-dim)'; e.currentTarget.style.background = 'none'; }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        My Progressions
                      </button>
                      <button
                        onClick={() => { signOut(); setShowUserMenu(false); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium transition-all text-left"
                        style={{ color: 'var(--th-text-dim)', background: 'none', border: 'none' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--th-text)'; e.currentTarget.style.background = 'var(--th-surface)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--th-text-dim)'; e.currentTarget.style.background = 'none'; }}
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
                className="flex items-center gap-2 text-sm font-semibold px-3 py-1.5 transition-all"
                style={{ background: 'var(--th-surface)', border: '1px solid var(--th-rule)', color: 'var(--th-text)' }}
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
          <h2 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Chord Progression Generator</h2>
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
                    className="px-3 py-1.5 text-sm"
                    style={{ border: '1px solid var(--th-rule)', outline: 'none', width: '200px', background: 'var(--th-surface)', color: 'var(--th-text)' }}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveProgression}
                    className="text-sm font-semibold px-3 py-1.5"
                    style={{ background: 'var(--th-text)', color: 'var(--th-bg)' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowSaveInput(false); setSaveName(''); }}
                    className="text-sm px-2 py-1.5"
                    style={{ color: 'var(--th-text-dim)' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveInput(true)}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 transition-all"
                  style={{ background: 'transparent', border: '1px solid var(--th-accent)', color: 'var(--th-accent)' }}
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
            style={{ background: 'var(--th-overlay)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowSaved(false)}
          >
            <div
              className="w-full max-w-lg max-h-[70vh] overflow-y-auto p-6"
              style={{
                background: 'var(--th-bg)',
                border: '1px solid var(--th-rule)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: 'var(--th-text)', fontFamily: "'Playfair Display', serif" }}>My Progressions</h3>
                <button
                  onClick={() => setShowSaved(false)}
                  className="text-xl leading-none"
                  style={{ color: 'var(--th-text-dim)' }}
                >&times;</button>
              </div>

              {progressions.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--th-text-dim)' }}>
                  No saved progressions yet. Generate one and save it!
                </p>
              ) : (
                <div className="space-y-2">
                  {progressions.map(prog => {
                    const progChords = prog.chords as unknown as ChordData[];
                    return (
                      <div
                        key={prog.id}
                        className="flex items-center justify-between px-4 py-3 transition-all cursor-pointer"
                        style={{ background: 'var(--th-card)', border: '1px solid var(--th-rule)' }}
                        onClick={() => handleLoadProgression(prog)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--th-card-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--th-card)'; }}
                      >
                        <div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--th-text)' }}>{prog.name}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--th-text-dim)' }}>
                            {progChords.map(c => `${c.root}${c.type === 'major' ? '' : c.type}`).join(' → ')}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteProgression(prog.id); }}
                          className="text-sm px-2 py-1 transition-colors"
                          style={{ color: 'var(--th-rule)' }}
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
