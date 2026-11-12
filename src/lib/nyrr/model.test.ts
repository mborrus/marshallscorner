// Run with: npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_PARAMS,
  countedPoints,
  courseOffset,
  expectedPointsIfFielded,
  fieldProbability,
  outcomeRules,
  pointsForPlace,
  projectRunner,
  runnerAttendance,
  seasonAsOf,
  simulate,
  simulateSeason,
  type RaceInfo,
  type SimRaceInput,
  type SimTeamInput,
  type TeamSeason,
} from './model';
import { distanceFromName, distanceMeters, raceKey, sameRunner } from './collect';
import { shortEventName } from './format';
import { goalLine } from './forecast';
import { promotionSpots } from './standings';

function race(eventCode: string, date: string, overrides: Partial<RaceInfo> = {}): RaceInfo {
  return {
    eventCode,
    eventName: eventCode,
    date,
    distanceMeters: 5000,
    multiplier: 1,
    scorers: 5,
    published: true,
    ...overrides,
  };
}

function team(teamCode: string, currentPoints: number, strength: number, fieldProb = 1): SimTeamInput {
  return {
    teamCode,
    currentPoints,
    fit: { R: { strength, strengthSe: 0, sigma: 0.0001, races: 5 } },
    fieldProb: { R: fieldProb },
  };
}

const oneRace: SimRaceInput[] = [{ race: race('R', '2026-12-01'), targetEffect: 8, extraSigma: 0, strengthScale: 1 }];

test('points follow the NYRR scale, with 1 point past 10th and doubling', () => {
  assert.deepEqual([0, 1, 2, 9, 10, 20].map((i) => pointsForPlace(i, 1)), [15, 12, 10, 1, 1, 1]);
  assert.equal(pointsForPlace(0, 2), 30);
});

test('a much faster team always wins the race', () => {
  const result = simulate([team('FAST', 0, -0.2), team('SLOW', 0, 0.2)], oneRace, 'FAST', 2000);
  assert.equal(result.teams[0].races.R.pWin, 1);
  assert.equal(result.teams[0].meanPoints, 15);
  assert.equal(result.teams[1].meanPoints, 12);
});

test('promotion and title odds always add up to 2 and 1', () => {
  const teams = [team('A', 40, 0), team('B', 35, -0.05, 0.6), team('C', 30, 0.02, 0.9), team('D', 10, -0.1)];
  const result = simulate(teams, oneRace, 'A', 5000);
  const sum = (key: 'pTop2' | 'pFirst') => result.teams.reduce((s, t) => s + t[key], 0);
  assert.ok(Math.abs(sum('pTop2') - 2) < 1e-9);
  assert.ok(Math.abs(sum('pFirst') - 1) < 1e-9);
});

test('ties for a promotion spot are split evenly', () => {
  // Nobody fields a team, so the three teams stay tied on 20 points
  const teams = ['A', 'B', 'C'].map((code) => team(code, 20, 0, 0));
  const result = simulate(teams, oneRace, 'A', 100);
  for (const t of result.teams) {
    assert.ok(Math.abs(t.pTop2 - 2 / 3) < 1e-9);
    assert.ok(Math.abs(t.pFirst - 1 / 3) < 1e-9);
  }
});

test('a team that never fields a full team scores nothing', () => {
  const result = simulate([team('A', 0, -0.5, 0), team('B', 0, 0.5)], oneRace, 'A', 500);
  assert.equal(result.teams[0].meanPoints, 0);
  assert.equal(result.teams[0].races.R.pField, 0);
});

test('a known lineup scores the fastest finishers', () => {
  const lineupTeam: SimTeamInput = {
    ...team('L', 0, 0),
    lineup: { R: Array.from({ length: 6 }, (_, i) => ({ projectedSeconds: 1000 * 1.3 ** i, chance: 1 })) },
  };
  const result = simulate([lineupTeam, team('X', 0, 9)], oneRace, 'L', 300);
  const pScore = result.teams[0].races.R.pScore!;
  // Five score at a 5-scorer race, and the slowest (index 5) almost never does
  assert.ok(Math.abs(pScore.reduce((s, p) => s + p, 0) - 5) < 1e-9);
  assert.ok(pScore[0] > 0.95 && pScore[5] < 0.2);
});

