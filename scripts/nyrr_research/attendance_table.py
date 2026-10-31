"""Chance a runner races the Marathon / Ted Corbitt 15K for their team, by club
races run before the marathon and whether they ran it last year.
Feeds ATTENDANCE in src/lib/nyrr/model.ts. Needs runners.json from
collect_runner_seasons.ts."""
import json, os

OUT = os.environ.get('NYRR_RESEARCH_DIR', '.nyrr-research')
rows = json.load(open(os.path.join(OUT, 'runners.json')))
BUCKETS = [(1, 1), (2, 2), (3, 3), (4, 5), (6, 7), (8, 99)]

for name, ran, last in (('Marathon', 'mara', 'lastMara'), ('Corbitt 15K', 'corb', 'lastCorb')):
    print(name)
    for lo, hi in BUCKETS:
        cells = []
        for ran_last in (False, True):
            b = [r for r in rows if lo <= len(r['results']) <= hi and r[last] is ran_last]
            k = sum(r[ran] is not None for r in b)
            cells.append(f"{(k + 1) / (len(b) + 2):.3f} (n={len(b)})")
        print(f"  {lo}-{hi} races: didn't run last year {cells[0]}  ran last year {cells[1]}")
