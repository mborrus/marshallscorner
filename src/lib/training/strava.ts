// Strava OAuth, token refresh and activity sync. Server only.

import { and, eq, gte, inArray, isNull, lt, notInArray, or, sql } from 'drizzle-orm';
import { getDb } from './db';
import { activities, stravaTokens } from './schema';
import { addDays, type Plan, planStart } from './plan';
import type { Activity } from './match';

const API = 'https://www.strava.com/api/v3';
const METERS_PER_MILE = 1609.344;
export const AUTO_SYNC_MINUTES = 15;
const MANUAL_SYNC_MINUTES = 1;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function authorizeUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env('STRAVA_CLIENT_ID'),
    redirect_uri: `${origin}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number };
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env('STRAVA_CLIENT_ID'),
      client_secret: env('STRAVA_CLIENT_SECRET'),
      ...body,
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Strava token request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function saveTokensFromCode(code: string): Promise<void> {
  const t = await tokenRequest({ code, grant_type: 'authorization_code' });
  const db = await getDb();
  const row = {
    id: 1,
    athleteId: t.athlete?.id ?? null,
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: t.expires_at,
  };
  await db.insert(stravaTokens).values(row).onConflictDoUpdate({ target: stravaTokens.id, set: row });
}

export type Connection = typeof stravaTokens.$inferSelect;

export async function getConnection(): Promise<Connection | null> {
  const db = await getDb();
  const rows = await db.select().from(stravaTokens).where(eq(stravaTokens.id, 1));
  return rows[0] ?? null;
}

export async function disconnect(): Promise<void> {
  const db = await getDb();
  await db.delete(stravaTokens);
}

/** A valid access token, refreshed when it's within a minute of expiring (they last ~6h). */
async function accessToken(): Promise<string> {
  const row = await getConnection();
  if (!row) throw new Error('Strava is not connected');
  if (row.expiresAt - 60 > Date.now() / 1000) return row.accessToken;
  const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: row.refreshToken });
  const db = await getDb();
  await db
    .update(stravaTokens)
    .set({ accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: t.expires_at })
    .where(eq(stravaTokens.id, 1));
  return t.access_token;
}

async function stravaGet<T>(pathAndQuery: string): Promise<T> {
  const res = await fetch(`${API}${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    cache: 'no-store',
  });
  if (res.status === 404) throw new NotFound();
  if (!res.ok) throw new Error(`Strava ${pathAndQuery} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

class NotFound extends Error {}

interface StravaActivity {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date_local: string; // local time, labelled "Z"
  distance: number; // meters
  moving_time: number;
  average_heartrate?: number;
}

function toRow(a: StravaActivity): Activity {
  return {
    stravaId: a.id,
    startLocal: a.start_date_local.replace(/Z$/, '').slice(0, 19),
    sportType: a.sport_type ?? a.type ?? 'Unknown',
    distanceMi: a.distance / METERS_PER_MILE,
    movingTimeS: a.moving_time,
    avgHr: a.average_heartrate ?? null,
    name: a.name,
  };
}

async function upsert(rows: Activity[]): Promise<void> {
  if (!rows.length) return;
  const db = await getDb();
  await db
    .insert(activities)
    .values(rows)
    .onConflictDoUpdate({
      target: activities.stravaId,
      set: {
        startLocal: sql`excluded.start_local`,
        sportType: sql`excluded.sport_type`,
        distanceMi: sql`excluded.distance_mi`,
        movingTimeS: sql`excluded.moving_time_s`,
        avgHr: sql`excluded.avg_hr`,
        name: sql`excluded.name`,
      },
    });
}

/**
 * Pulls every activity since the plan started and makes the table match Strava
 * (upserts, and removes activities deleted on Strava).
 * Throttled: at most once per 15 min (auto) or once a minute (Sync now button).
 * Returns null when skipped by the throttle.
 */
export async function syncActivities(plan: Plan, opts: { manual?: boolean } = {}): Promise<number | null> {
  const db = await getDb();
  const minutes = opts.manual ? MANUAL_SYNC_MINUTES : AUTO_SYNC_MINUTES;
  const before = await getConnection();
  if (!before) throw new Error('Strava is not connected');

  // Claim the sync slot so overlapping page loads don't both call Strava
  const claimed = await db
    .update(stravaTokens)
    .set({ lastSyncAt: sql`now()` })
    .where(
      and(
        eq(stravaTokens.id, 1),
        or(isNull(stravaTokens.lastSyncAt), lt(stravaTokens.lastSyncAt, sql`now() - make_interval(mins => ${minutes})`))
      )
    )
    .returning({ id: stravaTokens.id });
  if (!claimed.length) return null;

  try {
    const start = planStart(plan);
    const after = Math.floor(Date.parse(`${addDays(start, -1)}T00:00:00Z`) / 1000);
    const rows: Activity[] = [];
    for (let page = 1; page <= 20; page++) {
      const batch = await stravaGet<StravaActivity[]>(`/athlete/activities?after=${after}&per_page=200&page=${page}`);
      rows.push(...batch.map(toRow));
      if (batch.length < 200) break;
    }
    const inPlan = rows.filter((r) => r.startLocal >= start);
    await upsert(inPlan);
    const ids = inPlan.map((r) => r.stravaId);
    await db
      .delete(activities)
      .where(ids.length ? and(gte(activities.startLocal, start), notInArray(activities.stravaId, ids)) : gte(activities.startLocal, start));
    return inPlan.length;
  } catch (e) {
    // Give the slot back so the next page load can retry
    await db.update(stravaTokens).set({ lastSyncAt: before.lastSyncAt }).where(eq(stravaTokens.id, 1));
    throw e;
  }
}

/** Webhook: fetch one activity and store it (or remove it if it's gone). */
export async function syncOneActivity(id: number): Promise<void> {
  try {
    const a = await stravaGet<StravaActivity>(`/activities/${id}`);
    await upsert([toRow(a)]);
  } catch (e) {
    if (e instanceof NotFound) await deleteActivity(id);
    else throw e;
  }
}

export async function deleteActivity(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(activities).where(inArray(activities.stravaId, [id]));
}

export async function loadActivities(plan: Plan): Promise<Activity[]> {
  const db = await getDb();
  const rows = await db.select().from(activities).where(gte(activities.startLocal, planStart(plan)));
  return rows;
}
