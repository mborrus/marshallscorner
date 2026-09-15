'use client';

// Finish time per year, with the field median behind it so an improvement
// can be read against the race itself getting faster or slower.

import type { AthleteProfile, YearContext } from '@/lib/results/athletes';
import {
  SERIES,
  ceilTo,
  floorTo,
  formatDelta,
  formatTick,
  formatTime,
  ordinal,
  timeTicks,
} from './chart';
import { ChartTooltip, useChartTooltip, useElementWidth } from './chartUi';
import styles from './athlete.module.css';

interface FinishTrendProps {
  athlete: AthleteProfile;
  compare: AthleteProfile | null;
  yearContext: YearContext[];
}

interface Point {
  year: number;
  seconds: number;
  x: number;
  y: number;
}

const HEIGHT = 250;
const PAD = { top: 18, right: 20, bottom: 32, left: 58 };

export default function FinishTrend({ athlete, compare, yearContext }: FinishTrendProps) {
  const { containerRef, tooltip, show, hide } = useChartTooltip<HTMLDivElement>();
  const { ref: sizeRef, width } = useElementWidth<HTMLDivElement>(600);

  const years = yearContext.map((y) => y.year);
  if (years.length < 2) return null;

  const plotWidth = Math.max(width - PAD.left - PAD.right, 80);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  const seriesFor = (profile: AthleteProfile) =>
    profile.races
      .filter((r) => r.total !== null)
      .map((r) => ({ year: r.year, seconds: r.total! }));

  const primary = seriesFor(athlete);
  const secondary = compare ? seriesFor(compare) : [];
  const medians = yearContext
    .filter((y) => y.medianTotal !== null)
    .map((y) => ({ year: y.year, seconds: y.medianTotal! }));

  const values = [...primary, ...secondary, ...medians].map((p) => p.seconds);
  if (values.length === 0) return null;

  const low = floorTo(Math.min(...values) - 120, 300);
  const high = ceilTo(Math.max(...values) + 120, 300);
  const ticks = timeTicks(low, high, 5);

  const xOf = (year: number) => {
    const i = years.indexOf(year);
    if (years.length === 1) return PAD.left + plotWidth / 2;
    return PAD.left + (i / (years.length - 1)) * plotWidth;
  };
  const yOf = (seconds: number) =>
    PAD.top + plotHeight - ((seconds - low) / (high - low)) * plotHeight;

  const toPoints = (series: { year: number; seconds: number }[]): Point[] =>
    series.map((p) => ({ ...p, x: xOf(p.year), y: yOf(p.seconds) }));

  const primaryPoints = toPoints(primary);
  const secondaryPoints = toPoints(secondary);
  const medianPoints = toPoints(medians);

  const path = (points: Point[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const raceOf = (profile: AthleteProfile, year: number) =>
    profile.races.find((r) => r.year === year);

  const markerLines = (profile: AthleteProfile, point: Point) => {
    const race = raceOf(profile, point.year);
    const lines = [formatTime(point.seconds)];
    if (race?.place) lines.push(`${ordinal(race.place)} of ${race.fieldSize}`);
    if (race?.deltaTotal !== null && race?.comparedToYear) {
      lines.push(`${formatDelta(race.deltaTotal)} vs ${race.comparedToYear}`);
    }
    const median = yearContext.find((y) => y.year === point.year)?.medianTotal;
    if (median !== null && median !== undefined) {
      lines.push(`${formatDelta(point.seconds - median)} vs field median`);
    }
    return lines;
  };

  return (
    <div ref={containerRef} className={styles.chartFrame}>
      <ul className={styles.legend}>
        <li className={styles.legendItem}>
          <span
            className={styles.swatch}
            style={{ backgroundColor: SERIES.primary }}
            aria-hidden="true"
          />
          {athlete.name}
        </li>
        {compare && (
          <li className={styles.legendItem}>
            <span
              className={styles.swatch}
              style={{ backgroundColor: SERIES.compare }}
              aria-hidden="true"
            />
            {compare.name}
          </li>
        )}
        <li className={styles.legendItem}>
          <span className={styles.swatchDashed} aria-hidden="true" />
          Field median
        </li>
      </ul>

      <div ref={sizeRef} className={styles.svgHost}>
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`${athlete.name}'s finish time by year against the field median`}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={yOf(tick)}
                y2={yOf(tick)}
                className={styles.grid}
              />
              <text x={PAD.left - 8} y={yOf(tick) + 4} textAnchor="end" className={styles.axisText}>
                {formatTick(tick)}
              </text>
            </g>
          ))}

          {years.map((year) => (
            <text
              key={year}
              x={xOf(year)}
              y={HEIGHT - 10}
              textAnchor="middle"
              className={styles.axisText}
            >
              {year}
            </text>
          ))}

          {medianPoints.length > 1 && (
            <path d={path(medianPoints)} className={styles.medianLine} />
          )}

          {secondaryPoints.length > 1 && (
            <path d={path(secondaryPoints)} fill="none" stroke={SERIES.compare} strokeWidth={2} />
          )}
          {primaryPoints.length > 1 && (
            <path d={path(primaryPoints)} fill="none" stroke={SERIES.primary} strokeWidth={2} />
          )}

          {compare &&
            secondaryPoints.map((point) => (
              <circle
                key={`c-${point.year}`}
                cx={point.x}
                cy={point.y}
                r={5}
                fill={SERIES.compare}
                stroke="#ffffff"
                strokeWidth={2}
                tabIndex={0}
                className={styles.marker}
                aria-label={`${compare.name} ${point.year}: ${formatTime(point.seconds)}`}
                onMouseEnter={(e) =>
                  show(e.currentTarget, {
                    title: `${compare.name} ${point.year}`,
                    lines: markerLines(compare, point),
                  })
                }
                onFocus={(e) =>
                  show(e.currentTarget, {
                    title: `${compare.name} ${point.year}`,
                    lines: markerLines(compare, point),
                  })
                }
                onMouseLeave={hide}
                onBlur={hide}
              />
            ))}

          {primaryPoints.map((point, i) => {
            // Edge labels lean inward so they never sit on the axis gutter.
            const first = i === 0;
            const last = i === primaryPoints.length - 1;
            const anchor = first ? 'start' : last ? 'end' : 'middle';
            const labelX = first ? point.x - 4 : last ? point.x + 4 : point.x;
            return (
            <g key={`p-${point.year}`}>
              <text
                x={labelX}
                y={point.y - 12}
                textAnchor={anchor}
                className={styles.pointLabel}
              >
                {formatTime(point.seconds)}
              </text>
              <circle
                cx={point.x}
                cy={point.y}
                r={5}
                fill={SERIES.primary}
                stroke="#ffffff"
                strokeWidth={2}
                tabIndex={0}
                className={styles.marker}
                aria-label={`${athlete.name} ${point.year}: ${formatTime(point.seconds)}`}
                onMouseEnter={(e) =>
                  show(e.currentTarget, {
                    title: `${athlete.name} ${point.year}`,
                    lines: markerLines(athlete, point),
                  })
                }
                onFocus={(e) =>
                  show(e.currentTarget, {
                    title: `${athlete.name} ${point.year}`,
                    lines: markerLines(athlete, point),
                  })
                }
                onMouseLeave={hide}
                onBlur={hide}
              />
            </g>
            );
          })}
        </svg>
      </div>

      <ChartTooltip tooltip={tooltip} />
      <p className={styles.chartNote}>Lower is faster. A year with no dot means no finish.</p>
    </div>
  );
}
