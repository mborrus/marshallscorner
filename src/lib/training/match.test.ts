// Run with: npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayTotals, matchPlan, matchWeek, type Activity } from './match';
import { loadPlan, parseDays, totalPlannedMiles, weekPlannedMiles, type PlanWeek } from './plan';

let nextId = 1;
function act(startLocal: string, miles: number, paceMin = 9, sportType = 'Run', avgHr: number | null = 150): Activity {
  return {
    stravaId: nextId++,
    startLocal,
    sportType,
    distanceMi: miles,
    movingTimeS: Math.round(miles * paceMin * 60),
    avgHr,
    name: 'Run',
  };
}

// Week of Mon 2026-11-16
const WEEK: PlanWeek = {
  start: '2026-11-16',
  runs: [
    { day: 'Tue', kind: 'easy', miles: 5 },
    { day: 'Wed', kind: 'mtc', miles: 7 },
    { day: 'Fri', kind: 'easy', miles: 5 },
    { day: 'Sat', kind: 'long', miles: 12 },
    { day: 'Sun', kind: 'extra', miles: 3 },
  ],
};
const AFTER = '2026-11-30'; // "today" well after the week

test('parseDays handles single and either/or days', () => {
  assert.deepEqual(parseDays('Tue'), [1]);
  assert.deepEqual(parseDays('Sat/Sun'), [5, 6]);
  assert.deepEqual(parseDays(''), []);
});

test('race day with three activities counts as one run', () => {
  const race: PlanWeek = {
    start: '2027-03-15',
    runs: [
      { day: 'Tue', kind: 'easy', miles: 4 },
      { day: 'Sun', kind: 'race', miles: 13.1 },
    ],
  };
  const acts = [
    act('2027-03-16T07:00:00', 4),
    act('2027-03-21T06:30:00', 2, 9.5), // warm-up
    act('2027-03-21T07:30:00', 13.1, 6.9), // race
    act('2027-03-21T09:15:00', 1.5, 10), // cool-down
    act('2027-03-21T14:00:00', 10, 3, 'Ride'), // not a run
  ];
  const { rows, unplanned } = matchWeek(race, dayTotals(acts), [], '2027-03-22');
  assert.equal(rows[1].status, 'done');
  assert.equal(rows[1].actual?.miles, 16.6);
  assert.equal(rows[1].actual?.activities.length, 3);
  assert.equal(unplanned.length, 0);
});

test('long run moved from Saturday to Sunday', () => {
  const acts = [
    act('2026-11-17T07:00:00', 5),
    act('2026-11-18T07:00:00', 7, 7.5),
    act('2026-11-20T07:00:00', 5),
    act('2026-11-22T08:00:00', 12.3, 8.2), // Sunday, the planned extra day
  ];
  const { rows, unplanned } = matchWeek(WEEK, dayTotals(acts), [], AFTER);
  const long = rows[3];
  assert.equal(long.status, 'done');
  assert.equal(long.actual?.date, '2026-11-22');
  assert.equal(long.matchedBy, 'long');
  assert.equal(rows[4].status, 'optional'); // extra not done, not missed
  assert.equal(unplanned.length, 0);
});

test('skipped extra run is optional, not missed', () => {
  const acts = [
    act('2026-11-17T07:00:00', 5),
    act('2026-11-18T07:00:00', 7),
    act('2026-11-20T07:00:00', 5),
    act('2026-11-21T07:00:00', 12),
  ];
  const { rows } = matchWeek(WEEK, dayTotals(acts), [], AFTER);
  assert.deepEqual(
    rows.map((r) => r.status),
    ['done', 'done', 'done', 'done', 'optional']
  );
  assert.ok(rows.every((r) => r.status !== 'missed'));
});

test('week with an unplanned run', () => {
  const acts = [
    act('2026-11-16T07:00:00', 3), // Monday shakeout, not in plan
    act('2026-11-17T07:00:00', 5),
    act('2026-11-18T07:00:00', 7),
    act('2026-11-20T07:00:00', 5),
    act('2026-11-21T07:00:00', 12),
    act('2026-11-22T07:00:00', 3),
  ];
  const { rows, unplanned } = matchWeek(WEEK, dayTotals(acts), [], AFTER);
  assert.ok(rows.every((r) => r.status === 'done'));
  assert.deepEqual(
    unplanned.map((d) => d.date),
    ['2026-11-16']
  );
});

test('missed run, upcoming run, and the easy-pace flag', () => {
  const acts = [act('2026-11-17T07:00:00', 5, 7.5)]; // Tue easy at 7:30/mi
  const { rows } = matchWeek(WEEK, dayTotals(acts), [], '2026-11-19'); // Thursday
  assert.equal(rows[0].status, 'done');
  assert.deepEqual(rows[0].flags, ['Too fast for easy']);
  assert.equal(rows[1].status, 'missed'); // Wed passed
  assert.equal(rows[2].status, 'upcoming'); // Fri
  assert.equal(rows[3].status, 'upcoming'); // Sat
});

test('a day off the planned weekday fills a missing run by closest miles', () => {
  const acts = [
    act('2026-11-17T07:00:00', 5),
    act('2026-11-19T07:00:00', 6.8), // Thu instead of Wed
    act('2026-11-20T07:00:00', 5),
    act('2026-11-21T07:00:00', 12),
  ];
  const { rows } = matchWeek(WEEK, dayTotals(acts), [], AFTER);
  assert.equal(rows[1].actual?.date, '2026-11-19');
  assert.equal(rows[1].matchedBy, 'miles');
});

test('overrides win', () => {
  const acts = [act('2026-11-17T07:00:00', 5), act('2026-11-18T07:00:00', 7)];
  const { rows, unplanned } = matchWeek(
    WEEK,
    dayTotals(acts),
    [
      { weekStart: '2026-11-16', runIndex: 0, activityDate: null, skipped: true },
      { weekStart: '2026-11-16', runIndex: 2, activityDate: '2026-11-17', skipped: false },
    ],
    AFTER
  );
  assert.equal(rows[0].status, 'skipped');
  assert.equal(rows[2].actual?.date, '2026-11-17');
  assert.equal(rows[2].matchedBy, 'override');
  assert.equal(unplanned.length, 0);
});

test('week flags: over plan and big jump', () => {
  const plan = {
    weeks: [
      { start: '2026-11-09', runs: [{ day: 'Sat', kind: 'long' as const, miles: 10 }] },
      { start: '2026-11-16', runs: [{ day: 'Sat', kind: 'long' as const, miles: 10 }] },
    ],
  };
  const acts = [act('2026-11-14T07:00:00', 10), act('2026-11-21T07:00:00', 12), act('2026-11-22T07:00:00', 3)];
  const [w1, w2] = matchPlan(plan, acts, [], AFTER);
  assert.deepEqual(w1.flags, []);
  assert.equal(w2.actualMiles, 15);
  assert.equal(w2.flags.length, 2);
});

test('plan file loads and totals add up per week', () => {
  const { plan } = loadPlan();
  const sum = plan.weeks.reduce((s, w) => s + weekPlannedMiles(w), 0);
  assert.equal(totalPlannedMiles(plan), Math.round(sum * 10) / 10);
  assert.ok(plan.weeks.every((w, i) => i === 0 || w.start > plan.weeks[i - 1].start));
});
