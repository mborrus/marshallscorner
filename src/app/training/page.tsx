// Half-marathon training tracker: plan.json plus what was actually run on Strava.
// Password protected (src/middleware.ts).

import type { Metadata } from "next";
import { calendarKey } from "@/lib/training/auth";
import { databaseUrl, getDb } from "@/lib/training/db";
import {
  currentWeekIndex,
  formatPace,
  matchPlan,
  type Activity,
  type Override,
  type RunRow,
  type WeekResult,
} from "@/lib/training/match";
import {
  addDays,
  daysBetween,
  firstPlannedDate,
  goalText,
  loadPlan,
  raceDate,
  round1,
  targetPace,
  todayLocal,
  totalPlannedMiles,
  type Plan,
} from "@/lib/training/plan";
import { overrides as overridesTable } from "@/lib/training/schema";
import {
  AUTO_SYNC_MINUTES,
  getConnection,
  loadActivities,
  type Connection,
} from "@/lib/training/strava";
import BuildChart from "./BuildChart";
import OverrideSelect from "./OverrideSelect";
import SyncControls from "./SyncControls";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Training",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<RunRow["status"], string> = {
  done: "Done",
  upcoming: "Upcoming",
  missed: "Missed",
  skipped: "Skipped",
  optional: "Optional",
};

const KIND_LABEL: Record<string, string> = {
  easy: "Easy",
  mtc: "MTC",
  long: "Long",
  race: "Race",
  extra: "Extra",
};

const STRAVA_MESSAGES: Record<string, string> = {
  connected: "Strava connected.",
  denied: "Strava access was declined.",
  "bad-state": "Strava sign-in expired. Try again.",
  "need-read-all":
    'Please allow "View data about your private activities" so all runs show up.',
  "no-code": "Strava sign-in failed. Try again.",
};

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string }>;
}) {
  const { strava } = await searchParams;
  const { plan, isExample } = loadPlan();
  const today = todayLocal();

  // Strava data (optional: the plan still shows without a database)
  let activities: Activity[] = [];
  let overrides: Override[] = [];
  let connection: Connection | null = null;
  let dbError: string | null = null;
  if (databaseUrl()) {
    try {
      connection = await getConnection();
      activities = await loadActivities(plan);
      const db = await getDb();
      overrides = (await db.select().from(overridesTable)).map((o) => ({
        weekStart: o.weekStart,
        runIndex: o.runIndex,
        activityDate: o.activityDate,
        skipped: o.skipped,
      }));
    } catch (e) {
      dbError = (e as Error).message;
    }
  } else {
    dbError = "DATABASE_URL is not set, so only the plan is shown.";
  }

  const weeks = matchPlan(plan, activities, overrides, today);
  const current = currentWeekIndex(plan, today);
  const thisWeek = weeks[current];
  const race = daysBetween(today, raceDate(plan));
  const totalDone = round1(weeks.reduce((s, w) => s + w.actualMiles, 0));
  const lastSync = connection?.lastSyncAt
    ? new Date(connection.lastSyncAt)
    : null;
  const stale =
    !!connection &&
    (!lastSync ||
      Date.now() - lastSync.getTime() > AUTO_SYNC_MINUTES * 60 * 1000);
  const icsKey = await calendarKey();

  return (
    <div className={styles.page}>
      <div>
        <p className={styles.kicker}>Half marathon build</p>
        <h1>Training</h1>
        {goalText(plan) && <p>{goalText(plan)}</p>}
      </div>

      {isExample && (
        <p className={`win98-box-inset ${styles.warn}`}>
          Showing the sample plan. Add your plan as{" "}
          <code>content/training/plan.json</code>.
        </p>
      )}
      {strava && STRAVA_MESSAGES[strava] && (
        <p className="win98-box-inset">{STRAVA_MESSAGES[strava]}</p>
      )}
      {dbError && <p className={`win98-box-inset ${styles.warn}`}>{dbError}</p>}

      <section className={styles.stats}>
        <div className="win98-box">
          <div className={styles.statLabel}>To race</div>
          <div className={styles.bigNumber}>
            {race > 0 ? Math.ceil(race / 7) : 0}
          </div>
          <div>
            {race > 0
              ? `weeks (${race} days)`
              : race === 0
                ? "Race day!"
                : "Done"}
          </div>
        </div>
        <div className="win98-box">
          <div className={styles.statLabel}>This week</div>
          <div className={styles.bigNumber}>{thisWeek.actualMiles}</div>
          <div>of {thisWeek.plannedMiles} mi</div>
        </div>
        <div className="win98-box">
          <div className={styles.statLabel}>Total</div>
          <div className={styles.bigNumber}>{totalDone}</div>
          <div>of {totalPlannedMiles(plan)} mi</div>
        </div>
      </section>

      {!dbError && (
        <p className={styles.toolbar}>
          {connection ? (
            <SyncControls
              stale={stale}
              lastSync={
                connection.lastSyncAt ? String(connection.lastSyncAt) : null
              }
            />
          ) : (
            <a className={styles.button} href="/api/strava/connect">
              Connect Strava
            </a>
          )}
        </p>
      )}

      <section>
        <h2>
          This week{" "}
          <small>
            · week {current + 1} of {plan.weeks.length}
          </small>
        </h2>
        <WeekView
          result={thisWeek}
          plan={plan}
          overrides={overrides}
          editable={!!connection}
        />
      </section>

      <section>
        <h2>Build</h2>
        <BuildChart weeks={weeks} current={current} />
      </section>

      <section>
        <h2>All weeks</h2>
        {weeks.map((w) => (
          <details
            key={w.week.start}
            className={styles.week}
            open={w.index === current}
          >
            <summary>
              <strong>Week {w.index + 1}</strong> · {shortDate(w.week.start)} ·{" "}
              {w.actualMiles}/{w.plannedMiles} mi
              {w.flags.length > 0 && <span className={styles.flag}> ⚠</span>}
            </summary>
            <WeekView
              result={w}
              plan={plan}
              overrides={overrides}
              editable={!!connection}
            />
          </details>
        ))}
      </section>

      {icsKey && (
        <p className={styles.small}>
          Apple Watch / calendar: subscribe to{" "}
          <a href={`/training/plan.ics?key=${icsKey}`}>this calendar feed</a> to
          see each day&apos;s run on your phone and watch.
        </p>
      )}
    </div>
  );
}

