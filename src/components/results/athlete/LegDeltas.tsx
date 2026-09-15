'use client';

// Leg-by-leg change from one race to the next: bars left of the line are
// time saved, right of it time lost. This is the "2026 vs 2025" view.

import type { AthleteProfile, AthleteRace } from '@/lib/results/athletes';
import { FASTER, SLOWER, ceilTo, deltaArrow, formatDelta, formatTick } from './chart';
import { ChartTooltip, useChartTooltip, useElementWidth } from './chartUi';
import styles from './athlete.module.css';

interface LegDeltasProps {
  athlete: AthleteProfile;
}

interface LegDelta {
  label: string;
  delta: number;
}

const ROW = 26;
const BAR = 18;
const PAD = { top: 6, right: 16, bottom: 22, left: 86 };

/** Swim / bike / run plus the two transitions rolled into one row. */
function legDeltas(race: AthleteRace): LegDelta[] {
  const out: LegDelta[] = [];
  const named: [string, 'swim' | 'bike' | 'run'][] = [
    ['Swim', 'swim'],
    ['Bike', 'bike'],
    ['Run', 'run'],
  ];
  for (const [label, leg] of named) {
    const delta = race.deltaSplits[leg];
    if (delta !== undefined) out.push({ label, delta });
  }
  const t1 = race.deltaSplits.t1;
  const t2 = race.deltaSplits.t2;
  if (t1 !== undefined || t2 !== undefined) {
    out.push({ label: 'Transitions', delta: (t1 ?? 0) + (t2 ?? 0) });
  }
  return out;
}

export default function LegDeltas({ athlete }: LegDeltasProps) {
  const { containerRef, tooltip, show, hide } = useChartTooltip<HTMLDivElement>();
  const { ref: sizeRef, width } = useElementWidth<HTMLDivElement>(600);

  const transitions = athlete.races
    .filter((r) => r.comparedToYear !== null && Object.keys(r.deltaSplits).length > 0)
    .map((race) => ({ race, deltas: legDeltas(race) }))
    .filter((t) => t.deltas.length > 0)
    .reverse();

  if (transitions.length === 0) {
    return (
      <p className={styles.note}>
        {athlete.name} has one finish on record — there is nothing to compare it against yet.
      </p>
    );
  }

  const biggest = Math.max(
    ...transitions.flatMap((t) => t.deltas.map((d) => Math.abs(d.delta)))
  );
  const scaleMax = Math.max(ceilTo(biggest, 60), 60);

  const plotWidth = Math.max(width - PAD.left - PAD.right, 120);
  const zero = PAD.left + plotWidth / 2;
  const xOf = (delta: number) => zero + (delta / scaleMax) * (plotWidth / 2);

  return (
    <div ref={containerRef} className={styles.chartFrame}>
      <div ref={sizeRef} className={styles.svgHost}>
        {transitions.map(({ race, deltas }) => {
          const height = PAD.top + deltas.length * ROW + PAD.bottom;
          return (
            <div key={race.year} className={styles.deltaBlock}>
              <h3 className={styles.deltaTitle}>
                {race.year} vs {race.comparedToYear}
                <span className={`${styles.deltaTotal} ${race.deltaTotal! < 0 ? styles.faster : styles.slower}`}>
                  {deltaArrow(race.deltaTotal)}
                  {formatDelta(race.deltaTotal)} overall
                </span>
              </h3>
              <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label={`${athlete.name}: leg changes from ${race.comparedToYear} to ${race.year}`}
              >
                {deltas.map((d, i) => {
                  const y = PAD.top + i * ROW;
                  const isFaster = d.delta < 0;
                  const x = isFaster ? xOf(d.delta) : zero;
                  const barWidth = Math.max(Math.abs(xOf(d.delta) - zero), d.delta === 0 ? 0 : 2);
                  const text = `${deltaArrow(d.delta)}${formatDelta(d.delta)}`;
                  // Park the value outside the bar, or inside it when the bar
                  // reaches the edge of the plot.
                  const textWidth = text.length * 6.4;
                  const outside = isFaster
                    ? x - 6 - textWidth > PAD.left
                    : x + barWidth + 6 + textWidth < width - PAD.right;
                  const labelX = isFaster
                    ? outside
                      ? x - 6
                      : x + 6
                    : outside
                      ? x + barWidth + 6
                      : x + barWidth - 6;
                  const labelAnchor = isFaster
                    ? outside
                      ? 'end'
                      : 'start'
                    : outside
                      ? 'start'
                      : 'end';
                  const lines = [
                    `${formatDelta(d.delta)} vs ${race.comparedToYear}`,
                    isFaster ? 'time saved' : 'time lost',
                  ];
                  return (
                    <g key={d.label}>
                      <text x={PAD.left - 10} y={y + BAR / 2 + 4} textAnchor="end" className={styles.axisText}>
                        {d.label}
                      </text>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={BAR}
                        rx={3}
                        fill={isFaster ? FASTER : SLOWER}
                        tabIndex={0}
                        className={styles.marker}
                        aria-label={`${d.label}: ${formatDelta(d.delta)}`}
                        onMouseEnter={(e) => show(e.currentTarget, { title: d.label, lines })}
                        onFocus={(e) => show(e.currentTarget, { title: d.label, lines })}
                        onMouseLeave={hide}
                        onBlur={hide}
                      />
                      <text
                        x={labelX}
                        y={y + BAR / 2 + 4}
                        textAnchor={labelAnchor}
                        className={outside ? styles.pointLabel : styles.pointLabelInverse}
                      >
                        {text}
                      </text>
                    </g>
                  );
                })}

                <line
                  x1={zero}
                  x2={zero}
                  y1={PAD.top - 2}
                  y2={PAD.top + deltas.length * ROW}
                  className={styles.zeroLine}
                />
                <text x={PAD.left} y={height - 8} textAnchor="start" className={styles.axisText}>
                  ▼ {formatTick(scaleMax)} faster
                </text>
                <text x={zero} y={height - 8} textAnchor="middle" className={styles.axisText}>
                  no change
                </text>
                <text
                  x={width - PAD.right}
                  y={height - 8}
                  textAnchor="end"
                  className={styles.axisText}
                >
                  ▲ {formatTick(scaleMax)} slower
                </text>
              </svg>
            </div>
          );
        })}
      </div>

      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
