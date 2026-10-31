// Forecast model for NYRR club points races.
//
// Each team's score at a race is the log of its scorers' average time (the top
// 5 at most races, 3 at the marathon, 10 at the Team Championships).
// We fit score = teamStrength + raceDifficulty, so course, weather and distance
// all drop out and teams are compared only against each other. Remaining races
// are then simulated many times: each team either fields a full team or not,
// runs its strength plus noise, and gets points by finishing order.

export const POINTS_SCALE = [15, 12, 10, 8, 6, 5, 4, 3, 2, 1];
// Full teams that finish outside the top 10 still earn 1 point
export const POINTS_OUTSIDE_TOP = 1;

export interface RaceInfo {
  eventCode: string;
  eventName: string;
  date: string;
  distanceMeters: number;
  multiplier: number;
  // Runners counted toward a team's score; 0 when not known yet
  scorers: number;
  published: boolean;
}

export interface TeamRace {
  // log(mean scorer time in seconds), null when no full team
  score: number | null;
  points: number;
}

export interface TeamSeason {
  teamCode: string;
  teamName: string;
  place: number;
  totalPoints: number;
  races: Record<string, TeamRace>;
}

// How often a team fielded a full team at the same race in past seasons
export interface RaceHistory {
  fielded: number;
  seasons: number;
}

export interface ModelParams {
  recencyHalfLifeDays: number;
  distanceScale: number;
  riegelExponent: number;
  // Extra race-day noise on top of a team's usual consistency, by distance
  extraSigmaMarathon: number;
  extraSigmaOther: number;
  // How much of the gap between teams carries over. At the marathon, strong
  // teams' fastest short-race runners often skip it, so teams bunch up.
  strengthScaleMarathon: number;
  strengthScaleOther: number;
  // Correction to the Riegel time estimate at the marathon (log scale): only 3
  // runners score there. Only moves predicted times, not finishing order.
  timeOffsetMarathon: number;
  // How much a past season at the same race counts vs one 2026 race
  historyWeight: number;
  // Typical chance a division team fields a full team (A/B, 2022-2025: ~83%)
  turnoutPrior: number;
  // Typical race-to-race spread of a team's score, before it has its own
  teamSigmaPrior: number;
  // Share of a team's turnout chance that comes from its runners' own
  // attendance odds (the rest is team history). At the marathon this made
  // predictions worse: about a third of scorers hadn't run a club race all year.
  runnerTurnoutWeightMarathon: number;
  runnerTurnoutWeightOther: number;
  // Individual race times vs a straight Riegel projection (log scale, median)
  runnerTimeOffsetMarathon: number;
  runnerTimeOffsetOther: number;
}

export const DEFAULT_PARAMS: ModelParams = {
  recencyHalfLifeDays: 90,
  distanceScale: 1.5,
  riegelExponent: 1.06,
  // Calibrated on 2022-2025 A and B division seasons
  extraSigmaMarathon: 0.031,
  extraSigmaOther: 0.02,
  strengthScaleMarathon: 0.6,
  strengthScaleOther: 1,
  timeOffsetMarathon: -0.032,
  historyWeight: 6,
  turnoutPrior: 0.8,
  teamSigmaPrior: 0.045,
  runnerTurnoutWeightMarathon: 0,
  runnerTurnoutWeightOther: 0.25,
  runnerTimeOffsetMarathon: 0.064,
  runnerTimeOffsetOther: 0.017,
};

// The marathon behaves differently by division level (2022-2025, 8 marathons
// each): A teams' form mostly carries over, B teams' marathon squads are close
// to a toss-up. Also corrects the time level for each.
const MARATHON_BY_LEVEL: Record<string, Partial<ModelParams>> = {
  A: { strengthScaleMarathon: 0.74, extraSigmaMarathon: 0.02, timeOffsetMarathon: -0.004 },
  B: { strengthScaleMarathon: 0.32, extraSigmaMarathon: 0.04, timeOffsetMarathon: -0.051 },
};

// Model settings for a division ("AM", "BW", ...)
export function paramsForDivision(divisionCode: string): ModelParams {
  return { ...DEFAULT_PARAMS, ...MARATHON_BY_LEVEL[divisionCode.charAt(0)] };
}

