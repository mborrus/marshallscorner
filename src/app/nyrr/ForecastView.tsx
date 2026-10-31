// Promotion forecast for one division: who's in the race, what the focus team
// needs at the next race, and its fastest runners

import { Fragment } from 'react';
import type { DivisionForecast } from '@/lib/nyrr/forecast';
import { pointsForPlace } from '@/lib/nyrr/model';
import { formatDay, formatDuration, formatPct, ordinal, shortEventName } from '@/lib/nyrr/format';
import ProbBar from './ProbBar';
import RangeChart from './RangeChart';
import styles from './page.module.css';

const PROMOTED = 2;

interface Props {
  division: DivisionForecast;
  focusCode: string;
}

export default function ForecastView({ division, focusCode }: Props) {
  const teams = [...division.teams].sort((a, b) => b.points - a.points);
  const focus = teams.find((t) => t.teamCode === focusCode);
  if (!focus) return null;
  const next = division.remainingRaces[0];
  const nextLineup = next && division.lineups[next.eventCode];
  const second = teams[PROMOTED - 1];
  const third = teams[PROMOTED];
  const focusName = focus.teamName;

  // Teams with a real shot, plus everyone at or above the focus team
  const contenders = teams.filter((t) => t.pTop2 >= 0.001 || t.place <= Math.max(PROMOTED + 2, focus.place + 1));

  const inPromotion = focus.place <= PROMOTED;
  const gapToLine = inPromotion ? focus.points - (third?.points ?? 0) : second.points - focus.points;

  // Places down to the last one that still gives a real (1%+) promotion chance
  const lastUseful = Math.max(
    3,
    ...division.needs.filter((n) => n.place !== null && (n.pTop2Given ?? 0) >= 0.01).map((n) => n.place!)
  );
  const needs = division.needs.filter((n) => n.place === null || n.place <= lastUseful);
  const placeNeeded = division.needs.find((n) => n.place !== null && (n.pTop2Given ?? 0) >= 0.5);
  const winRow = division.needs.find((n) => n.place === 1);

  if (!next) {
    return (
      <p className="win98-box-inset">
        The {division.divisionName} season is over. {focusName} finished {ordinal(focus.place)}.
      </p>
    );
  }

  return (
    <div className={styles.forecast}>
      <div className={styles.cards}>
        <div className={`${styles.card} win98-box`}>
          <p className={styles.cardLabel}>Promotion chance</p>
          <p className={styles.bigNumber}>{formatPct(focus.pTop2)}</p>
          <p className={styles.muted}>Top {PROMOTED} move up a division</p>
        </div>
        <div className={`${styles.card} win98-box`}>
          <p className={styles.cardLabel}>{inPromotion ? 'Cushion' : 'Gap to 2nd'}</p>
          <p className={styles.bigNumber}>
            {gapToLine} <span className={styles.unit}>pts</span>
          </p>
          <p className={styles.muted}>
            {ordinal(focus.place)} with {focus.points} &middot;{' '}
            {inPromotion ? `ahead of ${third?.teamName}` : `behind ${second.teamName}`}
          </p>
        </div>
        <div className={`${styles.card} win98-box`}>
          <p className={styles.cardLabel}>Win the division</p>
          <p className={styles.bigNumber}>{formatPct(focus.pFirst)}</p>
          <p className={styles.muted}>
            {teams[0].teamCode === focusCode
              ? 'Currently leading'
              : `${teams[0].points - focus.points} pts behind ${teams[0].teamName}`}
          </p>
        </div>
      </div>

      <PlaceOdds distribution={focus.placeDistribution} />

      <p className={`${styles.callout} win98-box-inset`}>
        <strong>{division.remainingRaces.length === 1 ? 'One race left' : `${division.remainingRaces.length} races left`}:</strong>{' '}
        {division.remainingRaces
          .map((r) => `${shortEventName(r.eventName)} (${formatDay(r.date)}, top ${r.scorers} score)`)
          .join(' and ')}
        .{' '}
        {placeNeeded ? (
          <>
            The clearest path: <strong>{placeNeeded.place === 1 ? 'win' : `finish ${ordinal(placeNeeded.place!)} or better at`}</strong> the{' '}
            {shortEventName(next.eventName)}, which means the top {next.scorers} averaging about{' '}
            <strong>{formatDuration(placeNeeded.cutoffAvgSeconds ?? 0)}</strong>. That gives a{' '}
            {formatPct(placeNeeded.pTop2Given ?? 0)} promotion chance.
          </>
        ) : (
          <>
            Even winning the {shortEventName(next.eventName)} (top {next.scorers} averaging about{' '}
            {winRow?.cutoffAvgSeconds ? formatDuration(winRow.cutoffAvgSeconds) : '?'}) only gives a{' '}
            {formatPct(winRow?.pTop2Given ?? 0)} promotion chance. {focusName} also needs teams ahead to have bad days.
          </>
        )}
      </p>

      {nextLineup && (
        <p className={styles.muted}>
          {focusName}&apos;s {shortEventName(next.eventName)} numbers use its{' '}
          {nextLineup.kind === 'asked' ? 'list of runners asked to race' : 'sign-up list'} ({nextLineup.signedUp}{' '}
          runners in this division matched to results
          {nextLineup.unmatched > 0 && `; ${nextLineup.unmatched} names on the full list had no results and aren't counted`}
          ). Other teams use their history.
        </p>
      )}

      <section className={styles.section}>
        <h2>Who&apos;s in the hunt</h2>
        <p className={styles.muted}>
          &ldquo;Shows up&rdquo; is the chance of a full team at the {shortEventName(next.eventName)}; &ldquo;Pred.
          avg&rdquo; is the expected average time of its top {next.scorers} there.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th className={styles.num}>Pts</th>
                <th className={styles.num}>vs 2nd</th>
                <th className={styles.num} title={`Chance of fielding a full team at the ${shortEventName(next.eventName)}`}>Shows up</th>
                <th className={styles.num} title={`Predicted average time of the top ${next.scorers} scorers`}>Pred. avg</th>
                <th className={styles.num} title="Average projected final points (likely range)">Final pts</th>
                <th>Top 2</th>
                <th>1st</th>
              </tr>
            </thead>
            <tbody>
              {contenders.map((t) => {
                const r = t.races[next.eventCode];
                const vs = t.points - second.points;
                return (
                  <tr key={t.teamCode} className={t.teamCode === focusCode ? styles.highlightRow : ''}>
                    <td>{t.place}</td>
                    <td>{t.teamName}</td>
                    <td className={styles.num}>{t.points}</td>
                    <td className={styles.num}>{t.place === PROMOTED ? '–' : vs > 0 ? `+${vs}` : vs}</td>
                    <td className={styles.num}>{formatPct(r.pField)}</td>
                    <td className={styles.num}>{Number.isFinite(r.medianAvgSeconds) ? formatDuration(r.medianAvgSeconds) : '–'}</td>
                    <td className={styles.num}>
                      {Math.round(t.meanPoints)}{' '}
                      <span className={styles.muted}>
                        ({Math.round(t.p10Points)}–{Math.round(t.p90Points)})
                      </span>
                    </td>
                    <td><ProbBar p={t.pTop2} /></td>
                    <td><ProbBar p={t.pFirst} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <RangeChart teams={contenders} highlightCode={focusCode} />
      </section>

      <section className={styles.section}>
        <h2>What {focusName} needs at the {shortEventName(next.eventName)}</h2>
        <p>
          Each row is a finishing place among the division&apos;s teams. The time is what {focusName}&apos;s top{' '}
          {next.scorers} would need to average to beat the team that usually lands one spot behind (median over
          the simulations).
          {division.remainingRaces.length > 1 &&
            ` Promotion odds still include the ${division.remainingRaces.slice(1).map((r) => shortEventName(r.eventName)).join(' and ')}.`}
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Place</th>
                <th className={styles.num}>Pts</th>
                <th className={styles.num}>Avg time needed</th>
                <th className={styles.num}>Chance of this</th>
                <th>Promoted if so</th>
              </tr>
            </thead>
            <tbody>
              {needs.map((n) => (
                <tr key={n.place ?? 'none'}>
                  <td>{n.place ? ordinal(n.place) : 'No full team'}</td>
                  <td className={styles.num}>{n.place ? pointsForPlace(n.place - 1, next.multiplier) : 0}</td>
                  <td className={styles.num}>
                    {n.place && n.cutoffAvgSeconds ? `under ${formatDuration(n.cutoffAvgSeconds)}` : '–'}
                  </td>
                  <td className={styles.num}>{formatPct(n.pPlace)}</td>
                  <td>{n.pTop2Given !== null && n.samples >= 200 ? <ProbBar p={n.pTop2Given} /> : <span className={styles.muted}>too rare to say</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {division.remainingRaces.length >= 2 && (
        <ScenarioGrid division={division} focusName={focusName} />
      )}

      {division.runners.length > 0 && (
        <section className={styles.section}>
          <h2>{focusName} runners</h2>
          <p className={styles.muted}>
            {division.rosterSize} runners have raced a club points race for {focusName} this year. Times scale each
            runner&apos;s two best results to the new distance, allowing for how much club runners usually slow
            down; runners with only much shorter club races are projected from their other NYRR races in the past
            13 months. &ldquo;Chance&rdquo; is how often runners with the same number of races, and who did or
            didn&apos;t run it last year, showed up in 2023&ndash;2025. About a third of marathon scorers
            hadn&apos;t run a club race that year, so this list can&apos;t show everyone who might score.
            {Object.entries(division.lineups).map(([code, l]) => (
              <Fragment key={code}>
                {' '}
                {shortEventName(division.remainingRaces.find((r) => r.eventCode === code)?.eventName ?? '')}
                {l.kind === 'signed-up'
                  ? ` sign-up list (${formatDay(l.updated)}): ${l.signedUp} signed up, each 85% to finish; everyone else keeps a quarter of their usual chance.`
                  : ` invites (${formatDay(l.updated)}): ${l.signedUp} asked, each at least 50% (a guess, not checked against history); everyone else keeps their usual chance.`}
              </Fragment>
            ))}
            {Object.keys(division.lineups).length > 0 &&
              ' Those lists feed the team odds; this table shows each runner\'s usual chance and not who is on them.'}
          </p>
          <RunnerTable division={division} rows={division.runners.slice(0, 15)} />
          {division.runners.length > 15 && (
            <details className={styles.moreRunners}>
              <summary>Show {division.runners.length - 15} more</summary>
              <RunnerTable division={division} rows={division.runners.slice(15)} />
            </details>
          )}
          <p className={styles.muted}>* ran it for the team last year</p>
        </section>
      )}
    </div>
  );
}

// Promotion chance for each combination of places at the next two races
function ScenarioGrid({ division, focusName }: { division: DivisionForecast; focusName: string }) {
  const [first, second] = division.remainingRaces;
  const cells = division.scenarios;
  // The likelier places at each race (top 6 at most), plus no full team
  const places = (key: 'first' | 'second') => {
    const odds = new Map<number | null, number>();
    for (const c of cells) odds.set(c[key], (odds.get(c[key]) ?? 0) + c.p);
    return [...odds]
      .filter(([place, p]) => (p >= 0.03 || (place !== null && place <= 2)) && (place === null || place <= 6))
      .map(([place]) => place)
      .sort((a, b) => (a ?? 99) - (b ?? 99));
  };
  const rows = places('first');
  const cols = places('second');
  const label = (place: number | null) => (place ? ordinal(place) : 'No team');

  return (
    <section className={styles.section}>
      <h2>Both races: promotion chance by finish</h2>
      <p className={styles.muted}>
        Rows are {focusName}&apos;s place at the {shortEventName(first.eventName)}, columns at the{' '}
        {shortEventName(second.eventName)}. Each cell is the chance of finishing top {PROMOTED} if that happens.
      </p>
      <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.grid}`}>
          <thead>
            <tr>
              <th aria-label={`${shortEventName(first.eventName)} place by ${shortEventName(second.eventName)} place`}>↓ / →</th>
              {cols.map((c) => (
                <th key={String(c)} className={styles.num}>
                  {label(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r)}>
                <th>{label(r)}</th>
                {cols.map((c) => {
                  const cell = cells.find((x) => x.first === r && x.second === c);
                  const known = cell && cell.samples >= 100;
                  return (
                    <td
                      key={String(c)}
                      className={styles.num}
                      style={known ? { background: `rgba(46, 139, 87, ${0.08 + 0.5 * cell.pTop2})` } : undefined}
                      title={cell ? `Happens in ${formatPct(cell.p)} of simulations` : undefined}
                    >
                      {known ? formatPct(cell.pTop2) : '·'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Chance of each final place, for places with at least a 1% chance
function PlaceOdds({ distribution }: { distribution: number[] }) {
  const shown = distribution.map((p, i) => ({ place: i + 1, p })).filter((x) => x.p >= 0.01);
  return (
    <div className={styles.placeOdds} aria-label="Chance of each final place">
      <span className={styles.muted}>Final place:</span>
      {shown.map(({ place, p }) => (
        <span key={place} className={styles.placeOdd}>
          <span className={place <= PROMOTED ? styles.promoted : undefined}>{ordinal(place)}</span>{' '}
          <ProbBar p={p} />
        </span>
      ))}
    </div>
  );
}

function RunnerTable({ division, rows }: { division: DivisionForecast; rows: DivisionForecast['runners'] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Runner</th>
            <th className={styles.num} title="Club points races run for the team this year">Races</th>
            <th>Best result</th>
            {division.remainingRaces.map((r) => (
              <th key={r.eventCode} className={styles.num} colSpan={2}>
                {shortEventName(r.eventName)}
              </th>
            ))}
          </tr>
          <tr>
            <th colSpan={3} />
            {division.remainingRaces.map((r) => (
              <Fragment key={r.eventCode}>
                <th className={styles.num}>Time</th>
                <th className={styles.num}>Chance</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.name}-${i}`}>
              <td>{r.name}</td>
              <td className={styles.num}>{r.racesRun}</td>
              <td>
                {formatDuration(r.best.seconds)} <span className={styles.muted}>{shortEventName(r.best.eventName)}</span>
              </td>
              {division.remainingRaces.map((race) => (
                <Fragment key={race.eventCode}>
                  <td className={styles.num}>{formatDuration(r.projected[race.eventCode])}</td>
                  <td className={styles.num}>
                    {formatPct(r.chance[race.eventCode])}
                    {r.ranLastYear[race.eventCode] && <span className={styles.muted}>*</span>}
                  </td>
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
