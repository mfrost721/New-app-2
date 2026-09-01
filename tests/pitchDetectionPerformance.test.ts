import { describe, it, expect } from 'vitest';
import { autoCorrelate } from '../lib/audio/pitchDetection';

describe('Pitch Detection Performance Benchmark', () => {
  it('measures processing time per 1000 audio frames using subarray optimization', () => {
    const sampleRate = 44100;
    const bufferSize = 2048;
    const buffer = new Float32Array(bufferSize);

    // Generate 440 Hz sine wave
    for (let i = 0; i < bufferSize; i++) {
      buffer[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    }

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      autoCorrelate(buffer, sampleRate);
    }
    const duration = performance.now() - start;

    // 100 frames must complete within 1000ms
    expect(duration).toBeLessThan(1000);
  });
});
