"""Summarizes season_backtest.ts output: promotion-odds calibration by how many
races were left, and next-race time / turnout accuracy."""
import json, math, os, statistics as st
from collections import defaultdict

OUT = os.environ.get('NYRR_RESEARCH_DIR', '.nyrr-research')
odds = json.load(open(os.path.join(OUT, 'season_odds.json')))
nxt = json.load(open(os.path.join(OUT, 'season_next.json')))


def brier(rows, p, y):
    return sum((r[p] - r[y]) ** 2 for r in rows) / len(rows)


def logloss(rows, p, y):
    eps = 1e-3
    return -sum(math.log(max(eps, r[p] if r[y] else 1 - r[p])) for r in rows) / len(rows)


print('PROMOTION ODDS (top 2) by races left')
for lo, hi in ((1, 2), (3, 5), (6, 8), (9, 99)):
    b = [r for r in odds if lo <= r['left'] <= hi]
    print(f"  {lo}-{hi} left: n {len(b):4}  Brier model {brier(b, 'pTop2', 'top2'):.4f}  current-top2 {brier(b, 'nowTop2', 'top2'):.4f}"
          f"  log-loss {logloss(b, 'pTop2', 'top2'):.3f}  confident misses (p<2% or >98% wrong) "
          f"{sum((r['pTop2'] < .02 and r['top2']) or (r['pTop2'] > .98 and not r['top2']) for r in b)}")
print('  calibration (all points):')
for lo, hi in ((0, .02), (.02, .1), (.1, .3), (.3, .5), (.5, .7), (.7, .9), (.9, .98), (.98, 1.01)):
    b = [r for r in odds if lo <= r['pTop2'] < hi]
    if b:
        early = [r for r in b if r['left'] >= 6]
        print(f"    p {lo:.2f}-{hi:.2f}: n {len(b):4} predicted {st.mean(r['pTop2'] for r in b):.2f} actual {st.mean(r['top2'] for r in b):.2f}"
              + (f" | early (6+ left) n {len(early)} actual {st.mean(r['top2'] for r in early):.2f}" if early else ''))

print('\nNEXT-RACE TEAM TIME (fielded teams with data)')
rows = [r for r in nxt if r['actual'] is not None and r['hadData']]
# race effect estimate error cancels in ranks; look at relative errors within a race
by_race = defaultdict(list)
for r in rows:
    by_race[(r['year'], r['dc'], r['race'])].append(r)
rel = []
for g in by_race.values():
    if len(g) < 3:
        continue
    bias = st.mean(r['actual'] - r['predicted'] for r in g)
    for r in g:
        rel.append({**r, 'err': r['actual'] - r['predicted'] - bias, 'level': bias})
for key in ('group', 'n'):
    print(f'  by {key}:')
    groups = defaultdict(list)
    for r in rel:
        groups[r[key] if key == 'group' else min(r['n'], 6)].append(r)
    for k in sorted(groups):
        g = groups[k]
        z = [r['err'] / r['sd'] for r in g]
        print(f"    {str(k):12} n {len(g):4}  error sd {st.pstdev(r['err'] for r in g):.3f}  model sd {st.mean(r['sd'] for r in g):.3f}  z sd {st.pstdev(z):.2f}")
levels = defaultdict(list)
for g in by_race.values():
    if len(g) >= 3:
        levels[g[0]['group']].append(st.mean(r['actual'] - r['predicted'] for r in g))
print('  race time level (actual - predicted, log) by distance:')
for k, v in sorted(levels.items()):
    print(f"    {k:12} races {len(v):3}  mean {st.mean(v):+.3f}  sd {st.pstdev(v):.3f}")

print('\nNEXT-RACE TURNOUT')
for key in ('n', 'group'):
    groups = defaultdict(list)
    for r in nxt:
        groups[r[key] if key == 'group' else min(r['n'], 6)].append(r)
    for k in sorted(groups):
        g = groups[k]
        print(f"    {key} {str(k):12} n {len(g):4} predicted {st.mean(r['pField'] for r in g):.2f} actual {st.mean(r['fielded'] for r in g):.2f} Brier {brier(g, 'pField', 'fielded'):.3f}")
