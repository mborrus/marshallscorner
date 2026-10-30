#!/usr/bin/env npx tsx

/**
 * Build script for the NYRR club points forecast
 * Pulls the season from the NYRR results API, fits the model, simulates the
 * remaining races, and writes content/nyrr/generated/forecast.json.
 * If NYRR can't be reached, the last committed forecast is kept.
 */

import fs from 'fs';
import path from 'path';
import {
  collectDivision,
  collectHistory,
  collectPastScores,
  collectRoster,
  getDivisions,
  getRunnerResults,
  getLatestYear,
  mapLimit,
  nameHash,
  raceAttendees,
  raceKey,
  runnerKey,
  clubRaces,
  type DivisionSeason,
  type RosterRunner,
} from '../src/lib/nyrr/collect';
import {
  LINEUP_CHANCE,
  UNLISTED_FACTOR,
  blendTurnout,
  expectedPointsIfFielded,
  isComparable,
  paramsForDivision,
  pointsForPlace,
  prepareSimulation,
  projectRunner,
  runnerAttendance,
  runnerTurnout,
  seasonAsOf,
  simulate,
  type ModelParams,
  type PastScores,
  type RaceHistory,
  type RaceInfo,
  type TeamSeason,
} from '../src/lib/nyrr/model';
import {
  FORECAST_PATH,
  readLineups,
  type DivisionForecast,
  type Forecast,
  type ForecastRunner,
  type HistoryRace,
  type LeaderboardRow,
  type Lineup,
  type LineupKind,
} from '../src/lib/nyrr/forecast';
import { TEAM_CODE } from '../src/lib/nyrr/standings';

const SIMS = 50000;
// Fewer simulations per point for the season-so-far odds; there are many points
const HISTORY_SIMS = 10000;
// Give up and keep the last forecast if NYRR is this slow
const DEADLINE_MS = 5 * 60 * 1000;

type Attendance = Record<string, Record<string, RaceHistory>>;

function shortName(r: { firstName: string; lastName: string }): string {
  return `${r.firstName.trim()} ${r.lastName.trim().charAt(0)}.`;
}

function lineupChance(kind: LineupKind, listed: boolean, usual: number): number {
  if (!listed) return UNLISTED_FACTOR[kind] * usual;
  return kind === 'asked' ? Math.max(LINEUP_CHANCE.asked, usual) : LINEUP_CHANCE[kind];
}

// Standings after each completed race, and the promotion odds the model would
// have given at that point (team history only: no sign-up lists back then)
function buildHistory(
  season: DivisionSeason,
  attendance: Attendance,
  past: PastScores,
  focusRoster: RosterRunner[],
  params: ModelParams
): HistoryRace[] {
  const done = season.races.filter((r) => r.published);
  return done.map((race, n) => {
    const { simTeams, simRaces } = prepareSimulation(season.teams, seasonAsOf(season.races, n + 1), attendance, params, past);
    const focusTeam = season.teams.find((t) => t.teamCode === TEAM_CODE);
    const odds = simulate(simTeams, simRaces, TEAM_CODE, HISTORY_SIMS, 2026 + n).teams;
    const totals = simTeams.map((t) => t.currentPoints);
    const ranked = season.teams
      .filter((t) => t.races[race.eventCode]?.score != null)
      .sort((a, b) => a.races[race.eventCode].score! - b.races[race.eventCode].score!);
    const focusPos = ranked.findIndex((t) => t.teamCode === TEAM_CODE);
    const focusFull = focusPos >= 0;
    const avg = (t: TeamSeason) => Math.exp(t.races[race.eventCode].score!);
    const margin = (other: TeamSeason | undefined, points: number) =>
      other && { teamCode: other.teamCode, seconds: Math.abs(avg(other) - avg(ranked[focusPos])), points };
    const pointsAt = (pos: number) => pointsForPlace(pos, race.multiplier);
    const focusMargins: HistoryRace['focusMargins'] = !focusTeam
      ? {}
      : focusFull
        ? {
            ahead: margin(ranked[focusPos - 1], pointsAt(focusPos - 1) - pointsAt(focusPos)),
            behind: margin(ranked[focusPos + 1], pointsAt(focusPos) - pointsAt(focusPos + 1)),
          }
        : {
            missed: (() => {
              const expected = expectedPointsIfFielded(season.teams, seasonAsOf(season.races, n), race, TEAM_CODE, params, past);
              return { points: expected.points - (focusTeam.races[race.eventCode]?.points ?? 0), place: expected.place };
            })(),
          };
    const atRace = focusRoster
      .flatMap((r) => r.results.filter((x) => x.eventCode === race.eventCode).map((x) => ({ r, seconds: x.seconds })))
      .sort((a, b) => a.seconds - b.seconds);

    return {
      eventCode: race.eventCode,
      eventName: race.eventName,
      date: race.date,
      scorers: race.scorers,
      multiplier: race.multiplier,
      teams: season.teams.map((t, i) => {
        const score = t.races[race.eventCode]?.score ?? null;
        return {
          teamCode: t.teamCode,
          racePlace: score === null ? null : ranked.indexOf(t) + 1,
          avgSeconds: score === null ? null : Math.exp(score),
          points: t.races[race.eventCode]?.points ?? 0,
          total: totals[i],
          standing: totals.filter((x) => x > totals[i]).length + 1,
          pTop2: odds[i].pTop2,
          pFirst: odds[i].pFirst,
        };
      }),
      focusRunners: atRace.map(({ r, seconds }, i) => ({
        name: shortName(r),
        seconds,
        scored: focusFull && i < race.scorers,
      })),
      focusMargins,
    };
  });
}

