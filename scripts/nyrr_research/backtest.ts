// Backtest of the team model on 2022-2025 A/B divisions from the pre-marathon point:
// residual spread, time-estimate bias, team turnout calibration, and promotion Brier vs
// "current top 2". Override params with PARAMS='{"historyWeight":3}'.

import { collectDivision, collectHistory, collectPastScores } from '../../src/lib/nyrr/collect';
import {
  fitRace,
  fieldProbability,
  simulate,
  simRaceInput,
  isMarathon,
  DEFAULT_PARAMS,
  paramsForDivision,
  type ModelParams,
  type RaceInfo,
} from '../../src/lib/nyrr/model';

const DIVS: [string, string][] = [
  ['AM', 'M'],
  ['AW', 'W'],
  ['BM', 'M'],
  ['BW', 'W'],
];
// LEVELS=0 uses the same settings for A and B divisions
const paramsFor = (dc: string): ModelParams => ({
  ...(process.env.LEVELS === '0' ? DEFAULT_PARAMS : paramsForDivision(dc)),
  ...JSON.parse(process.env.PARAMS ?? '{}'),
});

async function main() {
  const errs: Record<string, number[]> = { MAR: [], OTHER: [] };
  const predVar: Record<string, number[]> = { MAR: [], OTHER: [] };
  const riegel: Record<string, number[]> = { MAR: [], OTHER: [] };
  const part: { p: number; y: number; hw: number }[] = [];
  const promo: { p: number; y: number; p1: number; y1: number; naive: number }[] = [];
  for (const year of [2022, 2023, 2024, 2025])
    for (const [dc, g] of DIVS) {
      let season;
      try {
        season = await collectDivision(year, dc, g);
      } catch (e) {
        console.log('skip', year, dc, String(e));
        continue;
      }
      const past = await collectPastScores(
        year,
        season.teams.map((t) => t.teamCode),
        g,
      );
      const params = paramsFor(dc);
      const mara = season.races.find(isMarathon);
      if (!mara) continue;
      const remaining = season.races.filter((r) => r.published && Date.parse(r.date) >= Date.parse(mara.date));
      const train = season.races.map((r) => (remaining.includes(r) ? { ...r, published: false } : r));
      const current = Object.fromEntries(
        season.teams.map((t) => [
          t.teamCode,
          train.filter((r) => r.published).reduce((s, r) => s + (t.races[r.eventCode]?.points ?? 0), 0),
        ]),
      );
      const simTeams = season.teams.map((t) => ({
        teamCode: t.teamCode,
        currentPoints: current[t.teamCode],
        fit: {} as any,
        fieldProb: {} as any,
      }));
      const simRaces = [];
      for (const target of remaining) {
        const kind = isMarathon(target) ? 'MAR' : 'OTHER';
        const fit = fitRace(season.teams, train, target, params, past);
        const { history: hist } = await collectHistory(
          target,
          season.teams.map((t) => t.teamCode),
          g,
          [year - 1, year - 2],
        );
        const fielded = season.teams.filter((t) => t.races[target.eventCode]?.score != null);
        const bAct =
          fielded.reduce((s, t) => s + t.races[target.eventCode].score! - fit.teams[t.teamCode].strength, 0) /
          Math.max(1, fielded.length);
        if (fielded.length >= 3) {
          riegel[kind].push(bAct - fit.targetEffect);
          for (const t of fielded)
            if (fit.teams[t.teamCode].races > 0) {
              const f = fit.teams[t.teamCode];
              errs[kind].push(t.races[target.eventCode].score! - f.strength - bAct);
              predVar[kind].push(f.sigma ** 2 + f.strengthSe ** 2);
            }
        }
        for (const t of season.teams) {
          const p = fieldProbability(t, train, hist[t.teamCode], params);
          part.push({ p, y: t.races[target.eventCode]?.score != null ? 1 : 0, hw: params.historyWeight });
          const st = simTeams.find((s) => s.teamCode === t.teamCode)!;
          st.fit[target.eventCode] = fit.teams[t.teamCode];
          st.fieldProb[target.eventCode] = p;
        }
        simRaces.push(simRaceInput(target, fit, params));
      }
      const res = simulate(simTeams, simRaces, '', 4000);
      const finalPts = season.teams.map((t) => t.totalPoints);
      const pre = season.teams.map((t) => current[t.teamCode]);
      season.teams.forEach((t, i) => {
        const better = finalPts.filter((p) => p > finalPts[i]).length;
        const preBetter = pre.filter((p) => p > pre[i]).length;
        const r = res.teams[i];
        promo.push({
          p: r.pTop2,
          y: better < 2 ? 1 : 0,
          p1: r.pFirst,
          y1: better < 1 ? 1 : 0,
          naive: preBetter < 2 ? 1 : 0,
        });
      });
      console.log(year, dc, 'teams', season.teams.length, 'remaining', remaining.map((r) => r.eventCode).join(','));
    }
  const sd = (a: number[]) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  for (const k of ['MAR', 'OTHER']) {
    console.log(
      k,
      'n',
      errs[k].length,
      'actual resid sd',
      sd(errs[k]).toFixed(4),
      'model sd',
      Math.sqrt(mean(predVar[k])).toFixed(4),
      'extra needed',
      Math.sqrt(Math.max(0, sd(errs[k]) ** 2 - mean(predVar[k]))).toFixed(4),
      'riegel offset mean',
      mean(riegel[k]).toFixed(4),
      'sd',
      sd(riegel[k].map((x) => x - mean(riegel[k]))).toFixed(4),
    );
  }
  const brier = (xs: { p: number; y: number }[]) => mean(xs.map((x) => (x.p - x.y) ** 2));
  console.log('participation brier', brier(part).toFixed(4), 'base rate', mean(part.map((x) => x.y)).toFixed(3));
  for (const [lo, hi] of [
    [0, 0.2],
    [0.2, 0.4],
    [0.4, 0.6],
    [0.6, 0.8],
    [0.8, 1.01],
  ]) {
    const b = part.filter((x) => x.p >= lo && x.p < hi);
    if (b.length)
      console.log(
        `  p ${lo}-${hi}: n=${b.length} predicted ${mean(b.map((x) => x.p)).toFixed(2)} actual ${mean(b.map((x) => x.y)).toFixed(2)}`,
      );
  }
  console.log(
    'top2 brier',
    brier(promo).toFixed(4),
    'naive (current top2) brier',
    brier(promo.map((x) => ({ p: x.naive, y: x.y }))).toFixed(4),
    'first brier',
    brier(promo.map((x) => ({ p: x.p1, y: x.y1 }))).toFixed(4),
  );
  for (const [lo, hi] of [
    [0, 0.05],
    [0.05, 0.3],
    [0.3, 0.7],
    [0.7, 0.95],
    [0.95, 1.01],
  ]) {
    const b = promo.filter((x) => x.p >= lo && x.p < hi);
    if (b.length)
      console.log(
        `  top2 p ${lo}-${hi}: n=${b.length} predicted ${mean(b.map((x) => x.p)).toFixed(2)} actual ${mean(b.map((x) => x.y)).toFixed(2)}`,
      );
  }
}
main();
