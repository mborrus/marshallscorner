// Time formatting utilities for triathlon results

/**
 * Parse a time string into seconds
 * Accepts: H:MM:SS, MM:SS, or just seconds
 * Returns null for invalid/missing values
 */
export function parseTimeToSeconds(timeStr: string | undefined | null): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const trimmed = timeStr.trim();

  // Invalid values
  if (
    trimmed === '' ||
    trimmed.toLowerCase() === 'nan' ||
    trimmed === 'XX' ||
    trimmed === '#VALUE!' ||
    trimmed.toLowerCase() === 'swim' ||
    trimmed.toLowerCase() === 'bike' ||
    trimmed.toLowerCase() === 'run' ||
    trimmed.toLowerCase() === 't1' ||
    trimmed.toLowerCase() === 't2' ||
    trimmed.toLowerCase() === 'total'
  ) {
    return null;
  }

  // Try H:MM:SS or MM:SS format
  const parts = trimmed.split(':').map((p) => parseFloat(p.trim()));

  if (parts.some((p) => isNaN(p))) return null;

  if (parts.length === 3) {
    // H:MM:SS
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    // Just seconds
    return parts[0];
  }

  return null;
}

/**
 * Format seconds into a display string (H:MM:SS or MM:SS)
 */
export function formatSecondsToTime(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds < 0) return '-';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

/**
 * Convert name to public format: "First Last" -> "First L."
 */
export function toPublicName(name: string): string {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];

  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0];

  return `${firstName} ${lastInitial}.`;
}

/**
 * Generate a stable ID from name and year
 */
export function generateId(name: string, year: number): string {
  const normalized = name.toLowerCase().replace(/\s+/g, '-');
  return `${year}-${normalized}`;
}
