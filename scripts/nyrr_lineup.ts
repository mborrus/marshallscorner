#!/usr/bin/env npx tsx

/**
 * Record who a team has signed up for a race, for the NYRR forecast.
 * Names are matched to the team's 2024+ NYRR results (so "Matt" finds
 * "Matthew") and saved as hashes in content/nyrr/lineups.json.
 *
 * Usage: npx tsx scripts/nyrr_lineup.ts [--asked] <year> "<race name>" <teamCode> "Name One" "Name Two" ...
 * e.g.   npx tsx scripts/nyrr_lineup.ts 2026 "TCS New York City Marathon" ManTC "Alex Hellyar" ...
 * --asked: these runners were invited, not confirmed
 */

import fs from 'fs';
import { getTeamRunners, mapLimit, nameHash, raceKey, runnerKey, sameRunner, clubRaces } from '../src/lib/nyrr/collect';
import { LINEUPS_PATH, type Lineup, type LineupKind } from '../src/lib/nyrr/forecast';

async function main() {
  const args = process.argv.slice(2);
  const kind: LineupKind = args.includes('--asked') ? 'asked' : 'signed-up';
  const [yearArg, raceName, team, ...names] = args.filter((a) => a !== '--asked');
  const year = Number(yearArg);
  if (!year || !raceName || !team || !names.length) {
    console.error('Usage: npx tsx scripts/nyrr_lineup.ts [--asked] <year> "<race name>" <teamCode> "Name" ...');
    process.exit(1);
  }

  const races = (await Promise.all([year, year - 1, year - 2].map(clubRaces))).flat();
  const lists = await mapLimit(races, 4, (r) => getTeamRunners(r.eventCode, team));
  const known = [...new Set(lists.flat().map(runnerKey))];

  const matched: string[] = [];
  let unmatched = 0;
  for (const name of names) {
    const key = runnerKey({ firstName: name, lastName: '' });
    const hit = known.find((k) => k === key) ?? known.find((k) => sameRunner(k, key));
    if (hit) {
      matched.push(nameHash(hit));
      console.log(`✓ ${name}${hit !== key ? ` (as ${hit})` : ''}`);
    } else {
      unmatched++;
      console.log(`✗ ${name}: no ${team} results since ${year - 2}`);
    }
  }

  const file = fs.existsSync(LINEUPS_PATH) ? JSON.parse(fs.readFileSync(LINEUPS_PATH, 'utf8')) : {};
  const lineups: Lineup[] = (file.lineups ?? []).filter(
    (l: Lineup) => !(l.year === year && l.race === raceKey(raceName) && l.team === team)
  );
  lineups.push({
    year,
    race: raceKey(raceName),
    team,
    kind,
    runners: [...new Set(matched)],
    unmatched,
    updated: new Date().toISOString().slice(0, 10),
  });
  fs.writeFileSync(
    LINEUPS_PATH,
    JSON.stringify({ about: 'Written by scripts/nyrr_lineup.ts. Runner names are hashed.', lineups }, null, 2) + '\n'
  );
  console.log(`Saved ${matched.length} runners (${unmatched} not found) to ${LINEUPS_PATH}`);
}

main();
