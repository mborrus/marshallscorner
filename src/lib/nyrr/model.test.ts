// Run with: npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  courseOffset,
  expectedPointsIfFielded,
  fieldProbability,
  pointsForPlace,
  projectRunner,
  runnerAttendance,
  seasonAsOf,
  simulate,
  type RaceInfo,
  type SimRaceInput,
  type SimTeamInput,
  type TeamSeason,
} from './model';
import { distanceFromName, distanceMeters, raceKey, sameRunner } from './collect';
import { shortEventName } from './format';

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
    races: { A: { score: 7, points: 15 }, B: { score: 7, points: 15 } },
  };
  const never: TeamSeason = { ...always, races: {} };
  assert.ok(fieldProbability(always, [], undefined) > 0.75);
  assert.ok(fieldProbability(always, races, undefined) > fieldProbability(never, races, undefined));
  assert.ok(fieldProbability(never, races, { fielded: 2, seasons: 2 }) > fieldProbability(never, races, undefined));
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
    A: { score: a, points: 0 }, B: { score: b, points: 0 }, C: { score: c, points: 0 },
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
