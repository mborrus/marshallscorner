// Formatting utilities for Turkey Trot (client-safe, no fs)

/**
 * Format seconds to MM:SS or H:MM:SS
 */
export function formatTime(seconds: number): string {
  if (seconds <= 0) return '-';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
}

/**
 * Convert seconds to pace per mile (for 5K = 3.1 miles)
 */
export function secondsToPace(seconds: number): string {
  const paceSeconds = seconds / 3.1;
  const minutes = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}/mi`;
}
