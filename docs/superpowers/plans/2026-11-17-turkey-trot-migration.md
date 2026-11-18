# Turkey Trot on marshallscorner — Implementation Plan

> **For agentic workers:** work through the tasks in order, one at a time. If the superpowers plugin is installed, use `superpowers:executing-plans` (or `superpowers:subagent-driven-development`). Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Written 2026-11-17 by a cloud session that could not reach Athlinks or the live dashboard. What it could not check is listed under [Unknowns](#unknowns).

**Goal:** `marshallscorner.com/turkey-trot` shows the Branford Turkey Trot dashboard before Thanksgiving (Thursday 26 November 2026), the 2026 results can be added on race day with one command, and the dashboard ends up running on the site itself instead of inside a frame.

| Part | What | Size | Result |
|---|---|---|---|
| A | Ship what is already built: `/turkey-trot` frames the existing Streamlit dashboard, and that dashboard keeps its data | 3 small tasks | Site is ready for this year |
| B | The migration: rebuild the dashboard as a normal page of the site (results CSV → build script → JSON → Next.js page), replacing the frame at the same address | 8 tasks | No Streamlit needed |
| C | Race-day steps for 26 November | checklist | 2026 results on the site |

**Stop points.** After Part A the site is ready. If Part B has not passed its checks (Task B5 Step 5 and the final checklist) by Tuesday 24 November, leave the frame in place for race day and finish Part B afterwards.

**Why rebuild instead of keeping the frame.** Vercel, which hosts the site, cannot run a Streamlit app, so the frame depends on Streamlit's free hosting. That app goes to sleep when idle and shows visitors a wake-up screen, results fetched inside it are wiped whenever it restarts, any visitor can use its sidebar to add or rename races for everyone, and it looks nothing like the rest of the site. A page built from committed data has none of these problems, and the site already has every piece it needs: a results pipeline (triathlon), hand-drawn SVG charts and a tab component (NYRR).

**Tech stack (Part B):** Next.js 15 App Router, React 18, TypeScript, CSS Modules, `csv-parse` (already installed), node's test runner through `tsx`. Fetching results stays in Python, using the existing `athlinks_scraper` package. No new npm packages.

---

## Ask Marshall before starting

The defaults are what this plan assumes. Only stop if he picks something else.

1. **Runner names and ages in public repos.** Parts A and B both commit finisher results (name, gender, age, time, pace, place; no bib numbers or home towns) to public GitHub repos. Athlinks and the current dashboard already show the same data publicly. *Default: yes.* If no: skip Task A2, and stop before Part B, because the site cannot build the page without the data in the repo.
2. **Do Part B at all?** *Default: yes.*
3. **Link in the header navigation?** *Default: no.* The page is linked from the home page and the Work page.
4. **Pushing to `main`.** In `marshallscorner` a push to `main` deploys the live site. In `athlinks_scraper` it presumably redeploys the Streamlit app. *Default: open pull requests and let Marshall merge.*

## Where things stand

Both repos are needed, checked out next to each other. Commands below use `../athlinks_scraper` from inside `marshallscorner` and the other way round.

| Repo | Branch | What is on it |
|---|---|---|
| `mborrus/marshallscorner` (public; Next.js site on Vercel) | `claude/pensive-albattani-8xz1jb`, 3 commits ahead of `main` including this plan | `src/app/turkey-trot/`: page that frames `https://turkeytrotter.streamlit.app/?embed=true` (`NEXT_PUBLIC_TURKEY_TROT_URL` overrides the address). `src/app/work/page.tsx`: lists side projects instead of a placeholder. `content/home.md`: links to the page. |
| `mborrus/athlinks_scraper` (public; scraper plus the Streamlit dashboard that is live at https://turkeytrotter.streamlit.app/) | `claude/pensive-albattani-8xz1jb`, 1 commit ahead of `main` | `dashboard/ui/components.py`: `use_container_width=True` → `width="stretch"` (Streamlit is removing the old option). `dashboard/requirements.txt`: `streamlit>=1.52`. |

Neither branch is merged. No pull requests are open.

**Checked in the cloud session:**

- `athlinks_scraper`: `python -m pytest tests -q` → 85 passed. The dashboard runs on Streamlit 1.67 with the fix; all five tabs render with no errors on the RunSignup example race, which loaded 2020–2026 including its 14 November 2026 edition.
- `marshallscorner`: `/turkey-trot` shows a framed dashboard correctly at desktop and phone widths. This was tested against a local Streamlit, not the live one. `npm run lint` and `npx tsc --noEmit` pass.
- The fetch script in Task B1 and the comparison script in Task B5 were both run against the RunSignup example. Neither has been run against Athlinks.

### Unknowns

| | Unknown | Settled in |
|---|---|---|
| U1 | Whether Athlinks answers from Marshall's machine. From the cloud, `https://reignite-api.athlinks.com/...` returned HTTP 403 "Request blocked" (CloudFront) whatever client name was sent, so it is probably refusing data-centre addresses. | Task A2 Step 1 |
| U2 | What the live Streamlit app shows right now, which branch it deploys from, and whether it loads inside a frame on another site. | Task A2 Step 8, Task A3 |
| U3 | The real Branford data: how many editions, how many finishers, which `Race Type` values, how complete the ages are. | Task A2 Step 3 |
| U4 | Whether the 2026 edition is already listed on Athlinks with no results yet. | Task A2 Step 3 |
| U5 | `streamlit>=1.52` is an estimate of where `width="stretch"` works for both charts and tables. It only matters if an old Streamlit gets installed; hosted installs take the latest. | — |

### The dashboard being moved

Read these first. All are in `athlinks_scraper`.

| File | What it is |
|---|---|
| `dashboard/dashboard_queries.py` | Every number the dashboard shows, as DuckDB SQL. `create_enriched_view` holds the row rules. **This is the reference for Part B.** |
| `dashboard/sections/*.py` | One file per tab: what is shown and how it is worded |
| `dashboard/app.py` | Sidebar (add a race by URL, upload, rename), masthead, tabs |
| `athlinks_scraper_project/athlinks_scraper/providers/` | Fetching. `detect_provider(url)`, then `list_events(url)`, then `fetch_event(ref)` returns a DataFrame with the 19 columns listed in `providers/base.py` |
| `tests/conftest.py`, `tests/test_dashboard_*.py` | Fixture and expected values, reused in Part B |

## Global constraints

- **Athlinks only works from a home machine.** Never add anything that fetches Athlinks from Vercel, GitHub Actions or any other cloud machine. Results are fetched by hand and committed.
- **Zero editions means blocked.** `core.fetch_master_events` prints the HTTP error and returns an empty list instead of raising. If a fetch reports no editions, read the line printed above it. On a 403 from Marshall's machine, stop and tell him. Do not try to get around the block.
- **No new npm packages.** No chart library, no database in the browser. Charts are inline SVG in the style of `src/app/nyrr/PointsChart.tsx`.
- **Stage only the paths a task names.** `npm run build` first runs every section's data build (`prebuild`), which contacts NYRR for a couple of minutes and rewrites other sections' generated files. Do not commit those. To check that the site compiles, run `npm run build:turkey` and then `npx next build`, which skips `prebuild`.
- **`athlinks_scraper` tracks some `.pyc` files, and they change whenever Python runs.** Never commit them: run `git checkout -- '*.pyc'` before staging.
- **Keep `src/lib/turkeytrot/` free of `fs` and `path`**, except `data.ts`. The browser components import the same functions.
- **Do not change how the scraper or the Streamlit app behave.** Part A adds data files and merges one existing fix. Part B does not touch `athlinks_scraper`.
- **Match the site.** Read `src/styles/globals.css` and `src/app/nyrr/page.module.css`, and reuse existing classes and colours before adding new ones. CSS Modules only.
- Commit after every task with the message given. One pull request per repo in Part A, one for Part B.

---

# Part A — Go live with the frame

## Task A1: Check the Streamlit fix (`athlinks_scraper`)

**Files:** none edited.

- [ ] **Step 1: Get the branch**

```bash
cd ../athlinks_scraper
git fetch origin
git checkout claude/pensive-albattani-8xz1jb
git log --oneline main..HEAD
```

Expected: one commit, `Dashboard: replace removed-soon Streamlit width option`.

- [ ] **Step 2: Install and run the tests**

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest tests -q
```

Expected: `85 passed`. If the editable install on the last line of `requirements-dev.txt` fails (it did in the cloud session, with `AttributeError: install_layout`), run `pip install pytest -r dashboard/requirements.txt` instead. The tests and the dashboard find the scraper package through `sys.path`, not through the install.

- [ ] **Step 3: Run the dashboard**

```bash
cd dashboard && streamlit run app.py
```

Expected: it opens, and the terminal prints no `use_container_width` warnings. Stop it and `cd ..`.

No commit in this task.

## Task A2: Keep Branford's results in the scraper repo

The hosted app starts with whatever is in the repo, and `.gitignore` excludes every results file, so today it starts empty until someone presses "Fetch all years". Committing the files fixes that.

**Files:**
- Modify: `.gitignore`
- Create: `dashboard/data/scraped_athlinks_15776_<year>_<eventid>.parquet`, one per edition

- [ ] **Step 1: Check Athlinks answers (U1)**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://reignite-api.athlinks.com/master/15776/metadata
```

Expected: `200`. On `403`, stop and tell Marshall.

- [ ] **Step 2: Move old local results out of the way**

Untracked files from earlier years (for example `scraped_15776_2023.parquet`) would be counted a second time next to the new ones.

```bash
mkdir -p ../turkey-trot-old-data
mv dashboard/data/*.parquet dashboard/data/*.csv ../turkey-trot-old-data/ 2>/dev/null
ls dashboard/data
```

Expected: only `event_metadata.json`.

- [ ] **Step 3: Fetch every edition**

Run from the repo root. The file names are the ones `save_event_frame()` in `dashboard/app.py` writes, so the app's own "Fetch all years" button overwrites these files instead of adding copies.

```bash
python - <<'EOF'
import sys
sys.path.insert(0, "athlinks_scraper_project")
from athlinks_scraper.providers import detect_provider

url = "https://www.athlinks.com/event/15776"
provider = detect_provider(url)
refs = provider.list_events(url)
if not refs:
    sys.exit("No editions found. If the line above says 403, this machine is blocked.")
total = 0
for ref in refs:
    df = provider.fetch_event(ref)
    if df.empty:
        print(ref.date_str, "no results, skipped")
        continue
    # Nothing in the dashboard uses these, and the repo is public.
    df[["Bib", "City", "State", "Country"]] = None
    year = ref.date_str[:4] if ref.date_str and ref.date_str != "Unknown" else "unknown"
    safe = "".join(ch for ch in ref.event_id if ch.isalnum() or ch in "-_")
    path = f"dashboard/data/scraped_{ref.source}_{ref.race_group}_{year}_{safe}.parquet"
    df.to_parquet(path, index=False)
    total += len(df)
    print(ref.date_str, len(df), "rows,", int(df["Age"].isna().sum()), "without age,",
          sorted(df["Race Type"].dropna().astype(str).unique()), "->", path)
print("total rows:", total)
EOF
```

Expected: one line per edition and a total. Write down the number of editions, the total, the race types, how many rows have no age, and whether a 2026 edition is listed (U3, U4). Task B1 must produce the same total.

- [ ] **Step 4: Let git see the files**

In `.gitignore`, add this line directly under `*.parquet`:

```
!dashboard/data/*.parquet
```

- [ ] **Step 5: Look at it**

```bash
cd dashboard && streamlit run app.py
```

Expected: the masthead reads "Branford Turkey Trot" with the edition count from Step 3, all five tabs render, and Runner Lookup returns races for a name taken from the Hall of Fame tab.

- [ ] **Step 6: Commit**

```bash
git checkout -- '*.pyc'
git add .gitignore dashboard/data/*.parquet
git commit -m "Keep Branford results in the repo so the hosted dashboard always has data"
```

- [ ] **Step 7: Pull request**

Push the branch and open a pull request to `main` titled "Turkey Trot 2026: Streamlit fix and saved Branford results".

- [ ] **Step 8: After the merge, check the live app (U2)**

Open https://turkeytrotter.streamlit.app/. Within a few minutes it should show Branford without anyone pressing "Fetch all years". If nothing changes, the app deploys from a different branch: ask Marshall to check the app's settings at share.streamlit.io.

## Task A3: Check the frame against the live dashboard and ship the page (`marshallscorner`)

**Files:** none, unless a check fails.

- [ ] **Step 1: Run the site**

```bash
cd ../marshallscorner
git fetch origin && git checkout claude/pensive-albattani-8xz1jb
npm ci
npm run dev
```

Open http://localhost:3000/turkey-trot.

- [ ] **Step 2: Check the frame**

| Check | If it fails |
|---|---|
| The frame shows the live dashboard with Branford loaded | A blank frame with a console error naming `X-Frame-Options` or `frame-ancestors` means the app refuses to be framed. Replace the `<iframe>` block in `src/app/turkey-trot/page.tsx` with a prominent link to the dashboard, and tell Marshall. |
| If the app is asleep, its wake-up button shows inside the frame and works there | Same fallback |
| At 375px wide the page itself does not scroll sideways | Fix `.frameWrap` in `src/app/turkey-trot/page.module.css` |
| `/work` lists the project and the home page link works | Fix the link |

- [ ] **Step 3: Lint and compile**

```bash
npm run lint
npx next build
```

Expected: both pass. The two `<img>` warnings in `src/app/art/page.tsx` were already there.

- [ ] **Step 4: Pull request**

Open a pull request to `main` titled "Add Turkey Trot page". After the merge, check https://marshallscorner.com/turkey-trot.

**Part A is done here. The site is ready for this year.**

---

# Part B — Move the dashboard into the site

## Design

### Files

```
content/turkey-trot/
  races.json                          which races, and where their results live
  aliases.json                        name fixes (one runner listed under two spellings)
  raw/branford/<year>.csv             results as fetched, trimmed to 11 columns   (committed)
  generated/branford/summary.json     small; read on the server                   (committed)
public/data/turkey-trot/branford.json every finisher, compact; fetched by the browser (committed)

scripts/turkey_trot_fetch.py          Athlinks → raw CSV. Run by hand, at home.
scripts/build_turkey_trot.ts          raw CSV → both JSON files. `npm run build:turkey`, also in prebuild.

src/lib/turkeytrot/
  types.ts        the contracts below
  format.ts       toSeconds, formatSeconds, formatSigned
  parse.ts        row rules: raw CSV rows → FinisherTable; decodeRows
  summary.ts      everything in summary.json
  runners.ts      everything the interactive tools compute
  data.ts         server only: read summary.json (the one file here that may use fs)
  fixture.ts      test rows
  *.test.ts

src/app/turkey-trot/
  page.tsx, page.module.css           rewritten
  Tabs.tsx                            copy of src/app/nyrr/DivisionTabs.tsx
  charts/LineChart.tsx, BarChart.tsx, Histogram.tsx
  TrendsChart.tsx, Competitiveness.tsx, RunnerTools.tsx, ReportCard.tsx, PlacePredictor.tsx
  RunnerPicker.tsx, useFinishers.ts

docs/turkey-trot.md                   notes, like docs/nyrr-forecast.md
```

Modified: `package.json` (scripts), `.claude/CLAUDE.md` (new section).

One race for now. Paths carry the race slug so a second race is a new entry in `races.json`, but do not build a race picker or a `[race]` route until there are two.

### Row rules

These are `create_enriched_view` in `dashboard_queries.py`, restated. `parse.ts` is the only place they live.

1. `toSeconds(text)`: accepts `H:MM:SS` and `MM:SS`. Parts are numbers and may carry fractions; the result is rounded to a whole second. Anything else is `null`.
2. Keep a row only if `Pace` parses, `toSeconds(Time) > 720`, and `Status` is not `DNF`. The 720 seconds (12:00) removes timing errors.
3. Year is the first four characters of `Event Date`. Drop rows without a valid date.
4. A runner is `Name` trimmed and upper-cased, then passed through `aliases.json`. The display name is the spelling from that runner's most recent edition.
5. Race types, case-insensitive: `^(run[- ]?)?5k([- ]?(run|walk|run/walk))?$` becomes `5K`; `^(run[- ]?)?5[- ]?mil(e|er)([- ]?run)?$` becomes `5 Mile`; anything else is left alone.
6. The **primary type** is the normalized race type with the most kept rows. Ties go to the alphabetically first.
7. Age groups: `0-14`, `15-19`, `20-29`, `30-39`, `40-49`, `50-59`, `60-69`, `70+`.
8. Median averages the two middle values. The 95th percentile interpolates linearly at position `0.95 × (n − 1)` in the sorted list. These match DuckDB's `MEDIAN` and `QUANTILE_CONT`.

The build prints how many rows it read, kept and dropped, by reason.

### Contracts (`src/lib/turkeytrot/types.ts`)

```ts
/** One (year, event name) pair. */
export interface Edition { year: number; name: string; date: string }

/** Every kept finisher, compact. Written to public/data/turkey-trot/<slug>.json. */
export interface FinisherTable {
  slug: string;
  primaryType: number;          // index into types
  editions: Edition[];          // oldest first
  types: string[];              // normalized race types
  genders: string[];            // as scraped, e.g. ["", "F", "M"]
  runners: string[];            // display names; a runner's id is their index
  // [runner, edition, type, timeSeconds, paceSeconds, gender, age | null, overallRank | null]
  rows: [number, number, number, number, number, number, number | null, number | null][];
}

/** A decoded row, which is what the functions in runners.ts take. */
export interface Finisher {
  runner: number; edition: number; type: number;
  timeSeconds: number; paceSeconds: number;
  gender: string; age: number | null; overallRank: number | null;
}

/** Written to content/turkey-trot/generated/<slug>/summary.json. */
export interface Summary {
  race: { slug: string; name: string; primaryType: string };
  updatedAt: string;            // date of the newest edition, never the build time
  years: { first: number; last: number; editions: number };   // all race types
  overview: {                   // primary type only
    finishers: number; avgPaceSeconds: number; firstYear: number;
    fastest: { time: string; name: string; year: number };
    slowest: { time: string };
  };
  trends: { year: number; runners: number;
            minTime: number; medianTime: number; p95Time: number;
            minPace: number; medianPace: number; p95Pace: number }[];
  paceHistogram: { startSeconds: number; binSeconds: number; counts: number[];
                   slower: number; medianSeconds: number };
  divisions: { ageGroup: string; runners: number; avgPaceSeconds: number;
               top3SpreadSeconds: number | null }[];
  eras: { start: number; avgRunnersPerYear: number; avgPaceSeconds: number; fastestSeconds: number }[];
  returning: { year: number; newRunners: number; returningRunners: number }[];
  fastestByYear: { year: number; name: string; time: string; pace: string }[];
  recordsByGroup: { gender: string; ageGroup: string; name: string; time: string; year: number }[];
  frequentFlyers: { name: string; races: number; bestPaceSeconds: number }[];
}
```

Running the build twice must leave no git diff: stable ordering, no timestamps.

### What each function computes

Port each one from the named Python function. "Primary" means primary-type rows only.

| TypeScript | Python source | Rows | Notes |
|---|---|---|---|
| `summary.ts` `overview` | `get_overview_stats` | primary | count, mean pace, fastest row (time, name, year), slowest time, first year |
| `trends` | `get_trends` | primary | per year: count, then min, median and 95th percentile of both time and pace |
| `paceHistogram` | `get_distribution` and `sections/trends.py` | all | 15-second bins from the fastest pace rounded down to a minute, up to the 99th percentile; slower runners are counted in `slower` |
| `divisions` | `get_division_stats` | primary, age known | per age group: count, mean pace, and the third-fastest time minus the fastest across all years (`null` with fewer than three rows) |
| `eras` | `get_era_stats` | primary | era start is `floor(year / 5) × 5`; runners per year is rows divided by distinct years |
| `returning` | `get_returning_counts` | all | one count per runner per year; "new" in the runner's first year |
| `fastestByYear` | `get_fastest_by_year` | primary | newest year first |
| `recordsByGroup` | `get_fastest_by_demographics` | primary, age known | fastest per gender and age group, ordered by gender then group |
| `frequentFlyers` | `get_fun_stats` | all | runners with more than one distinct year; top 10 by years, then by best pace |
| `runners.ts` `searchRunners` | `search_runner_names` | all | case-insensitive substring of the display name |
| `runnerHistory` | `get_runner_history` | all | newest first: date, event, race type, time, pace, overall place |
| `runnerYearly` | `get_runner_yearly` | primary | place is 1 plus the number of strictly faster finishers that year; `pctBeaten = round(100 × (field − place) / field, 1)`; also the field's median time |
| `rivals` | `get_nemesis` | all | runners in the same edition and race type as the picked runner at least twice: shared count, mean of (their time − the runner's time); order by count, then by smallest absolute mean; top 20 |
| `headToHead` | `get_head_to_head` | all | years both finished the same race type; difference is A − B |
| `pacePartners` | `get_pace_partners` | all, last two years in the data | pace or finish time within ± tolerance; closest first; top 20 |
| `competitiveness` | `get_competitiveness_stats` | primary | filters: gender, age range; per year the 3rd and 10th fastest times; a year with fewer than three matching finishers is left out |
| `predictPlace` | `sections/predictor.py` | primary | filters: gender, age range. `share` is the fraction strictly faster than the target; `field` is filtered rows divided by distinct years; place is `floor(share × field) + 1`; `null` when no rows match |
| `timeHistogram` | `sections/predictor.py` | primary | same filters; finish times in 30-second bins, for the predictor's chart |

### Deliberate differences from the Streamlit version

1. No "Add a race", upload, rename or race picker. The Streamlit app stays up for that, and the page links to it.
2. One shared runner picker (type part of a name, pick a runner) replaces the free-text name boxes.
3. Rivals and frequent flyers group by runner, not by raw spelling, and rivals are compared within the same race type.
4. With the age filter left at its full range, runners with no recorded age are included. In Streamlit they are always dropped from the competitiveness chart and the predictor.
5. The predictor's histogram uses 30-second bins instead of one bar per second.
6. Rows whose pace does not parse are dropped.

### The page

Masthead: the race name, the line `{years.first} – {years.last} · {years.editions} editions · {overview.finishers} finishers` (thousands separated with commas), and the blurb from `dashboard/app.py`.

Tabs, with ids `trends`, `tools`, `card`, `fame`, `predict`. `Tabs.tsx` is a copy of `src/app/nyrr/DivisionTabs.tsx` with its `.tabs`, `.tab`, `.tabActive` and `.tabPanel` styles; it already remembers the tab in the URL hash. Do not edit the NYRR files.

| Tab | Rendered | Contents, in order |
|---|---|---|
| Trends | server, from `summary.json` | **By the numbers**: four tiles (Finishers, "All editions since {year}"; Average pace, "Across every finisher"; Course record, "Set in {year} by {name}"; Last across the line, "Every finisher counts"). **Performance trends**: line chart by year with winning, median and 95th-percentile lines and a Pace/Time switch (`TrendsChart.tsx`, a small client component); the pace view leaves out points slower than 45:00. **Pace distribution**: histogram with a dashed, labelled median line. **Yearly competitiveness** (`Competitiveness.tsx`, client): gender and age filters, lines for the 3rd and 10th fastest times. **Division battle royale**: tile for the division with the smallest spread ("Only {n}s separates the podium"), bars of runners per age group, table of the five tightest. **Battle of the eras**: table. **New vs returning**: stacked bars and the sentence "In {year}, {n}% of finishers had run this race before." |
| Runner Tools | client | **Runner lookup**: history table. **Nemesis finder**: rivals table with shared editions and signed average margin. **Head to head**: two pickers, the sentence "{leader} leads {w}–{l}; average margin {m:ss}.", and a table by year. **Pace partners**: pace or finish time, a 5–60 second tolerance slider (default 15), up to 20 rows. |
| Report Card | client | Picker, then four tiles (Editions run with the year range; Best time with its year; Best place; Field beaten, the average), a line chart of the runner against the field median, a table (Year, Time, Pace, Place, Field, % beaten), then the rivals table. |
| Hall of Fame | server | Fastest overall by year. All-time records by age group. Frequent flyers. |
| Place Predictor | client | Target time (default 25:00), optional runner, gender and age filters. Tile: "Predicted finish {n}th", "Faster than {x}% of a typical field of {n}". Histogram of finish times with a line at the target and dotted lines, labelled by year, at the runner's past times. Show from the fastest time to the larger of the 98th percentile and the target. |

`useFinishers.ts` fetches `/data/turkey-trot/branford.json` once (keep the promise at module level), decodes it with `decodeRows`, and returns loading, error or data. Client tools show "Loading results…" and, on failure, "Couldn't load the results. Refresh to try again."

Stay inside the site's 760px column. Charts are SVG with a `viewBox`, so they scale. Wrap tables in a container with `overflow-x: auto`.

### Test fixture and expected values

`src/lib/turkeytrot/fixture.ts` holds the rows from `tests/conftest.py`:

```ts
const row = (date: string, name: string, gender: string, age: number, time: string,
             pace: string, rank: number, status = 'CONF') => ({
  'Event ID': '1', 'Event Name': 'Test Trot', 'Event Date': date, 'Race Type': '5K',
  Name: name, Gender: gender, Age: String(age), Time: time, Pace: pace,
  'Overall Rank': String(rank), Status: status,
});

export const FIXTURE = [
  row('2022-11-24', 'Alice Fast', 'F', 30, '18:00', '5:48', 1),
  row('2022-11-24', 'Bob Mid', 'M', 45, '25:00', '8:03', 2),
  row('2022-11-24', 'Carol Slow', 'F', 60, '35:00', '11:16', 3),
  row('2022-11-24', 'Dan Quick', 'M', 20, '10:00', '3:13', 4),        // dropped: faster than 12:00
  row('2022-11-24', 'Eve Dnf', 'F', 25, '20:00', '6:26', 5, 'DNF'),   // dropped: DNF
  row('2023-11-23', 'Alice Fast', 'F', 31, '17:30', '5:38', 1),
  row('2023-11-23', 'Bob Mid', 'M', 46, '24:00', '7:44', 2),
  row('2023-11-23', 'Frank New', 'M', 33, '30:00', '9:40', 3),
  row('2023-11-23', 'Carol Slow', 'F', 61, '31:00', '9:59', 4),
];
```

Every value below was produced by the Python dashboard on these rows on 2026-11-17.

| Call | Expected |
|---|---|
| `toSeconds` of `01:02:05`, `25:00`, `0:16:03`, `05:10`, `21:52.05`, `garbage` | 3725, 1500, 963, 310, 1312, `null` |
| `formatSeconds` of 1500, 3725, 65, `null`, `NaN` | `25:00`, `1:02:05`, `1:05`, `N/A`, `N/A` |
| parse | 7 rows kept; dropped 1 too fast and 1 DNF; primary type `5K`; Alice 2023 is 1050 s at a 338 s pace |
| `overview` | 7 finishers; mean pace 498.29 s; fastest `17:30` by Alice Fast in 2023; slowest `35:00`; first year 2022 |
| `trends` 2022 | 3 runners; time 1080 / 1500 / 2040; pace 348 / 483 / 656.7 (min / median / 95th) |
| `trends` 2023 | 4 runners; time 1050 / 1620 / 1851; pace 338 / 522 / 596.15 |
| `eras` | one era starting 2020: 3.5 runners a year, mean pace 498.29 s, fastest 1050 s |
| `divisions` | `30-39`: 3 runners, mean pace 422, spread 750. `40-49`: 2, 473.5, `null`. `60-69`: 2, 637.5, `null` |
| `returning` | 2022: 3 new, 0 returning. 2023: 1 new, 3 returning |
| `fastestByYear` | 2023 Alice Fast `17:30`; 2022 Alice Fast `18:00` |
| `recordsByGroup` | F `30-39` Alice Fast `17:30` (2023); F `60-69` Carol Slow `31:00` (2023); M `30-39` Frank New `30:00` (2023); M `40-49` Bob Mid `24:00` (2023) |
| `frequentFlyers` | Alice Fast 2 (best pace 5:38), Bob Mid 2 (7:44), Carol Slow 2 (9:59), in that order; no Frank New |
| `searchRunners` `al`, `zzz` | Alice Fast only; nothing |
| `runnerYearly` Alice | 2022 and 2023; `18:00`, `17:30`; place 1, 1; field 3, 4; beaten 66.7, 75.0; field median 1500, 1620 |
| `runnerYearly` Carol | place 3, 4; beaten 0, 0 |
| `rivals` Alice | Bob Mid: 2 shared, +405 s. Carol Slow: 2 shared, +915 s. No Frank New |
| `headToHead` Alice, Bob | 2022: `18:00` v `25:00`, −420. 2023: `17:30` v `24:00`, −390. Against an unknown runner: empty |
| `pacePartners` pace `8:00` ±15 | Bob Mid 2022 (`8:03`) only. With ±20, also Bob Mid 2023 (`7:44`), second |
| `competitiveness` no filters | 2022: 3rd is 2100. 2023: 3rd is 1800. No 10th in either |
| `competitiveness` ages 30–50 | 2023 only: 3rd is 1800 |
| `predictPlace` 1500 s | place 2, faster than 57.1%, typical field 3 (shown as "Faster than 57.1% of a typical field of 3") |

---

## Task B1: Results into the site repo

**Files:**
- Create: `content/turkey-trot/races.json`, `content/turkey-trot/aliases.json`, `scripts/turkey_trot_fetch.py`
- Create: `content/turkey-trot/raw/branford/<year>.csv`, one per year

- [ ] **Step 1: Branch**

After the Part A pull request is merged: `git checkout main && git pull && git checkout -b turkey-trot-native`. If it is not merged yet, branch from `claude/pensive-albattani-8xz1jb` instead.

- [ ] **Step 2: Create `content/turkey-trot/races.json`**

```json
[
  { "slug": "branford", "name": "Branford Turkey Trot", "url": "https://www.athlinks.com/event/15776" }
]
```

- [ ] **Step 3: Create `content/turkey-trot/aliases.json`**

A JSON object: key is a name as listed, upper-cased; value is the upper-cased name to merge it into. Carry over the one alias hard-coded in `create_enriched_view` (the `CASE WHEN TRIM(UPPER("Name")) = ...` line). Nothing else.

- [ ] **Step 4: Create `scripts/turkey_trot_fetch.py`**

```python
#!/usr/bin/env python3
"""Fetch Turkey Trot results into content/turkey-trot/raw/<slug>/<year>.csv.

Run from a home machine (Athlinks turns away cloud machines). Needs the scraper
package from the athlinks_scraper repo, checked out next to this one:

    PYTHONPATH=../athlinks_scraper/athlinks_scraper_project python scripts/turkey_trot_fetch.py

Fetches only the newest edition unless --all-years is given.
"""
import argparse
import json
import os
import sys

import pandas as pd

try:
    from athlinks_scraper.providers import detect_provider
except ImportError:
    sys.exit("Can't import athlinks_scraper. Set PYTHONPATH=../athlinks_scraper/athlinks_scraper_project "
             "(or pip install -e that folder).")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "content", "turkey-trot")
# Only what the page uses. No bib numbers or home towns: this repo is public.
KEEP = ["Event ID", "Event Name", "Event Date", "Race Type", "Name", "Gender", "Age",
        "Time", "Pace", "Overall Rank", "Status"]


def year_of(ref):
    return ref.date_str[:4] if ref.date_str and ref.date_str != "Unknown" else None


def main():
    parser = argparse.ArgumentParser(description="Fetch Turkey Trot results into content/turkey-trot/raw/.")
    parser.add_argument("--race", help="slug from races.json (default: every race)")
    parser.add_argument("--all-years", action="store_true", help="refetch every edition, not just the newest")
    parser.add_argument("--force", action="store_true", help="overwrite a year even if the new fetch has fewer rows")
    args = parser.parse_args()

    with open(os.path.join(ROOT, "races.json")) as f:
        races = json.load(f)
    if args.race:
        races = [r for r in races if r["slug"] == args.race]
        if not races:
            sys.exit("No race with slug %r in races.json" % args.race)

    failed = False
    for race in races:
        slug = race["slug"]
        provider = detect_provider(race["url"])
        refs = [r for r in provider.list_events(race["url"]) if year_of(r)]
        if not refs:
            # The Athlinks adapter prints the HTTP error itself and returns nothing.
            print("%s: no editions found. If the line above says 403, this machine is blocked." % slug)
            failed = True
            continue
        years = sorted({year_of(r) for r in refs})
        if not args.all_years:
            years = years[-1:]
        out_dir = os.path.join(ROOT, "raw", slug)
        os.makedirs(out_dir, exist_ok=True)
        for year in years:
            frames = [provider.fetch_event(r) for r in refs if year_of(r) == year]
            frames = [f for f in frames if not f.empty]
            if not frames:
                print("%s %s: no results posted yet, nothing written" % (slug, year))
                continue
            df = pd.concat(frames, ignore_index=True)[KEEP]
            path = os.path.join(out_dir, "%s.csv" % year)
            if os.path.exists(path) and not args.force:
                old = len(pd.read_csv(path))
                if len(df) < old:
                    print("%s %s: fetched %d rows but the file already has %d; left the file alone "
                          "(--force to overwrite)" % (slug, year, len(df), old))
                    failed = True
                    continue
            df.to_csv(path, index=False)
            print("%s %s: %d rows -> %s" % (slug, year, len(df), os.path.normpath(path)))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Fetch every year**

Use the Python environment from Task A1.

```bash
source ../athlinks_scraper/.venv/bin/activate
PYTHONPATH=../athlinks_scraper/athlinks_scraper_project python scripts/turkey_trot_fetch.py --all-years
echo "exit code $?"
```

Expected: one `branford <year>: <n> rows -> ...` line per year, exit code 0, and the row counts adding up to the total from Task A2 Step 3.

- [ ] **Step 6: Check the files**

```bash
head -1 content/turkey-trot/raw/branford/*.csv | sort -u
wc -l content/turkey-trot/raw/branford/*.csv
```

Expected: every file starts with `Event ID,Event Name,Event Date,Race Type,Name,Gender,Age,Time,Pace,Overall Rank,Status`.

- [ ] **Step 7: Commit**

```bash
git add content/turkey-trot scripts/turkey_trot_fetch.py
git commit -m "Turkey Trot: results fetch script and Branford results"
```

## Task B2: Row rules and formatting

**Files:**
- Create: `src/lib/turkeytrot/types.ts`, `format.ts`, `parse.ts`, `fixture.ts`, `parse.test.ts`
- Modify: `package.json`

- [ ] **Step 1:** In `package.json`, change the test script to `"tsx --test src/lib/nyrr/*.test.ts src/lib/turkeytrot/*.test.ts"`.
- [ ] **Step 2:** Create `types.ts` from the contracts above and `fixture.ts` from the fixture above.
- [ ] **Step 3:** Write `parse.test.ts` covering the `toSeconds`, `formatSeconds` and parse rows of the expected-values table, plus one test per row rule 5–8. Use `node:test` and `node:assert/strict`, as `src/lib/nyrr/model.test.ts` does. Run `npm test`: the new tests fail.
- [ ] **Step 4:** Implement `format.ts` (`toSeconds`, `formatSeconds`, `formatSigned` for `+6:45` and `-0:30`) and `parse.ts` (`normalizeType`, `ageGroup`, `median`, `quantile`, `parseRows(rawRows, aliases, slug)` returning the `FinisherTable` and the dropped counts, and `decodeRows(table)`).
- [ ] **Step 5:** `npm test` and `npx tsc --noEmit` pass.
- [ ] **Step 6:** Commit.

```bash
git add package.json src/lib/turkeytrot
git commit -m "Turkey Trot: row rules and formatting"
```

## Task B3: Summary numbers

**Files:**
- Create: `src/lib/turkeytrot/summary.ts`, `summary.test.ts`

- [ ] **Step 1:** Write tests for the nine `summary.ts` rows of the expected-values table (`overview` through `frequentFlyers`), and for `paceHistogram`: the counts plus `slower` add up to the number of rows. Run `npm test`: they fail.
- [ ] **Step 2:** Implement `buildSummary(table, race)` returning a `Summary`, one small function per field, following the function table.
- [ ] **Step 3:** `npm test` and `npx tsc --noEmit` pass.
- [ ] **Step 4:** Commit.

```bash
git add src/lib/turkeytrot
git commit -m "Turkey Trot: summary numbers"
```

## Task B4: Runner tools

**Files:**
- Create: `src/lib/turkeytrot/runners.ts`, `runners.test.ts`

- [ ] **Step 1:** Write tests for the `runners.ts` rows of the expected-values table (`searchRunners` through `predictPlace`), plus: an unknown runner gives empty results everywhere, `predictPlace` with a filter that matches nobody returns `null`, and the `timeHistogram` counts add up to the number of matching rows. Run `npm test`: they fail.
- [ ] **Step 2:** Implement the nine functions in the `runners.ts` part of the function table. Each takes the decoded rows and the table, and returns plain objects. The sentences shown to visitors are built in the components, not here.
- [ ] **Step 3:** `npm test` and `npx tsc --noEmit` pass.
- [ ] **Step 4:** Commit.

```bash
git add src/lib/turkeytrot
git commit -m "Turkey Trot: runner tools"
```

## Task B5: Build script, generated files, comparison with the Python dashboard

**Files:**
- Create: `scripts/build_turkey_trot.ts`, `src/lib/turkeytrot/data.ts`
- Create: `content/turkey-trot/generated/branford/summary.json`, `public/data/turkey-trot/branford.json`
- Modify: `package.json`

- [ ] **Step 1: Write `scripts/build_turkey_trot.ts`**

For each race in `races.json`: read every CSV in `raw/<slug>/` with `csv-parse/sync` (`columns: true`), run `parseRows` and `buildSummary`, and write the two JSON files (`summary.json` indented, the finisher table on one line, both ending in a newline). Print rows read, kept and dropped by reason, the primary type, and the size of the finisher file. Exit with an error if a race has no raw folder or keeps no rows, so that a bad data commit fails the deploy instead of publishing an empty page. Follow `scripts/build-results.ts` for layout.

- [ ] **Step 2: Wire it up**

In `package.json` add `"build:turkey": "npx tsx scripts/build_turkey_trot.ts"` and append `&& npm run build:turkey` to `prebuild`.

- [ ] **Step 3: Write `src/lib/turkeytrot/data.ts`**

`readRaces()` and `readSummary(slug)`, reading from `process.cwd()` the way `readForecast` in `src/lib/nyrr/forecast.ts` does. `readSummary` returns `null` if the file is missing.

- [ ] **Step 4: Run it twice**

```bash
npm run build:turkey
git add content/turkey-trot/generated public/data/turkey-trot
npm run build:turkey
git status --short content/turkey-trot/generated public/data/turkey-trot
ls -l public/data/turkey-trot/branford.json
```

Expected: the second run changes nothing (no ` M` lines). The finisher file is under 3 MB. If it is larger, stop and rethink before going on: dropping `overallRank` is the first thing to try.

- [ ] **Step 5: Compare with the Python dashboard**

Save this outside both repos as `parity.py` and run it from the `athlinks_scraper` root. It was tested on the RunSignup example.

```python
import glob, json, sys
import pandas as pd
sys.path.insert(0, "dashboard"); sys.path.insert(0, "athlinks_scraper_project")
import dashboard_queries as dq

raw = sys.argv[1]
text = {c: str for c in ["Event ID", "Event Name", "Event Date", "Race Type", "Name", "Gender", "Time", "Pace", "Status"]}
df = pd.concat([pd.read_csv(f, dtype=text) for f in sorted(glob.glob(f"{raw}/*.csv"))], ignore_index=True)
con = dq.init_db_from_dataframe(df)
dq.create_enriched_view(con)  # no group filter: the folder holds one race
out = {
    "overview": dq.get_overview_stats(con).to_dict("records")[0],
    "trends": dq.get_trends(con).to_dict("records"),
    "returning": dq.get_returning_counts(con).to_dict("records"),
    "eras": dq.get_era_stats(con).to_dict("records"),
    "divisions": dq.get_division_stats(con).to_dict("records"),
    "fastest_by_year": dq.get_fastest_by_year(con)[["event_year", "Name", "Time"]].to_dict("records"),
    "frequent_flyers": dq.get_fun_stats(con).to_dict("records"),
}
print(json.dumps(out, default=str, indent=1))
```

```bash
cd ../athlinks_scraper
python ../parity.py ../marshallscorner/content/turkey-trot/raw/branford > ../parity_py.json
git checkout -- '*.pyc'
```

Compare `../parity_py.json` with `summary.json` field by field. Whole numbers and text must match exactly; decimals to within 0.01. Explainable differences: the alias-affected runner; frequent flyers where Python splits one runner across spellings (difference 3); a different name on a tied fastest time. Then, for three runners from the frequent-flyers list, compare `runnerYearly` and `rivals` with `dq.get_runner_yearly(con, "NAME IN CAPITALS")` and `dq.get_nemesis(con, "Name")`. Anything else that differs is a bug in the port: fix it and add a test.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/build_turkey_trot.ts src/lib/turkeytrot content/turkey-trot/generated public/data/turkey-trot
git commit -m "Turkey Trot: build script and generated data"
```

## Task B6: Page shell, Trends and Hall of Fame

**Files:**
- Rewrite: `src/app/turkey-trot/page.tsx`, `page.module.css`
- Create: `src/app/turkey-trot/Tabs.tsx`, `TrendsChart.tsx`, `charts/LineChart.tsx`, `charts/BarChart.tsx`, `charts/Histogram.tsx`

- [ ] **Step 1:** Charts. `LineChart` takes several named series over years, a value formatter and optional point labels. `BarChart` takes categories and one or more stacked series. `Histogram` takes bin counts with a start and width, plus optional vertical markers (solid or dotted, each with a label). All three are plain components with no hooks, so both server and client code can use them. Copy the sizing, gridline colour and axis text from `src/app/nyrr/PointsChart.tsx`.
- [ ] **Step 2:** `Tabs.tsx`, as described under "The page".
- [ ] **Step 3:** `page.tsx`: read the first race from `readRaces()` and its summary. If the summary is missing, show `<Placeholder message="run npm run build:turkey" />`. Otherwise render the masthead and the five tabs, with the Trends and Hall of Fame contents from the table under "The page". Leave the three client tabs as short "coming soon" lines for now. Keep the existing `metadata`.
- [ ] **Step 4:** `npm run dev`, open `/turkey-trot`. Check every Trends and Hall of Fame item against the same item in the Streamlit dashboard running on the Task A2 data: same numbers, same order.
- [ ] **Step 5:** Check at 1280px and 375px wide: no sideways page scroll, charts readable, tables scroll inside their own box.
- [ ] **Step 6:** `npm run lint` and `npx tsc --noEmit` pass. Commit.

```bash
git add src/app/turkey-trot
git commit -m "Turkey Trot: native page with trends and hall of fame"
```

## Task B7: Interactive tools

**Files:**
- Create: `src/app/turkey-trot/useFinishers.ts`, `RunnerPicker.tsx`, `Competitiveness.tsx`, `RunnerTools.tsx`, `ReportCard.tsx`, `PlacePredictor.tsx`
- Modify: `src/app/turkey-trot/page.tsx`, `page.module.css`

- [ ] **Step 1:** `useFinishers.ts` as described under "The page".
- [ ] **Step 2:** `RunnerPicker.tsx`: a text box; from two typed characters it lists up to 20 matches from `searchRunners`; choosing one calls `onPick(runnerId)`. Works with the keyboard (arrows, Enter, Escape).
- [ ] **Step 3:** `Competitiveness.tsx`, then add it to the Trends tab.
- [ ] **Step 4:** `RunnerTools.tsx`, `ReportCard.tsx`, `PlacePredictor.tsx`, per the table under "The page". Wording for empty results comes from the matching `dashboard/sections/*.py` file.
- [ ] **Step 5:** For the three runners used in Task B5 Step 5, compare the Report Card, rivals and a head-to-head with the Streamlit dashboard. Try the predictor at 20:00, 25:00 and 40:00 with no filters and with one gender: same place as Streamlit, apart from difference 4.
- [ ] **Step 6:** Check at 1280px and 375px wide. Check that with the network tab throttled to "Slow 3G" the Trends tab is usable before the finisher file arrives.
- [ ] **Step 7:** `npm run lint` and `npx tsc --noEmit` pass. Commit.

```bash
git add src/app/turkey-trot
git commit -m "Turkey Trot: runner tools, report card and place predictor"
```

## Task B8: Cut over, write it down, ship

**Files:**
- Modify: `src/app/turkey-trot/page.tsx`, `page.module.css`, `.claude/CLAUDE.md`
- Create: `docs/turkey-trot.md`

- [ ] **Step 1:** Remove what is left of the frame: the `<iframe>`, `NEXT_PUBLIC_TURKEY_TROT_URL`, and the `.frameWrap` and `.frame` styles. At the bottom of the page add one line linking to https://turkeytrotter.streamlit.app/ for anyone who wants to load a different race.
- [ ] **Step 2:** Write `docs/turkey-trot.md`, modelled on `docs/nyrr-forecast.md`: a "where things live" table, how to add results (Part C below), the Athlinks block and what "no editions found" means, the row rules, the deliberate differences, how to add a second race, the answers to U1–U4, and known gaps (two people with the same name are one runner; `aliases.json` is the fix for a runner split across spellings).
- [ ] **Step 3:** Add this section to `.claude/CLAUDE.md`, above "External Services":

```markdown
## Turkey Trot (`/turkey-trot`)

Branford Turkey Trot results dashboard, built from committed results. **Read `docs/turkey-trot.md`
before changing it.**

- `npm run build:turkey` rebuilds `content/turkey-trot/generated/` and `public/data/turkey-trot/` from
  `content/turkey-trot/raw/` (also runs in `prebuild`).
- New results: `PYTHONPATH=../athlinks_scraper/athlinks_scraper_project python scripts/turkey_trot_fetch.py`
  from a home machine (Athlinks blocks cloud machines), then `npm run build:turkey` and commit.
```

- [ ] **Step 4:** Run the final checklist at the bottom of this plan.
- [ ] **Step 5:** Commit, push, open a pull request to `main` titled "Turkey Trot: native dashboard".

```bash
git add src/app/turkey-trot docs/turkey-trot.md .claude/CLAUDE.md
git commit -m "Turkey Trot: replace the framed dashboard with the native page"
```

- [ ] **Step 6:** After the merge, check https://marshallscorner.com/turkey-trot on a phone.

---

# Part C — Race day (Thursday 26 November 2026)

Run from Marshall's machine once Athlinks has posted the 2026 results.

**If Part B is live:**

- [ ] `cd marshallscorner && git checkout main && git pull`
- [ ] `source ../athlinks_scraper/.venv/bin/activate`
- [ ] `PYTHONPATH=../athlinks_scraper/athlinks_scraper_project python scripts/turkey_trot_fetch.py`
  Expected: `branford 2026: <n> rows -> content/turkey-trot/raw/branford/2026.csv`. "no results posted yet" means try again later. A 2025 line means Athlinks has not listed the 2026 edition yet.
- [ ] `npm run build:turkey && npm test`
- [ ] `npm run dev`, open `/turkey-trot`: the masthead ends in 2026, the 2026 winner is in the Hall of Fame, and someone who ran this year can be looked up.
- [ ] `git add content/turkey-trot public/data/turkey-trot && git commit -m "Turkey Trot: 2026 results"`, then push or open a pull request.
- [ ] Run the fetch again the next day. Results get corrected after the race. The script refuses to replace a file with one that has fewer rows unless `--force` is given, so read its message before forcing.

**If the frame is still live:**

- [ ] In `athlinks_scraper`, on an up-to-date `main`, run the Task A2 Step 3 snippet again. It refetches everything; only the 2026 file is new.
- [ ] `git checkout -- '*.pyc' && git add dashboard/data/*.parquet && git commit -m "Branford results: 2026"`, then push or open a pull request.
- [ ] Check https://turkeytrotter.streamlit.app/ shows 2026.

---

## Final checklist (Part B)

- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit` and `npx next build` all pass
- [ ] `npm run build:turkey` run twice leaves no git diff
- [ ] The comparison in Task B5 Step 5 shows only explainable differences
- [ ] Every tab checked at 1280px and 375px; the page never scrolls sideways
- [ ] `public/data/turkey-trot/branford.json` is under 3 MB
- [ ] `/turkey-trot` makes no request to `streamlit.app` (browser network tab)
- [ ] Nothing in `src/lib/turkeytrot/` except `data.ts` imports `fs` or `path`
- [ ] `docs/turkey-trot.md` and `.claude/CLAUDE.md` are updated, and U1–U4 are answered in the doc
- [ ] No files from other sections (`content/nyrr`, `content/food`, `content/triathlon`) are in the commits