test('seasonAsOf hides later races and drops races that were never scored', () => {
  const races = [
    race('A', '2026-03-01'),
    race('DROPPED', '2026-04-01', { published: false }),
    race('B', '2026-05-01'),
    race('FUTURE', '2026-12-01', { published: false }),
  ];
  const asOf = seasonAsOf(races, 1);
  assert.deepEqual(asOf.map((r) => r.eventCode), ['A', 'B', 'FUTURE']);
  assert.deepEqual(asOf.map((r) => r.published), [true, false, false]);
});

test('turnout starts near the usual rate and follows the team', () => {
  const races = [race('A', '2026-03-01'), race('B', '2026-04-01')];
  const always: TeamSeason = {
    teamCode: 'T', teamName: 'T', place: 1, totalPoints: 0,
    races: { A: { score: 7, points: 15, fielded: true }, B: { score: 7, points: 15, fielded: true } },
  };
  const never: TeamSeason = { ...always, races: {} };
  assert.ok(fieldProbability(always, [], undefined) > 0.75);
  assert.ok(fieldProbability(always, races, undefined) > fieldProbability(never, races, undefined));
  assert.ok(fieldProbability(never, races, { fielded: 2, seasons: 2 }) > fieldProbability(never, races, undefined));
  // Points without a listed team score still count as fielding a team
  const pointsOnly: TeamSeason = { ...never, races: { A: { score: null, points: 1, fielded: true } } };
  assert.ok(fieldProbability(pointsOnly, races, undefined) > fieldProbability(never, races, undefined));
});

test('runner attendance rises with races run and last year', () => {
  const mara = race('M', '2026-11-01', { distanceMeters: 42195 });
  assert.ok(runnerAttendance(mara, 1, false) < runnerAttendance(mara, 8, false));
  assert.ok(runnerAttendance(mara, 3, false) < runnerAttendance(mara, 3, true));
});

test('runner projections scale up with distance and skip far-off results', () => {
  const mara = race('M', '2026-11-01', { distanceMeters: 42195 });
  const half = { distanceMeters: 21097.5, seconds: 5400 };
  const mile = { distanceMeters: 1609.344, seconds: 300 };
  const fromHalf = projectRunner([half], mara);
  assert.ok(fromHalf > 2 * 5400);
  // A fast mile doesn't override a half marathon when projecting a marathon
  assert.equal(projectRunner([half, mile], mara), fromHalf);
  // A past marathon projects to itself
  assert.equal(projectRunner([{ distanceMeters: 42195, seconds: 12000 }], mara), 12000);
});

test('course offsets match race names across years', () => {
  const named = (eventName: string) => race('X', '2026-01-01', { eventName });
  assert.ok(courseOffset(named('2025 New Balance 5th Avenue Mile')) < 0);
  assert.ok(courseOffset(named('2026 NYRR Ted Corbitt 15K')) > 0);
  assert.equal(courseOffset(named('2026 NYRR Washington Heights Salsa, Blues, and Shamrocks 5K')), 0);
});

test('race names, distances and runner names match across years', () => {
  assert.equal(raceKey('2026 TCS New York City Marathon'), raceKey('TCS New York City Marathon 2025'));
  assert.equal(distanceMeters('MAR'), 42195);
  assert.equal(distanceMeters('5K'), 5000);
  assert.ok(Math.abs(distanceMeters('10M') - 16093.44) < 0.01);
  assert.ok(sameRunner('matthew whalen', 'matt whalen'));
  assert.ok(!sameRunner('matt whalen', 'matt walsh'));
  assert.equal(distanceFromName('Half-Marathon'), 21097.5);
  assert.equal(distanceFromName('Marathon'), 42195);
  assert.equal(distanceFromName('10 kilometers'), 10000);
  assert.ok(Math.abs(distanceFromName('5 miles')! - 8046.72) < 0.01);
  assert.equal(distanceFromName('Relay'), null);
});

test('race names drop the year and sponsor', () => {
  assert.equal(shortEventName('2026 New Balance Bronx 10M'), 'Bronx 10M');
  assert.equal(shortEventName('TCS New York City Marathon 2025'), 'New York City Marathon');
  assert.equal(shortEventName('2026 Run as One 4M Presented by JPMorgan Chase'), 'Run as One 4M');
});

