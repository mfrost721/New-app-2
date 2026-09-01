import { describe, it, expect, vi } from 'vitest';
import { midiController } from '../lib/audio/midi';

describe('Security and Hardening Pass', () => {
  it('requests Web MIDI access with sysex: false (least privilege)', async () => {
    const requestMIDIAccessMock = vi.fn().mockResolvedValue({
      inputs: {
        values: () => [][Symbol.iterator](),
      },
    });

    (globalThis as unknown as { navigator: unknown }).navigator = {
      requestMIDIAccess: requestMIDIAccessMock,
    };

    midiController.isSupported = true;
    const result = await midiController.init();

    expect(result).toBe(true);
    expect(requestMIDIAccessMock).toHaveBeenCalledWith({ sysex: false });
  });
});
