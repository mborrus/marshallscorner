// Database tables for the training tracker (Postgres via Drizzle).

import { bigint, boolean, date, integer, pgTable, primaryKey, real, text, timestamp } from 'drizzle-orm/pg-core';

// One row (id = 1): the owner's Strava tokens and when we last synced.
export const stravaTokens = pgTable('strava_tokens', {
  id: integer('id').primaryKey().default(1),
  athleteId: bigint('athlete_id', { mode: 'number' }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(), // unix seconds
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
});

export const activities = pgTable('activities', {
  stravaId: bigint('strava_id', { mode: 'number' }).primaryKey(),
  startLocal: text('start_local').notNull(), // "YYYY-MM-DDTHH:MM:SS", local time
  sportType: text('sport_type').notNull(),
  distanceMi: real('distance_mi').notNull(),
  movingTimeS: integer('moving_time_s').notNull(),
  avgHr: real('avg_hr'),
  name: text('name').notNull(),
});

// Manual fixes: point a planned run at a date, or mark it skipped.
export const overrides = pgTable(
  'overrides',
  {
    weekStart: date('week_start', { mode: 'string' }).notNull(),
    runIndex: integer('run_index').notNull(),
    activityDate: date('activity_date', { mode: 'string' }),
    skipped: boolean('skipped').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.weekStart, t.runIndex] })]
);