test('a missed race is valued by where the team would have finished', () => {
  const races = [race('A', '2026-03-01'), race('B', '2026-04-01'), race('C', '2026-05-01')];
  const scoresOf = (a: number, b: number, c: number | null) => ({
    A: { score: a, points: 0, fielded: true }, B: { score: b, points: 0, fielded: true }, C: { score: c, points: 0, fielded: c !== null },
  });
  const teams: TeamSeason[] = [
    { teamCode: 'FAST', teamName: '', place: 1, totalPoints: 0, races: scoresOf(7.0, 7.0, null) },
    { teamCode: 'MID', teamName: '', place: 2, totalPoints: 0, races: scoresOf(7.2, 7.2, 7.2) },
    { teamCode: 'SLOW', teamName: '', place: 3, totalPoints: 0, races: scoresOf(7.4, 7.4, 7.4) },
  ];
  const { points, place } = expectedPointsIfFielded(teams, races, races[2], 'FAST');
  // FAST is far quicker than both teams that ran, so it would almost surely have won
  assert.ok(points > 14.5 && place < 1.1);
});

test('two-race scenarios cover every simulation', () => {
  const twoRaces: SimRaceInput[] = [oneRace[0], { ...oneRace[0], race: race('S', '2026-12-08') }];
  const withS = (t: SimTeamInput) => ({ ...t, fit: { ...t.fit, S: t.fit.R }, fieldProb: { ...t.fieldProb, S: 0.7 } });
  const result = simulate([withS(team('A', 0, 0, 0.7)), withS(team('B', 0, 0.01)), withS(team('C', 5, 0))], twoRaces, 'A', 3000);
  assert.ok(Math.abs(result.scenarios.reduce((s, c) => s + c.p, 0) - 1) < 1e-9);
  // Winning both races beats missing both
  const cell = (a: number | null, b: number | null) => result.scenarios.find((c) => c.first === a && c.second === b)!;
  assert.ok(cell(1, 1).pTop2 > cell(null, null).pTop2);
});

test('the year-end total drops each team\'s lowest race scores', () => {
  assert.equal(countedPoints([15, 0, 12, 1, 10], 2), 37);
  assert.equal(countedPoints([15], 2), 0);
  // A wins the last race, but B, which has more low scores to drop, ends level
  const a: SimTeamInput = { ...team('A', 30, -0.5), racePoints: [15, 15, 0] };
  const b: SimTeamInput = { ...team('B', 27, 0.5, 0), racePoints: [12, 15, 0] };
  const result = simulate([a, b], oneRace, 'A', 200, 1, 2);
  // A: best 2 of [15, 15, 0, 15] = 30; B: best 2 of [12, 15, 0, 0] = 27
  assert.equal(result.teams[0].meanPoints, 30);
  assert.equal(result.teams[1].meanPoints, 27);
});

test('teams level on points across a line are counted as tied, not as a clear finish', () => {
  // Neither team can field a full team, so they end level on 10
  const result = simulate([team('A', 10, 0, 0), team('B', 10, 0, 0), team('C', 0, 0, 0)], oneRace, 'A', 100);
  const a = result.teams[0];
  assert.deepEqual([a.pFirst, a.pFirstOutright, a.pFirstTied], [0.5, 0, 1]);
  assert.deepEqual([a.pTop2, a.pTop2Outright, a.pTop2Tied], [1, 1, 0]);
  const none = result.needs.find((n) => n.place === null)!;
  assert.deepEqual([none.pFirstGiven, none.pFirstOutrightGiven, none.pFirstTiedGiven], [0.5, 0, 1]);
});

const fillers = ['X1', 'X2', 'X3'].map((teamCode) => ({ teamCode, racePoints: new Array(11).fill(0) }));