// Chance a runner races the Marathon / Corbitt 15K for their team, by how many
// club races they'd run that season and whether they ran the same race last
// year. From 2023-2025 A and B division rosters (about 18,000 runner-seasons).
const RACE_COUNT_BUCKETS = [1, 2, 3, 5, 7, Infinity];
const ATTENDANCE: Record<'marathon' | 'other', [number, number][]> = {
  //          [didn't run it last year, ran it last year]
  marathon: [[0.19, 0.36], [0.3, 0.53], [0.34, 0.64], [0.4, 0.73], [0.48, 0.85], [0.54, 0.9]],
  other: [[0.04, 0.14], [0.08, 0.24], [0.11, 0.27], [0.15, 0.36], [0.26, 0.47], [0.56, 0.74]],
};

export function runnerAttendance(race: RaceInfo, racesRun: number, ranLastYear: boolean): number {
  const bucket = RACE_COUNT_BUCKETS.findIndex((max) => racesRun <= max);
  return ATTENDANCE[isMarathon(race) ? 'marathon' : 'other'][Math.max(0, bucket)][ranLastYear ? 1 : 0];
}

// Turnout chance from a team's expected number of known runners showing up,
// relative to how many it needs (fitted on the same seasons)
export function runnerTurnout(race: RaceInfo, attendance: number[]): number {
  const expected = attendance.reduce((s, p) => s + p, 0);
  const z = 1.01 + 1.86 * Math.log(expected / Math.max(1, race.scorers) + 0.1);
  return 1 / (1 + Math.exp(-z));
}

export function blendTurnout(race: RaceInfo, teamChance: number, runnerChance: number, params = DEFAULT_PARAMS): number {
  const w = isMarathon(race) ? params.runnerTurnoutWeightMarathon : params.runnerTurnoutWeightOther;
  return (1 - w) * teamChance + w * runnerChance;
}

// Short races say little about a much longer one: within 4.5x counts as comparable
export function isComparable(result: { distanceMeters: number }, target: RaceInfo): boolean {
  return target.distanceMeters / result.distanceMeters <= 4.5;
}

// A runner's likely time at a race, from their two best results at a comparable
// distance, scaled by Riegel. Club runners run about the same ~6% slower at the
// marathon whether projected from a 5K or a half, so that correction applies to
// any clearly shorter race, but not to a past marathon.
export function projectRunner(
  results: { distanceMeters: number; seconds: number }[],
  target: RaceInfo,
  params = DEFAULT_PARAMS
): number {
  const close = results.filter((r) => isComparable(r, target));
  const usable = close.length ? close : results;
  const fade = isMarathon(target) ? params.runnerTimeOffsetMarathon : params.runnerTimeOffsetOther;
  const eqs = usable
    .map((r) => {
      const ratio = target.distanceMeters / r.distanceMeters;
      return r.seconds * Math.pow(ratio, params.riegelExponent) * (ratio >= 1.3 ? Math.exp(fade) : 1);
    })
    .sort((a, b) => a - b)
    .slice(0, 2);
  return eqs.reduce((s, x) => s + x, 0) / eqs.length;
}

// How individual times land around projectRunner's estimate (log scale),
// as quantiles at 2.5% steps from 2.5% to 97.5%, from 2023-2025 A and B rosters
const RUNNER_RESIDUALS = {
  marathon: [-0.169, -0.122, -0.098, -0.086, -0.077, -0.069, -0.063, -0.057, -0.051, -0.046, -0.04, -0.035, -0.031,
    -0.027, -0.022, -0.017, -0.013, -0.009, -0.004, 0, 0.005, 0.009, 0.015, 0.02, 0.026, 0.031, 0.038, 0.045, 0.051,
    0.058, 0.066, 0.076, 0.085, 0.098, 0.112, 0.128, 0.147, 0.178, 0.238],
  other: [-0.132, -0.099, -0.079, -0.066, -0.058, -0.05, -0.044, -0.04, -0.035, -0.03, -0.026, -0.023, -0.02, -0.017,
    -0.014, -0.011, -0.008, -0.006, -0.003, 0, 0.002, 0.005, 0.008, 0.011, 0.014, 0.017, 0.02, 0.024, 0.029, 0.035,
    0.042, 0.051, 0.058, 0.066, 0.076, 0.09, 0.113, 0.144, 0.22],
};

