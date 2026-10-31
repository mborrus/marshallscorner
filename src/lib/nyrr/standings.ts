// NYRR club points standings, fetched live from the NYRR results API
// (same endpoints as the nyrr-results-api package).

const BASE_URL = 'https://rmsprodapi.nyrr.org/api/v2/ClubStandings';

// Re-fetch at most every 6 hours
const REVALIDATE_SECONDS = 60 * 60 * 6;

export const TEAM_CODE = 'ManTC';

export interface EventPoints {
  eventCode: string;
  eventName: string;
  startDateTime: string;
  points: number | null;
  isClubPointsPublished: boolean;
}

export interface TeamResult {
  teamCode: string;
  teamName: string;
  teamPlace: number;
  totalPoints: number;
  eventDetails?: EventPoints[];
}

export interface Division {
  divisionCode: string;
  divisionName: string;
  divisionGender: string;
  divisionOrder: number;
  teamResults: TeamResult[];
}

async function post<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(body),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`NYRR ${endpoint} failed: ${res.status}`);
  return res.json();
}

export async function getLatestYear(): Promise<number> {
  const data = await post<{ years: number[] }>('getYears', {});
  return Math.max(...data.years);
}

export async function getDivisions(year: number): Promise<Division[]> {
  const data = await post<{ items: Division[] }>('getDivisionsResults', { year });
  return data.items.sort((a, b) => a.divisionOrder - b.divisionOrder);
}

// Same as a division from getDivisions, but each team includes per-race points
export async function getDivisionDetail(divisionCode: string, year: number): Promise<TeamResult[]> {
  const data = await post<{ items: TeamResult[] }>('getDivisionResults', { year, divisionCode });
  return data.items;
}

export function displayDivisionName(name: string): string {
  return name.replace(/\s*Standings$/i, '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
