// Pulls a division's season from the NYRR results API into the shape the
// forecast model uses. Used by the build script, not at request time.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { PastScores, RaceHistory, RaceInfo, TeamSeason } from './model';

const BASE_URL = 'https://rmsprodapi.nyrr.org/api/v2';
// Set NYRR_CACHE_DIR to reuse responses between runs while developing
const CACHE_DIR = process.env.NYRR_CACHE_DIR;

// Same request within one run returns the same answer (the history and
// forecast steps ask for a lot of the same data)
const inFlight = new Map<string, Promise<unknown>>();

function post<T>(endpoint: string, body: object): Promise<T> {
  const key = endpoint + JSON.stringify(body);
  if (!inFlight.has(key)) {
    const request = fetchNyrr<T>(endpoint, body);
    // A failed request can be tried again
    request.catch(() => inFlight.delete(key));
    inFlight.set(key, request);
  }
  return inFlight.get(key) as Promise<T>;
}

async function fetchNyrr<T>(endpoint: string, body: object): Promise<T> {
  const payload = JSON.stringify(body);
  const cacheFile = CACHE_DIR
    ? path.join(CACHE_DIR, crypto.createHash('md5').update(endpoint + payload).digest('hex') + '.json')
    : null;
  if (cacheFile && fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json;charset=UTF-8' },
        body: payload,
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`NYRR ${endpoint} ${res.status}`);
      const data = await res.json();
      if (cacheFile) {
        fs.mkdirSync(CACHE_DIR!, { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(data));
      }
      return data;
    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

interface ApiEvent {
  eventCode: string;
  eventName: string;
  startDateTime: string;
  distanceUnitCode: string;
  isClubPointsPublished: boolean;
  points: number | null;
}

interface ApiTeam {
  teamCode: string;
  teamName: string;
  teamPlace: number;
  totalPoints: number;
  eventDetails?: ApiEvent[];
}

interface ApiAward {
  summaryTime: number;
  runnersCount: number;
}

const UNIT_METERS: Record<string, number> = { K: 1000, M: 1609.344 };

export function distanceMeters(unitCode: string): number {
  if (unitCode === 'MAR') return 42195;
  if (unitCode === 'HALF') return 21097.5;
  const m = unitCode.match(/^(\d+(?:\.\d+)?)(K|M)$/);
  if (!m) throw new Error(`Unknown distance ${unitCode}`);
  return parseFloat(m[1]) * UNIT_METERS[m[2]];
}

// "2026 TCS New York City Marathon" and "TCS New York City Marathon 2025" match
export function raceKey(eventName: string): string {
  return eventName.replace(/\b(19|20)\d{2}\b/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export interface ApiTeamRunner {
  runnerId: number;
  firstName: string;
  lastName: string;
  gender: string;
  overallTime: string;
  ageGradePercent: number | null;
}

// Every team member who finished a race, not just the scorers
export async function getTeamRunners(eventCode: string, teamCode: string): Promise<ApiTeamRunner[]> {
  const pageSize = 100;
  const all: ApiTeamRunner[] = [];
  for (let pageIndex = 1; ; pageIndex++) {
    const data = await post<{ totalItems: number; items: ApiTeamRunner[] }>('teams/teamRunners', {
      eventCode,
      teamCode,
      pageIndex,
      pageSize,
    });
    all.push(...data.items);
    if (all.length >= data.totalItems || data.items.length < pageSize) return all;
  }
}

export interface DivisionSeason {
  races: RaceInfo[];
  teams: TeamSeason[];
}

export async function getLatestYear(): Promise<number> {
  const { years } = await post<{ years: number[] }>('ClubStandings/getYears', {});
  return Math.max(...years);
}

export interface DivisionSummary {
  divisionCode: string;
  divisionName: string;
  divisionGender: string;
  teamResults: { teamCode: string }[];
}

export async function getDivisions(year: number): Promise<DivisionSummary[]> {
  return (await post<{ items: DivisionSummary[] }>('ClubStandings/getDivisionsResults', { year })).items;
}

export async function getDivisionTeams(year: number, divisionCode: string): Promise<ApiTeam[]> {
  const data = await post<{ items: ApiTeam[] }>('ClubStandings/getDivisionResults', { year, divisionCode });
  return data.items;
}

export async function getTeamCodes(year: number): Promise<Set<string>> {
  const data = await post<{ items: { teamCode: string }[] }>('ClubStandings/getTeams', { year });
  return new Set(data.items.map((t) => t.teamCode));
}

async function getAward(eventCode: string, teamCode: string, gender: string): Promise<ApiAward | null> {
  const data = await post<{ items: ApiAward[] }>('awards/teamAwards', {
    eventCode,
    teamCode,
    gender,
    minimumAge: '0',
  });
  return data.items[0] ?? null;
}

// log(average scorer time in seconds)
function awardScore(award: ApiAward): number {
  return Math.log(award.summaryTime / 1000 / award.runnersCount);
}

export async function collectDivision(
  year: number,
  divisionCode: string,
  gender: string
): Promise<DivisionSeason> {
  const apiTeams = await getDivisionTeams(year, divisionCode);
  const events = apiTeams[0]?.eventDetails ?? [];

  const races: RaceInfo[] = events.map((e) => {
    const maxPoints = Math.max(0, ...apiTeams.map((t) => t.eventDetails?.find((x) => x.eventCode === e.eventCode)?.points ?? 0));
    return {
      eventCode: e.eventCode,
      eventName: e.eventName,
      date: e.startDateTime,
      distanceMeters: distanceMeters(e.distanceUnitCode),
      multiplier: maxPoints > 15 || /CHAMPS/i.test(e.eventCode) ? 2 : 1,
      // A published race where nobody scored was dropped from the standings
      published: e.isClubPointsPublished && maxPoints > 0,
      scorers: 0,
    };
  });

  const published = races.filter((r) => r.published);
  const jobs = apiTeams.flatMap((t) => published.map((r) => ({ team: t.teamCode, race: r.eventCode })));
  const awards = await mapLimit(jobs, 8, ({ team, race }) => getAward(race, team, gender));
  const awardMap = new Map(jobs.map((j, i) => [`${j.team}|${j.race}`, awards[i]]));

  // A full team has as many scorers as the most any team had at that race
  for (const r of published) {
    r.scorers = Math.max(0, ...apiTeams.map((t) => awardMap.get(`${t.teamCode}|${r.eventCode}`)?.runnersCount ?? 0));
  }
  const scoreOf = (team: string, race: RaceInfo): number | null => {
    const award = awardMap.get(`${team}|${race.eventCode}`);
    return award && award.runnersCount >= race.scorers ? awardScore(award) : null;
  };

  const teams: TeamSeason[] = apiTeams.map((t) => ({
    teamCode: t.teamCode,
    teamName: t.teamName,
    place: t.teamPlace,
    totalPoints: t.totalPoints,
    races: Object.fromEntries(
      published.map((r) => [
        r.eventCode,
        {
          score: scoreOf(t.teamCode, r),
          points: t.eventDetails?.find((x) => x.eventCode === r.eventCode)?.points ?? 0,
        },
      ])
    ),
  }));

  return { races, teams };
}

// Did each team field a full team at this same race in earlier seasons?
// Also returns how many runners scored there most recently, and that event's code.
export async function collectHistory(
  race: RaceInfo,
  teamCodes: string[],
  gender: string,
  years: number[]
): Promise<{ history: Record<string, RaceHistory>; scorers: number; lastEventCode: string | null }> {
  const history: Record<string, RaceHistory> = Object.fromEntries(teamCodes.map((t) => [t, { fielded: 0, seasons: 0 }]));
  let scorers = 0;
  let lastEventCode: string | null = null;
  for (const year of years) {
    const match = (await clubRaces(year)).find((r) => raceKey(r.eventName) === raceKey(race.eventName));
    if (!match) continue;
    lastEventCode ??= match.eventCode;
    const existing = await getTeamCodes(year);
    const present = teamCodes.filter((t) => existing.has(t));
    const awards = await mapLimit(present, 8, (t) => getAward(match.eventCode, t, gender));
    const required = Math.max(0, ...awards.map((a) => a?.runnersCount ?? 0));
    scorers ||= required;
    present.forEach((t, i) => {
      history[t].seasons++;
      if (awards[i] && awards[i]!.runnersCount >= required) history[t].fielded++;
    });
  }
  return { history, scorers, lastEventCode };
}

export interface RosterResult {
  eventCode: string;
  eventName: string;
  distanceMeters: number;
  seconds: number;
  ageGrade: number | null; // percent
}

export interface RosterRunner {
  runnerId: number;
  firstName: string;
  lastName: string;
  results: RosterResult[];
}

export function runnerKey(r: { firstName: string; lastName: string }): string {
  return `${r.firstName} ${r.lastName}`.replace(/\s+/g, ' ').trim().toLowerCase();
}

function parseTime(t: string): number {
  return t.split(':').map(Number).reduce((s, x) => s * 60 + x, 0);
}

// Everyone of one gender who ran any of these races for the team.
// NYRR runner IDs are per race, so people are matched by name.
export async function collectRoster(teamCode: string, gender: string, races: RaceInfo[]): Promise<RosterRunner[]> {
  const lists = await mapLimit(races, 4, (r) => getTeamRunners(r.eventCode, teamCode));
  const roster = new Map<string, RosterRunner>();
  races.forEach((race, i) => {
    for (const r of lists[i]) {
      if (r.gender !== gender) continue;
      const key = runnerKey(r);
      const entry = roster.get(key) ?? {
        runnerId: r.runnerId,
        firstName: r.firstName.trim(),
        lastName: r.lastName.trim(),
        results: [],
      };
      entry.results.push({
        eventCode: race.eventCode,
        eventName: race.eventName,
        distanceMeters: race.distanceMeters,
        seconds: parseTime(r.overallTime),
        ageGrade: r.ageGradePercent,
      });
      roster.set(key, entry);
    }
  });
  return [...roster.values()];
}

// Names (by runnerKey) of a team's runners of one gender at a race
export async function raceAttendees(eventCode: string, teamCode: string, gender: string): Promise<Set<string>> {
  const list = await getTeamRunners(eventCode, teamCode);
  return new Set(list.filter((r) => r.gender === gender).map(runnerKey));
}

// Lineups are stored as hashes of runnerKey so sign-up lists aren't published
export function nameHash(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

// "Matt Whalen" and "Matthew Whalen" are the same runner when the last names
// match and the first names share their first three letters
export function sameRunner(a: string, b: string): boolean {
  if (a === b) return true;
  const [af, ...al] = a.split(' ');
  const [bf, ...bl] = b.split(' ');
  return al.join(' ') === bl.join(' ') && af.slice(0, 3) === bf.slice(0, 3);
}

// A season's club points races that have been scored (every division runs the same ones)
export async function clubRaces(year: number): Promise<RaceInfo[]> {
  const events = (await getDivisionTeams(year, 'AM'))[0]?.eventDetails ?? [];
  return events
    .filter((e) => e.isClubPointsPublished)
    .map((e) => ({
      eventCode: e.eventCode,
      eventName: e.eventName,
      date: e.startDateTime,
      distanceMeters: distanceMeters(e.distanceUnitCode),
      multiplier: /CHAMPS/i.test(e.eventCode) ? 2 : 1,
      scorers: 0,
      published: true,
    }));
}

// Each team's scores at the previous season's club races, whatever division it was in
export async function collectPastScores(year: number, teamCodes: string[], gender: string): Promise<PastScores> {
  const races = await clubRaces(year - 1);
  const jobs = teamCodes.flatMap((team) => races.map((race) => ({ team, race })));
  const awards = await mapLimit(jobs, 8, ({ team, race }) => getAward(race.eventCode, team, gender));
  const scores: PastScores['scores'] = {};
  for (const race of races) {
    const here = jobs.map((j, i) => ({ ...j, award: awards[i] })).filter((j) => j.race === race && j.award);
    race.scorers = Math.max(0, ...here.map((j) => j.award!.runnersCount));
    for (const { team, award } of here) {
      if (award!.runnersCount < race.scorers) continue;
      (scores[team] ??= {})[race.eventCode] = awardScore(award!);
    }
  }
  return { races, scores };
}

// "Half-Marathon", "10 kilometers", "5 miles" -> meters (null if unrecognized)
export function distanceFromName(name: string): number | null {
  if (/half/i.test(name)) return 21097.5;
  if (/marathon/i.test(name)) return 42195;
  const m = name.match(/(\d+(?:\.\d+)?)\s*(kilometers?|km|k|miles?|mi)\b/i);
  if (!m) return null;
  return parseFloat(m[1]) * (/^k/i.test(m[2]) ? 1000 : 1609.344);
}

// Every NYRR race a runner has run (not just club races), most recent first.
// Unlike team results, this runner ID does follow the person across races.
export async function getRunnerResults(runnerId: number): Promise<(RosterResult & { date: string })[]> {
  const data = await post<{
    items: { eventCode: string; eventName: string; distanceName: string; startDateTime: string; actualTime: string }[];
  }>('runners/races', { runnerId, pageIndex: 1, pageSize: 100 });
  return data.items.flatMap((r) => {
    const meters = distanceFromName(r.distanceName);
    return meters
      ? [{ eventCode: r.eventCode, eventName: r.eventName, distanceMeters: meters, seconds: parseTime(r.actualTime), ageGrade: null, date: r.startDateTime }]
      : [];
  });
}
