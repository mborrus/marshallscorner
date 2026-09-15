// Shared vocabulary for the athlete charts: colours, formatting, scales.
// The three leg hues are checked for colour-blind separation against the
// chart surface; transitions stay neutral because they are context, not a
// series of their own.

import { formatSecondsToTime } from '@/lib/results/format';
import type { Leg } from '@/lib/results/athletes';

export const LEG_COLORS: Record<Leg, string> = {
  swim: '#1a6fa8',
  t1: '#8a8378',
  bike: '#2e8b57',
  t2: '#8a8378',
  run: '#c1571a',
};

/** Selected athlete, comparison athlete, and the field behind them. */
export const SERIES = {
  primary: '#1a6fa8',
  compare: '#c1571a',
  reference: '#8a8378',
  field: '#c3bdb0',
};

export const FASTER = '#1d7a3f';
export const SLOWER = '#b03a26';

export function formatTime(seconds: number | null | undefined): string {
  return formatSecondsToTime(seconds, '—');
}

/** Signed difference; negative reads as faster. */
export function formatDelta(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  const rounded = Math.round(seconds);
  if (rounded === 0) return 'even';
  const sign = rounded < 0 ? '−' : '+';
  return `${sign}${formatTime(Math.abs(rounded))}`;
}

/** Arrow so faster/slower never rides on colour alone. */
export function deltaArrow(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Math.round(seconds) === 0) return '';
  return seconds < 0 ? '▼ ' : '▲ ';
}

export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Round up to the next whole step, so an axis ends on a readable number. */
export function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

export function floorTo(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

/**
 * Evenly spaced tick values from `from` to `to`, at most `max` of them.
 * Steps are chosen from whole minutes so labels stay round.
 */
export function timeTicks(from: number, to: number, max = 6): number[] {
  const span = to - from;
  if (span <= 0) return [from];

  const candidates = [60, 120, 300, 600, 900, 1200, 1800, 3600, 5400, 7200];
  const step = candidates.find((c) => span / c <= max) ?? 7200;

  const ticks: number[] = [];
  for (let t = ceilTo(from, step); t <= to + 1; t += step) ticks.push(t);
  return ticks;
}

/** Hours and minutes only - for axis labels, where seconds are noise. */
export function formatTick(seconds: number): string {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}`;
  return `${minutes}m`;
}
