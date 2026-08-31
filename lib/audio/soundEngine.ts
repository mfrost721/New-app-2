/**
 * Web Audio API Sound Synthesizer Engine
 * Pure browser audio synthesizer with high-quality polyphonic harmonic piano-like envelope synthesis.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Converts MIDI pitch integer (0-127, e.g., 60 = Middle C) to frequency in Hz.
   */
  public midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Plays a single MIDI note with piano-like harmonic decay.
   */
  public playNote(midi: number, durationSec = 1.2, volume = 0.5): void {
    this.initCtx();
    if (!this.ctx) return;

    const freq = this.midiToFreq(midi);
    const now = this.ctx.currentTime;

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    masterGain.connect(this.ctx.destination);

    // Fundamental + harmonics for rich piano timbre
    const harmonics = [
      { mult: 1, gain: 0.6 },
      { mult: 2, gain: 0.25 },
      { mult: 3, gain: 0.1 },
      { mult: 4, gain: 0.05 }
    ];

    harmonics.forEach(h => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const hGain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * h.mult, now);

      hGain.gain.setValueAtTime(h.gain, now);
      hGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      osc.connect(hGain);
      hGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + durationSec);
    });
  }

  /**
   * Plays a chord (array of MIDI notes) simultaneously or as an arpeggio.
   */
  public playChord(midis: number[], durationSec = 1.8, arpeggiated = false): void {
    midis.forEach((midi, idx) => {
      const delay = arpeggiated ? idx * 0.12 : 0;
      setTimeout(() => {
        this.playNote(midi, durationSec);
      }, delay * 1000);
    });
  }
}

export const soundEngine = new SoundEngine();
