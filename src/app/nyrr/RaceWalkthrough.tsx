// Step-by-step look at how the next race's forecast is built: where things
// stand, how each team has been running, its predicted time, turnout, simulated
// finishing places, and what each focus-team finish would mean

import type { DivisionForecast, ForecastTeam, TeamForm } from '@/lib/nyrr/forecast';
import { pointsForPlace } from '@/lib/nyrr/model';
import { formatDuration, formatPct, ordinal, shortEventName } from '@/lib/nyrr/format';
import { RuleTable, joinNames } from './OutcomeRules';
import ProbBar from './ProbBar';
import RangeChart, { axisLabel } from './RangeChart';
import styles from './page.module.css';

const HIGHLIGHT = '#d62828';
const BASE = '#336699';
// 1st (darkest) to 5th+, then no full team
const PLACE_COLORS = ['#1f6f43', '#3c9161', '#6db48a', '#a3d2b3', '#d2eadb'];
const NO_TEAM = '#c9c0b0';

interface Props {
  division: DivisionForecast;
  teams: ForecastTeam[]; // contenders, best counted points first
  focusCode: string;
  goal: 'promotion' | 'title';
}

export default function RaceWalkthrough({ division, teams, focusCode, goal }: Props) {
  const race = division.remainingRaces[0];
  if (!race) return null;
  const code = race.eventCode;
  const raceName = shortEventName(race.eventName);
  const lineup = division.lineups[code];
  const focusName = teams.find((t) => t.teamCode === focusCode)?.teamName ?? focusCode;
  const maxGain = pointsForPlace(0, race.multiplier);
  type Need = DivisionForecast['needs'][number];
  const outrightGiven = (n: Need) => (goal === 'title' ? n.pFirstOutrightGiven : n.pTop2OutrightGiven);
  const tiedGiven = (n: Need) => (goal === 'title' ? n.pFirstTiedGiven : n.pTop2TiedGiven);
  const names = (teamCode: string) => division.teams.find((t) => t.teamCode === teamCode)?.teamName ?? teamCode;
  const worst = division.droppedRaces === 1 ? 'worst race' : `${division.droppedRaces} worst races`;
  // Teams made faster for the last race because their place is still open
  const shifted = division.lastRaceShift.teams.filter((c) => teams.some((t) => t.teamCode === c));
  const needs = division.needs.filter((n) => n.pPlace >= 0.005);

  return (
    <section className={styles.section}>
      <h2>How the {raceName} forecast works</h2>

      <Step n={1} title="Where it stands">
        <p>
          Points that count so far, with each team&apos;s {worst} already dropped. The lighter part is what a{' '}
          {raceName} win ({maxGain} points) would add.
        </p>
        <StandingsBars teams={teams} focusCode={focusCode} maxGain={maxGain} />
      </Step>

      <Step n={2} title="How each team has been running">
        <p>
          Every race this season (numbered in order) compared with the rest of the division that day. A dot below
          the 0% line means the team&apos;s scorers were faster than the average team. Bigger dots count more toward
          the {raceName}: they are recent and closer to its distance. The colored line is the strength the model
          settles on, and missing dots are races without a full team.
        </p>
        <div className={styles.formGrid}>
          {teams.map((t) => (
            <FormChart
              key={t.teamCode}
              team={t}
              form={division.form[t.teamCode]}
              season={division.history.map((h) => h.eventName)}
              focus={t.teamCode === focusCode}
            />
          ))}
        </div>
      </Step>

      <Step n={3} title={`Predicted ${raceName} time`}>
        <p>
          Each team&apos;s strength turned into a {race.distanceMeters / 1000}K time for its top {race.scorers}{' '}
          (the course runs a little slow, which is built in). The dot is the most likely average per runner; the bar
          covers 8 in 10 simulated races.
          {lineup && (
            <>
              {' '}
              {focusName}&apos;s time instead comes from the {lineup.signedUp} runners on its{' '}
              {lineup.kind === 'asked' ? 'invite list' : 'entry list'}, each projected from their own recent races, so
              it can be faster than its team results above. Its range is narrower because its lineup is known.
            </>
          )}
          {shifted.length > 0 && (
            <>
              {' '}
              {joinNames(shifted.map(names))} still {shifted.length === 1 ? 'has its' : 'have their'} place to race
              for. In 2022&ndash;2025, teams in that spot ran the last race about 3.5% faster than their season form
              (most likely by sending their best runners), so {shifted.length === 1 ? 'its time here is' : 'their times here are'}{' '}
              {Math.round(-division.lastRaceShift.shift * 1000) / 10}% faster than the season alone suggests.
            </>
          )}
        </p>
        <TimeRanges teams={teams} code={code} focusCode={focusCode} />
      </Step>

      <Step n={4} title="Who shows up">
        <p>
          A team only scores with {race.scorers} finishers. These chances come from how often each team has fielded a
          full team this season and at the {raceName} in past years
          {lineup ? `; ${focusName}'s from its ${lineup.kind === 'asked' ? 'invite' : 'entry'} list` : ''}.
        </p>
        <div className={styles.barList}>
          {teams.map((t) => (
            <div key={t.teamCode} className={styles.barRow}>
              <span className={t.teamCode === focusCode ? styles.focusName : undefined}>{t.teamName}</span>
              <ProbBar p={t.races[code].pField} />
            </div>
          ))}
        </div>
      </Step>

      <Step n={5} title={`The ${raceName}, run 50,000 times`}>
        <p>
          The model runs the race 50,000 times: who shows up, then each team&apos;s time drawn from step 3. How often
          each team finished in each place:
        </p>
        <PlaceStacks teams={teams} code={code} focusCode={focusCode} />
      </Step>

      <Step n={6} title={`What each ${focusName} finish means`}>
        <p>
          Each place adds its points to the totals in step 1, then the final standings drop each team&apos;s{' '}
          {worst}.{' '}
          {division.rules && (
            <>
              That part is plain arithmetic, no forecast needed: for each {focusName} finish, where each rival
              has to finish to end up behind it on final points. Places count only this division&apos;s teams, and
              &ldquo;level&rdquo; means the two finish on the same points.
            </>
          )}
        </p>
        {division.rules && <RuleTable rules={division.rules} focusName={focusName} names={names} />}
        <p>
          How likely each finish is, from step 5. The time is roughly what {focusName}&apos;s top {race.scorers} need
          to average to finish that high.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{raceName} place</th>
                <th className={styles.num}>Pts</th>
                <th className={styles.num}>Avg time needed</th>
                <th>How likely</th>
                <th>{goal === 'title' ? 'Wins division if so' : 'Promoted if so'}</th>
              </tr>
            </thead>
            <tbody>
              {needs.map((n) => (
                <tr key={n.place ?? 'none'}>
                  <td>{n.place ? ordinal(n.place) : 'No full team'}</td>
                  <td className={styles.num}>{n.place ? pointsForPlace(n.place - 1, race.multiplier) : 0}</td>
                  <td className={styles.num}>
                    {n.place && n.cutoffAvgSeconds ? `under ${formatDuration(n.cutoffAvgSeconds)}` : '–'}
                  </td>
                  <td>
                    <ProbBar p={n.pPlace} />
                  </td>
                  <td>
                    {outrightGiven(n) !== null && n.samples >= 200 ? (
                      <>
                        <ProbBar p={outrightGiven(n)!} />
                        {(tiedGiven(n) ?? 0) >= 0.01 && (
                          <span className={styles.muted}> + {formatPct(tiedGiven(n)!)} level</span>
                        )}
                      </>
                    ) : (
                      <span className={styles.muted}>too rare to say</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Step>

      <Step n={7} title="Final standings">
        <p>
          Projected final points after the {raceName}. Teams that finish level on points share a place in
          NYRR&apos;s standings.
        </p>
        <RangeChart teams={teams} highlightCode={focusCode} />
      </Step>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className={styles.step}>
      <h3 className={styles.subhead}>
        <span className={styles.stepNumber}>{n}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function StandingsBars({ teams, focusCode, maxGain }: { teams: ForecastTeam[]; focusCode: string; maxGain: number }) {
  const top = Math.max(...teams.map((t) => t.counted + maxGain));
  const lo = Math.floor((Math.min(...teams.map((t) => t.counted)) * 0.8) / 10) * 10;
  const pct = (v: number) => `${((v - lo) / (top - lo)) * 100}%`;
  return (
    <div className={styles.hbars}>
      {teams.map((t) => {
        const color = t.teamCode === focusCode ? HIGHLIGHT : BASE;
        return (
          <div
            key={t.teamCode}
            className={styles.hbarRow}
            title={`${t.teamName}: ${t.counted} counted (NYRR total ${t.points}); up to ${t.counted + maxGain} with a win`}
          >
            <span className={t.teamCode === focusCode ? styles.focusName : undefined}>{t.teamName}</span>
            <span className={styles.hbarTrack}>
              <span className={styles.hbarFill} style={{ width: pct(t.counted), background: color }}>
                {t.counted}
              </span>
              <span
                className={styles.hbarExtra}
                style={{ left: pct(t.counted), width: `calc(${pct(t.counted + maxGain)} - ${pct(t.counted)})`, background: color }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

const FORM_MIN = -0.25;
const FORM_MAX = 0.1;

function FormChart({
  team,
  form,
  season,
  focus,
}: {
  team: ForecastTeam;
  form?: TeamForm;
  season: string[]; // the season's completed races, in order
  focus: boolean;
}) {
  if (!form) return null;
  const width = 300;
  const height = 150;
  const pad = { left: 40, right: 10, top: 22, bottom: 18 };
  const n = Math.max(2, season.length);
  const x = (i: number) => pad.left + (i / (n - 1)) * (width - pad.left - pad.right);
  // Faster (negative) plots lower, matching "below the line = faster"
  const y = (v: number) =>
    pad.top + ((Math.min(FORM_MAX, Math.max(FORM_MIN, v)) - FORM_MAX) / (FORM_MIN - FORM_MAX)) * (height - pad.top - pad.bottom);
  const color = focus ? HIGHLIGHT : BASE;
  const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
  return (
    <figure className={styles.formChart}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${team.teamName} race by race`}>
        <text x={pad.left} y={13} className={styles.rowLabel} fontWeight="bold">
          {short(team.teamName)}: {Math.abs(Math.round(form.strength * 100))}% {form.strength < 0 ? 'faster' : 'slower'}
        </text>
        {[0.1, 0, -0.1, -0.2].map((v) => (
          <g key={v}>
            <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#a89f8f' : '#e0d9cc'} />
            <text x={pad.left - 4} y={y(v) + 4} textAnchor="end" className={styles.axisText}>
              {pct(v)}
            </text>
          </g>
        ))}
        <line x1={pad.left} x2={width - pad.right} y1={y(form.strength)} y2={y(form.strength)} stroke={color} strokeWidth={2} />
        {season.map((_, i) => (
          <text key={i} x={x(i)} y={height - 4} textAnchor="middle" className={styles.axisText}>
            {i + 1}
          </text>
        ))}
        {form.races.map((r) => {
          const raceIndex = season.indexOf(r.eventName);
          return (
            <circle
              key={r.eventName}
              cx={x(raceIndex)}
              cy={y(r.relative)}
              r={2.5 + 4 * r.weight}
              fill={color}
              opacity={0.35 + 0.6 * r.weight}
              stroke="#fffef8"
              strokeWidth={1}
            >
              <title>{`${shortEventName(r.eventName)}: ${pct(r.relative)} vs the average team`}</title>
            </circle>
          );
        })}
      </svg>
    </figure>
  );
}

// Round-minute ticks spanning [lo, hi] seconds
function minuteTicks(lo: number, hi: number): number[] {
  const step = [60, 120, 300, 600].find((st) => (hi - lo) / st <= 4) ?? 600;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
  return ticks;
}

function TimeRanges({ teams, code, focusCode }: { teams: ForecastTeam[]; code: string; focusCode: string }) {
  const rows = teams.filter((t) => t.races[code].pField > 0);
  const lo = Math.min(...rows.map((t) => t.races[code].p10AvgSeconds)) - 30;
  const hi = Math.max(...rows.map((t) => t.races[code].p90AvgSeconds)) + 30;
  const pct = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className={styles.hbars}>
      {rows.map((t) => {
        const r = t.races[code];
        const color = t.teamCode === focusCode ? HIGHLIGHT : BASE;
        return (
          <div
            key={t.teamCode}
            className={styles.hbarRow}
            title={`${t.teamName}: about ${formatDuration(r.medianAvgSeconds)} per runner (${formatDuration(r.p10AvgSeconds)}–${formatDuration(r.p90AvgSeconds)})`}
          >
            <span className={t.teamCode === focusCode ? styles.focusName : undefined}>
              {t.teamName} <span className={styles.muted}>{formatDuration(r.medianAvgSeconds)}</span>
            </span>
            <span className={styles.rangeTrack}>
              <span
                className={styles.rangeBar}
                style={{ left: pct(r.p10AvgSeconds), width: `calc(${pct(r.p90AvgSeconds)} - ${pct(r.p10AvgSeconds)})`, background: color }}
              />
              <span className={styles.rangeDot} style={{ left: pct(r.medianAvgSeconds), background: color }} />
            </span>
          </div>
        );
      })}
      <div className={styles.hbarRow}>
        <span />
        <span className={styles.rangeAxis}>
          {minuteTicks(lo, hi).map((t) => (
            <span key={t} style={axisLabel((t - lo) / (hi - lo))}>
              {formatDuration(t)}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

function PlaceStacks({ teams, code, focusCode }: { teams: ForecastTeam[]; code: string; focusCode: string }) {
  const labels = ['1st', '2nd', '3rd', '4th', '5th+', 'No team'];
  const color = (k: number) => (k < 5 ? PLACE_COLORS[k] : NO_TEAM);
  return (
    <figure className={styles.chart}>
      <div className={styles.hbars}>
        {teams.map((t) => {
          const r = t.races[code];
          const parts = [...r.placeOdds.slice(0, 4), r.placeOdds.slice(4).reduce((s, p) => s + p, 0), 1 - r.pField];
          return (
            <div key={t.teamCode} className={styles.hbarRow}>
              <span className={t.teamCode === focusCode ? styles.focusName : undefined}>{t.teamName}</span>
              <span className={styles.stack}>
                {parts.map((p, k) => (
                  <span
                    key={k}
                    className={k < 2 ? styles.stackSegLight : styles.stackSeg}
                    style={{ width: `${p * 100}%`, background: color(k) }}
                    title={`${t.teamName}: ${labels[k]} ${formatPct(p)}`}
                  >
                    {p >= 0.08 ? formatPct(p) : ''}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className={styles.legend}>
        {labels.map((l, k) => (
          <span key={l} className={styles.legendItem}>
            <span className={styles.swatch} style={{ background: color(k), height: 10 }} />
            {l}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function short(name: string): string {
  const clean = name.replace(/\.$/, '');
  return clean.length > 24 ? `${clean.slice(0, 23)}…` : clean;
}
