// Per team and race: team-history turnout chance, runner-based turnout, and whether the
// team fielded a full team. Writes partrows.json for turnout_blend.py.

import fs from 'fs';
import path from 'path';

const OUT = process.env.NYRR_RESEARCH_DIR ?? '.nyrr-research';
import { collectDivision, collectHistory } from '../../src/lib/nyrr/collect';
import { fieldProbability, isMarathon } from '../../src/lib/nyrr/model';
const runners = JSON.parse(fs.readFileSync(path.join(OUT, 'runners.json'), 'utf8'));
const TABLE: Record<string, [number, number][]> = {
  MAR: [
    [0.189, 0.36],
    [0.297, 0.53],
    [0.343, 0.635],
    [0.402, 0.725],
    [0.477, 0.848],
    [0.54, 0.896],
  ],
  '15K': [
    [0.037, 0.136],
    [0.082, 0.244],
    [0.114, 0.272],
    [0.154, 0.364],
    [0.263, 0.467],
    [0.558, 0.738],
  ],
};
const bucket = (n: number) => (n <= 3 ? n - 1 : n <= 5 ? 3 : n <= 7 ? 4 : 5);
function atLeast(ps: number[], k: number): number {
  let dist = [1];
  for (const p of ps) {
    const nd = new Array(dist.length + 1).fill(0);
    dist.forEach((v, i) => {
      nd[i] += v * (1 - p);
      nd[i + 1] += v * p;
    });
    dist = nd;
  }
  return dist.slice(k).reduce((s, x) => s + x, 0);
}
(async () => {
  const out: any[] = [];
  for (const year of [2023, 2024, 2025])
    for (const [dc, g] of [
      ['AM', 'M'],
      ['AW', 'W'],
      ['BM', 'M'],
      ['BW', 'W'],
    ]) {
      const s = await collectDivision(year, dc, g);
      const mara = s.races.find(isMarathon)!;
      const later = s.races.filter((r) => r.published && Date.parse(r.date) >= Date.parse(mara.date));
      const train = s.races.map((r) => (later.includes(r) ? { ...r, published: false } : r));
      for (const target of later) {
        const kind = isMarathon(target) ? 'MAR' : '15K';
        const { history } = await collectHistory(
          target,
          s.teams.map((t) => t.teamCode),
          g,
          [year - 1, year - 2],
        );
        for (const t of s.teams) {
          const roster = runners.filter((r: any) => r.year === year && r.dc === dc && r.team === t.teamCode);
          const ps = roster.map(
            (r: any) => TABLE[kind][bucket(r.results.length)][(kind === 'MAR' ? r.lastMara : r.lastCorb) ? 1 : 0],
          );
          out.push({
            year,
            dc,
            team: t.teamCode,
            kind,
            pTeam: fieldProbability(t, train, history[t.teamCode]),
            pRunner: atLeast(ps, target.scorers),
            expected: ps.reduce((a: number, b: number) => a + b, 0),
            roster: roster.length,
            k: target.scorers,
            y: t.races[target.eventCode]?.score != null ? 1 : 0,
          });
        }
      }
    }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'partrows.json'), JSON.stringify(out));
})();