function sampleResidual(race: RaceInfo, rand: () => number): number {
  const q = isMarathon(race) ? RUNNER_RESIDUALS.marathon : RUNNER_RESIDUALS.other;
  const pos = rand() * (q.length - 1);
  const lo = Math.floor(pos);
  return q[lo] + (q[Math.min(q.length - 1, lo + 1)] - q[lo]) * (pos - lo);
}

// When a team's lineup for a race is known, it's simulated runner by runner.
// A sign-up list is close to final, so runners not on it rarely race. An
// "asked" list is people being recruited: an assumed 50% (or their usual
// chance if higher), and everyone else keeps their usual chance.
export const LINEUP_CHANCE = { 'signed-up': 0.85, asked: 0.5 };
export const UNLISTED_FACTOR = { 'signed-up': 0.25, asked: 1 };

export interface LineupRunner {
  projectedSeconds: number;
  chance: number;
}

// Team scores from an earlier season, used as older evidence of team strength
export interface PastScores {
  races: RaceInfo[];
  scores: Record<string, Record<string, number>>; // team → event code → score
}

export interface TeamFit {
  strength: number;
  strengthSe: number;
  sigma: number;
  races: number;
}

export interface RaceFit {
  teams: Record<string, TeamFit>;
  targetEffect: number;
}

const DAY_MS = 86_400_000;

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = groups.get(k);
    if (group) group.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

function raceWeight(race: RaceInfo, target: RaceInfo, params: ModelParams): number {
  const ageDays = (Date.parse(target.date) - Date.parse(race.date)) / DAY_MS;
  const recency = Math.pow(0.5, Math.max(0, ageDays) / params.recencyHalfLifeDays);
  const distance = Math.exp(-Math.abs(Math.log(target.distanceMeters / race.distanceMeters)) / params.distanceScale);
  return recency * distance;
}

// How much faster (-) or slower (+) a course runs than its distance suggests,
// on the log scale, from 2022-2025 team times vs a Riegel projection from
// similar races. Only moves predicted times, not finishing order.
const COURSE_OFFSETS: [RegExp, number][] = [
  [/5th Ave(nue)? Mile/i, -0.06],
  [/Brooklyn Half/i, -0.053],
  [/NYC Half/i, -0.033],
  [/Bronx 10M/i, -0.02],
  [/Queens 10K/i, -0.014],
  [/Team Championship/i, 0.01],
  [/Staten Island Half/i, 0.028],
  [/Harlem 5K/i, 0.034],
  [/Ted Corbitt/i, 0.043],
];

export function courseOffset(race: RaceInfo): number {
  return COURSE_OFFSETS.find(([pattern]) => pattern.test(race.eventName))?.[1] ?? 0;
}

export function isMarathon(race: RaceInfo): boolean {
  return race.distanceMeters > 40000;
}

