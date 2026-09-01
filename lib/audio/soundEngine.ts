/**
 * Web Audio API Sound Synthesizer Engine
 * Pure browser audio synthesizer with high-quality polyphonic harmonic piano-like envelope synthesis.
 */

export interface RhythmEvent {
  timeOffsetSec: number;
  durationSec?: number;
  midi?: number;
  volume?: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private activeNodes: Set<{ stop?: () => void; disconnect: () => void }> = new Set();
  private scheduledTimeouts: number[] = [];

  /**
   * Initializes or resumes the AudioContext safely.
   */
  public ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  /**
   * Converts MIDI pitch integer (0-127, e.g., 60 = Middle C) to frequency in Hz.
   */
  public midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Stops all currently playing sounds and clears scheduled audio tasks.
   */
  public stopAll(): void {
    if (typeof window !== 'undefined') {
      this.scheduledTimeouts.forEach(t => window.clearTimeout(t));
    }
    this.scheduledTimeouts = [];

    this.activeNodes.forEach(node => {
      try {
        if (node.stop) {
          node.stop();
        }
        node.disconnect();
      } catch {
        // Safe catch for already disconnected audio nodes
      }
    });
    this.activeNodes.clear();
  }

  /**
   * Plays a single MIDI note with piano-like harmonic decay using Web Audio timing.
   * @param midi MIDI note number (0-127)
   * @param durationSec Duration of tone in seconds
   * @param volume Master volume (0 to 1)
   * @param startOffsetSec Delay in seconds before playback starts
   */
  public playNote(midi: number, durationSec = 1.2, volume = 0.5, startOffsetSec = 0): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    const freq = this.midiToFreq(midi);
    const now = ctx.currentTime;
    const startTime = now + Math.max(0, startOffsetSec);
    const safeDuration = Math.max(0.05, durationSec);
    const endTime = startTime + safeDuration;
    const safeVolume = Math.max(0.0001, volume);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(safeVolume, startTime);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, endTime);
    masterGain.connect(ctx.destination);

    const masterNodeRef = {
      disconnect: () => {
        try {
          masterGain.disconnect();
        } catch {
          // ignore
        }
      },
    };
    this.activeNodes.add(masterNodeRef);

    // Fundamental + harmonics for rich piano timbre
    const harmonics = [
      { mult: 1, gain: 0.6 },
      { mult: 2, gain: 0.25 },
      { mult: 3, gain: 0.1 },
      { mult: 4, gain: 0.05 },
    ];

    harmonics.forEach(h => {
      const osc = ctx.createOscillator();
      const hGain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * h.mult, startTime);

      const hVolume = Math.max(0.0001, h.gain * safeVolume);
      hGain.gain.setValueAtTime(hVolume, startTime);
      hGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(hGain);
      hGain.connect(masterGain);

      osc.start(startTime);
      osc.stop(endTime);

      const nodeRef = {
        stop: () => {
          try {
            osc.stop();
          } catch {
            // ignore
          }
        },
        disconnect: () => {
          try {
            osc.disconnect();
            hGain.disconnect();
          } catch {
            // ignore
          }
        },
      };
      this.activeNodes.add(nodeRef);

      osc.onended = () => {
        this.activeNodes.delete(nodeRef);
      };
    });

    if (typeof window !== 'undefined') {
      const cleanupDelayMs = (startOffsetSec + safeDuration + 0.1) * 1000;
      const tid = window.setTimeout(() => {
        this.activeNodes.delete(masterNodeRef);
      }, cleanupDelayMs) as unknown as number;
      this.scheduledTimeouts.push(tid);
    }
  }

  /**
   * Plays two notes as an interval, either melodically (sequential) or harmonically (simultaneous).
   */
  public playInterval(
    note1: number,
    note2: number,
    durationSec = 1.2,
    harmonic = false,
    noteDelaySec = 0.5
  ): void {
    if (harmonic) {
      this.playNote(note1, durationSec);
      this.playNote(note2, durationSec);
    } else {
      this.playNote(note1, durationSec, 0.5, 0);
      this.playNote(note2, durationSec, 0.5, noteDelaySec);
    }
  }

  /**
   * Plays a chord (array of MIDI notes) simultaneously or as an arpeggio.
   */
  public playChord(midis: number[], durationSec = 1.8, arpeggiated = false, arpeggioDelaySec = 0.12): void {
    midis.forEach((midi, idx) => {
      const delay = arpeggiated ? idx * arpeggioDelaySec : 0;
      this.playNote(midi, durationSec, 0.5, delay);
    });
  }

  /**
   * Plays a scale (array of MIDI notes) sequentially using deterministic Web Audio timing.
   */
  public playScale(midis: number[], noteDurationSec = 0.5, tempoBpm = 120): void {
    const beatDurationSec = 60 / tempoBpm;
    const stepDuration = Math.max(0.1, Math.min(noteDurationSec, beatDurationSec));
    midis.forEach((midi, idx) => {
      this.playNote(midi, stepDuration * 1.5, 0.5, idx * stepDuration);
    });
  }

  /**
   * Plays a sequence of chords (harmonic progression).
   */
  public playProgression(chords: number[][], chordDurationSec = 1.0): void {
    chords.forEach((chord, idx) => {
      const startOffset = idx * chordDurationSec;
      chord.forEach(midi => {
        this.playNote(midi, chordDurationSec * 1.2, 0.5, startOffset);
      });
    });
  }

  /**
   * Plays a rhythmic pattern / sequence of rhythmic events.
   */
  public playRhythmPattern(events: RhythmEvent[], bpm = 120): void {
    const secondsPerBeat = 60 / bpm;
    events.forEach(event => {
      const startOffsetSec = event.timeOffsetSec * secondsPerBeat;
      const durationSec = (event.durationSec ?? 0.25) * secondsPerBeat;
      const midi = event.midi ?? 60;
      const volume = event.volume ?? 0.5;
      this.playNote(midi, durationSec, volume, startOffsetSec);
    });
  }
}

export const soundEngine = new SoundEngine();
