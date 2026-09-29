/**
 * Web MIDI API Connector
 * Listens for hardware MIDI piano keyboard input in browser environment.
 * Filters out timing clock / active sensing and safely handles device disconnect / reconnect.
 */

export interface MIDIMessage {
  note: number;
  velocity: number;
  type: 'noteon' | 'noteoff';
}

export type MIDICallback = (msg: MIDIMessage) => void;

export interface WebMidiInput {
  id?: string;
  name?: string;
  state?: string;
  onmidimessage: ((event: { data: Uint8Array }) => void) | null;
}

export interface WebMidiAccess {
  inputs: {
    values: () => IterableIterator<WebMidiInput>;
  };
  onstatechange?: ((event: { port?: WebMidiInput }) => void) | null;
}

/**
 * Parses raw Uint8Array MIDI bytes and filters for note on / note off events.
 * Ignores system real-time messages (0xF8 Clock, 0xFE Active Sensing, SysEx), CC, and Pitch Bend.
 */
export function parseMIDIMessage(data: Uint8Array): MIDIMessage | null {
  if (!data || data.length < 2) return null;
  const status = data[0];

  // Ignore System Real-Time & System Common messages (0xF0 - 0xFF)
  if (status >= 0xf0) return null;

  const command = status >> 4;
  const note = data[1];
  const velocity = data.length > 2 ? data[2] : 0;

  // Command 9 = Note On (velocity > 0)
  if (command === 9 && velocity > 0) {
    return { note, velocity, type: 'noteon' };
  }

  // Command 8 = Note Off, or Command 9 with velocity 0
  if (command === 8 || (command === 9 && velocity === 0)) {
    return { note, velocity, type: 'noteoff' };
  }

  // Ignore Control Change, Program Change, Pitch Bend, Poly Key Pressure, etc.
  return null;
}

export class MIDIController {
  private callbacks: MIDICallback[] = [];
  private midiAccess: WebMidiAccess | null = null;
  public isSupported = false;

  constructor() {
    if (typeof window !== 'undefined' && 'requestMIDIAccess' in navigator) {
      this.isSupported = true;
    }
  }

  public async init(customAccess?: WebMidiAccess): Promise<boolean> {
    if (customAccess) {
      this.midiAccess = customAccess;
      this.bindInputs();
      return true;
    }
    if (!this.isSupported) return false;
    try {
      this.midiAccess = await (
        navigator as unknown as {
          requestMIDIAccess: (opts?: { sysex: boolean }) => Promise<WebMidiAccess>;
        }
      ).requestMIDIAccess({ sysex: false });

      if (this.midiAccess) {
        this.midiAccess.onstatechange = () => {
          this.bindInputs();
        };
        this.bindInputs();
      }
      return true;
    } catch {
      return false;
    }
  }

  public bindInputs(): void {
    if (!this.midiAccess) return;
    try {
      const inputs = this.midiAccess.inputs.values();
      for (const input of inputs) {
        if (input) {
          input.onmidimessage = this.handleMIDIMessage.bind(this);
        }
      }
    } catch {
      // Safely catch input enumeration errors during device disconnect
    }
  }

  public onNote(callback: MIDICallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  public handleMIDIMessage(event: { data: Uint8Array }): void {
    try {
      if (!event || !event.data) return;
      const msg = parseMIDIMessage(event.data);
      if (msg) {
        this.callbacks.forEach(cb => {
          try {
            cb(msg);
          } catch {
            // Ignore callback listener exceptions
          }
        });
      }
    } catch {
      // Safely catch malformed message structures
    }
  }

  public destroy(): void {
    if (this.midiAccess) {
      try {
        const inputs = this.midiAccess.inputs.values();
        for (const input of inputs) {
          if (input) input.onmidimessage = null;
        }
        this.midiAccess.onstatechange = null;
      } catch {
        // Ignore disconnect cleanup errors
      }
      this.midiAccess = null;
    }
    this.callbacks = [];
  }
}

export const midiController = new MIDIController();
