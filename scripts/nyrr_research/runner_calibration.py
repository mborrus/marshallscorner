"""How individual times land around a Riegel projection, and whether
simulating a team's top-k from its finishers is unbiased.
Feeds runnerTimeOffset* and RUNNER_RESIDUALS in src/lib/nyrr/model.ts.
Needs runners.json from collect_runner_seasons.ts."""
import json, math, os, random, statistics as st
from collections import defaultdict

OUT = os.environ.get('NYRR_RESEARCH_DIR', '.nyrr-research')
rows = json.load(open(os.path.join(OUT, 'runners.json')))
RIEGEL = 1.06


def project(r, dist):
    close = [x for x in r['results'] if dist / x['d'] <= 4.5] or r['results']
    eqs = sorted(x['s'] * (dist / x['d']) ** RIEGEL for x in close)[:2]
    return sum(eqs) / len(eqs)


for name, dist, col, k in (('Marathon', 42195, 'mara', 3), ('Corbitt 15K', 15000, 'corb', 5)):
    raw = [math.log(r[col] / project(r, dist)) for r in rows if r[col]]
    offset = st.median(raw)
    res = sorted(x - offset for x in raw)
    print(f"{name}: median offset {offset:.3f}, sd {st.pstdev(raw):.3f}, n {len(raw)}")
    print('  residual quantiles 2.5%..97.5%:', [round(res[int(i / 40 * (len(res) - 1))], 3) for i in range(1, 40)])

    teams = defaultdict(list)
    for r in rows:
        if r[col]:
            teams[(r['year'], r['dc'], r['team'])].append(r)
    random.seed(1)
    errs = []
    for rs in teams.values():
        if len(rs) < k:
            continue
        actual = math.log(st.mean(sorted(r[col] for r in rs)[:k]))
        sims = sorted(
            math.log(st.mean(sorted(project(r, dist) * math.exp(offset + random.choice(res)) for r in rs)[:k]))
            for _ in range(400)
        )
        errs.append((actual - sims[200], sum(s < actual for s in sims) / 400, len(rs)))
    print(f"  team top-{k}: bias {st.mean(e[0] for e in errs):.4f}, in 10-90% range {sum(0.1 <= e[1] <= 0.9 for e in errs) / len(errs):.2f}")
    for lo, hi in ((3, 6), (7, 15), (16, 999)):
        b = [e for e in errs if lo <= e[2] <= hi]
        if b:
            print(f"    {lo}-{hi} finishers: n {len(b)} bias {st.mean(e[0] for e in b):.4f}")
