'use client';

// Camp-themed all-time triathlon results page.
// Everything here is rendered from `AllTimeData` (see src/lib/results/allTime.ts) —
// adding a year to the results table should never require touching this file.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AllTimeData, LeaderboardRow, MoverRow, ReturneeRow, Row, TransitionRow } from '@/lib/results/allTime';
import { fmt, fmtDiff, yy } from '@/lib/results/allTime';
import { SwimIcon, BikeIcon, RunIcon, YoYArrow } from './icons';
import styles from './CampAllTime.module.css';

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const LEG_LABEL: Record<string, string> = { swim: 'swim', bike: 'bike', run: 'run' };

function pctText(fraction: number): string {
  const pct = Math.round(fraction * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

export default function CampAllTime({ data }: { data: AllTimeData }) {
  const latestYear = data.years[data.years.length - 1];

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <nav className={styles.breadcrumb}>
          <Link href="/triathlon/results">Results</Link>
          <span className={styles.sep}>/</span>
          <span>All-Time</span>
        </nav>

        <Sign />
        <Garland data={data} />
        <MeritBadges data={data} latestYear={latestYear} />

        <Chapter n="1" title="Records" miles="the fastest anyone has ever gone" />
        <CourseRecords data={data} />
        <Disciplines data={data} />
        <Participation data={data} />

        <Chapter n="2" title="The Race" miles="how a Meredith tri actually unfolds" />
        <Anatomy data={data} />
        <Movers data={data} />
        <Transitions data={data} />

        <Chapter n="3" title="The Field" miles="everyone who has toed the line" />
        <Returnees data={data} />
        <PerformanceMatrix data={data} />
        <HeadToHead data={data} />
        <BestTimes data={data} />
      </div>
    </div>
  );
}

function Sign() {
  return (
    <div>
      <div className={styles.signHang}>
        <span />
        <span />
      </div>
      <div className={styles.sign}>
        <div className={styles.signNails}>
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className={styles.signEyebrow}>Meredith Tryathlon · Lakes Region, N.H. · Est. 2024</div>
        <h1 className={styles.signTitle}>
          All-Time
          <small>Results</small>
        </h1>
        <p className={styles.signSub}>Every finisher, every split, fastest year kept on file.</p>
      </div>
    </div>
  );
}

function Garland({ data }: { data: AllTimeData }) {
  const flags = [
    { c: 'a', b: String(data.garland.uniqueRacers), i: 'racers' },
    { c: 'b', b: String(data.garland.entries), i: 'entries' },
    { c: 'c', b: String(data.garland.seasons), i: 'seasons' },
    { c: 'd', b: data.garland.returnedOf, i: 'returned' },
    { c: 'e', b: `${data.garland.pctImproved}%`, i: 'improved' },
  ];
  return (
    <div className={styles.garland}>
      <div className={styles.rope} />
      <div className={styles.flags}>
        {flags.map((f, i) => (
          <div
            className={cx(styles.flag, styles[f.c])}
            key={f.c}
            style={{ transform: `rotate(${(i % 2 ? 1 : -1) * 3 * (i === 2 ? 0 : 1)}deg)` }}
          >
            <b>{f.b}</b>
            <i>{f.i}</i>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeritBadges({ data, latestYear }: { data: AllTimeData; latestYear: number }) {
  const items: { c: string; big: string; name?: boolean; lbl: string; note: string }[] = [];

  if (data.headlines.closestFinish) {
    const cf = data.headlines.closestFinish;
    items.push({
      c: 'lake',
      big: fmt(cf.gap),
      lbl: 'Closest finish',
      note: `${cf.a} held off ${cf.b} in ${cf.year}`,
    });
  }
  if (data.headlines.biggestComeback) {
    const bc = data.headlines.biggestComeback;
    items.push({
      c: 'forest',
      big: `#${bc.swimPos}→#${bc.finishPos}`,
      lbl: 'Biggest comeback',
      note: `${bc.name} moved from swim #${bc.swimPos} to finish #${bc.finishPos} in ${bc.year}`,
    });
  }
  if (data.headlines.specialist) {
    const sp = data.headlines.specialist;
    items.push({
      c: 'mustard',
      big: sp.name,
      name: true,
      lbl: 'Specialist',
      note: `strong ${LEG_LABEL[sp.bestLeg]}, weaker ${LEG_LABEL[sp.worstLeg]} — biggest split gap`,
    });
  }
  if (data.headlines.fieldGrowth !== null) {
    const growth = data.headlines.fieldGrowth;
    const prevYear = data.years[data.years.length - 2];
    const steady = Math.round(growth * 100) === 0;
    items.push({
      c: 'red',
      big: steady ? '=' : pctText(growth),
      lbl: steady ? 'Field holding' : growth > 0 ? 'Field growing' : 'Field shrinking',
      note: steady
        ? `same turnout in ${latestYear} as ${prevYear}`
        : `${growth > 0 ? 'more' : 'fewer'} racers in ${latestYear} than ${prevYear}`,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className={styles.badges}>
      {items.map((b) => (
        <div className={cx(styles.badge, styles[b.c])} key={b.lbl}>
          <div className={styles.badgeDisc}>
            <div className={cx(styles.big, b.name && styles.name)}>{b.big}</div>
            <div className={styles.lbl}>{b.lbl}</div>
          </div>
          <div className={styles.badgeNote}>{b.note}</div>
        </div>
      ))}
    </div>
  );
}

function Chapter({ n, title, miles }: { n: string; title: string; miles: string }) {
  return (
    <div className={styles.chapter}>
      <span className={styles.post} />
      <div className={styles.trailSign}>
        <small>Chapter {n}</small>
        {title}
      </div>
      <span className={styles.miles}>{miles}</span>
    </div>
  );
}

function CourseRecords({ data }: { data: AllTimeData }) {
  const { total, swim, bike, run } = data.courseRecords;
  if (!total) return null;
  const patches: { k: 'swim' | 'bike' | 'run'; label: string; icon: React.ReactNode; rec: typeof swim }[] = [
    { k: 'swim', label: 'Swim Record', icon: <SwimIcon />, rec: swim },
    { k: 'bike', label: 'Bike Record', icon: <BikeIcon />, rec: bike },
    { k: 'run', label: 'Run Record', icon: <RunIcon />, rec: run },
  ];
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Course Records</h2>
        <span className={styles.rule} />
        <span className={styles.count}>all-time bests</span>
      </div>
      <div className={styles.records}>
        <div className={styles.plaque}>
          <div className={styles.plaqueLeg}>Overall · Fastest Triathlon</div>
          <div className={styles.plaqueTime}>{fmt(total.value)}</div>
          <div className={styles.plaqueName}>
            {total.name} · {total.year}
          </div>
          {data.overallRecordSplits && (
            <div className={styles.plaqueMeta}>
              {(['swim', 'bike', 'run'] as const).map((leg) => (
                <div key={leg}>
                  <span className={styles.lbl}>{leg[0].toUpperCase() + leg.slice(1)}</span>
                  <span className={styles.val}>{fmt(data.overallRecordSplits![leg])}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.patches}>
          {patches.map(({ k, label, icon, rec }) =>
            rec ? (
              <div className={cx(styles.patch, styles[k])} key={k}>
                <div className={styles.patchIcon}>{icon}</div>
                <div>
                  <div className={styles.patchLbl}>{label}</div>
                  <div className={styles.patchName}>{rec.name}</div>
                </div>
                <div>
                  <div className={styles.patchTime}>{fmt(rec.value)}</div>
                  <div className={styles.patchYear}>{rec.year}</div>
                </div>
              </div>
            ) : null
          )}
        </div>
      </div>
    </section>
  );
}

function Disciplines({ data }: { data: AllTimeData }) {
  const titles: Record<string, string> = { swim: 'Swim', bike: 'Bike', run: 'Run' };
  const icons: Record<string, React.ReactNode> = { swim: <SwimIcon />, bike: <BikeIcon />, run: <RunIcon /> };
  const legs: ('swim' | 'bike' | 'run')[] = ['swim', 'bike', 'run'];

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>By Discipline</h2>
        <span className={styles.rule} />
        <span className={styles.count}>top 5 per leg</span>
      </div>
      <div className={styles.disciplines}>
        {legs.map((k) => {
          const rows: LeaderboardRow[] = data.leaderboards[k];
          if (rows.length === 0) return null;
          return (
            <div className={cx(styles.dc, styles[k])} key={k}>
              <div className={styles.dcPennant}>
                <span className={styles.icon}>{icons[k]}</span>
                {titles[k]}
              </div>
              <div className={styles.dcBest}>best {fmt(rows[0].value)}</div>
              <div className={styles.dcRows}>
                {rows.map((row, i) => (
                  <div className={cx(styles.dcRow, i === 0 && styles.first)} key={`${row.name}-${row.year}`}>
                    <span className={styles.rank}>{row.rank}</span>
                    <span className={styles.who}>
                      {row.name}
                      <span className={styles.gtag}>
                        {row.gender} &apos;{yy(row.year)}
                      </span>
                    </span>
                    <span className={styles.time}>{fmt(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Participation({ data }: { data: AllTimeData }) {
  const rows = data.participation;
  if (rows.length === 0) return null;
  const maxTotal = Math.max(...rows.map((d) => d.total));
  const menTotal = rows.reduce((sum, d) => sum + d.men, 0);
  const womenTotal = rows.reduce((sum, d) => sum + d.women, 0);
  const last = rows[rows.length - 1];
  const prev = rows.length > 1 ? rows[rows.length - 2] : null;
  const delta = prev ? last.total - prev.total : null;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Participation</h2>
        <span className={styles.rule} />
        {delta !== null && (
          <span className={styles.count}>
            {delta === 0 ? 'no change year-over-year' : `${delta > 0 ? '+' : ''}${delta} year-over-year`}
          </span>
        )}
      </div>
      <div className={cx(styles.card, styles.participation)}>
        <div className={styles.chart}>
          <div className={styles.yAxisLabel}>RACERS</div>
          {delta !== null && delta !== 0 && (
            <div className={styles.yoyArrow}>
              <YoYArrow />
              <span className={styles.yoyLabel}>
                {delta > 0 ? '+' : ''}
                {delta} racers
              </span>
            </div>
          )}
          <div className={styles.chartBars}>
            {rows.map((d) => {
              const barH = Math.round((d.total / maxTotal) * 190);
              const mPct = (d.men / d.total) * 100;
              const wPct = (d.women / d.total) * 100;
              return (
                <div className={styles.barWrap} key={d.year}>
                  <div className={styles.barStack} style={{ height: `${barH}px` }}>
                    <div className={styles.barSegM} style={{ height: `${mPct}%` }}>
                      <span className={styles.segCount}>{d.men}</span>
                    </div>
                    <div className={styles.barSegW} style={{ height: `${wPct}%` }}>
                      <span className={cx(styles.segCount, wPct < 20 && styles.tiny)}>{d.women}</span>
                    </div>
                  </div>
                  <div className={styles.barLabelYear}>&apos;{yy(d.year)}</div>
                  <div className={styles.barLabelTotal}>{d.total} racers</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className={styles.legend}>
          <h4>Field</h4>
          <div className={styles.legendRow}>
            <span className={cx(styles.legendSw, styles.m)} />
            <span>
              Men <span className={styles.lab}>— {menTotal} entries</span>
            </span>
          </div>
          <div className={styles.legendRow}>
            <span className={cx(styles.legendSw, styles.w)} />
            <span>
              Women <span className={styles.lab}>— {womenTotal} entries</span>
            </span>
          </div>
          <div className={styles.finRate}>
            <h5>Finish rate</h5>
            {rows.map((d) => {
              const dnf = d.total - d.finishers;
              const pct = Math.round((d.finishers / d.total) * 100);
              return (
                <div className={styles.finRow} key={d.year}>
                  <span className={styles.y}>&apos;{yy(d.year)}</span>
                  <span className={styles.dots}>
                    {Array.from({ length: d.finishers }).map((_, i) => (
                      <span key={`f${i}`} className={styles.finDot} />
                    ))}
                    {Array.from({ length: dnf }).map((_, i) => (
                      <span key={`d${i}`} className={cx(styles.finDot, styles.dnf)} />
                    ))}
                  </span>
                  <span className={styles.pct}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const ANATOMY_COLORS = ['#f4ead0', '#e0a63a', '#7fb3c0', '#d0692b', '#c9748a'];

function Anatomy({ data }: { data: AllTimeData }) {
  const anatomy = data.anatomy;
  if (!anatomy) return null;
  const stages = ['swim', 't1', 'bike', 't2', 'run'] as const;
  const stageLabels = ['SWIM EXIT', 'T1', 'BIKE FINISH', 'T2', 'FINISH'];

  const cumulative = anatomy.racers.map((r) => {
    let s = 0;
    const cum: number[] = [];
    for (const st of stages) {
      s += r[st];
      cum.push(s);
    }
    return { ...r, cum };
  });

  const N = cumulative.length;
  const positions: number[][] = [];
  for (let si = 0; si < stages.length; si++) {
    const ordered = cumulative.map((r, i) => ({ i, t: r.cum[si] })).sort((a, b) => a.t - b.t);
    const posByIndex: number[] = [];
    ordered.forEach((o, rank) => {
      posByIndex[o.i] = rank + 1;
    });
    positions.push(posByIndex);
  }

  const W = 760;
  const H = 320;
  const padL = 22;
  const padR = 96;
  const padT = 28;
  const padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xAt = (i: number) => padL + (i / (stages.length - 1)) * innerW;
  const yAt = (pos: number) => padT + ((pos - 1) / (N - 1)) * innerH;

  const swimLeaderIdx = positions[0].findIndex((p) => p === 1);
  const winnerIdx = positions[stages.length - 1].findIndex((p) => p === 1);
  const swimLeader = cumulative[swimLeaderIdx];
  const winner = cumulative[winnerIdx];
  const note =
    swimLeaderIdx === winnerIdx ? (
      <>
        <span className={styles.pen}>{winner.name}</span> led wire-to-wire in {anatomy.year}, first out of the water and
        first across the line.
      </>
    ) : (
      <>
        <span className={styles.pen}>{swimLeader.name}</span> led out of the water in {anatomy.year}, but{' '}
        <span className={styles.pen}>{winner.name}</span> ran the field down to take the win.
      </>
    );

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Anatomy of a Race</h2>
        <span className={styles.rule} />
        <span className={styles.count}>{anatomy.year} podium chase · position by stage</span>
      </div>
      <div className={cx(styles.card, styles.anatomy)}>
        <div className={styles.anatomyFrame}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            {Array.from({ length: N }).map((_, k) => {
              const y = yAt(k + 1);
              return (
                <g key={`g${k}`}>
                  <line className={styles.anatomyStageTick} x1={padL} y1={y} x2={W - padR} y2={y} />
                  <text className={styles.anatomyPosLabel} x={padL - 6} y={y + 4} textAnchor="end">
                    #{k + 1}
                  </text>
                </g>
              );
            })}
            {stageLabels.map((lbl, i) => {
              const x = xAt(i);
              return (
                <g key={`s${i}`}>
                  <line className={styles.anatomyStageTick} x1={x} y1={padT - 6} x2={x} y2={H - padB} />
                  <text className={styles.anatomyStageLabel} x={x} y={H - padB + 18} textAnchor="middle">
                    {lbl}
                  </text>
                </g>
              );
            })}
            {cumulative.map((r, idx) => {
              const color = ANATOMY_COLORS[idx % ANATOMY_COLORS.length];
              const pts = stages.map((_, si) => `${xAt(si)},${yAt(positions[si][idx])}`);
              const lastY = yAt(positions[stages.length - 1][idx]);
              return (
                <g key={idx}>
                  <polyline className={styles.anatomyLine} points={pts.join(' ')} stroke={color} />
                  {stages.map((_, si) => (
                    <circle
                      key={si}
                      className={styles.anatomyDot}
                      cx={xAt(si)}
                      cy={yAt(positions[si][idx])}
                      r={5}
                      fill={color}
                      stroke="var(--forest)"
                    />
                  ))}
                  <text className={styles.anatomyNameLabel} x={xAt(stages.length - 1) + 12} y={lastY + 5} fill={color}>
                    {r.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className={styles.anatomyNote}>{note}</div>
      </div>
    </section>
  );
}

function MoverTrack({ m }: { m: MoverRow }) {
  const FIELD = m.fieldSize;
  const swimPct = ((m.swimPos - 1) / (FIELD - 1)) * 100;
  const finishPct = ((m.finishPos - 1) / (FIELD - 1)) * 100;
  const up = m.finishPos < m.swimPos;
  const left = Math.min(swimPct, finishPct);
  const right = Math.max(swimPct, finishPct);
  return (
    <div className={styles.track}>
      <div className={styles.trackLine} />
      <div
        className={cx(styles.trackArrow, up ? styles.up : styles.down)}
        style={{ left: `${left}%`, width: `${right - left}%` }}
      />
      <div className={cx(styles.trackDot, styles.start)} style={{ left: `calc(${swimPct}% - 5px)` }} title={`swim exit: ${m.swimPos}`} />
      <div
        className={cx(styles.trackDot, styles.end, up ? styles.up : styles.down)}
        style={{ left: `calc(${finishPct}% - 5px)` }}
        title={`finish: ${m.finishPos}`}
      />
      <span className={cx(styles.trackLabel, styles.start)}>swim #{m.swimPos}</span>
      <span className={cx(styles.trackLabel, styles.end)}>finish #{m.finishPos}</span>
    </div>
  );
}

function Movers({ data }: { data: AllTimeData }) {
  const { gainers, faded } = data.movers;
  if (gainers.length === 0 && faded.length === 0) return null;
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Race Movers</h2>
        <span className={styles.rule} />
        <span className={styles.count}>Positions gained from swim exit</span>
      </div>
      <div className={styles.movers}>
        <div className={cx(styles.mc, styles.up)}>
          <div className={styles.mcHead}>
            <h4>Top Gainers</h4>
            <span className={styles.swatch}>↑ UP THE FIELD</span>
          </div>
          {gainers.map((m, i) => (
            <div className={styles.mcRow} key={`${m.name}-${m.year}`}>
              <div className={styles.mcRowTop}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.who}>
                  {m.name}
                  <span className={styles.gtag} style={{ marginLeft: 6 }}>
                    {m.gender} &apos;{yy(m.year)}
                  </span>
                </span>
                <span className={styles.move}>+{m.n}</span>
              </div>
              <MoverTrack m={m} />
            </div>
          ))}
        </div>
        <div className={cx(styles.mc, styles.down)}>
          <div className={styles.mcHead}>
            <h4>Faded</h4>
            <span className={styles.swatch}>↓ DOWN THE FIELD</span>
          </div>
          {faded.map((m, i) => (
            <div className={styles.mcRow} key={`${m.name}-${m.year}`}>
              <div className={styles.mcRowTop}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.who}>
                  {m.name}
                  <span className={styles.gtag} style={{ marginLeft: 6 }}>
                    {m.gender} &apos;{yy(m.year)}
                  </span>
                </span>
                <span className={styles.move}>{m.n}</span>
              </div>
              <MoverTrack m={m} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TransitionList({ rows }: { rows: TransitionRow[] }) {
  return (
    <div className={styles.tzRows}>
      {rows.map((r) => (
        <div className={styles.tzRow} key={`${r.name}-${r.year}`}>
          <span className={styles.who}>{r.name}</span>
          <span className={styles.split}>
            T1 {fmt(r.t1)} · T2 {fmt(r.t2)}
          </span>
          <span className={styles.total}>{fmt(r.total)}</span>
        </div>
      ))}
    </div>
  );
}

function Transitions({ data }: { data: AllTimeData }) {
  const { fastest, slowest } = data.transitions;
  if (fastest.length === 0) return null;
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Transitions</h2>
        <span className={styles.rule} />
        <span className={styles.count}>T1 + T2 combined</span>
      </div>
      <div className={styles.transitions}>
        <div className={cx(styles.tz, styles.fast)}>
          <div className={styles.tzLabel}>Quickest in &amp; out</div>
          <TransitionList rows={fastest} />
        </div>
        <div className={cx(styles.tz, styles.slow)}>
          <div className={styles.tzLabel}>Lost in transition</div>
          <TransitionList rows={slowest} />
        </div>
      </div>
    </section>
  );
}

function Returnees({ data }: { data: AllTimeData }) {
  const returnees = data.returnees;
  if (returnees.length === 0) return null;

  const allTimes = returnees.flatMap((r) => r.times);
  const globalMax = Math.max(...allTimes);
  const globalMin = Math.min(...allTimes);
  const improvedCount = returnees.filter((r) => r.improved).length;
  const allImproved = improvedCount === returnees.length;
  const mostImproved = [...returnees].sort((a, b) => a.delta - b.delta)[0];

  return (
    <section className={styles.panel} style={{ marginTop: 52 }}>
      <div className={styles.board}>
        <div className={styles.boardTitle}>
          Returnees · {returnees.length} came back{allImproved ? ', all improved' : ''}
        </div>
        <div className={styles.pins}>
          <div className={styles.note} style={{ '--pin': 'var(--red)', transform: 'rotate(-1.5deg)' } as React.CSSProperties}>
            <div className={styles.tileLbl}>Came back</div>
            <div className={styles.tileVal}>{returnees.length}</div>
            <div className={styles.tileSub}>of {data.uniqueRacers} unique racers</div>
          </div>
          <div className={styles.note} style={{ '--pin': 'var(--lake)', transform: 'rotate(1deg)' } as React.CSSProperties}>
            <div className={styles.tileLbl}>Improved</div>
            <div className={styles.tileVal}>
              {Math.round((improvedCount / returnees.length) * 100)}
              <span style={{ fontSize: 30 }}>%</span>
            </div>
            <div className={styles.tileSub}>
              {improvedCount} for {returnees.length}
            </div>
          </div>
          <div
            className={cx(styles.note, styles.hot)}
            style={{ '--pin': 'var(--mustard)', transform: 'rotate(-0.8deg)' } as React.CSSProperties}
          >
            <div className={styles.tileLbl}>Most improved</div>
            <div className={styles.tileVal}>{fmtDiff(mostImproved.delta)}</div>
            <div className={styles.tileSub}>{mostImproved.name}</div>
          </div>
        </div>
        <div className={styles.ledger}>
          <span className={cx(styles.tape, styles.l)} />
          <span className={cx(styles.tape, styles.r)} />
          <div className={cx(styles.ledgerRow, styles.head)}>
            <div>Racer</div>
            <div>Years</div>
            <div>Year-over-year</div>
            <div style={{ textAlign: 'right' }}>Δ Total</div>
          </div>
          {returnees.map((r: ReturneeRow) => (
            <div className={styles.ledgerRow} key={r.name}>
              <div className={styles.lname}>{r.name}</div>
              <div className={styles.lyears}>{r.years.join(', ')}</div>
              <div className={styles.prog}>
                {r.times.map((t, j) => {
                  const pct = 30 + ((t - globalMin) / (globalMax - globalMin || 1)) * 70;
                  const isBest = t === Math.min(...r.times);
                  return (
                    <div className={styles.progRow} key={r.years[j]}>
                      <span className={styles.yr}>&apos;{yy(r.years[j])}</span>
                      <div className={styles.progTrack}>
                        <div
                          className={cx(styles.progFill, isBest && styles.best)}
                          style={{ width: `${pct}%` }}
                          title={`${r.years[j]}: ${fmt(t)}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <span className={cx(styles.delta, r.improved ? styles.up : styles.down)}>
                {r.improved ? '↓' : '↑'} {fmtDiff(r.delta)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PerformanceMatrix({ data }: { data: AllTimeData }) {
  const points = data.bestByRacer
    .filter((r): r is Row & { swim: number; bike: number; run: number } => r.swim !== null && r.bike !== null && r.run !== null)
    .map((r) => ({ name: r.name, gender: r.gender, swim: r.swim, bike: r.bike, run: r.run }));

  if (points.length === 0) return null;

  const xs = points.map((p) => p.swim);
  const ys = points.map((p) => p.run);
  const bs = points.map((p) => p.bike);
  const xMin = Math.min(...xs) - 60;
  const xMax = Math.max(...xs) + 60;
  const yMin = Math.min(...ys) - 60;
  const yMax = Math.max(...ys) + 60;
  const bMin = Math.min(...bs);
  const bMax = Math.max(...bs);

  const W = 600;
  const H = 360;
  const padL = 50;
  const padR = 18;
  const padT = 18;
  const padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const px = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * innerW;
  const py = (y: number) => padT + ((y - yMin) / (yMax - yMin)) * innerH;
  const pr = (b: number) => 6 + ((b - bMin) / (bMax - bMin || 1)) * 12;

  const xMed = [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const yMed = [...ys].sort((a, b) => a - b)[Math.floor(ys.length / 2)];

  const tickFmt = (s: number) => fmt(Math.round(s / 60) * 60);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Performance Matrix</h2>
        <span className={styles.rule} />
        <span className={styles.count}>Swim vs Run · bike = bubble size</span>
      </div>
      <div className={cx(styles.card, styles.matrix)}>
        <div className={styles.matrixChart}>
          <div className={styles.mxAxisY}>RUN → slower</div>
          <div className={styles.mxAxisX}>SWIM → slower</div>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            <line className={styles.mxGridLine} x1={px(xMed)} y1={padT} x2={px(xMed)} y2={H - padB} />
            <line className={styles.mxGridLine} x1={padL} y1={py(yMed)} x2={W - padR} y2={py(yMed)} />
            <line className={styles.mxAxisLine} x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} />
            <line className={styles.mxAxisLine} x1={padL} y1={padT} x2={padL} y2={H - padB} />
            <text className={styles.mxTickLabel} x={padL} y={H - padB + 14} textAnchor="start">
              {tickFmt(xMin)}
            </text>
            <text className={styles.mxTickLabel} x={W - padR} y={H - padB + 14} textAnchor="end">
              {tickFmt(xMax)}
            </text>
            <text className={styles.mxTickLabel} x={padL - 6} y={padT + 8} textAnchor="end">
              {tickFmt(yMin)}
            </text>
            <text className={styles.mxTickLabel} x={padL - 6} y={H - padB} textAnchor="end">
              {tickFmt(yMax)}
            </text>
            <text className={styles.mxQuadLabel} x={padL + 12} y={padT + 22} textAnchor="start">
              all-around
            </text>
            <text className={styles.mxQuadLabel} x={W - padR - 12} y={padT + 22} textAnchor="end">
              runners
            </text>
            <text className={styles.mxQuadLabel} x={padL + 12} y={H - padB - 10} textAnchor="start">
              swimmers
            </text>
            <text className={styles.mxQuadLabel} x={W - padR - 12} y={H - padB - 10} textAnchor="end">
              grinders
            </text>
            {points.map((p) => {
              const cx_ = px(p.swim);
              const cy = py(p.run);
              const r = pr(p.bike);
              const fill = p.gender === 'M' ? 'var(--forest)' : 'var(--orange)';
              return (
                <g key={`${p.name}`}>
                  <circle cx={cx_} cy={cy} r={r} fill={fill} fillOpacity="0.7" className={styles.mxPointStroke} />
                  <text className={styles.mxPointLabel} x={cx_ + r + 4} y={cy + 4}>
                    {p.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className={styles.mxSide}>
          <h4>How to read</h4>
          <div className={styles.row}>
            <span className={cx(styles.dot, styles.m)} />
            Men
          </div>
          <div className={styles.row}>
            <span className={cx(styles.dot, styles.w)} />
            Women
          </div>
          <div className={styles.sizeKey}>
            <span className={styles.sc} style={{ width: 8, height: 8 }} />
            <span className={styles.sc} style={{ width: 14, height: 14 }} />
            <span className={styles.sc} style={{ width: 20, height: 20 }} />
          </div>
          <div className={styles.row} style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-mid)' }}>
            smaller = faster bike
          </div>
          <div className={styles.legendNote}>
            Bottom-left is the all-around quadrant — fast in the water and on foot. Big circles in the bottom-left lose
            time only on the bike.
          </div>
        </div>
      </div>
    </section>
  );
}

function SplitRow({ leg, ra, rb }: { leg: string; ra: Row; rb: Row }) {
  const key = leg.toLowerCase() as 'swim' | 'bike' | 'run' | 'total';
  const va = key === 'total' ? ra.total : ra[key];
  const vb = key === 'total' ? rb.total : rb[key];
  const sa = va ?? 0;
  const sb = vb ?? 0;
  const max = Math.max(sa, sb) || 1;
  const aWin = sa < sb;
  return (
    <div className={styles.splitRow}>
      <div className={styles.splitBarLeft}>
        <div className={styles.fill} style={{ width: `${(sa / max) * 100}%`, opacity: aWin ? 1 : 0.6 }}>
          <span className={styles.splitTime}>{fmt(va)}</span>
        </div>
      </div>
      <div className={styles.splitLabel}>
        {leg}
        {sa !== sb && (
          <div className={styles.splitWinnerArrow} style={{ color: aWin ? 'var(--good)' : 'var(--bad)' }}>
            {aWin ? `◀ ${fmtDiff(sa - sb)}` : `${fmtDiff(sa - sb)} ▶`}
          </div>
        )}
      </div>
      <div className={styles.splitBarRight}>
        <div className={styles.fill} style={{ width: `${(sb / max) * 100}%`, opacity: !aWin ? 1 : 0.6 }}>
          <span className={styles.splitTime}>{fmt(vb)}</span>
        </div>
      </div>
    </div>
  );
}

function HeadToHead({ data }: { data: AllTimeData }) {
  const options = useMemo(
    () => data.bestByRacer.map((r) => ({ key: `${r.name}-${r.year}`, label: `${r.name} ('${yy(r.year)})`, row: r })),
    [data.bestByRacer]
  );
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const ra = options.find((o) => o.key === a)?.row;
  const rb = options.find((o) => o.key === b)?.row;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Head-to-Head</h2>
        <span className={styles.rule} />
        <span className={styles.count}>Pick two to compare splits</span>
      </div>
      <div className={cx(styles.card, styles.h2h)}>
        <div className={styles.h2hGrid}>
          <div className={styles.racer}>
            <div className={styles.racerLbl}>Racer one</div>
            <select value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">— Select —</option>
              {options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            {ra && <div className={styles.racerTotal}>{fmt(ra.total)}</div>}
          </div>
          <div className={styles.h2hVs}>
            <span className={styles.circle}>VS</span>
          </div>
          <div className={styles.racer}>
            <div className={styles.racerLbl}>Racer two</div>
            <select value={b} onChange={(e) => setB(e.target.value)}>
              <option value="">— Select —</option>
              {options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            {rb && <div className={styles.racerTotal}>{fmt(rb.total)}</div>}
          </div>
        </div>

        {ra && rb ? (
          <div className={styles.h2hSplits}>
            <SplitRow leg="SWIM" ra={ra} rb={rb} />
            <SplitRow leg="BIKE" ra={ra} rb={rb} />
            <SplitRow leg="RUN" ra={ra} rb={rb} />
            <SplitRow leg="TOTAL" ra={ra} rb={rb} />
          </div>
        ) : (
          <div className={styles.h2hEmpty}>— select two racers to compare splits —</div>
        )}
      </div>
    </section>
  );
}

type GenderFilter = 'all' | 'M' | 'W';

function BestTimes({ data }: { data: AllTimeData }) {
  const [filter, setFilter] = useState<GenderFilter>('all');
  const all = data.bestByRacer;
  const rows = filter === 'all' ? all : all.filter((r) => r.gender === filter);
  const counts = { all: all.length, M: all.filter((r) => r.gender === 'M').length, W: all.filter((r) => r.gender === 'W').length };

  if (all.length === 0) return null;

  const leaderSec = all[0].total!;
  const maxSec = all[all.length - 1].total!;
  const gapRange = maxSec - leaderSec;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Best Times</h2>
        <span className={styles.rule} />
        <span className={styles.count}>One row per racer · fastest year</span>
      </div>

      <div className={styles.btControls}>
        <div className={styles.btFilter}>
          <button className={filter === 'all' ? styles.active : ''} onClick={() => setFilter('all')}>
            All · {counts.all}
          </button>
          <button className={filter === 'M' ? styles.active : ''} onClick={() => setFilter('M')}>
            Men · {counts.M}
          </button>
          <button className={filter === 'W' ? styles.active : ''} onClick={() => setFilter('W')}>
            Women · {counts.W}
          </button>
        </div>
        <div className={styles.btLegend}>
          gap from leader<span className={styles.swatch} /> longer = slower
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.num}>#</th>
            <th>Racer</th>
            <th>Year</th>
            <th className={styles.num}>Total</th>
            <th>Gap from leader</th>
            <th className={styles.num}>Swim</th>
            <th className={styles.num}>Bike</th>
            <th className={styles.num}>Run</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const rank = all.indexOf(r) + 1;
            const gap = r.total! - leaderSec;
            const pct = gapRange ? (gap / gapRange) * 100 : 0;
            return (
              <tr key={`${r.name}-${r.year}`} className={rank <= 3 ? styles.podium : ''}>
                <td className={styles.rankCell}>{rank}</td>
                <td>
                  <span className={styles.nameCell}>{r.name}</span>
                  <span className={styles.gtag}>{r.gender}</span>
                </td>
                <td className={styles.yearCell}>&apos;{yy(r.year)}</td>
                <td className={styles.num}>{fmt(r.total)}</td>
                <td className={styles.gapCell}>
                  <div className={styles.gapBar}>
                    <div className={styles.fill} style={{ width: `${pct}%` }} />
                  </div>
                  <div className={styles.gapText}>{gap === 0 ? '— leader —' : `+${fmt(gap)}`}</div>
                </td>
                <td className={styles.num}>{fmt(r.swim)}</td>
                <td className={styles.num}>{fmt(r.bike)}</td>
                <td className={styles.num}>{fmt(r.run)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
