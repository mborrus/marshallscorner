# NYRR Team Standings & Promotion Forecast — Notes

Everything learned building `/nyrr` (Oct 2026), so the next round of work starts from here.
Focus team: **Manhattan Track Club (`ManTC`)**, in **Open Men B** and **Open Women B**.
**Top 2 in a division get promoted** to the next level (A).

## Where things live

| What | Where |
|---|---|
| Page (tabs, live standings, race-by-race) | `src/app/nyrr/page.tsx` |
| Forecast view, range chart, tabs | `src/app/nyrr/ForecastView.tsx`, `RangeChart.tsx`, `DivisionTabs.tsx`, `PointsChart.tsx` |
| Live standings fetch (ISR, 6h) | `src/lib/nyrr/standings.ts` |
| Model + simulation (pure functions, all tuned constants) | `src/lib/nyrr/model.ts` |
| NYRR API data collection | `src/lib/nyrr/collect.ts` |
| Forecast/lineup types + readers | `src/lib/nyrr/forecast.ts` |
| Build step → `content/nyrr/generated/forecast.json` | `scripts/build_nyrr_forecast.ts` (`npm run build:nyrr`, part of `prebuild`) |
| Team sign-up / asked lists (hashed names) | `content/nyrr/lineups.json`, written by `scripts/nyrr_lineup.ts` |
| Backtests and calibration analyses | `scripts/nyrr_research/` (see bottom) |

