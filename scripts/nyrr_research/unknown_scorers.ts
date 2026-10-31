// Share of Marathon / Corbitt team scorers who hadn't run an earlier club race that year
// for the team (31% / 14%) - why runner-level turnout doesn't help at the marathon.

import { getDivisionTeams, getTeamRunners, mapLimit } from '../../src/lib/nyrr/collect';
const key = (r: { firstName: string; lastName: string }) => `${r.firstName} ${r.lastName}`.trim().toLowerCase();
const secs = (t: string) =>
  t
    .split(':')
    .map(Number)
    .reduce((s, x) => s * 60 + x, 0);
(async () => {
  let scorers = 0,
    newScorers = 0,
    finishers = 0,
    newFinishers = 0,
    scorersC = 0,
    newScorersC = 0;
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
      await mapLimit(teams, 4, async (t) => {
        const known = new Set<string>();
        for (const e of before)
          (await getTeamRunners(e.eventCode, t.teamCode))
            .filter((r) => r.gender === g)
            .forEach((r) => known.add(key(r)));
        for (const [code, k, isM] of [
          [mara.eventCode, 3, true],
          [corb.eventCode, 5, false],
        ] as const) {
          const ran = (await getTeamRunners(code, t.teamCode))
            .filter((r) => r.gender === g)
            .sort((a, b) => secs(a.overallTime) - secs(b.overallTime));
          if (isM) {
            finishers += ran.length;
            newFinishers += ran.filter((r) => !known.has(key(r))).length;
          }
          if (ran.length >= k)
            for (const r of ran.slice(0, k)) {
              if (isM) {
                scorers++;
                if (!known.has(key(r))) newScorers++;
              } else {
                scorersC++;
                if (!known.has(key(r))) newScorersC++;
              }
            }
        }
      });
    }
  console.log(
    `marathon finishers with no earlier club race: ${newFinishers}/${finishers} (${((100 * newFinishers) / finishers).toFixed(0)}%)`,
  );
  console.log(
    `marathon SCORERS with no earlier club race: ${newScorers}/${scorers} (${((100 * newScorers) / scorers).toFixed(0)}%)`,
  );
  console.log(
    `Corbitt SCORERS with no earlier club race: ${newScorersC}/${scorersC} (${((100 * newScorersC) / scorersC).toFixed(0)}%)`,
  );
})();