function WeekView({
  result,
  plan,
  overrides,
  editable,
}: {
  result: WeekResult;
  plan: Plan;
  overrides: Override[];
  editable: boolean;
}) {
  const { week } = result;
  const dayOptions = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(week.start, i);
    const ran =
      result.rows.find((r) => r.actual?.date === date)?.actual ??
      result.unplanned.find((d) => d.date === date);
    return {
      date,
      label: `${shortDate(date)}${ran ? ` · ${ran.miles} mi` : ""}`,
    };
  });

  return (
    <div>
      {week.note && <p className={styles.note}>{week.note}</p>}
      {result.flags.map((f) => (
        <p key={f} className={styles.flag}>
          ⚠ {f}
        </p>
      ))}
      <ul className={styles.runs}>
        {[...result.rows]
          .sort(
            (a, b) =>
              firstPlannedDate(week.start, a.run).localeCompare(
                firstPlannedDate(week.start, b.run),
              ) || a.runIndex - b.runIndex,
          )
          .map((r) => {
            const o = overrides.find(
              (x) => x.weekStart === week.start && x.runIndex === r.runIndex,
            );
            const value = o
              ? o.skipped
                ? "skipped"
                : (o.activityDate ?? "auto")
              : "auto";
            return (
              <li
                key={r.runIndex}
                className={`${styles.run} ${styles[r.status]}`}
              >
                <div className={styles.runHead}>
                  <span className={styles.badge}>{STATUS_LABEL[r.status]}</span>
                  <strong>
                    {r.run.day} · {KIND_LABEL[r.run.kind] ?? r.run.kind}
                  </strong>
                  <span className={styles.miles}>
                    {r.actual ? `${r.actual.miles} / ` : ""}
                    {r.run.miles} mi
                  </span>
                </div>
                <div className={styles.runBody}>
                  {r.actual && (
                    <span>
                      {shortDate(r.actual.date)} · {formatPace(r.paceS)}/mi
                      {r.actual.avgHr ? ` · ${r.actual.avgHr} bpm` : ""}
                      {r.actual.activities.length > 1
                        ? ` · ${r.actual.activities.length} runs`
                        : ""}
                    </span>
                  )}
                  {targetPace(plan, r.run.kind) && (
                    <span>Target {targetPace(plan, r.run.kind)}</span>
                  )}
                  {r.run.note && (
                    <span className={styles.note}>{r.run.note}</span>
                  )}
                  {r.flags.map((f) => (
                    <span key={f} className={styles.flag}>
                      ⚠ {f}
                    </span>
                  ))}
                </div>
                {editable && (
                  <OverrideSelect
                    weekStart={week.start}
                    runIndex={r.runIndex}
                    value={value}
                    days={dayOptions}
                  />
                )}
              </li>
            );
          })}
        {result.unplanned.map((d) => (
          <li key={d.date} className={`${styles.run} ${styles.unplanned}`}>
            <div className={styles.runHead}>
              <span className={styles.badge}>Unplanned run</span>
              <strong>{shortDate(d.date)}</strong>
              <span className={styles.miles}>{d.miles} mi</span>
            </div>
            <div className={styles.runBody}>
              <span>
                {formatPace(d.miles ? d.movingTimeS / d.miles : null)}/mi
                {d.avgHr ? ` · ${d.avgHr} bpm` : ""}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
