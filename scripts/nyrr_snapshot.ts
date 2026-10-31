#!/usr/bin/env npx tsx

/**
 * Saves what NYRR is showing right now for MTC's divisions (points per team per
 * race) as content/nyrr/snapshots/<date>.json, but only when it differs from the
 * latest saved snapshot. Over time this is the record of what was posted when,
 * which NYRR itself doesn't keep.
 *
 * Prints changed=true|false, and appends it to $GITHUB_OUTPUT when run in GitHub Actions.
 */

import fs from 'fs';
import path from 'path';
import { getDivisionTeams, getDivisions, getLatestYear } from '../src/lib/nyrr/collect';
import { TEAM_CODE } from '../src/lib/nyrr/standings';

const DIR = path.join(process.cwd(), 'content', 'nyrr', 'snapshots');

async function current() {
  const year = await getLatestYear();
  const mine = (await getDivisions(year)).filter((d) => d.teamResults.some((t) => t.teamCode === TEAM_CODE));
  const divisions = [];
  for (const d of mine) {
    const teams = await getDivisionTeams(year, d.divisionCode);
    divisions.push({
      divisionCode: d.divisionCode,
      divisionName: d.divisionName,
      teams: teams.map((t) => ({
        teamCode: t.teamCode,
        teamName: t.teamName,
        place: t.teamPlace,
        points: t.totalPoints,
        races: Object.fromEntries((t.eventDetails ?? []).map((e) => [e.eventCode, e.points])),
      })),
    });
  }
  return { year, divisions };
}

function latestSaved(): string | null {
  if (!fs.existsSync(DIR)) return null;
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
  if (!files.length) return null;
  const { savedAt: _, ...rest } = JSON.parse(fs.readFileSync(path.join(DIR, files[files.length - 1]), 'utf8'));
  return JSON.stringify(rest);
}

async function main() {
  const now = await current();
  const changed = JSON.stringify(now) !== latestSaved();
  if (changed) {
    const savedAt = new Date().toISOString();
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(path.join(DIR, `${savedAt.slice(0, 10)}.json`), JSON.stringify({ savedAt, ...now }, null, 2) + '\n');
  }
  console.log(`changed=${changed}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
}

main().catch((err) => {
  console.error(`NYRR snapshot failed: ${err.message ?? err}`);
  process.exit(1);
});