// Each focus team runner's season: races run, times among the team's scorers, best age grade
function buildLeaderboard(season: DivisionSeason, roster: RosterRunner[]): LeaderboardRow[] {
  const focusTeam = season.teams.find((t) => t.teamCode === TEAM_CODE);
  const scored = new Map<string, number>();
  for (const race of season.races.filter((r) => r.published)) {
    if (focusTeam?.races[race.eventCode]?.score == null) continue;
    roster
      .flatMap((r) => r.results.filter((x) => x.eventCode === race.eventCode).map((x) => ({ key: runnerKey(r), seconds: x.seconds })))
      .sort((a, b) => a.seconds - b.seconds)
      .slice(0, race.scorers)
      .forEach(({ key }) => scored.set(key, (scored.get(key) ?? 0) + 1));
  }
  return roster
    .map((r) => {
      const graded = r.results.filter((x) => x.ageGrade != null);
      const best = graded.reduce<(typeof graded)[number] | null>((a, b) => (!a || b.ageGrade! > a.ageGrade! ? b : a), null);
      return {
        name: shortName(r),
        races: r.results.length,
        scored: scored.get(runnerKey(r)) ?? 0,
        bestAgeGrade: best ? { percent: best.ageGrade!, eventName: best.eventName } : null,
      };
    })
    .sort((a, b) => b.scored - a.scored || b.races - a.races || (b.bestAgeGrade?.percent ?? 0) - (a.bestAgeGrade?.percent ?? 0));
}