// Fit team strengths from completed races, weighted toward races that are
// recent and similar in distance to the target race.
export function fitRace(
  teams: TeamSeason[],
  races: RaceInfo[],
  target: RaceInfo,
  params: ModelParams = DEFAULT_PARAMS,
  past?: PastScores
): RaceFit {
  // Last season's races count too; recency weighting makes them fade as this season goes on
  const done = [
    ...(past?.races ?? []),
    ...races.filter((r) => r.published && Date.parse(r.date) < Date.parse(target.date)),
  ];
  const weights = new Map(done.map((r) => [r.eventCode, raceWeight(r, target, params)]));
  const scoreOf = (t: TeamSeason, code: string) => t.races[code]?.score ?? past?.scores[t.teamCode]?.[code] ?? null;
  const obs = teams.flatMap((t) =>
    done
      .map((r) => ({ team: t.teamCode, race: r.eventCode, x: scoreOf(t, r.eventCode) }))
      .filter((o): o is { team: string; race: string; x: number } => o.x !== null)
  );

  const byRace = groupBy(obs, (o) => o.race);
  const byTeam = groupBy(obs, (o) => o.team);
  const fitted = teams.filter((t) => byTeam.has(t.teamCode));

  const a = new Map<string, number>(teams.map((t) => [t.teamCode, 0]));
  const b = new Map<string, number>();
  for (let iter = 0; iter < 100; iter++) {
    for (const [race, xs] of byRace) b.set(race, xs.reduce((s, o) => s + o.x - a.get(o.team)!, 0) / xs.length);
    for (const [team, xs] of byTeam) {
      const w = xs.reduce((s, o) => s + weights.get(o.race)!, 0);
      if (w > 0) a.set(team, xs.reduce((s, o) => s + weights.get(o.race)! * (o.x - b.get(o.race)!), 0) / w);
    }
    // Pin the average team at 0 so race effects stay in seconds
    const mean = fitted.reduce((s, t) => s + a.get(t.teamCode)!, 0) / Math.max(1, fitted.length);
    for (const t of fitted) a.set(t.teamCode, a.get(t.teamCode)! - mean);
  }

  const resid = obs.map((o) => ({ ...o, e: o.x - a.get(o.team)! - b.get(o.race)!, w: weights.get(o.race)! }));
  const residByTeam = groupBy(resid, (o) => o.team);

  // A team's consistency starts from a typical value and moves toward its own
  // spread as races come in. One race says nothing about spread, and fitting the
  // team's strength uses up one race's worth of information.
  const PRIOR_RACES = 3;
  const priorVar = params.teamSigmaPrior ** 2;
  const fits: Record<string, TeamFit> = {};
  const weakest = Math.max(...teams.map((t) => a.get(t.teamCode)!));
  for (const t of teams) {
    const mine = residByTeam.get(t.teamCode) ?? [];
    const w = mine.reduce((s, o) => s + o.w, 0);
    const variance =
      (PRIOR_RACES * priorVar + mine.reduce((s, o) => s + o.e * o.e, 0)) / (PRIOR_RACES + Math.max(0, mine.length - 1));
    const sigma = Math.sqrt(variance);
    // Effective number of races given the weights
    const nEff = mine.length ? Math.pow(w, 2) / mine.reduce((s, o) => s + o.w * o.w, 0) : 0;
    fits[t.teamCode] = mine.length
      ? { strength: a.get(t.teamCode)!, strengthSe: sigma / Math.sqrt(nEff), sigma, races: mine.length }
      : // Never fielded a team this season: assume they'd be slowest if they did
        { strength: weakest + 2 * params.teamSigmaPrior, strengthSe: 2 * params.teamSigmaPrior, sigma: 2 * params.teamSigmaPrior, races: 0 };
  }

  // Predict how hard the target race is from the races most like it (Riegel)
  let num = 0;
  let den = 0;
  for (const r of done) {
    if (!b.has(r.eventCode)) continue;
    const w = Math.exp(-Math.abs(Math.log(target.distanceMeters / r.distanceMeters)) / 0.5);
    num += w * (b.get(r.eventCode)! + params.riegelExponent * Math.log(target.distanceMeters / r.distanceMeters));
    den += w;
  }

  return {
    teams: fits,
    targetEffect:
      (den > 0 ? num / den : NaN) + (isMarathon(target) ? params.timeOffsetMarathon : courseOffset(target)),
  };
}

// Chance a team fields a full team at the target race
export function fieldProbability(
  team: TeamSeason,
  races: RaceInfo[],
  history: RaceHistory | undefined,
  params: ModelParams = DEFAULT_PARAMS
): number {
  const done = races.filter((r) => r.published);
  const fielded = done.filter((r) => team.races[r.eventCode]?.score != null).length;
  const hw = params.historyWeight;
  const hf = history?.fielded ?? 0;
  const hn = history?.seasons ?? 0;
  // Starts from how often teams usually field a full team
  return (fielded + hw * hf + 2 * params.turnoutPrior) / (done.length + hw * hn + 2);
}

export function pointsForPlace(index: number, multiplier: number): number {
  return (index < POINTS_SCALE.length ? POINTS_SCALE[index] : POINTS_OUTSIDE_TOP) * multiplier;
}

// Share of the given top-N slots a team gets when it is tied with others
function slotShare({ better, tied }: Standing, slots: number): number {
  return Math.max(0, Math.min(slots, better + tied) - better) / tied;
}

interface Standing {
  better: number; // teams with more points
  tied: number; // teams on the same points, itself included
}

