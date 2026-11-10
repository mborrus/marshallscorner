# Training tracker (`/training`)

Shows the half-marathon plan (`content/training/plan.json`) and fills in what was actually run
from Strava. One owner, one password. Not linked from the site nav.

## Setup

1. **Plan.** Put the plan at `content/training/plan.json` (same shape as `plan.example.json`).
   Until it exists the page shows the example plan with a warning. Edit it by hand any time.
2. **Database.** Add a Neon / Vercel Postgres database to the Vercel project. It sets
   `DATABASE_URL` (or `POSTGRES_URL`; either works). Tables are created on first use.
3. **Strava app.** At strava.com/settings/api create an app. Set "Authorization Callback Domain"
   to the site's domain (`localhost` for local dev).
4. **Env vars on Vercel:**

   | Name | What |
   |---|---|
   | `TRAINING_PASSWORD` | the login password (also keys the calendar feed URL) |
   | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` | from the Strava app |
   | `STRAVA_VERIFY_TOKEN` | any random string, for the webhook |
   | `STRAVA_SUBSCRIPTION_ID` | optional, set after step 6 |
   | `TRAINING_TZ` | optional, default `America/New_York` |

5. Deploy, open `/training`, log in, click **Connect Strava** and allow private activities.
   The first sync runs right after.
6. **Webhook** (new runs arrive without opening the page). After deploying, run locally with the
   same Strava env vars:
   `npx tsx scripts/strava_webhook.ts create https://<site>/api/strava/webhook`,
   then set `STRAVA_SUBSCRIPTION_ID` to the id it prints.

## How it works

- `src/lib/training/plan.ts` – loads and checks plan.json, date helpers.
- `src/lib/training/match.ts` – matches Strava days to planned runs (pure, tested in
  `match.test.ts`; `npm test`). Rules are in the file header.
- `src/lib/training/strava.ts` – OAuth, token refresh, sync. Sync pulls everything since the plan
  start in one or two requests and removes activities deleted on Strava. Throttled in the DB:
  at most every 15 min on page load, every 1 min with "Sync now". No background polling.
- `src/middleware.ts` – password gate for `/training`, `/api/training/*`, `/api/strava/*`
  (except the webhook and the calendar feed, which check their own secrets).
- Overrides: the dropdown on each run pins it to a day or marks it skipped. They're stored by
  week start + run index, so reordering runs inside a week in plan.json moves the override.

## Apple Watch

A web app can't put structured workouts on the Watch (that needs a native iOS app using
WorkoutKit). What it does instead: `/training/plan.ics?key=...` (link at the bottom of the page)
is a calendar feed with each run, its miles and target pace. Subscribe to it on the iPhone
(Settings > Calendar > Accounts > Add Subscribed Calendar) and it shows on the Watch.

## Flags

- Week: actual > 110% of planned, or > 4 mi more than the week before -> "Ease off".
- Easy run faster than 8:00/mi -> "Too fast for easy".
