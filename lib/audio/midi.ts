/**
 * Web MIDI API Connector
 * Listens for hardware MIDI piano keyboard input in browser environment.
 */

export interface MIDIMessage {
  note: number;
  velocity: number;
  type: 'noteon' | 'noteoff';
}

type MIDICallback = (msg: MIDIMessage) => void;

interface WebMidiEvent {
  data: Uint8Array | number[];
}

interface WebMidiPort {
  onmidimessage: ((event: WebMidiEvent) => void) | null;
}

interface WebMidiAccess {
  inputs: {
    values: () => IterableIterator<WebMidiPort>;
  };
}

class MIDIController {
  private callbacks: MIDICallback[] = [];
  private midiAccess: WebMidiAccess | null = null;
  private boundHandler: ((event: WebMidiEvent) => void) | null = null;
  public isSupported = false;

  constructor() {
    if (typeof window !== 'undefined' && 'requestMIDIAccess' in navigator) {
      this.isSupported = true;
    }
  }

  public async init(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      if (!this.boundHandler) {
        this.boundHandler = this.handleMIDIMessage.bind(this);
      }
      if (!this.midiAccess) {
        const nav = navigator as unknown as { requestMIDIAccess: () => Promise<WebMidiAccess> };
        this.midiAccess = await nav.requestMIDIAccess();
      }
      const inputs = this.midiAccess.inputs.values();
      for (const input of inputs) {
        input.onmidimessage = this.boundHandler;
      }
      return true;
    } catch {
      return false;
    }
  }

  public onNote(callback: MIDICallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
      if (this.callbacks.length === 0) {
        this.cleanup();
      }
    };
  }

  public cleanup(): void {
    if (!this.midiAccess) return;
    const inputs = this.midiAccess.inputs.values();
    for (const input of inputs) {
      input.onmidimessage = null;
    }
  }

  private handleMIDIMessage(event: WebMidiEvent): void {
    const [status, note, velocity] = event.data;
    const command = status >> 4;

    if (command === 9 && velocity > 0) {
      // Note On
      const msg: MIDIMessage = { note, velocity, type: 'noteon' };
      this.callbacks.forEach(cb => cb(msg));
    } else if (command === 8 || (command === 9 && velocity === 0)) {
      // Note Off
      const msg: MIDIMessage = { note, velocity, type: 'noteoff' };
      this.callbacks.forEach(cb => cb(msg));
    }
  }
}

export const midiController = new MIDIController();
