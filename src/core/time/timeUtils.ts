export const MICROSECONDS_PER_SECOND = 1_000_000;

/** Convertit des secondes en microsecondes entières */
export function secondsToUs(seconds: number): number {
  return Math.round(seconds * MICROSECONDS_PER_SECOND);
}

/** Convertit des microsecondes en secondes */
export function usToSeconds(us: number): number {
  return us / MICROSECONDS_PER_SECOND;
}

/** Convertit un nombre d'images (frames) en microsecondes */
export function framesToUs(frames: number, fps: number): number {
  if (fps <= 0) return 0;
  return Math.round((frames * MICROSECONDS_PER_SECOND) / fps);
}

/** Convertit des microsecondes en index d'image (frame) */
export function usToFrames(us: number, fps: number): number {
  if (fps <= 0) return 0;
  return Math.round((us * fps) / MICROSECONDS_PER_SECOND);
}

/**
 * Formate des microsecondes en timecode SMPTE standard (HH:MM:SS:FF)
 */
export function usToTimecode(us: number, fps: number = 60.0): string {
  if (us < 0) us = 0;
  const totalSeconds = us / MICROSECONDS_PER_SECOND;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const remainingUs = us % MICROSECONDS_PER_SECOND;
  const frame = Math.floor((remainingUs * fps) / MICROSECONDS_PER_SECOND);

  const pad = (n: number, z: number = 2) => n.toString().padStart(z, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frame)}`;
}

/**
 * Formate une durée en chaîne lisible humaine (MM:SS ou HH:MM:SS)
 */
export function formatDurationHuman(us: number): string {
  if (us < 0) us = 0;
  const totalSeconds = Math.floor(us / MICROSECONDS_PER_SECOND);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Parse un timecode (HH:MM:SS:FF) vers des microsecondes
 */
export function timecodeToUs(timecode: string, fps: number = 60.0): number {
  const parts = timecode.split(':').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return 0;
  }
  const [hours, minutes, seconds, frames] = parts;
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const frameUs = framesToUs(frames, fps);
  return totalSeconds * MICROSECONDS_PER_SECOND + frameUs;
}
