// NYRR club points dashboard - live team standings, focused on Manhattan Track Club

import type { Metadata } from 'next';
import {
  TEAM_CODE,
  displayDivisionName,
  getDivisionDetail,
  getDivisions,
  getLatestYear,
  isOpenDivision,
  type Division,
  type TeamResult,
} from '@/lib/nyrr/standings';
import { readForecast, standingsFromForecast, type DivisionForecast, type LeaderboardRow } from '@/lib/nyrr/forecast';
import { formatPct, ordinal, shortEventName } from '@/lib/nyrr/format';
import DivisionTabs from './DivisionTabs';
import ForecastView from './ForecastView';
import PointsChart from './PointsChart';
import SeasonHistory from './SeasonHistory';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'NYRR Team Standings',
  description: 'NYRR club points standings and a promotion forecast for Manhattan Track Club.',
};

// Rebuild the page from fresh NYRR data at most every hour
export const revalidate = 3600;

export default async function NyrrPage() {
  const forecast = readForecast();
  let year: number;
  let divisions: Division[];
  // If NYRR doesn't answer, fall back to the standings saved with the forecast
  let offline = false;
  try {
    year = await getLatestYear();
    divisions = await getDivisions(year);
  } catch {
    if (!forecast) {
      return (
        <div className={styles.page}>
          <h1>NYRR Team Standings</h1>
          <p className="win98-box-inset">Couldn&apos;t reach the NYRR results site right now. Try again later.</p>
        </div>
      );
    }
    offline = true;
    year = forecast.year;
    divisions = standingsFromForecast(forecast);
  }

  const teamDivisions = await Promise.all(
    divisions
      .filter((d) => isOpenDivision(d.divisionCode) && d.teamResults.some((t) => t.teamCode === TEAM_CODE))
      .map(async (division) => {
        const team = division.teamResults.find((t) => t.teamCode === TEAM_CODE)!;
        const detail = offline
          ? division.teamResults
          : await getDivisionDetail(division.divisionCode, year).catch(() => [] as TeamResult[]);
        return { division, team, detail };
      })
  );

  const teamName = teamDivisions[0]?.team.teamName ?? 'Manhattan Track Club';
  const genderLabel: Record<string, string> = { M: 'Men', W: 'Women', X: 'Nonbinary' };

  const tabs = teamDivisions.map(({ division, team, detail }) => {
    const divisionForecast = forecast?.year === year
      ? forecast.divisions.find((d) => d.divisionCode === division.divisionCode)
      : undefined;
    const liveRacesDone = (detail[0]?.eventDetails ?? []).filter(
      (e) => e.isClubPointsPublished && detail.some((t) => t.eventDetails?.find((x) => x.eventCode === e.eventCode)?.points)
    ).length;
    const stale = divisionForecast && liveRacesDone > divisionForecast.racesDone;

    return {
      id: (genderLabel[division.divisionGender] ?? division.divisionCode).toLowerCase(),
      label: `${genderLabel[division.divisionGender] ?? ''} · ${displayDivisionName(division.divisionName)}`,
      content: (
        <>
          {stale && (
            <p className={`${styles.callout} win98-box-inset`}>
              New results are out since this forecast was made. It updates on the next site deploy.
            </p>
          )}
          {divisionForecast ? (
            <ForecastView division={divisionForecast} focusCode={TEAM_CODE} />
          ) : (
            <p className="win98-box-inset">
              {ordinal(team.teamPlace)} place with {team.totalPoints} pts. No forecast for this division yet.
            </p>
          )}
          {detail.length > 0 && (
            <RaceByRace division={division} detail={detail} team={team} forecast={divisionForecast} />
          )}
        </>
      ),
    };
  });

  return (
    <div className={styles.page}>
      <div className={styles.titleBlock}>
        <p className={styles.kicker}>{year} NYRR Club Points</p>
        <h1>NYRR Team Standings</h1>
        <p>
          Can {teamName} finish top 2 and move up a division? Standings come live from NYRR; the forecast
          simulates the rest of the season {forecast ? forecast.sims.toLocaleString() : ''} times.
        </p>
      </div>

      {offline && forecast && (
        <p className={`${styles.callout} win98-box-inset`}>
          NYRR&apos;s results site didn&apos;t respond, so these standings are as of{' '}
          {new Date(forecast.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}
          , when the forecast was built. The page tries again within the hour.
        </p>
      )}

      {teamDivisions.length === 0 && (
        <p className="win98-box-inset">{teamName} isn&apos;t in any {year} division standings yet.</p>
      )}

      {tabs.length > 0 && <DivisionTabs tabs={tabs} />}
      <section className={styles.section}>
        <h2>All divisions</h2>
        {divisions.map((division) => (
          <details key={division.divisionCode} className={`${styles.division} win98-box`}>
            <summary>
              {displayDivisionName(division.divisionName)}
              <span className={styles.muted}> &mdash; leader: {division.teamResults[0]?.teamName}</span>
            </summary>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Place</th>
                  <th>Team</th>
                  <th className={styles.num}>Points</th>
                  <th className={styles.num}>Back</th>
                </tr>
              </thead>
              <tbody>
                {division.teamResults.map((t) => (
                  <tr key={t.teamCode} className={t.teamCode === TEAM_CODE ? styles.highlightRow : ''}>
                    <td>{t.teamPlace}</td>
                    <td>{t.teamName}</td>
                    <td className={styles.num}>{t.totalPoints}</td>
                    <td className={styles.num}>
                      {division.teamResults[0].totalPoints - t.totalPoints || '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </section>

      {forecast && <Method generatedAt={forecast.generatedAt} />}

      <p className={styles.muted}>
        Source: <a href="https://results.nyrr.org/teams">results.nyrr.org</a>.
      </p>
    </div>
  );
}

function RaceByRace({
  division,
  detail,
  team,
  forecast,
}: {
  division: Division;
  detail: TeamResult[];
  team: TeamResult;
  forecast?: DivisionForecast;
}) {
  const history = forecast?.history;
  const todayTop2 = forecast?.teams.find((t) => t.teamCode === TEAM_CODE)?.pTop2;
  const byCounted = [...(forecast?.teams ?? [])].sort((a, b) => b.counted - a.counted);
  const focusCounted = byCounted.find((t) => t.teamCode === TEAM_CODE)?.counted;
  const gapToSecond = focusCounted !== undefined && byCounted[1] ? byCounted[1].counted - focusCounted : undefined;
  const leaderboard = forecast?.leaderboard ?? [];
  const top = detail.slice(0, 5);
  const chartTeams = top.some((t) => t.teamCode === TEAM_CODE)
    ? top
    : [...top.slice(0, 4), detail.find((t) => t.teamCode === TEAM_CODE) ?? team];
  return (
    <section className={styles.section}>
      <h2>{displayDivisionName(division.divisionName)}: season so far</h2>
      <PointsChart teams={chartTeams} highlightCode={TEAM_CODE} />
      {!!history?.length && (
        <>
          <h3 className={styles.subhead}>Chance of a top 2 finish after each race</h3>
          <p className={styles.muted}>
            What the forecast would have said right after each race, using only results up to then. Early in
            the season the odds lean on last season&apos;s results, so a team that was strong last year can look
            likely to move up before it has scored much. These replays leave out sign-up lists, so the last
            point can differ from today&apos;s forecast above
            {todayTop2 !== undefined && <> (which has {team.teamName} at {formatPct(todayTop2)} for a top 2 finish)</>}
            . Click a race to see the standings at that point.
          </p>
          <SeasonHistory
            history={history}
            teamNames={Object.fromEntries(detail.map((t) => [t.teamCode, t.teamName]))}
            focusCode={TEAM_CODE}
            gapToSecond={gapToSecond}
          />
        </>
      )}
      {leaderboard.length > 0 && (
        <>
          <h3 className={styles.subhead}>{team.teamName} season leaderboard</h3>
          <p className={styles.muted}>
            Times scored counts races where the runner was one of the team&apos;s scorers. Age grade adjusts a time
            for age and sex (100% is world-record level).
          </p>
          <Leaderboard rows={leaderboard.slice(0, 12)} />
          {leaderboard.length > 12 && (
            <details className={styles.moreRunners}>
              <summary>Show {leaderboard.length - 12} more</summary>
              <Leaderboard rows={leaderboard.slice(12)} />
            </details>
          )}
        </>
      )}
    </section>
  );
}

function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Runner</th>
            <th className={styles.num}>Races</th>
            <th className={styles.num}>Times scored</th>
            <th>Best age grade</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.name}-${i}`}>
              <td>{r.name}</td>
              <td className={styles.num}>{r.races}</td>
              <td className={styles.num}>{r.scored}</td>
              <td>
                {r.bestAgeGrade ? (
                  <>
                    {r.bestAgeGrade.percent.toFixed(1)}%{' '}
                    <span className={styles.muted}>{shortEventName(r.bestAgeGrade.eventName)}</span>
                  </>
                ) : (
                  '–'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Method({ generatedAt }: { generatedAt: string }) {
  return (
    <details className={`${styles.division} win98-box`}>
      <summary>How the forecast works</summary>
      <div className={styles.method}>
        <p>
          <strong>Team strength.</strong> For every race this season and last, each team&apos;s score is its
          scorers&apos; average time. A model splits that into how strong the team is and how fast the race was
          (course, weather, distance), so teams are only compared to each other. Recent races and races closer
          in distance to the one being predicted count more, so last season matters early on and fades out. At
          the marathon, teams finish closer together than their other races suggest (strong teams&apos; fastest
          runners often skip it). In B divisions only about a third of the gap between teams carries over; in A
          divisions about three quarters. Predicted times also
          allow for each course: the 5th Ave Mile and Brooklyn Half run fast, the Harlem 5K and Ted Corbitt
          15K slow.
        </p>
        <p>
          <strong>Showing up.</strong> Many teams don&apos;t field a full team at every race. The chance a team
          does is based on how often it has this season, plus whether it did at the same race the last two
          years. For the Ted Corbitt 15K, a quarter of it also comes from the team&apos;s own runners: how many
          club races each has run this year and whether they ran it last year (runners with 8+ races show up
          over half the time; one-race runners about 4%). For the marathon that runner-level signal made
          predictions worse when tested, because so many people run it regardless and about a third of team
          scorers hadn&apos;t run another club race that year, so it uses team history only.
        </p>
        <p>
          <strong>Known lineups.</strong> When Manhattan Track Club&apos;s sign-up list for a race is available,
          its team is simulated runner by runner instead: each signed-up runner has an 85% chance of finishing,
          other runners keep a quarter of their usual chance. For a list of people asked to race, they get at
          least 50% and everyone else keeps their usual chance. Each time is drawn from how much real club
          runners&apos; results varied around their projections in 2023&ndash;2025. Tested on past team
          marathons, this landed within about 1% of the real team score on average.
        </p>
        <p>
          <strong>The last race.</strong> In the 2022&ndash;2025 seasons, teams whose title or top-2 place was
          still open ran the final race about 3.5% faster than their season form predicted (21 teams), most
          likely because they send their best lineup. Everyone else ran as predicted. So in the last race, teams
          in that position are made 2.5% faster. A team simulated from its sign-up list is left alone, because
          the list already says who is running. It is a small sample, and it moves the odds a lot when one
          team has a list and its rivals don&apos;t.
        </p>
        <p>
          <strong>Simulating.</strong> Each simulation decides who shows up, draws each team&apos;s time from its
          strength plus race-day randomness, scores the race (15, 12, 10, 8, 6, 5, 4, 3, 2, 1, then 1 for any
          other full team), and adds up the final standings the way the year-end ranking does: each
          team&apos;s two lowest race scores are dropped. Teams that end level on points share a place in
          NYRR&apos;s standings, so the chance of that is shown on its own; where one number is needed, a tie
          counts as half.
        </p>
        <p>
          <strong>Checked against history.</strong> Replayed race by race through the 2022–2025 A and B
          division seasons, it beat &ldquo;whoever is top 2 now&rdquo; at every point, by about half early in
          the season (Brier score 0.069 vs 0.142 with 9+ races left; 0.019 vs 0.029 with 1&ndash;2 left). Its
          50/50 calls came true about half the time, and every real B-division marathon winning time fell
          inside its likely range. The race-day randomness, recency weighting and time estimates were tuned
          on those seasons.
        </p>
        <p className={styles.muted}>
          Forecast generated{' '}
          {new Date(generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' })}{' '}
          ET. Probabilities shown as {formatPct(0.004)} are possible but very unlikely.
        </p>
      </div>
    </details>
  );
}
