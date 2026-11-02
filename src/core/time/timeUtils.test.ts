import { describe, it, expect } from 'vitest';
import {
  MICROSECONDS_PER_SECOND,
  secondsToUs,
  usToSeconds,
  framesToUs,
  usToFrames,
  usToTimecode,
  formatDurationHuman,
  timecodeToUs,
} from './timeUtils';

describe('timeUtils', () => {
  it('convertit correctement les secondes en microsecondes et inversement', () => {
    expect(secondsToUs(1)).toBe(MICROSECONDS_PER_SECOND);
    expect(secondsToUs(2.5)).toBe(2_500_000);
    expect(usToSeconds(2_500_000)).toBe(2.5);
    expect(usToSeconds(0)).toBe(0);
  });

  it('calcule exactement les frames selon le framerate', () => {
    const fps = 60.0;
    // 60 frames à 60 fps = 1 seconde = 1 000 000 µs
    expect(framesToUs(60, fps)).toBe(1_000_000);
    expect(usToFrames(1_000_000, fps)).toBe(60);

    // À 30 fps, 1 frame = ~33333 µs
    expect(framesToUs(1, 30.0)).toBe(33333);
    expect(usToFrames(33333, 30.0)).toBe(1);
  });

  it('formate correctement en timecode SMPTE HH:MM:SS:FF', () => {
    expect(usToTimecode(0, 60)).toBe('00:00:00:00');
    // 1 heure, 2 minutes, 3 secondes, et 15 frames à 60 fps (15/60 = 250 000 µs)
    const oneHourUs = 3600 * 1_000_000;
    const twoMinUs = 2 * 60 * 1_000_000;
    const threeSecUs = 3 * 1_000_000;
    const fifteenFramesUs = framesToUs(15, 60);
    const testUs = oneHourUs + twoMinUs + threeSecUs + fifteenFramesUs;

    expect(usToTimecode(testUs, 60)).toBe('01:02:03:15');
  });

  it('formate les durées lisibles courtes et longues', () => {
    expect(formatDurationHuman(15_000_000)).toBe('00:15');
    expect(formatDurationHuman(125_000_000)).toBe('02:05');
    expect(formatDurationHuman(3665_000_000)).toBe('01:01:05');
  });

  it('décode un timecode vers les microsecondes sans perte', () => {
    const timecode = '00:01:30:15';
    const us = timecodeToUs(timecode, 60);
    const roundtrip = usToTimecode(us, 60);
    expect(roundtrip).toBe(timecode);
  });
});