// Each team's standing from its points total (one sort, so big divisions stay fast)
function standings(totals: number[]): Standing[] {
  const sorted = [...totals].sort((a, b) => b - a);
  const byTotal = new Map<number, Standing>();
  sorted.forEach((t, i) => {
    const s = byTotal.get(t);
    if (s) s.tied++;
    else byTotal.set(t, { better: i, tied: 1 });
  });
  return totals.map((t) => byTotal.get(t)!);
}

export interface SimTeamInput {
  teamCode: string;
  currentPoints: number;
  fit: Record<string, TeamFit>; // per remaining race
  fieldProb: Record<string, number>;
  // Races where the team's lineup is known, in place of fit and fieldProb
  lineup?: Record<string, LineupRunner[]>;
}

export interface SimRaceInput {
  race: RaceInfo;
  targetEffect: number;
  extraSigma: number;
  strengthScale: number;
}

export function simRaceInput(race: RaceInfo, fit: RaceFit, params: ModelParams = DEFAULT_PARAMS): SimRaceInput {
  const marathon = isMarathon(race);
  return {
    race,
    targetEffect: fit.targetEffect,
    extraSigma: marathon ? params.extraSigmaMarathon : params.extraSigmaOther,
    strengthScale: marathon ? params.strengthScaleMarathon : params.strengthScaleOther,
  };
}

export interface SimTeamResult {
  teamCode: string;
  pFirst: number;
  pTop2: number;
  meanPoints: number;
  p10Points: number;
  p90Points: number;
  placeDistribution: number[];
  // Per remaining race
  races: Record<
    string,
    { pField: number; medianAvgSeconds: number; pWin: number; pScore?: number[] }
  >;
}

export interface NeedsRow {
  place: number | null; // null = no full team
  pPlace: number;
  cutoffAvgSeconds: number | null; // avg scorer time needed to finish this high
  pTop2Given: number | null;
  samples: number;
}

// Promotion chance by the focus team's place at each of the next two races
// (null = no full team)
export interface ScenarioCell {
  first: number | null;
  second: number | null;
  p: number;
  pTop2: number;
  samples: number;
}

