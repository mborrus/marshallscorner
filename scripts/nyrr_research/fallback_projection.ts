// For runners whose club results before the Marathon / Corbitt were all much
// shorter races: does projecting from their other NYRR races in the 13 months
// before (getRunnerResults) beat projecting from those short club races?

import {
  distanceMeters,
  getDivisionTeams,
  getRunnerResults,
  getTeamRunners,
  mapLimit,
  runnerKey,
} from '../../src/lib/nyrr/collect';
import { isComparable, projectRunner, type RaceInfo } from '../../src/lib/nyrr/model';

const secs = (t: string) =>
  t
    .split(':')
    .map(Number)
    .reduce((s, x) => s * 60 + x, 0);
const median = (a: number[]) => [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)];
const sd = (a: number[]) => {
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};

(async () => {
  const rows: { kind: string; club: number; other: number | null }[] = [];
  for (const year of [2024, 2025])
    for (const [dc, g] of [
      ['AM', 'M'],
      ['AW', 'W'],
      ['BM', 'M'],
      ['BW', 'W'],
    ]) {
      const teams = await getDivisionTeams(year, dc);
      const evs = teams[0].eventDetails!;
      const mara = evs.find((e) => e.distanceUnitCode === 'MAR')!;
      const before = evs.filter(
        (e) => e.isClubPointsPublished && Date.parse(e.startDateTime) < Date.parse(mara.startDateTime),
      );
      for (const target of [mara, evs.find((e) => /corbitt/i.test(e.eventName))!]) {
        const race: RaceInfo = {
          eventCode: target.eventCode,
          eventName: target.eventName,
          date: target.startDateTime,
          distanceMeters: distanceMeters(target.distanceUnitCode),
          multiplier: 1,
          scorers: 0,
          published: true,
        };
        await mapLimit(teams, 2, async (t) => {
          const club = new Map<string, { distanceMeters: number; seconds: number }[]>();
          for (const e of before) {
            for (const r of await getTeamRunners(e.eventCode, t.teamCode)) {
              if (r.gender !== g) continue;
              const list = club.get(runnerKey(r)) ?? [];
              list.push({ distanceMeters: distanceMeters(e.distanceUnitCode), seconds: secs(r.overallTime) });
              club.set(runnerKey(r), list);
            }
          }
          const finishers = (await getTeamRunners(target.eventCode, t.teamCode)).filter((r) => r.gender === g);
          await mapLimit(finishers, 4, async (r) => {
            const mine = club.get(runnerKey(r));
            if (!mine || mine.some((x) => isComparable(x, race))) return;
            const since = Date.parse(race.date) - 395 * 86_400_000;
            const other = (await getRunnerResults(r.runnerId).catch(() => [])).filter(
              (x) => isComparable(x, race) && Date.parse(x.date) > since && Date.parse(x.date) < Date.parse(race.date),
            );
            const actual = secs(r.overallTime);
            rows.push({
              kind: race.distanceMeters > 40000 ? 'MAR' : '15K',
              club: Math.log(actual / projectRunner(mine, race)),
              other: other.length ? Math.log(actual / projectRunner(other, race)) : null,
            });
          });
        });
        console.error(year, dc, target.eventCode, rows.length);
      }
    }
  for (const kind of ['MAR', '15K']) {
    const both = rows.filter((r) => r.kind === kind && r.other !== null);
    const none = rows.filter((r) => r.kind === kind && r.other === null);
    console.log(
      `${kind}: ${both.length} runners with only short club races but other comparable results (${none.length} without)`,
    );
    console.log(
      `  from short club races: median error ${median(both.map((r) => r.club)).toFixed(3)}, sd ${sd(both.map((r) => r.club)).toFixed(3)}`,
    );
    console.log(
      `  from other NYRR races: median error ${median(both.map((r) => r.other!)).toFixed(3)}, sd ${sd(both.map((r) => r.other!)).toFixed(3)}`,
    );
    const absClub = median(both.map((r) => Math.abs(r.club)));
    const absOther = median(both.map((r) => Math.abs(r.other!)));
    console.log(`  median absolute error: club ${absClub.toFixed(3)} vs other ${absOther.toFixed(3)}`);
  }
})();
