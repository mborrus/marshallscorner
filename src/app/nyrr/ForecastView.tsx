// Forecast for one division: headline odds, a step-by-step walkthrough of the
// next race, a two-race grid when two races are left, and the focus team's runners

import { Fragment } from 'react';
import { goalLine, type DivisionForecast } from '@/lib/nyrr/forecast';
import { formatDay, formatDuration, formatPct, ordinal, shortEventName } from '@/lib/nyrr/format';
import { RuleSummary } from './OutcomeRules';
import ProbBar from './ProbBar';
import RaceWalkthrough from './RaceWalkthrough';
import styles from './page.module.css';

interface Props {
  division: DivisionForecast;
  focusCode: string;
  // How many teams move up this year
  spots: number;
}

export default function ForecastView({ division, focusCode, spots }: Props) {
  // Ranked by the points that count at year end (lowest race scores dropped)
  const teams = [...division.teams].sort((a, b) => b.counted - a.counted || b.points - a.points);
  const rank = (t: (typeof teams)[number]) => 1 + teams.filter((o) => o.counted > t.counted).length;
  const focus = teams.find((t) => t.teamCode === focusCode);
  if (!focus) return null;
  const totalRaces = division.racesDone + division.remainingRaces.length;
  const countsNote =
    division.droppedRaces > 0
      ? `Points count each team's best ${totalRaces - division.droppedRaces} of ${totalRaces} races: the year-end ranking drops the ${division.droppedRaces} lowest scores (missed races are 0), so these totals already leave out each team's ${division.droppedRaces} worst so far. NYRR's running totals, in brackets, add every race. A team's final total is about this plus what it scores in the ${division.remainingRaces.length === 1 ? 'last race' : 'races left'}; if that score is worse than ones already dropped, it gets dropped instead, so no team can finish below its total with only its single worst race left out.`
      : null;
  const next = division.remainingRaces[0];
  const nextLineup = next && division.lineups[next.eventCode];
  // The last team in a promotion place, and the first one outside
  const lastUp = teams[spots - 1];
  const firstOut = teams[spots];
  const focusName = focus.teamName;

  // Teams with a real shot, plus everyone at or above the focus team
  const contenders = teams.filter((t) => t.pTop2 >= 0.001 || rank(t) <= Math.max(4, rank(focus) + 1));

  const inPromotion = rank(focus) <= spots;
  const gapToLine = inPromotion ? focus.counted - (firstOut?.counted ?? 0) : lastUp.counted - focus.counted;

  // The place still being raced for (1st or 2nd), and whether it is the one that brings promotion
  const line = goalLine(focus, spots);
  const promotes = line === spots;
  const goalName = promotes ? 'promotion' : line === 1 ? 'title' : 'top 2';
  const chanceLabel = promotes ? 'promotion chance' : line === 1 ? 'chance of winning the division' : 'chance of a top 2 finish';
  const given = (n: { pTop2Given: number | null; pFirstGiven: number | null }) =>
    line === 1 ? n.pFirstGiven : n.pTop2Given;
  const placeNeeded = division.needs.find((n) => n.place !== null && (given(n) ?? 0) >= 0.5);
  const winRow = division.needs.find((n) => n.place === 1);
  const names = (teamCode: string) => teams.find((t) => t.teamCode === teamCode)?.teamName ?? teamCode;

  // A tie on points across the line is its own outcome, shown apart from finishing clear once it matters
  const top2 = headline(focus.pTop2, focus.pTop2Outright, focus.pTop2Tied);
  const title = headline(focus.pFirst, focus.pFirstOutright, focus.pFirstTied);
  const promotion = spots === 1 ? title : top2;
  const main = line === 1 ? title : top2;
  const plain = division.withoutLineup;
  const plainMain = plain && (line === 1 ? (title.tied ? plain.pFirstOutright : plain.pFirst) : top2.tied ? plain.pTop2Outright : plain.pTop2);
  const leader = teams.reduce((a, b) => (b.pFirst > a.pFirst ? b : a));
  const runnerUp = teams[1];

  if (!next) {
    return (
      <p className="win98-box-inset">
        The {division.divisionName} season is over. {focusName} finished {ordinal(rank(focus))}.
      </p>
    );
  }

  return (
    <div className={styles.forecast}>
      <div className={styles.cards}>
        <div className={`${styles.card} win98-box`}>
          <p className={styles.cardLabel}>Promotion chance</p>
          <p className={styles.bigNumber}>{formatPct(promotion.p)}</p>
          <p className={styles.muted}>
            {promotion.tied > 0 && <>Plus {formatPct(promotion.tied)} level on points for {ordinal(spots)}. </>}
            {spots === 1 ? 'Only the division winner moves up this year' : `Top ${spots} move up a division`}
          </p>
        </div>
        <div className={`${styles.card} win98-box`}>
          <p className={styles.cardLabel}>{inPromotion ? 'Cushion' : `Gap to ${ordinal(spots)}`}</p>
          <p className={styles.bigNumber}>
            {gapToLine} <span className={styles.unit}>{gapToLine === 1 ? 'pt' : 'pts'}</span>
          </p>
          <p className={styles.muted}>
            {ordinal(rank(focus))} with {focus.counted} &middot;{' '}
            {inPromotion ? `ahead of ${firstOut?.teamName}` : `behind ${lastUp.teamName}`}
          </p>
        </div>
        {spots === 1 ? (
          <div className={`${styles.card} win98-box`}>
            <p className={styles.cardLabel}>Finish in the top 2</p>
            <p className={styles.bigNumber}>{formatPct(top2.p)}</p>
            <p className={styles.muted}>
              {top2.tied > 0 && <>Plus {formatPct(top2.tied)} level on points for 2nd. </>}
              {rank(focus) <= 2
                ? `${focus.counted - (teams[2]?.counted ?? 0)} pts ahead of ${teams[2]?.teamName}`
                : `${runnerUp.counted - focus.counted} ${runnerUp.counted - focus.counted === 1 ? 'pt' : 'pts'} behind ${runnerUp.teamName}`}
            </p>
          </div>
        ) : (
          <div className={`${styles.card} win98-box`}>
            <p className={styles.cardLabel}>Win the division</p>
            <p className={styles.bigNumber}>{formatPct(title.p)}</p>
            <p className={styles.muted}>
              {title.tied > 0 && <>Outright. Plus {formatPct(title.tied)} level on points, a shared 1st. </>}
              {teams[0].teamCode === focusCode
                ? 'Currently leading'
                : `${teams[0].counted - focus.counted} pts behind ${teams[0].teamName}`}
            </p>
          </div>
        )}
      </div>
      {countsNote && <p className={styles.muted}>{countsNote}</p>}

      <PlaceOdds distribution={focus.placeDistribution} spots={spots} tiesSplit={top2.tied > 0 || title.tied > 0} />

      <p className={`${styles.callout} win98-box-inset`}>
        <strong>{division.remainingRaces.length === 1 ? 'One race left' : `${division.remainingRaces.length} races left`}:</strong>{' '}
        {division.remainingRaces
          .map((r) => `${shortEventName(r.eventName)} (${formatDay(r.date)}, top ${r.scorers} score)`)
          .join(' and ')}
        .{' '}
        {line === 1 && spots > 1 && <>Promotion is locked up; what&apos;s left is the division title. </>}
        {line === 1 && spots === 1 && <>Only the division winner moves up this year. </>}
        {line === 2 && spots === 1 && (
          <>
            Only the division winner moves up this year, and {leader.teamName.replace(/\.$/, '')} can&apos;t be caught, so promotion is
            out of reach. What&apos;s left is 2nd place.{' '}
          </>
        )}
        {division.rules ? (
          <>
            <RuleSummary
              rules={division.rules}
              spots={spots}
              focusName={focusName}
              raceName={shortEventName(next.eventName)}
              names={names}
            />{' '}
            The forecast: <strong>{formatPct(main.p)}</strong> to{' '}
            {line === 1 ? (promotes ? 'win the division and move up' : 'win it outright') : promotes ? 'be promoted' : 'finish in the top 2'}
            {main.tied > 0 && <>, {formatPct(main.tied)} to end level on points</>}.
            {winRow?.cutoffAvgSeconds && (
              <>
                {' '}
                Winning the race likely takes the top {next.scorers} averaging about{' '}
                <strong>{formatDuration(winRow.cutoffAvgSeconds)}</strong>.
              </>
            )}
          </>
        ) : placeNeeded ? (
          <>
            The clearest path: <strong>{placeNeeded.place === 1 ? 'win' : `finish ${ordinal(placeNeeded.place!)} or better at`}</strong> the{' '}
            {shortEventName(next.eventName)}, which means the top {next.scorers} averaging about{' '}
            <strong>{formatDuration(placeNeeded.cutoffAvgSeconds ?? 0)}</strong>. That gives a{' '}
            {formatPct(given(placeNeeded) ?? 0)} {chanceLabel}.
          </>
        ) : (
          <>
            Even winning the {shortEventName(next.eventName)} (top {next.scorers} averaging about{' '}
            {winRow?.cutoffAvgSeconds ? formatDuration(winRow.cutoffAvgSeconds) : '?'}) only gives a{' '}
            {formatPct(winRow ? given(winRow) ?? 0 : 0)} {chanceLabel}.{' '}
            {focusName} also needs teams ahead to have bad days.
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
          {plainMain !== null && plainMain !== undefined && Math.abs(plainMain - main.p) >= 0.03 && (
            <>
              {' '}
              <strong>
                Without that list the {goalName} chance would be {formatPct(plainMain)}, not{' '}
                {formatPct(main.p)}
              </strong>
              , so much of this number rests on those runners turning up and running to form.
            </>
          )}
        </p>
      )}

      <RaceWalkthrough
        division={division}
        teams={contenders}
        focusCode={focusCode}
        line={line}
        ifSoLabel={promotes ? 'Promoted if so' : line === 1 ? 'Wins division if so' : 'Top 2 if so'}
      />

      {division.remainingRaces.length >= 2 && (
        <ScenarioGrid division={division} focusName={focusName} spots={spots} />
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
function ScenarioGrid({ division, focusName, spots }: { division: DivisionForecast; focusName: string; spots: number }) {
  const odds = (cell: DivisionForecast['scenarios'][number]) => (spots === 1 ? cell.pFirst : cell.pTop2);
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
        {shortEventName(second.eventName)}. Each cell is the chance of{' '}
        {spots === 1 ? 'winning the division' : `finishing top ${spots}`} if that happens.
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
                      style={known ? { background: `rgba(46, 139, 87, ${0.08 + 0.5 * odds(cell)})` } : undefined}
                      title={cell ? `Happens in ${formatPct(cell.p)} of simulations` : undefined}
                    >
                      {known ? formatPct(odds(cell)) : '·'}
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

// Headline odds: once a tie across the line has a real chance, show the chance of
// finishing clear and the chance of ending level separately
function headline(split: number, outright: number, tied: number): { p: number; tied: number } {
  return tied >= 0.01 ? { p: outright, tied } : { p: split, tied: 0 };
}

// Chance of each final place, for places with at least a 1% chance
function PlaceOdds({ distribution, spots, tiesSplit }: { distribution: number[]; spots: number; tiesSplit: boolean }) {
  const shown = distribution.map((p, i) => ({ place: i + 1, p })).filter((x) => x.p >= 0.01);
  return (
    <div className={styles.placeOdds} aria-label="Chance of each final place">
      <span className={styles.muted}>Final place:</span>
      {shown.map(({ place, p }) => (
        <span key={place} className={styles.placeOdd}>
          <span className={place <= spots ? styles.promoted : undefined}>{ordinal(place)}</span>{' '}
          <ProbBar p={p} />
        </span>
      ))}
      {tiesSplit && <span className={styles.muted}>(teams level on points count half for each place)</span>}
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