async function buildDivision(
  year: number,
  divisionCode: string,
  divisionName: string,
  gender: string
): Promise<DivisionForecast> {
  const season = await collectDivision(year, divisionCode, gender);
  const codes = season.teams.map((t) => t.teamCode);
  const focusIdx = codes.indexOf(TEAM_CODE);
  const done = season.races.filter((r) => r.published);

  // Each race in the two previous seasons: who fielded a full team, and how many scored
  const attendance: Attendance = {};
  const lastYearEvent: Record<string, string | null> = {};
  for (const race of season.races) {
    const found = await collectHistory(race, codes, gender, [year - 1, year - 2]);
    attendance[race.eventCode] = found.history;
    lastYearEvent[race.eventCode] = found.lastEventCode;
    race.scorers ||= found.scorers;
  }
  for (const race of season.races.filter((r) => !r.scorers)) {
    console.warn(`⚠ ${race.eventName}: scorer count unknown, assuming 5`);
    race.scorers = 5;
  }
  const past = await collectPastScores(year, codes, gender);
  const rosters = await mapLimit(codes, 2, (t) => collectRoster(t, gender, done));

  const params = paramsForDivision(divisionCode);
  const { simTeams, simRaces } = prepareSimulation(season.teams, season.races, attendance, params, past);
  const remaining = simRaces.map((r) => r.race);
  for (const [i, t] of season.teams.entries()) {
    if (simTeams[i].currentPoints !== t.totalPoints) {
      console.warn(`⚠ ${t.teamCode}: race points add to ${simTeams[i].currentPoints}, NYRR total is ${t.totalPoints}`);
      simTeams[i].currentPoints = t.totalPoints;
    }
  }

  // Who ran each remaining race for their team last year
  const ranLastYear: Record<string, Set<string>[]> = {};
  for (const race of remaining) {
    const code = lastYearEvent[race.eventCode];
    ranLastYear[race.eventCode] = code
      ? await mapLimit(codes, 4, (t) => raceAttendees(code, t, gender))
      : codes.map(() => new Set<string>());
  }
  const usualChance = (race: RaceInfo, teamIdx: number, r: RosterRunner, racesRun = r.results.length) =>
    runnerAttendance(race, racesRun, ranLastYear[race.eventCode][teamIdx].has(runnerKey(r)));

  // Runner-level turnout odds feed into each team's chance of a full team
  for (const race of remaining) {
    season.teams.forEach((_, i) => {
      const fieldProb = simTeams[i].fieldProb;
      fieldProb[race.eventCode] = blendTurnout(
        race,
        fieldProb[race.eventCode],
        runnerTurnout(race, rosters[i].map((r) => usualChance(race, i, r)))
      );
    });
  }

  // Focus team runners: this year's roster, plus anyone on a sign-up list who last
  // raced for the team the year before. With a list, the team is simulated runner by runner.
  const lineups = remaining.map((race) =>
    readLineups().find((l) => l.year === year && l.race === raceKey(race.eventName) && l.team === TEAM_CODE)
  );
  const listed = (l: Lineup | undefined, r: RosterRunner) => !!l?.runners.includes(nameHash(runnerKey(r)));
  const current = focusIdx >= 0 ? rosters[focusIdx] : [];
  const currentKeys = new Set(current.map(runnerKey));
  const returning = lineups.some(Boolean)
    ? (await collectRoster(TEAM_CODE, gender, await clubRaces(year - 1))).filter(
        (r) => !currentKeys.has(runnerKey(r)) && lineups.some((l) => listed(l, r))
      )
    : [];
  const focusRunners = [
    ...current.map((r) => ({ runner: r, racesRun: r.results.length })),
    ...returning.map((r) => ({ runner: r, racesRun: 0 })),
  ];
  // Runners with no comparable club result (say, only 5Ks before a marathon) are
  // projected from their other NYRR races in the 13 months before, if any (long
  // enough to include last year's marathon, short enough to skip stale form)
  const otherResults = new Map<string, Awaited<ReturnType<typeof getRunnerResults>>>();
  const needOthers = focusRunners.filter((f) => remaining.some((race) => !f.runner.results.some((x) => isComparable(x, race))));
  await mapLimit(needOthers, 4, async ({ runner }) => {
    otherResults.set(runnerKey(runner), await getRunnerResults(runner.runnerId).catch(() => []));
  });
  const basis = (runner: RosterRunner, race: RaceInfo) => {
    if (runner.results.some((x) => isComparable(x, race))) return runner.results;
    const since = Date.parse(race.date) - 395 * 86_400_000;
    const others = (otherResults.get(runnerKey(runner)) ?? []).filter(
      (x) => isComparable(x, race) && Date.parse(x.date) > since && Date.parse(x.date) < Date.parse(race.date)
    );
    return others.length ? others : runner.results;
  };

  const chanceOf = (raceIdx: number, { runner, racesRun }: (typeof focusRunners)[number]) => {
    const race = remaining[raceIdx];
    const usual = usualChance(race, focusIdx, runner, racesRun);
    const lineup = lineups[raceIdx];
    return lineup ? lineupChance(lineup.kind, listed(lineup, runner), usual) : usual;
  };
  if (focusIdx >= 0) {
    remaining.forEach((race, k) => {
      if (!lineups[k]) return;
      (simTeams[focusIdx].lineup ??= {})[race.eventCode] = focusRunners.map((f) => ({
        projectedSeconds: projectRunner(basis(f.runner, race), race),
        chance: chanceOf(k, f),
      }));
    });
  }

  const result = simulate(simTeams, simRaces, TEAM_CODE, SIMS);
  const next = remaining[0];

  // The page never shows who is on a sign-up or invite list: only this season's
  // roster, each with their usual (history-based) chance, fastest first
  const runners: ForecastRunner[] = current
    .map((runner) => {
      const racesRun = runner.results.length;
      // Show the result the projection leans on most: the best one it's based on
      const based = next ? basis(runner, next) : runner.results;
      const comparable = next ? based.filter((x) => isComparable(x, next)) : [];
      const pool = comparable.length ? comparable : based;
      const best = next ? pool.reduce((a, b) => (projectRunner([b], next) < projectRunner([a], next) ? b : a)) : pool[0];
      const perRace = <T,>(fn: (race: RaceInfo, k: number) => T) =>
        Object.fromEntries(remaining.map((race, k) => [race.eventCode, fn(race, k)]));
      return {
        name: shortName(runner),
        racesRun,
        best: { eventName: best.eventName, seconds: best.seconds, distanceMeters: best.distanceMeters },
        projected: perRace((race) => projectRunner(basis(runner, race), race)),
        chance: perRace((race) => usualChance(race, focusIdx, runner)),
        ranLastYear: perRace((race) => ranLastYear[race.eventCode][focusIdx].has(runnerKey(runner))),
      };
    })
    .sort((a, b) => (next ? a.projected[next.eventCode] - b.projected[next.eventCode] : 0));

  return {
    divisionCode,
    divisionName,
    gender,
    racesDone: done.length,
    remainingRaces: remaining.map((r) => ({
      eventCode: r.eventCode,
      eventName: r.eventName,
      date: r.date,
      distanceMeters: r.distanceMeters,
      scorers: r.scorers,
      multiplier: r.multiplier,
    })),
    teams: season.teams.map((t, i) => ({
      ...result.teams[i],
      // Per-runner scoring shares would hint at who is on a sign-up list, so they stay out of the file
      races: Object.fromEntries(
        Object.entries(result.teams[i].races).map(([code, { pScore: _, ...rest }]) => [code, rest])
      ),
      teamName: t.teamName,
      place: t.place,
      points: t.totalPoints,
    })),
    needs: result.needs,
    scenarios: result.scenarios,
    runners: runners.slice(0, 40),
    rosterSize: current.length,
    lineups: Object.fromEntries(
      remaining.flatMap((race, k) => {
        const l = lineups[k];
        if (!l) return [];
        const signedUp = focusRunners.filter((f) => listed(l, f.runner)).length;
        return [[race.eventCode, { kind: l.kind, signedUp, unmatched: l.unmatched, updated: l.updated }]];
      })
    ),
    history: buildHistory(season, attendance, past, focusIdx >= 0 ? rosters[focusIdx] : [], params),
    leaderboard: buildLeaderboard(season, current),
  };
}

