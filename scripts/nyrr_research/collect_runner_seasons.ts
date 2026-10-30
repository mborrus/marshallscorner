// Collects every A/B division runner-season 2023-2025 (club results before the marathon,
// whether they ran the Marathon / Corbitt, and last year) into runners.json for the
// Python analyses. Slow the first time (~2,500 API calls); set NYRR_CACHE_DIR.

import fs from 'fs';
import path from 'path';

const OUT = process.env.NYRR_RESEARCH_DIR ?? '.nyrr-research';
import { getDivisionTeams, getTeamRunners, mapLimit, raceKey, distanceMeters } from '../../src/lib/nyrr/collect';
const key = (r: { firstName: string; lastName: string }) => `${r.firstName} ${r.lastName}`.trim().toLowerCase();
const secs = (t: string) =>
  t
    .split(':')
    .map(Number)
    .reduce((s, x) => s * 60 + x, 0);
(async () => {
  const out: any[] = [];
  for (const year of [2023, 2024, 2025])
    for (const [dc, g] of [
      ['AM', 'M'],
      ['AW', 'W'],
      ['BM', 'M'],
      ['BW', 'W'],
    ]) {
      const teams = await getDivisionTeams(year, dc);
      const evs = teams[0].eventDetails!;
      const mara = evs.find((e) => e.distanceUnitCode === 'MAR')!;
      const corb = evs.find((e) => /corbitt/i.test(e.eventName))!;
      const before = evs.filter((e) => Date.parse(e.startDateTime) < Date.parse(mara.startDateTime));
      const prevEvs = (await getDivisionTeams(year - 1, 'AM'))[0].eventDetails!;
      const pm = prevEvs.find((e) => raceKey(e.eventName) === raceKey(mara.eventName));
      const pc = prevEvs.find((e) => raceKey(e.eventName) === raceKey(corb.eventName));
      await mapLimit(teams, 4, async (t) => {
        const get = async (code?: string) =>
          code
            ? new Map(
                (await getTeamRunners(code, t.teamCode))
                  .filter((r) => r.gender === g)
                  .map((r) => [key(r), secs(r.overallTime)]),
              )
            : new Map();
        const res = await mapLimit(before, 4, async (e) => ({ e, m: await get(e.eventCode) }));
        const m = await get(mara.eventCode),
          c = await get(corb.eventCode),
          lm = await get(pm?.eventCode),
          lc = await get(pc?.eventCode);
        const runners = new Map<string, { d: number; s: number; date: string }[]>();
        for (const { e, m: mm } of res)
          for (const [k, s] of mm) {
            if (!runners.has(k)) runners.set(k, []);
            runners.get(k)!.push({ d: distanceMeters(e.distanceUnitCode), s, date: e.startDateTime });
          }
        for (const [k, results] of runners)
          out.push({
            year,
            dc,
            team: t.teamCode,
            g,
            k,
            results,
            mara: m.get(k) ?? null,
            corb: c.get(k) ?? null,
            lastMara: pm ? lm.has(k) : null,
            lastCorb: pc ? lc.has(k) : null,
            scorersMara: 3,
            scorersCorb: 5,
          });
      });
      console.error(year, dc, out.length);
    }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'runners.json'), JSON.stringify(out));
})();
