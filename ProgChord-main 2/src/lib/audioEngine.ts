import * as Tone from 'tone';
import { Voicing, voicingToMidiNotes } from './chordVoicings';

function midiToToneNote(midi: number): string {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export interface PlayOptions {
  tempo: number;
  timeSignature: string;
  pattern: 'strum' | 'arpeggio';
  loop: boolean;
  metronome: boolean;
  tuningMidi: number[];
  onChordChange?: (index: number) => void;
  onStop?: () => void;
}

class AudioEngine {
  private sampler: Tone.Sampler | null = null;
  private metronomeSynth: Tone.MembraneSynth | null = null;
  private part: Tone.Part | null = null;
  private metronomeLoop: Tone.Loop | null = null;
  private isInitialized = false;
  private loadingPromise: Promise<void> | null = null;

  async init() {
    if (this.isInitialized) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = new Promise<void>((resolve) => {
      Tone.start().then(() => {
        this.sampler = new Tone.Sampler({
          urls: {
            A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
            A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
            A4: 'A4.mp3', C5: 'C5.mp3',
          },
          baseUrl: 'https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments/samples/guitar-acoustic/',
          release: 1.5,
          onload: () => {
            this.isInitialized = true;
            resolve();
          },
          onerror: () => {
            // Fallback: still resolve so UI doesn't hang
            console.warn('Sample loading failed, audio may not work');
            this.isInitialized = true;
            resolve();
          },
        }).toDestination();
        this.sampler.volume.value = -6;

        this.metronomeSynth = new Tone.MembraneSynth({
          pitchDecay: 0.008,
          octaves: 4,
          envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
        }).toDestination();
        this.metronomeSynth.volume.value = -8;
      });
    });

    return this.loadingPromise;
  }

  playProgression(voicings: Voicing[], options: PlayOptions) {
    this.stop();
    if (!this.sampler) return;

    const [beatsNum] = options.timeSignature.split('/').map(Number);
    Tone.getTransport().bpm.value = options.tempo;
    Tone.getTransport().timeSignature = beatsNum;

    const events = voicings.map((v, i) => ({
      time: `${i}m`,
      voicing: v,
      index: i,
    }));

    this.part = new Tone.Part((time, ev) => {
      options.onChordChange?.(ev.index);
      this.playChord(ev.voicing, options.tuningMidi, options.pattern, time, beatsNum, options.tempo);
    }, events);

    this.part.loop = options.loop;
    this.part.loopEnd = `${voicings.length}m`;
    this.part.start(0);

    if (!options.loop) {
      const totalMeasures = voicings.length;
      Tone.getTransport().scheduleOnce(() => {
        this.stop();
        options.onStop?.();
      }, `${totalMeasures}m`);
    }

    if (options.metronome && this.metronomeSynth) {
      const synth = this.metronomeSynth;
      this.metronomeLoop = new Tone.Loop((time) => {
        synth.triggerAttackRelease('C5', '32n', time, 0.5);
      }, '4n');
      this.metronomeLoop.start(0);
    }

    Tone.getTransport().start();
  }

  private playChord(voicing: Voicing, tuningMidi: number[], pattern: string, time: number, beats: number, _tempo: number) {
    if (!this.sampler) return;
    const midiNotes = voicingToMidiNotes(voicing, tuningMidi);
    const notes = midiNotes.filter((n): n is number => n !== null).map(midiToToneNote);

    if (notes.length === 0) return;

    if (pattern === 'strum') {
      // Strum on every beat within the measure, locked to transport grid
      const quarterDur = Tone.Time('4n').toSeconds();
      for (let beat = 0; beat < beats; beat++) {
        const beatTime = time + beat * quarterDur;
        notes.forEach((note, i) => {
          this.sampler!.triggerAttackRelease(note, '2n', beatTime + i * 0.015);
        });
      }
    } else {
      // Arpeggio: use transport-synced eighth note duration
      const ascending = [...notes];
      const descending = ascending.length > 2 ? [...ascending].reverse().slice(1, -1) : [];
      const cycle = [...ascending, ...descending];
      const eighthDur = Tone.Time('8n').toSeconds();
      const numEighths = beats * 2;

      for (let i = 0; i < numEighths; i++) {
        const note = cycle[i % cycle.length];
        this.sampler!.triggerAttackRelease(note, '8n', time + i * eighthDur);
      }
    }
  }

  async playNote(midi: number) {
    await this.init();
    if (!this.sampler) return;
    const note = midiToToneNote(midi);
    this.sampler.triggerAttackRelease(note, '2n');
  }

  async strumChord(voicing: Voicing, tuningMidi: number[]) {
    await this.init();
    if (!this.sampler) return;
    const midiNotes = voicingToMidiNotes(voicing, tuningMidi);
    const notes = midiNotes.filter((n): n is number => n !== null).map(midiToToneNote);
    const now = Tone.now();
    notes.forEach((note, i) => {
      this.sampler!.triggerAttackRelease(note, '2n', now + i * 0.018);
    });
  }

  stop() {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    this.part?.dispose();
    this.part = null;
    this.metronomeLoop?.dispose();
    this.metronomeLoop = null;
  }
}

export const audioEngine = new AudioEngine();
