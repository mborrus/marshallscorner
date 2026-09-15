'use client';

// Every finisher of a year as a dot on a time axis, with the selected athlete
// picked out. Shows whether a race was won in a pack or strung out, and where
// the athlete sat in it.

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

interface FieldStripProps {
  athlete: AthleteProfile;
  compare: AthleteProfile | null;
  yearContext: YearContext[];
}

const ROW_HEIGHT = 46;
const PAD = { top: 10, right: 20, bottom: 30, left: 52 };

export default function FieldStrip({ athlete, compare, yearContext }: FieldStripProps) {
  const { containerRef, tooltip, show, hide } = useChartTooltip<HTMLDivElement>();
  const { ref: sizeRef, width } = useElementWidth<HTMLDivElement>(600);

  const shown = yearContext.filter(
    (y) =>
      y.field.length > 0 &&
      (athlete.years.includes(y.year) || (compare?.years.includes(y.year) ?? false))
  );
  if (shown.length === 0) return null;

  const totals = shown.flatMap((y) => y.field.map((f) => f.total));
  const low = floorTo(Math.min(...totals) - 180, 600);
  const high = ceilTo(Math.max(...totals) + 180, 600);
  const ticks = timeTicks(low, high, 7);

  const plotWidth = Math.max(width - PAD.left - PAD.right, 80);
  const height = PAD.top + shown.length * ROW_HEIGHT + PAD.bottom;

  const xOf = (seconds: number) => PAD.left + ((seconds - low) / (high - low)) * plotWidth;
  const yOf = (index: number) => PAD.top + index * ROW_HEIGHT + ROW_HEIGHT / 2;

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
          <span
            className={styles.swatch}
            style={{ backgroundColor: SERIES.field }}
            aria-hidden="true"
          />
          Everyone else
        </li>
      </ul>

      <div ref={sizeRef} className={styles.svgHost}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Finishers each year with ${athlete.name} highlighted`}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={xOf(tick)}
                x2={xOf(tick)}
                y1={PAD.top}
                y2={height - PAD.bottom}
                className={styles.grid}
              />
              <text
                x={xOf(tick)}
                y={height - 10}
                textAnchor="middle"
                className={styles.axisText}
              >
                {formatTick(tick)}
              </text>
            </g>
          ))}

          {shown.map((year, row) => {
            const y = yOf(row);
            return (
              <g key={year.year}>
                <text x={PAD.left - 10} y={y + 4} textAnchor="end" className={styles.axisYear}>
                  {year.year}
                </text>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y}
                  y2={y}
                  className={styles.stripRule}
                />
                {year.medianTotal !== null && (
                  <line
                    x1={xOf(year.medianTotal)}
                    x2={xOf(year.medianTotal)}
                    y1={y - 13}
                    y2={y + 13}
                    className={styles.medianTick}
                  />
                )}
                {year.field.map((entry, i) => {
                  const isPrimary = entry.slug === athlete.slug;
                  const isCompare = compare ? entry.slug === compare.slug : false;
                  const fill = isPrimary
                    ? SERIES.primary
                    : isCompare
                      ? SERIES.compare
                      : SERIES.field;
                  const lines = [
                    formatTime(entry.total),
                    `${ordinal(i + 1)} of ${year.field.length}`,
                  ];
                  if (year.medianTotal !== null) {
                    lines.push(`${formatDelta(entry.total - year.medianTotal)} vs median`);
                  }
                  return (
                    <circle
                      key={`${entry.slug}-${i}`}
                      cx={xOf(entry.total)}
                      cy={y}
                      r={isPrimary || isCompare ? 7 : 5}
                      fill={fill}
                      stroke="#ffffff"
                      strokeWidth={2}
                      tabIndex={0}
                      className={styles.marker}
                      aria-label={`${entry.name}, ${year.year}: ${formatTime(entry.total)}`}
                      onMouseEnter={(e) =>
                        show(e.currentTarget, { title: `${entry.name} · ${year.year}`, lines })
                      }
                      onFocus={(e) =>
                        show(e.currentTarget, { title: `${entry.name} · ${year.year}`, lines })
                      }
                      onMouseLeave={hide}
                      onBlur={hide}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <ChartTooltip tooltip={tooltip} />
      <p className={styles.chartNote}>
        One dot per finisher. The short vertical mark is that year&apos;s median.
      </p>
    </div>
  );
}
