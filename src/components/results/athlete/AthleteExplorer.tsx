'use client';

// Pick an athlete, see every race they have run: how their finish time has
// moved, where the time goes, what changed leg by leg, where they sat in the
// field, and an optional side-by-side with a second athlete.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AthleteIndex, AthleteProfile } from '@/lib/results/athletes';
import { LEGS, LEG_LABELS, RACED_LEGS } from '@/lib/results/athletes';
import { deltaArrow, formatDelta, formatTime, ordinal } from './chart';
import SplitBars, { type BarRow } from './SplitBars';
import FinishTrend from './FinishTrend';
import FieldStrip from './FieldStrip';
import LegDeltas from './LegDeltas';
import styles from './athlete.module.css';

interface AthleteExplorerProps {
  index: AthleteIndex;
}

function deltaClass(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Math.round(seconds) === 0) return '';
  return seconds < 0 ? styles.faster : styles.slower;
}

/** Change on the athlete's most recent finish vs the finish before it. */
function latestDelta(athlete: AthleteProfile): number | null {
  const finished = athlete.races.filter((r) => r.total !== null);
  return finished[finished.length - 1]?.deltaTotal ?? null;
}

function latestDeltaNote(athlete: AthleteProfile): string {
  const finished = athlete.races.filter((r) => r.total !== null);
  const latest = finished[finished.length - 1];
  if (!latest || latest.deltaTotal === null || latest.comparedToYear === null) {
    return 'first finish on record';
  }
  return `${latest.year} vs ${latest.comparedToYear}`;
}