// Throws if the forecast doesn't hang together, so a bad run never replaces a good file
function checkForecast(forecast: Forecast) {
  const problems: string[] = [];
  const isProb = (p: number) => Number.isFinite(p) && p >= 0 && p <= 1;
  for (const d of forecast.divisions) {
    const where = d.divisionCode;
    if (d.teams.length < 2) problems.push(`${where}: only ${d.teams.length} teams`);
    const sum = (key: 'pTop2' | 'pFirst') => d.teams.reduce((s, t) => s + t[key], 0);
    if (Math.abs(sum('pTop2') - Math.min(2, d.teams.length)) > 1e-6) problems.push(`${where}: top-2 odds add to ${sum('pTop2')}`);
    if (Math.abs(sum('pFirst') - 1) > 1e-6) problems.push(`${where}: title odds add to ${sum('pFirst')}`);
    for (const t of d.teams) {
      if (![t.pTop2, t.pFirst].every(isProb)) problems.push(`${where} ${t.teamCode}: odds out of range`);
      if (t.meanPoints < t.points - 1e-9) problems.push(`${where} ${t.teamCode}: projected below current points`);
      for (const [code, r] of Object.entries(t.races)) {
        if (!isProb(r.pField)) problems.push(`${where} ${t.teamCode} ${code}: bad turnout ${r.pField}`);
        if (r.pField > 0 && !Number.isFinite(r.medianAvgSeconds)) problems.push(`${where} ${t.teamCode} ${code}: no time`);
      }
    }
    if (d.history.length !== d.racesDone) problems.push(`${where}: history has ${d.history.length} of ${d.racesDone} races`);
  }
  if (problems.length) throw new Error(`forecast failed checks:\n  ${problems.join('\n  ')}`);
}

async function main() {
  // NYRR_YEAR=2025 rebuilds a past season, to check how a finished season looks
  const year = Number(process.env.NYRR_YEAR) || (await getLatestYear());
  const mine = (await getDivisions(year)).filter((d) => d.teamResults.some((t) => t.teamCode === TEAM_CODE));
  const divisions = await mapLimit(mine, 1, (d) => buildDivision(year, d.divisionCode, d.divisionName, d.divisionGender));

  const forecast: Forecast = {
    generatedAt: new Date().toISOString(),
    year,
    sims: SIMS,
    divisions,
  };
  checkForecast(forecast);
  fs.mkdirSync(path.dirname(FORECAST_PATH), { recursive: true });
  fs.writeFileSync(FORECAST_PATH, JSON.stringify(forecast, null, 2) + '\n');
  console.log(`✓ NYRR forecast: ${divisions.map((d) => d.divisionCode).join(', ')} → ${FORECAST_PATH}`);
}

const deadline = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error(`gave up after ${DEADLINE_MS / 60000} minutes`)), DEADLINE_MS).unref()
);
Promise.race([main(), deadline])
  .catch((err) => {
    // Don't fail the site build over NYRR being down or a bad run
    console.warn(`⚠ NYRR forecast not updated (${err.message ?? err}). Keeping the existing file.`);
  })
  .finally(() => process.exit(0));