test('with one race left, the rules give where each rival must finish (2026 Open Men B)', () => {
  const teams = [
    { teamCode: 'ReRC', racePoints: [6, 8, 10, 10, 12, 12, 12, 15, 15, 15, 24] },
    { teamCode: 'LWTC', racePoints: [5, 6, 8, 10, 10, 10, 12, 12, 12, 12, 15] },
    { teamCode: 'HRR', racePoints: [3, 4, 4, 5, 10, 10, 12, 15, 15, 15, 16] },
    { teamCode: 'ManTC', racePoints: [0, 1, 4, 5, 6, 8, 8, 10, 15, 15, 30] },
    { teamCode: 'STR', racePoints: [1, 1, 5, 5, 6, 8, 8, 8, 8, 10, 10] },
    ...fillers,
  ];
  const rules = outcomeRules(teams, 'ManTC', 1, 2, 2)!;
  // The leader can't be caught and the 5th team can't catch up: two rivals for one spot
  assert.deepEqual(rules.rivals, ['LWTC', 'HRR']);
  assert.equal(rules.mustBeat, 2);
  assert.deepEqual(rules.rows.map((r) => [r.place, r.finalPoints, r.best]), [
    [1, 116, 'clear'],
    [2, 113, 'clear'],
    [3, 111, 'clear'],
    [4, 109, 'clear'],
    [5, 107, 'level'],
  ]);
  // A win is enough whatever the rivals do; from 2nd to 4th, finishing ahead of them is
  assert.ok(rules.rows[0].rivals.every((r) => r.always));
  assert.deepEqual(rules.rows[2].rivals.map((r) => r.behindFrom), [4, 4]);
  // 5th: Lone Wolf can't finish below 107, Hellgate is level on 107 if 6th
  assert.deepEqual(rules.rows[4].rivals, [
    { teamCode: 'LWTC', behindFrom: null, always: false, levelFrom: 6 },
    { teamCode: 'HRR', behindFrom: 7, always: false, levelFrom: 6 },
  ]);
  // The title is out of reach
  assert.equal(outcomeRules(teams, 'ManTC', 1, 2, 1), null);
});

test('a win can still leave two teams level for the title (2026 Open Women B)', () => {
  const teams = [
    { teamCode: 'NYF', racePoints: [6, 8, 8, 10, 12, 12, 15, 15, 15, 15, 16] },
    { teamCode: 'ManTC', racePoints: [0, 0, 0, 0, 10, 15, 15, 15, 15, 15, 30] },
    ...fillers,
  ];
  // Promotion is certain, so there is nothing to work out for it
  assert.equal(outcomeRules(teams, 'ManTC', 1, 2, 2), null);
  const rules = outcomeRules(teams, 'ManTC', 1, 2, 1)!;
  assert.deepEqual(rules.rows.map((r) => [r.place, r.finalPoints, r.rivals[0].behindFrom, r.rivals[0].levelFrom]), [
    [1, 130, 3, 2],
    [2, 127, 4, null],
  ]);
});

test('in the last race, teams whose place is still open run faster, unless run from a lineup', () => {
  const runner = { projectedSeconds: Math.exp(8), chance: 1 };
  const listed: SimTeamInput = { ...team('L', 0, 0), lineup: { R: Array(5).fill(runner) } };
  const teams = [listed, team('A', 0, 0), team('B', -100, 0)];
  const plain = simulate(teams, oneRace, 'L', 2000, 1);
  const result = simulateSeason(teams, oneRace, 'L', 2000, 1, { ...DEFAULT_PARAMS, droppedRaces: 0 });
  // A is level with L going in; B is out of it
  assert.deepEqual(result.inFight, ['A']);
  const ratio = (code: number) => result.teams[code].races.R.medianAvgSeconds / plain.teams[code].races.R.medianAvgSeconds;
  assert.ok(Math.abs(ratio(1) - Math.exp(DEFAULT_PARAMS.lastRaceFightShift)) < 1e-6);
  assert.equal(ratio(2), 1);
  // With two races left nothing changes
  const twoLeft = [...oneRace, { ...oneRace[0], race: race('R2', '2026-12-08') }];
  const two = teams.map((t) => ({ ...t, fit: { ...t.fit, R2: t.fit.R }, fieldProb: { ...t.fieldProb, R2: 1 } }));
  assert.deepEqual(simulateSeason(two, twoLeft, 'L', 200, 1, DEFAULT_PARAMS).inFight, []);
});

test('the place being raced for follows how many teams move up', () => {
  assert.deepEqual([2025, 2026].map(promotionSpots), [2, 1]);
  // Two spots: the last promotion place while it is open, then the title
  assert.equal(goalLine({ pTop2: 0.35, pFirst: 0 }, 2), 2);
  assert.equal(goalLine({ pTop2: 1, pFirst: 0.4 }, 2), 1);
  // One spot: the title while it can be won, else 2nd place (which no longer brings promotion)
  assert.equal(goalLine({ pTop2: 1, pFirst: 0.4 }, 1), 1);
  assert.equal(goalLine({ pTop2: 0.35, pFirst: 0 }, 1), 2);
});