export default function AthleteExplorer({ index }: AthleteExplorerProps) {
  const { athletes, years, yearContext } = index;

  const [selectedSlug, setSelectedSlug] = useState<string>(athletes[0]?.slug ?? '');
  const [compareSlug, setCompareSlug] = useState<string>('');
  const [query, setQuery] = useState('');

  // Read a shareable link on first paint (?athlete=marshall&vs=lucas).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const athlete = params.get('athlete');
    const vs = params.get('vs');
    if (athlete && athletes.some((a) => a.slug === athlete)) setSelectedSlug(athlete);
    if (vs && athletes.some((a) => a.slug === vs)) setCompareSlug(vs);
  }, [athletes]);

  // Keep the URL in step so a view can be linked to.
  useEffect(() => {
    if (!selectedSlug) return;
    const params = new URLSearchParams(window.location.search);
    params.set('athlete', selectedSlug);
    if (compareSlug) {
      params.set('vs', compareSlug);
    } else {
      params.delete('vs');
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [selectedSlug, compareSlug]);

  const selected = athletes.find((a) => a.slug === selectedSlug) ?? null;
  const compare = athletes.find((a) => a.slug === compareSlug) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter((a) => a.name.toLowerCase().includes(q));
  }, [athletes, query]);

  const rows: BarRow[] = useMemo(() => {
    if (!selected) return [];
    if (!compare) {
      return selected.races.map((race) => ({
        key: `${selected.slug}-${race.year}`,
        race,
        athlete: selected,
        showAthleteName: false,
      }));
    }
    // With a comparison on, group by year so the two sit next to each other.
    const allYears = [...new Set([...selected.years, ...compare.years])].sort((a, b) => a - b);
    const out: BarRow[] = [];
    for (const year of allYears) {
      for (const athlete of [selected, compare]) {
        const race = athlete.races.find((r) => r.year === year);
        if (race) {
          out.push({ key: `${athlete.slug}-${year}`, race, athlete, showAthleteName: true });
        }
      }
    }
    return out;
  }, [selected, compare]);

  const selectAthlete = useCallback(
    (slug: string) => {
      setSelectedSlug(slug);
      setCompareSlug((current) => (current === slug ? '' : current));
    },
    []
  );

  if (athletes.length === 0) {
    return <p>No athlete data available.</p>;
  }

  const sharedYears =
    selected && compare ? selected.years.filter((y) => compare.years.includes(y)) : [];

  return (
    <div className={styles.explorer}>
      {/* ---- Picker ------------------------------------------------ */}
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Pick an athlete</h2>
        <div className={styles.panelBody}>
          <div className={styles.controls}>
            <label className={styles.searchLabel}>
              <span className={styles.srOnly}>Search athletes</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name..."
                className={styles.search}
              />
            </label>
            <label className={styles.compareLabel}>
              Compare with
              <select
                value={compareSlug}
                onChange={(e) => setCompareSlug(e.target.value)}
                className={styles.select}
              >
                <option value="">Nobody</option>
                {athletes
                  .filter((a) => a.slug !== selectedSlug)
                  .map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <ul className={styles.athleteList}>
            {filtered.map((athlete) => (
              <li key={athlete.slug}>
                <button
                  type="button"
                  onClick={() => selectAthlete(athlete.slug)}
                  className={`${styles.athleteButton} ${
                    athlete.slug === selectedSlug ? styles.athleteButtonActive : ''
                  }`}
                  aria-pressed={athlete.slug === selectedSlug}
                >
                  <span className={styles.athleteName}>{athlete.name}</span>
                  <span className={styles.athleteYears}>
                    {athlete.years.map((y) => String(y).slice(-2)).join(' · ')}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className={styles.noMatch}>No athlete by that name.</li>}
          </ul>
        </div>
      </section>

      {selected && (
        <>
          {/* ---- Career summary --------------------------------------- */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>{selected.name}&apos;s career</h2>
            <div className={styles.panelBody}>
              <dl className={styles.tiles}>
                <div className={styles.tile}>
                  <dt>Races</dt>
                  <dd>{selected.races.length}</dd>
                  <span className={styles.tileNote}>{selected.years.join(', ')}</span>
                </div>
                <div className={styles.tile}>
                  <dt>Personal best</dt>
                  <dd>{formatTime(selected.bestTotal?.seconds ?? null)}</dd>
                  <span className={styles.tileNote}>
                    {selected.bestTotal ? `set in ${selected.bestTotal.year}` : 'no finish yet'}
                  </span>
                </div>
                <div className={styles.tile}>
                  <dt>Best finish</dt>
                  <dd>{selected.bestPlace ? ordinal(selected.bestPlace.place) : '—'}</dd>
                  <span className={styles.tileNote}>
                    {selected.bestPlace
                      ? `of ${selected.bestPlace.of} in ${selected.bestPlace.year}`
                      : 'no finish yet'}
                  </span>
                </div>
                <div className={styles.tile}>
                  <dt>Latest change</dt>
                  <dd className={deltaClass(latestDelta(selected))}>
                    {latestDelta(selected) === null
                      ? '—'
                      : `${deltaArrow(latestDelta(selected))}${formatDelta(latestDelta(selected))}`}
                  </dd>
                  <span className={styles.tileNote}>{latestDeltaNote(selected)}</span>
                </div>
              </dl>
            </div>
          </section>

          {/* ---- Finish time trend ------------------------------------ */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Finish time by year</h2>
            <div className={styles.panelBody}>
              <FinishTrend athlete={selected} compare={compare} yearContext={yearContext} />
            </div>
          </section>

          {/* ---- Stacked bars ---------------------------------------- */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Where the time went</h2>
            <div className={styles.panelBody}>
              <SplitBars rows={rows} />
              <p className={styles.chartNote}>
                Bars share one clock, so a longer race is a longer bar. Hover or tab a segment for
                detail.
              </p>
            </div>
          </section>

          {/* ---- Leg-by-leg change ------------------------------------ */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>What changed, leg by leg</h2>
            <div className={styles.panelBody}>
              <LegDeltas athlete={selected} />
            </div>
          </section>

          {/* ---- Field strip ----------------------------------------- */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Where they sat in the field</h2>
            <div className={styles.panelBody}>
              <FieldStrip athlete={selected} compare={compare} yearContext={yearContext} />
            </div>
          </section>

          {/* ---- Year by year ---------------------------------------- */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Year by year — {selected.name}</h2>
            <div className={styles.panelBody}>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <caption className={styles.srOnly}>
                    {selected.name}&apos;s split times each year, with the change against their
                    previous race.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Year</th>
                      {LEGS.map((leg) => (
                        <th scope="col" key={leg}>
                          {LEG_LABELS[leg]}
                        </th>
                      ))}
                      <th scope="col">Total</th>
                      <th scope="col">Place</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...selected.races].reverse().map((race) => (
                      <tr key={race.year}>
                        <th scope="row">{race.year}</th>
                        {LEGS.map((leg) => (
                          <td key={leg}>
                            <span className={styles.cellValue}>{formatTime(race.splits[leg])}</span>
                            {race.deltaSplits[leg] !== undefined && (
                              <span
                                className={`${styles.cellDelta} ${deltaClass(race.deltaSplits[leg])}`}
                              >
                                {deltaArrow(race.deltaSplits[leg])}
                                {formatDelta(race.deltaSplits[leg])}
                              </span>
                            )}
                          </td>
                        ))}
                        <td>
                          <span className={styles.cellValue}>{formatTime(race.total)}</span>
                          {race.deltaTotal !== null && (
                            <span className={`${styles.cellDelta} ${deltaClass(race.deltaTotal)}`}>
                              {deltaArrow(race.deltaTotal)}
                              {formatDelta(race.deltaTotal)}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={styles.cellValue}>
                            {race.place ? `${ordinal(race.place)}/${race.fieldSize}` : 'DNF'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={styles.chartNote}>
                Change is measured against {selected.name}&apos;s previous race. ▼ faster, ▲ slower.
              </p>
            </div>
          </section>

          {/* ---- Against the field ----------------------------------- */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Against the field</h2>
            <div className={styles.panelBody}>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Year</th>
                      <th scope="col">Finish</th>
                      <th scope="col">Behind winner</th>
                      <th scope="col">vs median</th>
                      {RACED_LEGS.map((leg) => (
                        <th scope="col" key={leg}>
                          {LEG_LABELS[leg]} rank
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...selected.races].reverse().map((race) => (
                      <tr key={race.year}>
                        <th scope="row">{race.year}</th>
                        <td>{race.place ? `${ordinal(race.place)} of ${race.fieldSize}` : 'DNF'}</td>
                        <td>{race.gapToWinner === null ? '—' : formatTime(race.gapToWinner)}</td>
                        <td className={deltaClass(race.vsMedian)}>
                          {race.vsMedian === null
                            ? '—'
                            : `${deltaArrow(race.vsMedian)}${formatDelta(race.vsMedian)}`}
                        </td>
                        {RACED_LEGS.map((leg) => {
                          const standing = race.legs[leg];
                          return (
                            <td key={leg}>{standing ? `${standing.place}/${standing.of}` : '—'}</td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ---- Head to head ---------------------------------------- */}
          {compare && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>
                {selected.name} vs {compare.name}
              </h2>
              <div className={styles.panelBody}>
                {sharedYears.length === 0 ? (
                  <p className={styles.note}>
                    {selected.name} and {compare.name} have never raced the same year — the charts
                    above still line their careers up side by side.
                  </p>
                ) : (
                  <div className={styles.tableScroll}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th scope="col">Year</th>
                          <th scope="col">{selected.name}</th>
                          <th scope="col">{compare.name}</th>
                          <th scope="col">Gap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...sharedYears].reverse().map((year) => {
                          const a = selected.races.find((r) => r.year === year)!;
                          const b = compare.races.find((r) => r.year === year)!;
                          const gap =
                            a.total !== null && b.total !== null ? a.total - b.total : null;
                          return (
                            <tr key={year}>
                              <th scope="row">{year}</th>
                              <td>
                                <span className={styles.cellValue}>{formatTime(a.total)}</span>
                                <span className={styles.cellDelta}>
                                  {a.place ? `${ordinal(a.place)} of ${a.fieldSize}` : 'DNF'}
                                </span>
                              </td>
                              <td>
                                <span className={styles.cellValue}>{formatTime(b.total)}</span>
                                <span className={styles.cellDelta}>
                                  {b.place ? `${ordinal(b.place)} of ${b.fieldSize}` : 'DNF'}
                                </span>
                              </td>
                              <td className={deltaClass(gap)}>
                                {gap === null ? '—' : `${deltaArrow(gap)}${formatDelta(gap)}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className={styles.chartNote}>
                  Gap is {selected.name} minus {compare.name}. ▼ means {selected.name} was ahead.
                </p>
              </div>
            </section>
          )}
        </>
      )}

      <p className={styles.note}>
        Covering {years.join(', ')}. Athletes are matched across years by name.
      </p>
    </div>
  );
}