export interface SimResult {
  sims: number;
  teams: SimTeamResult[];
  needs: NeedsRow[];
  scenarios: ScenarioCell[];
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number): number {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function simulate(
  teams: SimTeamInput[],
  races: SimRaceInput[],
  focusTeam: string,
  sims = 50000,
  seed = 2026
): SimResult {
  const rand = mulberry32(seed);
  const n = teams.length;
  const focusIdx = teams.findIndex((t) => t.teamCode === focusTeam);
  const next = races[0]?.race.eventCode;

  const first = new Float64Array(n);
  const top2 = new Float64Array(n);
  const pointSums = new Float64Array(n);
  const finals: number[][] = teams.map(() => []);
  const placeCounts = teams.map(() => new Array(n).fill(0));
  const raceStats = teams.map(() =>
    Object.fromEntries(
      races.map((r) => [r.race.eventCode, { fielded: 0, wins: 0, scores: [] as number[], scorerCounts: [] as number[] }])
    )
  );
  // Needs table: keyed by focus team's place in the next race (0 = no team)
  const needs = new Map<number, { count: number; top2: number }>();
  const scenarios = new Map<string, { count: number; top2: number }>();
  const cutoffs: number[][] = teams.map(() => []);

  for (let s = 0; s < sims; s++) {
    const totals = teams.map((t) => t.currentPoints);
    // Season-long form for this simulation, shared across remaining races
    const formShock = teams.map(() => normal(rand));
    let focusNextPlace = 0;
    let focusSecondPlace = 0;

    races.forEach((r, ri) => {
      const entries: { i: number; x: number }[] = [];
      teams.forEach((t, i) => {
        const lineup = t.lineup?.[r.race.eventCode];
        if (lineup) {
          const finishers: { j: number; time: number }[] = [];
          lineup.forEach((runner, j) => {
            if (rand() < runner.chance) {
              finishers.push({ j, time: runner.projectedSeconds * Math.exp(sampleResidual(r.race, rand)) });
            }
          });
          if (finishers.length < r.race.scorers) return;
          finishers.sort((p, q) => p.time - q.time);
          const scoring = finishers.slice(0, r.race.scorers);
          const counts = raceStats[i][r.race.eventCode].scorerCounts;
          for (const f of scoring) counts[f.j] = (counts[f.j] ?? 0) + 1;
          entries.push({ i, x: Math.log(scoring.reduce((sum, f) => sum + f.time, 0) / scoring.length) });
          return;
        }
        const fit = t.fit[r.race.eventCode];
        if (rand() >= t.fieldProb[r.race.eventCode]) return;
        const k = r.strengthScale;
        const sigma = Math.sqrt(k * k * fit.sigma * fit.sigma + r.extraSigma * r.extraSigma);
        const x = r.targetEffect + k * (fit.strength + fit.strengthSe * formShock[i]) + sigma * normal(rand);
        entries.push({ i, x });
      });
      entries.sort((p, q) => p.x - q.x);
      entries.forEach((e, place) => {
        totals[e.i] += pointsForPlace(place, r.race.multiplier);
        const st = raceStats[e.i][r.race.eventCode];
        st.fielded++;
        if (place === 0) st.wins++;
        if (st.scores.length < 5000) st.scores.push(e.x);
      });
      if (ri === 1 && focusIdx >= 0) focusSecondPlace = entries.findIndex((e) => e.i === focusIdx) + 1;
      if (ri === 0 && focusIdx >= 0) {
        const pos = entries.findIndex((e) => e.i === focusIdx);
        focusNextPlace = pos + 1;
        const others = entries.filter((e) => e.i !== focusIdx);
        for (let k = 0; k < n; k++) cutoffs[k].push(k < others.length ? others[k].x : Infinity);
      }
    });

    const table = standings(totals);
    for (let i = 0; i < n; i++) {
      first[i] += slotShare(table[i], 1);
      top2[i] += slotShare(table[i], 2);
      pointSums[i] += totals[i];
      if (finals[i].length < 20000) finals[i].push(totals[i]);
      placeCounts[i][table[i].better]++;
    }
    if (focusIdx >= 0) {
      const row = needs.get(focusNextPlace) ?? { count: 0, top2: 0 };
      row.count++;
      row.top2 += slotShare(table[focusIdx], 2);
      needs.set(focusNextPlace, row);
      if (races.length >= 2) {
        const key = `${focusNextPlace}|${focusSecondPlace}`;
        const cell = scenarios.get(key) ?? { count: 0, top2: 0 };
        cell.count++;
        cell.top2 += slotShare(table[focusIdx], 2);
        scenarios.set(key, cell);
      }
    }
  }

  const teamResults: SimTeamResult[] = teams.map((t, i) => {
    const sorted = [...finals[i]].sort((p, q) => p - q);
    return {
      teamCode: t.teamCode,
      pFirst: first[i] / sims,
      pTop2: top2[i] / sims,
      meanPoints: pointSums[i] / sims,
      p10Points: quantile(sorted, 0.1),
      p90Points: quantile(sorted, 0.9),
      placeDistribution: placeCounts[i].map((c: number) => c / sims),
      races: Object.fromEntries(
        races.map((r) => {
          const st = raceStats[i][r.race.eventCode];
          const scores = [...st.scores].sort((p, q) => p - q);
          return [
            r.race.eventCode,
            {
              pField: st.fielded / sims,
              medianAvgSeconds: scores.length ? Math.exp(quantile(scores, 0.5)) : NaN,
              pWin: st.wins / sims,
              ...(t.lineup?.[r.race.eventCode] && {
                pScore: t.lineup[r.race.eventCode].map((_, j) => (st.scorerCounts[j] ?? 0) / sims),
              }),
            },
          ];
        })
      ),
    };
  });

  const needsRows: NeedsRow[] = [];
  if (focusIdx >= 0 && next) {
    const maxPlace = Math.max(...needs.keys());
    for (let place = 1; place <= maxPlace; place++) {
      const row = needs.get(place) ?? { count: 0, top2: 0 };
      // To finish k-th you must beat the k-th best of the other teams
      const c = cutoffs[place - 1].filter((x) => Number.isFinite(x)).sort((p, q) => p - q);
      needsRows.push({
        place,
        pPlace: row.count / sims,
        cutoffAvgSeconds: c.length > sims * 0.5 ? Math.exp(quantile(c, 0.5)) : null,
        pTop2Given: row.count ? row.top2 / row.count : null,
        samples: row.count,
      });
    }
    const none = needs.get(0);
    if (none) {
      needsRows.push({
        place: null,
        pPlace: none.count / sims,
        cutoffAvgSeconds: null,
        pTop2Given: none.top2 / none.count,
        samples: none.count,
      });
    }
  }

  const scenarioCells: ScenarioCell[] = [...scenarios].map(([key, cell]) => {
    const [a, b] = key.split('|').map(Number);
    return { first: a || null, second: b || null, p: cell.count / sims, pTop2: cell.top2 / cell.count, samples: cell.count };
  });

  return { sims, teams: teamResults, needs: needsRows, scenarios: scenarioCells };
}

// Inputs for simulating the races still to run (unpublished, after the last
// published race), with turnout from team history only
export function prepareSimulation(
  teams: TeamSeason[],
  races: RaceInfo[],
  attendance: Record<string, Record<string, RaceHistory>>,
  params: ModelParams = DEFAULT_PARAMS,
  past?: PastScores
): { simTeams: SimTeamInput[]; simRaces: SimRaceInput[] } {
  const done = races.filter((r) => r.published);
  const lastDone = Math.max(0, ...done.map((r) => Date.parse(r.date)));
  const left = races
    .filter((r) => !r.published && Date.parse(r.date) > lastDone)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  const simTeams: SimTeamInput[] = teams.map((t) => ({
    teamCode: t.teamCode,
    currentPoints: done.reduce((sum, r) => sum + (t.races[r.eventCode]?.points ?? 0), 0),
    fit: {},
    fieldProb: {},
  }));
  const simRaces = left.map((race) => {
    const fit = fitRace(teams, races, race, params, past);
    teams.forEach((t, i) => {
      simTeams[i].fit[race.eventCode] = fit.teams[t.teamCode];
      simTeams[i].fieldProb[race.eventCode] = fieldProbability(t, races, attendance[race.eventCode]?.[t.teamCode], params);
    });
    return simRaceInput(race, fit, params);
  });
  return { simTeams, simRaces };
}

// The season as it stood after its first `racesDone` published races
// (races that were run but never scored, like the 2025 SI Half, are left out)
export function seasonAsOf(races: RaceInfo[], racesDone: number): RaceInfo[] {
  const done = races.filter((r) => r.published);
  const lastEver = Math.max(0, ...done.map((r) => Date.parse(r.date)));
  const cutoff = racesDone > 0 ? Date.parse(done[racesDone - 1].date) : -Infinity;
  return races
    .filter((r) => r.published || Date.parse(r.date) > lastEver)
    .map((r) => (Date.parse(r.date) > cutoff ? { ...r, published: false } : r));
}

function normalCdf(z: number): number {
  // Abramowitz-Stegun 7.1.26, accurate to ~1e-7
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const erf =
    1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) *
      Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

// Points a team would most likely have scored at a race it didn't field a full
// team for, given its form going in and how the other teams actually ran
export function expectedPointsIfFielded(
  teams: TeamSeason[],
  races: RaceInfo[],
  race: RaceInfo,
  teamCode: string,
  params: ModelParams = DEFAULT_PARAMS,
  past?: PastScores
): { points: number; place: number } {
  const fit = fitRace(teams, races, race, params, past);
  const others = teams.filter((t) => t.teamCode !== teamCode && t.races[race.eventCode]?.score != null);
  const scores = others.map((t) => t.races[race.eventCode].score!).sort((a, b) => a - b);
  const sim = simRaceInput(race, fit, params);
  const k = sim.strengthScale;
  // How fast this race actually ran, from the teams that were there
  const level =
    others.reduce((s, t) => s + t.races[race.eventCode].score! - k * fit.teams[t.teamCode].strength, 0) /
    Math.max(1, others.length);
  const mine = fit.teams[teamCode];
  const mean = level + k * mine.strength;
  const sd = Math.sqrt(k * k * (mine.sigma ** 2 + mine.strengthSe ** 2) + sim.extraSigma ** 2);

  // Chance of beating exactly `place` of the other teams' actual scores
  let points = 0;
  let place = 0;
  let below = 0;
  for (let j = 0; j <= scores.length; j++) {
    const upTo = j < scores.length ? normalCdf((scores[j] - mean) / sd) : 1;
    const p = upTo - below;
    points += p * pointsForPlace(j, race.multiplier);
    place += p * (j + 1);
    below = upTo;
  }
  return { points, place };
}
