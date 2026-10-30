// Fits how much of the gap between teams carries over to the marathon / 15K
// (strengthScale*, extraSigma* in model.ts). Marathon ~0.6, 15K ~1.0.
// DIVS=AM,AW limits it to some divisions.

import { collectDivision, collectPastScores } from '../../src/lib/nyrr/collect';
import { DEFAULT_PARAMS, fitRace, isMarathon } from '../../src/lib/nyrr/model';
(async () => {
  const groups: Record<string, { a: number; x: number; sigma: number; se: number; off: number }[][]> = {
    MAR: [],
    '15K': [],
  };
  const wanted = process.env.DIVS?.split(',');
  const divisions = [
    ['AM', 'M'],
    ['AW', 'W'],
    ['BM', 'M'],
    ['BW', 'W'],
  ].filter(([dc]) => !wanted || wanted.includes(dc));
  for (const year of [2022, 2023, 2024, 2025])
    for (const [dc, g] of divisions) {
      const s = await collectDivision(year, dc, g);
      const past = await collectPastScores(
        year,
        s.teams.map((t) => t.teamCode),
        g,
      );
      const mara = s.races.find(isMarathon)!;
      const later = s.races.filter((r) => r.published && Date.parse(r.date) >= Date.parse(mara.date));
      const train = s.races.map((r) => (later.includes(r) ? { ...r, published: false } : r));
      for (const target of later) {
        const fit = fitRace(s.teams, train, target, DEFAULT_PARAMS, past);
        const grp = s.teams
          .filter((t) => fit.teams[t.teamCode].races > 0 && t.races[target.eventCode]?.score != null)
          .map((t) => ({
            a: fit.teams[t.teamCode].strength,
            x: t.races[target.eventCode].score!,
            sigma: fit.teams[t.teamCode].sigma,
            se: fit.teams[t.teamCode].strengthSe,
            off: fit.targetEffect,
          }));
        if (grp.length >= 3) groups[isMarathon(target) ? 'MAR' : '15K'].push(grp);
      }
    }
  for (const [kind, gs] of Object.entries(groups)) {
    let sxy = 0,
      sxx = 0;
    for (const g of gs) {
      const ma = g.reduce((s, o) => s + o.a, 0) / g.length,
        mx = g.reduce((s, o) => s + o.x, 0) / g.length;
      for (const o of g) {
        sxy += (o.a - ma) * (o.x - mx);
        sxx += (o.a - ma) ** 2;
      }
    }
    const lam = sxy / sxx;
    // residuals with lambda, intercept = race mean; and bias of level vs predicted offset
    const res: number[] = [];
    const lvl: number[] = [];
    let modelVar = 0,
      n = 0;
    for (const g of gs) {
      const ma = g.reduce((s, o) => s + o.a, 0) / g.length,
        mx = g.reduce((s, o) => s + o.x, 0) / g.length;
      lvl.push(mx - (g[0].off + lam * ma));
      for (const o of g) {
        res.push(o.x - mx - lam * (o.a - ma));
        modelVar += lam * lam * (o.sigma ** 2 + o.se ** 2);
        n++;
      }
    }
    const sd = Math.sqrt(res.reduce((s, x) => s + x * x, 0) / res.length);
    const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
    console.log(
      kind,
      'lambda',
      lam.toFixed(3),
      'resid sd',
      sd.toFixed(4),
      'model sd (scaled)',
      Math.sqrt(modelVar / n).toFixed(4),
      'extra',
      Math.sqrt(Math.max(0, sd * sd - modelVar / n)).toFixed(4),
      'level bias',
      mean(lvl).toFixed(4),
      'sd',
      Math.sqrt(mean(lvl.map((x) => (x - mean(lvl)) ** 2))).toFixed(4),
    );
  }
})();
