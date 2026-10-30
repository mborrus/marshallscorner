'use client';

// Season so far: promotion odds after each race, and the standings and the
// focus team's runners at any race picked from the list

import { useState } from 'react';
import type { HistoryRace } from '@/lib/nyrr/forecast';
import { formatDay, formatDuration, formatPct, ordinal, shortEventName } from '@/lib/nyrr/format';
import ProbBar from './ProbBar';
import styles from './page.module.css';

const HIGHLIGHT = '#d62828';
const COLORS = ['#336699', '#b5651d', '#7a5c99', '#4a8a8a'];

interface Props {
  history: HistoryRace[];
  teamNames: Record<string, string>;
  focusCode: string;
}

export default function SeasonHistory({ history, teamNames, focusCode }: Props) {
  const [selected, setSelected] = useState(history.length - 1);
  if (!history.length) return null;
  const race = history[selected];
  const previous = history[selected - 1];

  // Teams that were ever real contenders, colored in today's standings order
  const latest = history[history.length - 1].teams;
  const shown = [...latest]
    .sort((a, b) => a.standing - b.standing)
    .filter(
      (t) => t.teamCode === focusCode || history.some((h) => (h.teams.find((x) => x.teamCode === t.teamCode)?.pTop2 ?? 0) >= 0.2)
    )
    .slice(0, 5);
  let colorIndex = 0;
  const colorOf = new Map(
    shown.map((t) => [t.teamCode, t.teamCode === focusCode ? HIGHLIGHT : COLORS[colorIndex++ % COLORS.length]])
  );

  const width = 640;
  const height = 240;
  const pad = { top: 12, right: 16, bottom: 28, left: 40 };
  const x = (i: number) => pad.left + (history.length === 1 ? 0 : (i / (history.length - 1)) * (width - pad.left - pad.right));
  const y = (p: number) => height - pad.bottom - p * (height - pad.top - pad.bottom);

  const rows = [...race.teams].sort((a, b) => a.standing - b.standing || b.total - a.total);

  // Points the focus team likely missed by not fielding full teams
  const missed = history.filter((h) => h.focusMargins.missed);
  const missedPoints = missed.reduce((s, h) => s + h.focusMargins.missed!.points, 0);
  const now = history[history.length - 1].teams;
  const focusNow = now.find((t) => t.teamCode === focusCode);
  const secondNow = [...now].sort((a, b) => b.total - a.total)[1];
  const closeCalls = history.filter((h) => h.focusMargins.ahead && h.focusMargins.ahead.seconds < 20);

  return (
    <div className={styles.history}>
      {(missed.length > 0 || closeCalls.length > 0) && (
        <p className={`${styles.callout} win98-box-inset`}>
          {missed.length > 0 && (
            <>
              <strong>Points left on the table:</strong> about {Math.round(missedPoints)} from {missed.length}{' '}
              {missed.length === 1 ? 'race' : 'races'} without a full team (
              {missed.map((h) => shortEventName(h.eventName)).join(', ')}), going by how a typical{' '}
              {teamNames[focusCode]} team was running then.
              {focusNow && secondNow && focusNow.teamCode !== secondNow.teamCode && focusNow.total < secondNow.total && (
                <> The gap to 2nd is {secondNow.total - focusNow.total}.</>
              )}{' '}
            </>
          )}
          {closeCalls.length > 0 && (
            <>
              <strong>Close calls:</strong>{' '}
              {closeCalls
                .map((h) => `${Math.round(h.focusMargins.ahead!.seconds)}s per runner from +${h.focusMargins.ahead!.points} at the ${shortEventName(h.eventName)}`)
                .join('; ')}
              .
            </>
          )}
        </p>
      )}
      <figure className={styles.chart}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Chance of a top 2 finish after each race">
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <g key={p}>
              <line x1={pad.left} x2={width - pad.right} y1={y(p)} y2={y(p)} stroke="#e0d9cc" />
              <text x={pad.left - 6} y={y(p) + 4} textAnchor="end" className={styles.axisText}>
                {p * 100}%
              </text>
            </g>
          ))}
          <line x1={x(selected)} x2={x(selected)} y1={pad.top} y2={height - pad.bottom} stroke="#5a5a5a" strokeDasharray="3 3" />
          {history.map((h, i) => (
            <g key={h.eventCode} onClick={() => setSelected(i)} className={styles.clickable}>
              <rect x={x(i) - 14} y={pad.top} width={28} height={height - pad.top} fill="transparent" />
              <text x={x(i)} y={height - 8} textAnchor="middle" className={styles.axisText} fontWeight={i === selected ? 'bold' : 'normal'}>
                {i + 1}
              </text>
            </g>
          ))}
          {[...shown].reverse().map((t) => {
            const color = colorOf.get(t.teamCode)!;
            const isFocus = t.teamCode === focusCode;
            const points = history.map((h) => h.teams.find((x) => x.teamCode === t.teamCode)?.pTop2 ?? 0);
            return (
              <g key={t.teamCode}>
                <polyline
                  fill="none"
                  stroke={color}
                  strokeWidth={isFocus ? 3 : 1.75}
                  points={points.map((p, i) => `${x(i)},${y(p)}`).join(' ')}
                />
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(p)}
                    r={isFocus ? 4 : 3}
                    fill={color}
                    stroke="#fffef8"
                    strokeWidth={1.5}
                    onClick={() => setSelected(i)}
                    className={styles.clickable}
                  >
                    <title>{`${teamNames[t.teamCode]} after ${shortEventName(history[i].eventName)}: ${formatPct(p)}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
        <figcaption className={styles.legend}>
          {shown.map((t) => (
            <span key={t.teamCode} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: colorOf.get(t.teamCode) }} />
              {teamNames[t.teamCode]}
            </span>
          ))}
        </figcaption>
      </figure>

      <div className={styles.racePicker}>
        <button
          className={styles.tab}
          onClick={() => setSelected(Math.max(0, selected - 1))}
          disabled={selected === 0}
          aria-label="Previous race"
        >
          ◀
        </button>
        <select
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
          className={styles.raceSelect}
          aria-label="Race"
        >
          {history.map((h, i) => (
            <option key={h.eventCode} value={i}>
              {i + 1}. {shortEventName(h.eventName)} ({formatDay(h.date)})
            </option>
          ))}
        </select>
        <button
          className={styles.tab}
          onClick={() => setSelected(Math.min(history.length - 1, selected + 1))}
          disabled={selected === history.length - 1}
          aria-label="Next race"
        >
          ▶
        </button>
      </div>
      <p className={styles.muted}>
        Top {race.scorers} scored{race.multiplier > 1 ? `, ${race.multiplier}× points` : ''}. Standings and odds are as
        they stood right after this race.
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>After</th>
              <th>Team</th>
              <th className={styles.num}>Race</th>
              <th className={styles.num} title="Team's average scorer time">Avg time</th>
              <th className={styles.num}>Pts</th>
              <th className={styles.num}>Total</th>
              <th>Top 2 odds</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const before = previous?.teams.find((p) => p.teamCode === t.teamCode);
              const move = before ? before.standing - t.standing : 0;
              return (
                <tr key={t.teamCode} className={t.teamCode === focusCode ? styles.highlightRow : ''}>
                  <td>
                    {t.standing}
                    {move > 0 && <span className={styles.up}> ▲{move}</span>}
                    {move < 0 && <span className={styles.down}> ▼{-move}</span>}
                  </td>
                  <td>{teamNames[t.teamCode]}</td>
                  <td className={styles.num}>{t.racePlace ? ordinal(t.racePlace) : <span className={styles.muted}>no team</span>}</td>
                  <td className={styles.num}>{t.avgSeconds ? formatDuration(t.avgSeconds) : '–'}</td>
                  <td className={styles.num}>{t.points ? `+${t.points}` : 0}</td>
                  <td className={styles.num}>{t.total}</td>
                  <td>
                    <ProbBar p={t.pTop2} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className={styles.subhead}>
        {teamNames[focusCode]} at the {shortEventName(race.eventName)}
      </h3>
      <Margins race={race} teamNames={teamNames} />
      {race.focusRunners.length ? (
        <>
          <ol className={styles.runnerList}>
            {race.focusRunners.map((r, i) => (
              <li key={`${r.name}-${i}`} className={r.scored ? styles.scored : ''}>
                {r.name} <span className={styles.muted}>{formatDuration(r.seconds)}</span>
                {r.scored && ' ✓'}
              </li>
            ))}
          </ol>
          <p className={styles.muted}>
            {race.focusRunners.length} finished;{' '}
            {race.focusRunners.some((r) => r.scored)
              ? `✓ the ${race.scorers} who scored`
              : `fewer than ${race.scorers}, so no team score`}
            .
          </p>
        </>
      ) : (
        <p className={styles.muted}>No finishers.</p>
      )}
    </div>
  );
}

// One line on how close the focus team was to the places around it
function Margins({ race, teamNames }: { race: HistoryRace; teamNames: Record<string, string> }) {
  const { ahead, behind, missed } = race.focusMargins;
  if (missed) {
    return (
      <p>
        No full team. Running like it usually did then, it would most likely have placed about{' '}
        {ordinal(Math.round(missed.place))}: roughly {Math.round(missed.points)} points missed.
      </p>
    );
  }
  if (!ahead && !behind) return null;
  const per = (s: number) => (s < 60 ? `${Math.round(s)}s` : formatDuration(s));
  return (
    <p>
      {ahead && (
        <>
          {per(ahead.seconds)} per scorer behind {teamNames[ahead.teamCode] ?? ahead.teamCode} (one place up was worth +
          {ahead.points}).{' '}
        </>
      )}
      {behind && (
        <>
          {per(behind.seconds)} per scorer ahead of {teamNames[behind.teamCode] ?? behind.teamCode}.
        </>
      )}
    </p>
  );
}