Tests: `npm test` (node's test runner via tsx; `src/lib/nyrr/*.test.ts`) covers scoring, ties,
odds summing to 2 and 1, lineups, as-of seasons, turnout, projections, course and name matching.

The build checks the forecast before writing it (odds add up, values in range, every remaining
race has a predicted time, history covers every completed race) and gives up after 5 minutes. On any
failure it keeps the last good `forecast.json` and the site build continues.

`NYRR_YEAR=2025 npm run build:nyrr` rebuilds a past season (useful for checking a finished season or a
big division). MTC was in the C divisions in 2025 (~300 teams each; men 2nd, women 1st, so both were
promoted to B for 2026). The fit and the simulation's standings are written to stay fast for divisions that
size (indexed observations, one sort per simulated season); a 2025 C-division rebuild takes ~2 minutes.

The live standings refresh every 6h; the forecast refreshes on deploy and from the weekly job below.

**Weekly job** (`.github/workflows/nyrr-weekly.yml`, Tuesdays 15:17 UTC, plus a manual "Run workflow"
button; scheduled runs only happen once it's on `main`): `scripts/nyrr_snapshot.ts` fetches MTC's divisions
(points per team per race) and saves `content/nyrr/snapshots/<date>.json` only if it differs from the
latest one. No change → the job stops there (no rebuild, commit or deploy). Change → `npm run build:nyrr`
and one commit of `content/nyrr`, whose push triggers a Vercel deploy. ~30s without changes, ~1 min with.
The snapshots are the "as posted" record that NYRR doesn't keep (first one: Oct 30, 2026). If new results are
out, the page shows a "forecast is out of date" note. If NYRR is unreachable at build time,
the last committed `forecast.json` is kept.

## NYRR API (`https://rmsprodapi.nyrr.org/api/v2`, all POST JSON)

Same endpoints as the `mborrus/nyrr-results-api` package; the site calls them with `fetch` directly.

- `ClubStandings/getYears`, `getDivisionsResults {year}` (all divisions, no per-race detail),
  `getDivisionResults {year, divisionCode}` (per-race points in `eventDetails`), `getTeams {year}`.
- `awards/teamAwards {eventCode, teamCode, gender, minimumAge:"0"}` → team score:
  `summaryTime` (ms, sum of scorers) and `runnersCount`. Empty when no full team.
- `awards/teamAwardRunners {eventCode, teamCode, teamGender, teamMinimumAge}` → the scorers only.
- `teams/teamRunners {eventCode, teamCode, pageIndex, pageSize}` → **every** team finisher
  (both genders; filter by `gender`). `eventCode` is required. Max useful `pageSize` 100.
- `runners/races {runnerId}` → all of a runner's NYRR races (not used yet; could improve projections).

Quirks:
- **`runnerId` is per race result, not per person.** Match people by name (`runnerKey`).
- Names vary: Matt/Matthew, Jackie/Jacqueline, Kim/Kimberly, Howie/Howard. `sameRunner()`
  matches same last name + first 3 letters of first name.
- Upcoming events have `_draft` codes (`M2026_draft`, `26TC15K_draft`); codes may change when published.
  Match races across years by `raceKey(eventName)` (strips years).
- A race can be "published" with 0 points for everyone (2025 SI Half `25SIHALF_draft`) — treat as dropped.
- Python `urllib` gets **403 without a User-Agent**; curl and Node fetch are fine.
- Division "C" includes hundreds of teams; leave it out of calibration.
- In the cloud dev container, Node needs `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
  Set `NYRR_CACHE_DIR` to cache API responses between runs.

## Scoring rules (verified against standings)

- Team places within a division score **15, 12, 10, 8, 6, 5, 4, 3, 2, 1**; full teams placing
  11th+ get **1**; no full team gets **0** (one oddity: MTC men got 1 pt at 2026 Queens 10K
  without an award row).
- Team score = combined time of the top N team finishers of that gender. **N = 5 at most races,
  3 at the NYC Marathon, 10 at the Team Championships.**
- **Team Championships count double** (30, 24, 20, …).
- Ties share a place in the standings (e.g. 60W 2026). Promotion tie-break unknown → the sim splits ties evenly.
- One unexplained case: URC at 2026 Team Champs placed 2nd on time but got 12 pts (probably a DQ).
- 2026 remaining races (as of Oct 24): **NYC Marathon (Nov 1)** and **Ted Corbitt 15K (Dec 5)**.
  Both counted in 2022–2025 too.

## The model

### Team strength (team level)
- Per race, team score `x = log(average scorer time)`. Fit `x = teamStrength + raceEffect`
  (weighted alternating least squares) so course/weather/distance drop out.
- Data: this season's races **plus last season's** (`collectPastScores`: every current team's
  scores at last year's club races, whatever division it was in).
- Weights: recency half-life **90 days** × distance similarity `exp(-|log(D_target/D)| / 1.5)`.
  With 90 days, last season counts a lot before the first races and fades to almost nothing.
- Team noise = shrunk residual SD (prior of 3 races at `teamSigmaPrior` 0.045; residual degrees of
  freedom = races − 1) + strength standard error.
- Target race time level: Riegel (exponent 1.06) from the most similar races, plus a per-course
  offset (`COURSE_OFFSETS`) or the marathon offset (−3.2%, negative because only 3 scorers count).

### Key findings that shaped it
1. **Teams bunch up at the marathon.** Only ~60% of the gap between teams carries over
   (`strengthScaleMarathon = 0.6`; 0.57 before last season's data was added); the 15K keeps ~100%. Strong teams run ~4% slower than
   their form, weak teams ~2% faster. Ignoring this made the first version say Men B needed a
   **2:28** top-3 average to win the marathon; real Men B winners were 2:44 / 2:49 / 2:35 / 2:38
   (2022–2025). After the fix every B-division winner fell inside the model's 10–90% range.
2. Extra race-day noise on top of team consistency: marathon 0.031, other 0.02 (log scale).
   **The marathon differs by division level** (`paramsForDivision`, 8 marathons each, 2022–2025):
   A teams carry ~74% of their gap into the marathon (extra noise 0.02, level −0.4%), B teams only ~32%
   (B women ~19%; extra noise 0.04, level −5.1%). Separate settings left promotion odds the same but fixed
   A-division winning times (were 3–7 min too fast) and cut the time-level error 0.038 → 0.031.
3. **Turnout matters a lot** and team history at the *same race* is the best predictor
   (`historyWeight = 6`: a past season at that race counts like 6 of this season's races).
   Participation Brier went 0.115 (no history) → 0.088.
4. Backtest (2022–2025 A+B, from the pre-marathon point): final top-2 Brier **0.020** vs
   **0.027** for "current top 2". 50/50 calls came true about half the time.

### Whole-season backtest (`season_backtest.ts`, Oct 30)
Replays every 2022–2025 A/B season race by race: promotion odds after each race vs final top 2, and
each team's predicted time and turnout at the next race.

| Races left | Model Brier | "Current top 2" Brier |
|---|---|---|
| 1–2 | 0.019 | 0.029 |
| 3–5 | 0.024 | 0.033 |
| 6–8 | 0.035 | 0.083 |
| 9+ | 0.069 | 0.142 |

What it found and what changed:
- **One-race bug:** with one race of data a team's spread came out as zero, so next-race time
  predictions were 2.2× too confident. Fixed with a fixed prior spread and races − 1 degrees of freedom.
- **Turnout was underpredicted early** (61% vs 79% actual after race 1) because the formula started from
  50%. Now starts from 80% (`turnoutPrior`). Turnout Brier after race 1: 0.153 → 0.116.
- **Teams written off early** (no full team in the first races → assumed weakest; URC 2022, WSX 2023,
  LWTC 2023 later went top 2). Adding last season's results fixed most: early log-loss 0.274 → 0.227,
  confident early misses 5 → 1. Overall season log-loss 0.124 → 0.114.
- Recency half-life: 90 days beat 120 and 180; 60–75 about the same.
- **Tried and dropped (made things worse):** a season-long turnout slump per team (correlated turnout),
  and form that drifts race to race. The one big late collapse (team "101", 2024 Women B: led 82–53 after
  Team Champs, finished 3rd after skipping races) looks like a one-off.
- Overall calibration is good; remaining weak spot: calls above 98% are right ~95% of the time.
- **Courses have stable personalities** (team time vs Riegel from similar races, ±~2% year to year):
  5th Ave Mile −6%, Brooklyn Half −5%, NYC Half −3%, Bronx 10M −2%, Queens 10K −1.4%, Team Champs +1%,
  SI Half +3%, Harlem 5K +3.4%, Ted Corbitt +4.3%. These only move predicted times, not odds.

### Runner-level findings (2023–2025 A+B rosters, ~18,000 runner-seasons)
Chance a runner races it for the team, by club races run before the marathon:

| Races | Marathon (no / yes ran it last year) | Corbitt 15K (no / yes) |
|---|---|---|
| 1 | 19% / 36% | 4% / 14% |
| 2 | 30% / 53% | 8% / 24% |
| 3 | 34% / 64% | 11% / 27% |
| 4–5 | 40% / 73% | 15% / 36% |
| 6–7 | 48% / 85% | 26% / 47% |
| 8+ | 54% / 90% | 56% / 74% |

- **Speed doesn't predict marathon attendance** (fastest regulars ~50%, same as others). At the
  15K, faster runners attend a bit more (29% vs 17%).
- **31% of marathon team scorers had not run a single earlier club race that year for the team**
  (14% at the Corbitt). Half of all team marathon finishers are "unknowns". So rosters can't
  predict marathon lineups.
- Result: adding runner-level turnout to team turnout **hurt** at the marathon in every test
  year (weight 0) and **helped slightly** at the 15K in every test year (weight 0.25).
- Individual times vs straight Riegel 1.06 projection: marathon **+6.4%** slower (median), 15K **+1.7%**.
  The marathon penalty is about the same projecting from a 5K (+6.1%), 10K (+6.7%) or half (+5.5%), so it's
  a "marathons are hard" effect, applied only to results at least 1.3x shorter (not to a past marathon).
- `runners/races` (person-level history, incl. non-club races) is used when a runner has no comparable club
  result this season: their comparable NYRR races in the 13 months before. Tested on 2024–2025
  (`fallback_projection.ts`): marathon error spread 0.149 → 0.127 (361 runners), 15K median abs error
  10.6% → 3.3% (18 runners). 18 months let stale results override fresh form.
  Residual spread is skewed (blow-ups); the sim samples empirical quantiles (`RUNNER_RESIDUALS`).
- Simulating a team's top-k from its finishers this way is unbiased for 3–15 finishers
  (−1% to +0.6%), ~82% of real team scores inside the 10–90% range. Slightly fast (+2%) for 16+.

### Known lineups (`content/nyrr/lineups.json`)
- When MTC's list for a race exists, MTC is simulated **runner by runner** for that race; other
  teams stay team-level.
- `signed-up` list: listed runners 85% to finish; unlisted roster runners keep 25% of their usual chance.
- `asked` list (invited, not confirmed): listed runners max(50%, usual); everyone else keeps their usual chance.
  **The 50% is an uncalibrated assumption.**
- Names are stored as SHA-256 hashes of `runnerKey` because the repo is public and lists come from a
  private team app. **The page never shows who is on a list** (Marshall's call, Oct 30): no marks, the
  runner table shows each runner's usual history-based chance (not the list-adjusted one), sorts by
  projected time, leaves out list-only runners who haven't raced this year, and per-runner scoring shares
  stay out of `forecast.json`. Only counts ("9 signed up") appear. The lists still drive the team odds.
- Signed-up runners not on this year's roster are pulled from last year's MTC results.
- Update: `npx tsx scripts/nyrr_lineup.ts [--asked] 2026 "TCS New York City Marathon" ManTC "Name" ...`
  (re-running replaces that race's list; it prints who matched).

## Snapshot (Oct 24, 2026, with lineups)

- **Men B:** MTC 4th, 97 pts (Rebeldes 133, Hellgate 105, Lone Wolf 102). Promotion ~7%.
  Marathon sign-ups (9 matched men) project ~2:51 top-3 average; Greg F. and Joe D. (fastest)
  not signed up. Winning the marathon needs ~2:35:30. MTC is competitive at the 15K
  (~57:27 vs Rebeldes 56:58) if the asked group shows.
- **Women B:** MTC 2nd, 100 pts (NY Flyers 126, POLSKA 92, UES 84). Promotion ~95%. Main risk
  was not fielding 3 at the marathon; the sign-up list removes it.
- 2 names on the marathon list had no MTC results since 2024 and aren't counted.
- **Oct 30 update** (after recalibration, last-season data, B-division marathon settings, runner fallback):
  men ~6%, women ~91%. Marathon is close to a toss-up in B (Rebeldes win it ~20%, MTC men ~3% with the
  signed-up lineup). Men: winning the marathon → ~51% promotion; winning both races → ~92%. Women: any full
  team at the Corbitt → ~100%; with no Corbitt team it depends on the marathon (5th → ~44%).

## Season history (standings at each point in time)

Each division's `history` in `forecast.json` (built by `buildHistory` in the build script) has, for every
completed race: each team's race place among full teams, team average time, points, running total,
standing after the race, and the promotion/title odds the model would have given right then (team model
only, 10,000 sims, no lineups). Plus MTC's finishers at that race and who scored. The page shows it as an
odds-over-time chart and a race picker (`src/app/nyrr/SeasonHistory.tsx`).

- This is "as recorded now": built from today's per-race points and results. NYRR has no change log, so
  what the site showed on a given day (before any corrections) can't be recovered. The weekly job's
  snapshots capture it from Oct 30, 2026 on.
- Early-season odds were checked in the whole-season backtest (above) and improved with last season's data.
  With last season included, MTC women start at 69% after race 1 (they were strong in 2025) instead of 0%.
- `focusMargins` per race: seconds per scorer to the team one place up/down and the points at stake, or for a
  race without a full team, the points a typical MTC team would likely have scored
  (`expectedPointsIfFielded`: MTC's form going in vs the other teams' actual times that day). The page sums
  these as "points left on the table" and lists close calls (under 20s per runner from the next place up).
- 2026 (Oct 30): MTC men left ~17 pts on the table (Queens 10K, 5th Ave Mile) and are 8 pts from 2nd; close
  calls 5s/runner at Run as One and 14s at the SI Half. MTC women left ~54 pts across 4 missed races.
- 2026 story: MTC men peaked at 77% after winning Team Champs (race 6), then fell after no full team at the
  5th Ave Mile and a 5th at the Bronx 10M. MTC women went from 0% to 86% by winning 4 of the last 5 races.

## Page extras

- **Final place odds** for MTC (from the simulation's `placeDistribution`), above the forecast callout.
- **Both-races grid** (`scenarios` in `forecast.json`, from `simulate`): promotion chance for each pair of
  MTC places at the next two races (null = no full team). Cells with <100 sims show "·". Oct 30: men need
  roughly a marathon win + Corbitt win (92%), 2nd + 1st is 58%; women are ~100% with any full Corbitt team.
- **Season leaderboard** (`leaderboard` in `forecast.json`): each MTC runner's races, times among the team's
  scorers (top N at races where MTC had a full team), and best age grade (`ageGradePercent` from
  `teams/teamRunners`, kept on each roster result).

## Gaps and ideas

- Marathon entry depends on lottery / 9+1 / time qualifiers; last year's 9+1 completion could predict this year's entry.
- Runner-level sim ignores teammates outside the roster (31% of marathon scorers historically).
- The 50% "asked" chance and 85% "signed-up" chance aren't calibrated.
- Ted Corbitt 15K by division level (8 races each): A teams carry ~96% of their gap, B teams ~130% (gaps
  widen; B model spread 0.087 vs actual 0.065). Not applied: it would need a Corbitt-only setting and the
  sample is small. Worth revisiting with 2026 results.
- The "needs" table only covers the next race.

## Research scripts (`scripts/nyrr_research/`)

Run from the repo root with `NYRR_CACHE_DIR=<dir>` (plus the proxy env vars in the cloud
container). Data goes to `.nyrr-research/` (gitignored; override with `NYRR_RESEARCH_DIR`).

| Script | What it answers |
|---|---|
| `backtest.ts` | Team model calibration + promotion Brier (`PARAMS='{...}'` to try settings) |
| `winning_times.ts` | Simulated vs real winning marathon times (the 2:28 bug check) |
| `strength_scale.ts` | Fits marathon/15K gap shrinkage, extra noise and time level (`DIVS=AM,AW` for one level) |
| `unknown_scorers.ts` | Share of scorers with no earlier club race |
| `collect_runner_seasons.ts` → `runners.json` | Runner-season dataset (slow first run) |
| `attendance_table.py` | Attendance table above |
| `runner_calibration.py` | Individual time offsets, residual quantiles, top-k sim bias |
| `turnout_rows.ts` → `partrows.json`, then `turnout_blend.py` | Runner vs team turnout blend test |
| `fallback_projection.ts` | Short club races vs other NYRR races for projecting the Marathon/15K |
| `season_backtest.ts` → then `season_backtest_report.py` | Whole-season replay: odds by races left, next-race time/turnout accuracy (`PARAMS`, `PAST=0`, `YEARS`) |
