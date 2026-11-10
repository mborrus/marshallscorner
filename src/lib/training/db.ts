// Postgres connection (Neon / Vercel Postgres). Tables are created on first use.

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export function databaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

let client: ReturnType<typeof drizzle<typeof schema>> | null = null;
let ready: Promise<void> | null = null;

export async function getDb() {
  const url = databaseUrl();
  if (!url) throw new Error('DATABASE_URL is not set');
  if (!client) {
    const sql = neon(url);
    client = drizzle(sql, { schema });
    ready = (async () => {
      for (const stmt of DDL) await sql.query(stmt);
    })();
  }
  try {
    await ready;
  } catch (e) {
    client = null; // retry next time
    throw e;
  }
  return client!;
}

// Mirrors schema.ts. CREATE IF NOT EXISTS, so it's safe to run on every cold start.
const DDL = [
  `CREATE TABLE IF NOT EXISTS strava_tokens (
    id integer PRIMARY KEY DEFAULT 1,
    athlete_id bigint,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at bigint NOT NULL,
    last_sync_at timestamptz
  )`,
  `CREATE TABLE IF NOT EXISTS activities (
    strava_id bigint PRIMARY KEY,
    start_local text NOT NULL,
    sport_type text NOT NULL,
    distance_mi real NOT NULL,
    moving_time_s integer NOT NULL,
    avg_hr real,
    name text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS overrides (
    week_start date NOT NULL,
    run_index integer NOT NULL,
    activity_date date,
    skipped boolean NOT NULL DEFAULT false,
    PRIMARY KEY (week_start, run_index)
  )`,
];
