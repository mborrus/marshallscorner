'use client';

import { useState, useMemo } from 'react';
import type { TurkeyTrotRunner } from '@/lib/turkeytrotter/types';
import { formatTime, secondsToPace } from '@/lib/turkeytrotter/format';
import styles from './RunnerLookup.module.css';

interface Props {
  runners: TurkeyTrotRunner[];
  years: number[];
}

type ToolMode = 'search' | 'nemesis' | 'pacePartner';

export default function RunnerLookup({ runners, years }: Props) {
  const [mode, setMode] = useState<ToolMode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [runner1, setRunner1] = useState('');
  const [runner2, setRunner2] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return runners
      .filter((r) => r.name.toLowerCase().includes(lowerQuery))
      .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)
      .slice(0, 50);
  }, [runners, searchQuery]);

  // Group search results by runner name for history view
  const runnerHistory = useMemo(() => {
    if (searchResults.length === 0) return null;

    const grouped = new Map<string, TurkeyTrotRunner[]>();
    for (const runner of searchResults) {
      const key = runner.name.toLowerCase();
      const existing = grouped.get(key) || [];
      existing.push(runner);
      grouped.set(key, existing);
    }

    return Array.from(grouped.entries()).map(([, results]) => ({
      name: results[0].name,
      results: results.sort((a, b) => b.year - a.year),
    }));
  }, [searchResults]);

  // Head-to-head / Nemesis finder
  const headToHead = useMemo(() => {
    if (!runner1.trim() || !runner2.trim()) return null;

    const r1Lower = runner1.toLowerCase();
    const r2Lower = runner2.toLowerCase();

    const r1Results = runners.filter((r) =>
      r.name.toLowerCase().includes(r1Lower)
    );
    const r2Results = runners.filter((r) =>
      r.name.toLowerCase().includes(r2Lower)
    );

    if (r1Results.length === 0 || r2Results.length === 0) return null;

    const r1Name = r1Results[0].name;
    const r2Name = r2Results[0].name;

    const r1Years = new Map(r1Results.map((r) => [r.year, r]));
    const r2Years = new Map(r2Results.map((r) => [r.year, r]));

    const sharedYears = Array.from(r1Years.keys()).filter((y) =>
      r2Years.has(y)
    );

    if (sharedYears.length === 0) return { r1Name, r2Name, races: [] };

    const races = sharedYears
      .map((year) => ({
        year,
        r1: r1Years.get(year)!,
        r2: r2Years.get(year)!,
      }))
      .sort((a, b) => b.year - a.year);

    return {
      r1Name,
      r2Name,
      races,
      r1Wins: races.filter((r) => r.r1.finishTimeSeconds < r.r2.finishTimeSeconds).length,
      r2Wins: races.filter((r) => r.r2.finishTimeSeconds < r.r1.finishTimeSeconds).length,
    };
  }, [runners, runner1, runner2]);

  // Pace partner finder
  const pacePartners = useMemo(() => {
    if (!targetTime.trim()) return [];

    const parts = targetTime.split(':');
    let seconds = 0;
    if (parts.length === 2) {
      seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 3) {
      seconds =
        parseInt(parts[0], 10) * 3600 +
        parseInt(parts[1], 10) * 60 +
        parseInt(parts[2], 10);
    }

    if (seconds <= 0 || isNaN(seconds)) return [];

    const tolerance = 60; // +/- 1 minute
    const yearFiltered = selectedYear
      ? runners.filter((r) => r.year === selectedYear)
      : runners;

    return yearFiltered
      .filter((r) => Math.abs(r.finishTimeSeconds - seconds) <= tolerance)
      .sort(
        (a, b) =>
          Math.abs(a.finishTimeSeconds - seconds) -
          Math.abs(b.finishTimeSeconds - seconds)
      )
      .slice(0, 20);
  }, [runners, targetTime, selectedYear]);

  return (
    <div className={styles.container}>
      {/* Tool Selection */}
      <div className={styles.toolSelector}>
        <button
          className={`${styles.toolButton} ${mode === 'search' ? styles.active : ''}`}
          onClick={() => setMode('search')}
        >
          Runner Lookup
        </button>
        <button
          className={`${styles.toolButton} ${mode === 'nemesis' ? styles.active : ''}`}
          onClick={() => setMode('nemesis')}
        >
          Nemesis Finder
        </button>
        <button
          className={`${styles.toolButton} ${mode === 'pacePartner' ? styles.active : ''}`}
          onClick={() => setMode('pacePartner')}
        >
          Pace Partners
        </button>
      </div>

      {/* Runner Search */}
      {mode === 'search' && (
        <div className={styles.toolContent}>
          <div className={styles.inputGroup}>
            <label htmlFor="runner-search" className={styles.label}>
              Search by name
            </label>
            <input
              id="runner-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter runner name..."
              className={styles.input}
            />
          </div>

          {runnerHistory && runnerHistory.length > 0 && (
            <div className={styles.results}>
              {runnerHistory.map((runner) => (
                <div key={runner.name} className={styles.runnerCard}>
                  <h4 className={styles.runnerName}>{runner.name}</h4>
                  <p className={styles.runnerMeta}>
                    {runner.results.length} race{runner.results.length !== 1 ? 's' : ''}
                  </p>
                  <table className={styles.historyTable}>
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Time</th>
                        <th>Pace</th>
                        <th>Place</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runner.results.map((r) => (
                        <tr key={r.id}>
                          <td>{r.year}</td>
                          <td>{formatTime(r.finishTimeSeconds)}</td>
                          <td>{secondsToPace(r.finishTimeSeconds)}</td>
                          <td>
                            #{r.overallPlace} ({r.ageGroup}: #{r.ageGroupPlace})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {searchQuery && runnerHistory?.length === 0 && (
            <p className={styles.noResults}>No runners found matching &ldquo;{searchQuery}&rdquo;</p>
          )}
        </div>
      )}

      {/* Nemesis Finder */}
      {mode === 'nemesis' && (
        <div className={styles.toolContent}>
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="runner1" className={styles.label}>
                Runner 1
              </label>
              <input
                id="runner1"
                type="text"
                value={runner1}
                onChange={(e) => setRunner1(e.target.value)}
                placeholder="First runner name..."
                className={styles.input}
              />
            </div>
            <span className={styles.vs}>vs</span>
            <div className={styles.inputGroup}>
              <label htmlFor="runner2" className={styles.label}>
                Runner 2
              </label>
              <input
                id="runner2"
                type="text"
                value={runner2}
                onChange={(e) => setRunner2(e.target.value)}
                placeholder="Second runner name..."
                className={styles.input}
              />
            </div>
          </div>

          {headToHead && headToHead.races.length > 0 && (
            <div className={styles.headToHead}>
              <div className={styles.h2hScore}>
                <div className={styles.h2hRunner}>
                  <span className={styles.h2hName}>{headToHead.r1Name}</span>
                  <span className={styles.h2hWins}>{headToHead.r1Wins} wins</span>
                </div>
                <span className={styles.h2hSeparator}>-</span>
                <div className={styles.h2hRunner}>
                  <span className={styles.h2hWins}>{headToHead.r2Wins} wins</span>
                  <span className={styles.h2hName}>{headToHead.r2Name}</span>
                </div>
              </div>

              <table className={styles.h2hTable}>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>{headToHead.r1Name}</th>
                    <th>{headToHead.r2Name}</th>
                    <th>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {headToHead.races.map((race) => {
                    const winner =
                      race.r1.finishTimeSeconds < race.r2.finishTimeSeconds
                        ? headToHead.r1Name
                        : headToHead.r2Name;
                    return (
                      <tr key={race.year}>
                        <td>{race.year}</td>
                        <td
                          className={
                            race.r1.finishTimeSeconds < race.r2.finishTimeSeconds
                              ? styles.winnerTime
                              : ''
                          }
                        >
                          {formatTime(race.r1.finishTimeSeconds)}
                        </td>
                        <td
                          className={
                            race.r2.finishTimeSeconds < race.r1.finishTimeSeconds
                              ? styles.winnerTime
                              : ''
                          }
                        >
                          {formatTime(race.r2.finishTimeSeconds)}
                        </td>
                        <td className={styles.winner}>{winner}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {runner1 && runner2 && headToHead?.races.length === 0 && (
            <p className={styles.noResults}>
              No head-to-head races found between these runners
            </p>
          )}
        </div>
      )}

      {/* Pace Partner Finder */}
      {mode === 'pacePartner' && (
        <div className={styles.toolContent}>
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="target-time" className={styles.label}>
                Target Time (MM:SS or H:MM:SS)
              </label>
              <input
                id="target-time"
                type="text"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                placeholder="e.g., 25:00 or 0:25:00"
                className={styles.input}
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="year-filter" className={styles.label}>
                Year (optional)
              </label>
              <select
                id="year-filter"
                value={selectedYear ?? ''}
                onChange={(e) =>
                  setSelectedYear(e.target.value ? parseInt(e.target.value, 10) : null)
                }
                className={styles.select}
              >
                <option value="">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {pacePartners.length > 0 && (
            <div className={styles.pacePartnerResults}>
              <p className={styles.resultCount}>
                Found {pacePartners.length} runners within 1 minute of your target
              </p>
              <table className={styles.partnerTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Year</th>
                    <th>Time</th>
                    <th>Pace</th>
                    <th>Age Group</th>
                  </tr>
                </thead>
                <tbody>
                  {pacePartners.map((partner) => (
                    <tr key={partner.id}>
                      <td className={styles.partnerName}>{partner.name}</td>
                      <td>{partner.year}</td>
                      <td>{formatTime(partner.finishTimeSeconds)}</td>
                      <td>{secondsToPace(partner.finishTimeSeconds)}</td>
                      <td>{partner.ageGroup}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {targetTime && pacePartners.length === 0 && (
            <p className={styles.noResults}>
              No pace partners found. Try a different target time.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
