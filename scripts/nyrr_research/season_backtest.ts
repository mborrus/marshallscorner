// Replays past seasons race by race: after every race, the promotion odds the
// model would have given (vs who actually finished top 2), and how well it
// predicted each team's time and turnout at the next race.

import fs from 'fs';
import path from 'path';
import { collectDivision, collectHistory, collectPastScores } from '../../src/lib/nyrr/collect';
import {
  DEFAULT_PARAMS,
  fitRace,
  isMarathon,
  prepareSimulation,
  seasonAsOf,
  simulate,
  paramsForDivision,
  type ModelParams,
  type RaceHistory,
} from '../../src/lib/nyrr/model';

const OUT = process.env.NYRR_RESEARCH_DIR ?? '.nyrr-research';
// LEVELS=0 uses the same settings for A and B divisions
const paramsFor = (dc: string): ModelParams => ({
  ...(process.env.LEVELS === '0' ? DEFAULT_PARAMS : paramsForDivision(dc)),
  ...JSON.parse(process.env.PARAMS ?? '{}'),
});
const YEARS = (process.env.YEARS ?? '2022,2023,2024,2025').split(',').map(Number);
const DIVISIONS: [string, string][] = [
  ['AM', 'M'],
  ['AW', 'W'],
  ['BM', 'M'],
  ['BW', 'W'],
];

function distanceGroup(m: number): string {
  if (m < 2000) return 'mile';
  if (m < 9000) return '5K-5M';
  if (m < 17000) return '10K-10M/15K';
  if (m < 30000) return 'half';
  return 'marathon';
}

(async () => {
  const odds: object[] = [];
  const next: object[] = [];
  for (const year of YEARS)
    for (const [dc, g] of DIVISIONS) {
      const season = await collectDivision(year, dc, g);
      const params = paramsFor(dc);
      const codes = season.teams.map((t) => t.teamCode);
      const attendance: Record<string, Record<string, RaceHistory>> = {};
      for (const race of season.races)
        attendance[race.eventCode] = (await collectHistory(race, codes, g, [year - 1, year - 2])).history;
      // PAST=0 leaves out last season's results
      const past = process.env.PAST === '0' ? undefined : await collectPastScores(year, codes, g);
      const done = season.races.filter((r) => r.published);
      const finals = season.teams.map((t) => t.totalPoints);

      for (let n = 1; n < done.length; n++) {
        const asOf = seasonAsOf(season.races, n);
        const { simTeams, simRaces } = prepareSimulation(season.teams, asOf, attendance, params, past);
        const sim = simulate(simTeams, simRaces, '', 3000, year * 100 + n);
        season.teams.forEach((t, i) => {
          const better = finals.filter((p) => p > finals[i]).length;
          const now = simTeams.map((s) => s.currentPoints);
          odds.push({
            year,
            dc,
            n,
            left: done.length - n,
            team: t.teamCode,
            pTop2: sim.teams[i].pTop2,
            pFirst: sim.teams[i].pFirst,
            top2: better < 2 ? 1 : 0,
            first: better < 1 ? 1 : 0,
            nowTop2: now.filter((p) => p > now[i]).length < 2 ? 1 : 0,
          });
        });

        const target = done[n];
        const fit = fitRace(season.teams, asOf, target, params, past);
        const race = simRaces.find((r) => r.race.eventCode === target.eventCode)!;
        season.teams.forEach((t, i) => {
          const f = fit.teams[t.teamCode];
          const actual = t.races[target.eventCode]?.score ?? null;
          const k = race.strengthScale;
          next.push({
            year,
            dc,
            n,
            race: target.eventCode,
            group: distanceGroup(target.distanceMeters),
            marathon: isMarathon(target),
            team: t.teamCode,
            hadData: f.races > 0,
            pField: simTeams[i].fieldProb[target.eventCode],
            fielded: actual !== null ? 1 : 0,
            predicted: race.targetEffect + k * f.strength,
            sd: Math.sqrt(k * k * (f.sigma ** 2 + f.strengthSe ** 2) + race.extraSigma ** 2),
            actual,
          });
        });
      }
      console.error(year, dc, 'done');
    }
  const rows = odds as { left: number; pTop2: number; top2: number }[];
  const score = (rs: typeof rows) => {
    const brier = rs.reduce((s, r) => s + (r.pTop2 - r.top2) ** 2, 0) / rs.length;
    const ll = -rs.reduce((s, r) => s + Math.log(Math.max(1e-3, r.top2 ? r.pTop2 : 1 - r.pTop2)), 0) / rs.length;
    return `Brier ${brier.toFixed(4)} log-loss ${ll.toFixed(3)}`;
  };
  console.log(
    `all: ${score(rows)} | 6+ left: ${score(rows.filter((r) => r.left >= 6))} | <6 left: ${score(rows.filter((r) => r.left < 6))}`,
  );
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'season_odds.json'), JSON.stringify(odds));
  fs.writeFileSync(path.join(OUT, 'season_next.json'), JSON.stringify(next));
})();
