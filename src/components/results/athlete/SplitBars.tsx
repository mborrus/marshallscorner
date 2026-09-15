'use client';

// Every race as one stacked bar on a shared time axis, so a longer race is
// always a longer bar. Segment labels appear only where they fit; the rest
// of the detail lives in the tooltip and the table below.

import { Fragment } from 'react';
import type { AthleteProfile, AthleteRace } from '@/lib/results/athletes';
import { LEGS, LEG_LABELS } from '@/lib/results/athletes';
import {
  LEG_COLORS,
  ceilTo,
  formatDelta,
  formatTick,
  formatTime,
  ordinal,
  timeTicks,
} from './chart';
import { ChartTooltip, useChartTooltip, useElementWidth } from './chartUi';
import styles from './athlete.module.css';

export interface BarRow {
  key: string;
  race: AthleteRace;
  athlete: AthleteProfile;
  showAthleteName: boolean;
}

/** Recorded time for a race, including partials with no official total. */
export function raceSeconds(race: AthleteRace): number {
  if (race.total !== null) return race.total;
  return LEGS.reduce((sum, leg) => sum + (race.splits[leg] ?? 0), 0);
}

interface SplitBarsProps {
  rows: BarRow[];
}

export default function SplitBars({ rows }: SplitBarsProps) {
  const { containerRef, tooltip, show, hide } = useChartTooltip<HTMLDivElement>();
  const { ref: axisRef, width: plotWidth } = useElementWidth<HTMLDivElement>(480);

  if (rows.length === 0) return null;

  const longest = rows.reduce((max, row) => Math.max(max, raceSeconds(row.race)), 0);
  // Axis ends on a round half hour so the gridlines read as clock time.
  const axisMax = ceilTo(longest, 1800);
  const ticks = timeTicks(0, axisMax, 6);

  return (
    <>
      <ul className={styles.legend}>
        {LEGS.filter((leg) => leg !== 't2').map((leg) => (
          <li key={leg} className={styles.legendItem}>
            <span
              className={styles.swatch}
              style={{ backgroundColor: LEG_COLORS[leg] }}
              aria-hidden="true"
            />
            {leg === 't1' ? 'Transitions' : LEG_LABELS[leg]}
          </li>
        ))}
      </ul>

      <div className={styles.barChart} ref={containerRef}>
        {rows.map((row) => {
          const seconds = raceSeconds(row.race);
          const segments = LEGS.map((leg) => ({ leg, seconds: row.race.splits[leg] })).filter(
            (s): s is { leg: (typeof LEGS)[number]; seconds: number } =>
              s.seconds !== null && s.seconds > 0
          );

          return (
            <Fragment key={row.key}>
              <div className={styles.barLabel}>
                <span className={styles.barYear}>{row.race.year}</span>
                {row.showAthleteName && (
                  <span className={styles.barAthlete}>{row.athlete.name}</span>
                )}
                <span className={styles.barPlace}>
                  {row.race.place
                    ? `${ordinal(row.race.place)} of ${row.race.fieldSize}`
                    : 'did not finish'}
                </span>
              </div>

              <div className={styles.barPlot}>
                <div className={styles.gridlines} aria-hidden="true">
                  {ticks.map((tick) => (
                    <span key={tick} style={{ left: `${(tick / axisMax) * 100}%` }} />
                  ))}
                </div>

                <div className={styles.bar} style={{ width: `${(seconds / axisMax) * 100}%` }}>
                  {segments.map((segment, i) => {
                    const share = segment.seconds / seconds;
                    const pixels = share * (seconds / axisMax) * plotWidth;
                    const standing =
                      segment.leg === 'swim' || segment.leg === 'bike' || segment.leg === 'run'
                        ? row.race.legs[segment.leg]
                        : undefined;
                    const title = `${row.athlete.name} ${row.race.year} ${LEG_LABELS[segment.leg]}`;
                    const lines = [
                      formatTime(segment.seconds),
                      `${Math.round(share * 100)}% of the race`,
                    ];
                    if (standing) {
                      lines.push(`${ordinal(standing.place)} of ${standing.of} on this leg`);
                      lines.push(`${formatDelta(standing.vsMedian)} vs field median`);
                    }
                    const yoy = row.race.deltaSplits[segment.leg];
                    if (yoy !== undefined && row.race.comparedToYear !== null) {
                      lines.push(`${formatDelta(yoy)} vs ${row.race.comparedToYear}`);
                    }

                    return (
                      <button
                        type="button"
                        key={segment.leg}
                        className={styles.segment}
                        style={{
                          width: `${share * 100}%`,
                          backgroundColor: LEG_COLORS[segment.leg],
                          borderTopLeftRadius: i === 0 ? 4 : 0,
                          borderBottomLeftRadius: i === 0 ? 4 : 0,
                          borderTopRightRadius: i === segments.length - 1 ? 4 : 0,
                          borderBottomRightRadius: i === segments.length - 1 ? 4 : 0,
                        }}
                        aria-label={`${title}: ${lines.join(', ')}`}
                        onMouseEnter={(e) => show(e.currentTarget, { title, lines })}
                        onFocus={(e) => show(e.currentTarget, { title, lines })}
                        onMouseLeave={hide}
                        onBlur={hide}
                      >
                        {pixels > 92 && (
                          <span className={styles.segmentLabel}>
                            {LEG_LABELS[segment.leg]} {formatTime(segment.seconds)}
                          </span>
                        )}
                        {pixels > 46 && pixels <= 92 && (
                          <span className={styles.segmentLabel}>{LEG_LABELS[segment.leg]}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <span className={styles.barTotal}>
                {row.race.total !== null ? formatTime(row.race.total) : 'partial'}
              </span>
            </Fragment>
          );
        })}

        <div className={styles.barAxis} ref={axisRef}>
          {ticks.map((tick) => (
            <span
              key={tick}
              className={styles.axisTick}
              style={{ left: `${(tick / axisMax) * 100}%` }}
            >
              {formatTick(tick)}
            </span>
          ))}
        </div>

        <ChartTooltip tooltip={tooltip} />
      </div>
    </>
  );
}
