#!/usr/bin/env npx tsx

/**
 * How does NYRR rank teams that finish a season level on points? Looks through
 * past seasons for teams level on NYRR's final total (which already leaves out
 * each team's dropped scores) among the top places, and prints the place NYRR
 * gave each, plus where open-division teams played the next year.
 *
 *   NYRR_CACHE_DIR=/tmp/nyrr npx tsx scripts/nyrr_research/ties.ts 2022 2023 2024 2025
 */

import { getDivisionTeams, getDivisions } from '../../src/lib/nyrr/collect';
import { isOpenDivision } from '../../src/lib/nyrr/standings';

async function main() {
  const years = process.argv.slice(2).map(Number);
  for (const year of years) {
    const divisions = await getDivisions(year);
    const next = await getDivisions(year + 1).catch(() => []);
    const nextDivision = new Map<string, string>();
    // Open divisions only: a team is in one per gender, so next year's shows who moved
    for (const d of next) {
      if (isOpenDivision(d.divisionCode)) for (const t of d.teamResults) nextDivision.set(`${d.divisionGender}|${t.teamCode}`, d.divisionCode);
    }
    for (const d of divisions) {
      const teams = await getDivisionTeams(year, d.divisionCode);
      const rows = teams.map((t) => {
        const points = (t.eventDetails ?? []).filter((e) => e.isClubPointsPublished).map((e) => e.points ?? 0);
        return { code: t.teamCode, place: t.teamPlace, total: t.totalPoints, points };
      });
      const byTotal = new Map<number, typeof rows>();
      for (const r of rows) byTotal.set(r.total, [...(byTotal.get(r.total) ?? []), r]);
      for (const [total, tied] of byTotal) {
        if (tied.length < 2 || total === 0) continue;
        const better = rows.filter((r) => r.total > total).length;
        if (better > 5) continue;
        console.log(`${year} ${d.divisionCode} level on ${total} for place ${better + 1}:`);
        for (const r of tied) {
          const where = isOpenDivision(d.divisionCode) ? `, next year ${nextDivision.get(`${d.divisionGender}|${r.code}`) ?? '?'}` : '';
          console.log(`   ${r.code.padEnd(8)} NYRR place ${r.place}, NYRR total ${r.total}${where}, scores ${[...r.points].sort((a, b) => b - a).join(' ')}`);
        }
      }
    }
  }
}

main();
