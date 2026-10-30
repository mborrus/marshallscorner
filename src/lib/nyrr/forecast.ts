// Shape of the generated NYRR forecast, and how the page reads it

import fs from 'fs';
import path from 'path';
import type { NeedsRow, ScenarioCell } from './model';

export const FORECAST_PATH = path.join(process.cwd(), 'content', 'nyrr', 'generated', 'forecast.json');
export const LINEUPS_PATH = path.join(process.cwd(), 'content', 'nyrr', 'lineups.json');

// Who a team has signed up for a race. Runner names are hashed (see nameHash).
export interface Lineup {
  year: number;
  race: string; // raceKey of the event name
  team: string;
  // 'signed-up': committed to racing; 'asked': invited, not confirmed
  kind: LineupKind;
  runners: string[];
  unmatched: number;
  updated: string;
}

export type LineupKind = 'signed-up' | 'asked';

export function readLineups(): Lineup[] {
  if (!fs.existsSync(LINEUPS_PATH)) return [];
  const lineups: Lineup[] = JSON.parse(fs.readFileSync(LINEUPS_PATH, 'utf8')).lineups ?? [];
  return lineups.map((l) => ({ ...l, kind: l.kind ?? 'signed-up' }));
}

export interface ForecastRace {
  eventCode: string;
  eventName: string;
  date: string;
  distanceMeters: number;
  scorers: number;
  multiplier: number;
}

export interface ForecastTeam {
  teamCode: string;
  teamName: string;
  place: number;
  points: number;
  pFirst: number;
  pTop2: number;
  meanPoints: number;
  p10Points: number;
  p90Points: number;
  placeDistribution: number[];
  races: Record<string, { pField: number; medianAvgSeconds: number; pWin: number }>;
}

export interface ForecastRunner {
  name: string;
  racesRun: number;
  best: { eventName: string; seconds: number; distanceMeters: number };
  // Per remaining race, keyed by event code
  projected: Record<string, number>;
  // Usual chance of racing it, from races run this season and last year's attendance
  chance: Record<string, number>;
  ranLastYear: Record<string, boolean>;
}

// One team's race and where it stood afterwards
export interface HistoryTeamRace {
  teamCode: string;
  racePlace: number | null; // place among the division's full teams; null = no full team
  avgSeconds: number | null; // team's average scorer time
  points: number;
  total: number;
  standing: number;
  // Promotion / title odds the model would have given right after this race
  pTop2: number;
  pFirst: number;
}

export interface HistoryRace {
  eventCode: string;
  eventName: string;
  date: string;
  scorers: number;
  multiplier: number;
  teams: HistoryTeamRace[];
  // Focus team's finishers at this race, fastest first
  focusRunners: { name: string; seconds: number; scored: boolean }[];
  // How close the focus team was to the next place up and down (average seconds
  // per scorer, and the points at stake), or what it likely missed without a full team
  focusMargins: {
    ahead?: { teamCode: string; seconds: number; points: number };
    behind?: { teamCode: string; seconds: number; points: number };
    missed?: { points: number; place: number };
  };
}

export interface DivisionForecast {
  divisionCode: string;
  divisionName: string;
  gender: string;
  racesDone: number;
  remainingRaces: ForecastRace[];
  teams: ForecastTeam[];
  needs: NeedsRow[];
  scenarios: ScenarioCell[];
  runners: ForecastRunner[];
  rosterSize: number;
  // Per race with a known lineup for the focus team
  lineups: Record<string, { kind: LineupKind; signedUp: number; unmatched: number; updated: string }>;
  // Standings race by race, as recorded now (later NYRR corrections are included)
  history: HistoryRace[];
  // Focus team's runners this season, most times scored first
  leaderboard: LeaderboardRow[];
}

export interface LeaderboardRow {
  name: string;
  races: number;
  scored: number;
  bestAgeGrade: { percent: number; eventName: string } | null;
}

export interface Forecast {
  generatedAt: string;
  year: number;
  sims: number;
  divisions: DivisionForecast[];
}

export function readForecast(): Forecast | null {
  try {
    return JSON.parse(fs.readFileSync(FORECAST_PATH, 'utf8'));
  } catch {
    return null;
  }
}
