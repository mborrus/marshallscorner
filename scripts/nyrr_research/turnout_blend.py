"""Does runner-level attendance improve team turnout predictions over team
history alone? Leave-one-year-out check of blends. Feeds
runnerTurnoutWeight* and runnerTurnout() in src/lib/nyrr/model.ts.
Needs partrows.json from turnout_rows.ts. Requires numpy."""
import json, os
import numpy as np

OUT = os.environ.get('NYRR_RESEARCH_DIR', '.nyrr-research')
d = json.load(open(os.path.join(OUT, 'partrows.json')))


def fit(X, y, iters=4000, lr=0.3, l2=0.01):
    w = np.zeros(X.shape[1])
    for _ in range(iters):
        p = 1 / (1 + np.exp(-X @ w))
        w -= lr * (X.T @ (p - y) / len(y) + l2 * w * np.r_[0, np.ones(X.shape[1] - 1)])
    return w


for kind in ('MAR', '15K'):
    r = [x for x in d if x['kind'] == kind]
    y = np.array([x['y'] for x in r])
    years = np.array([x['year'] for x in r])
    team = np.array([x['pTeam'] for x in r])
    X = np.array([[1, np.log(x['expected'] / x['k'] + 0.1)] for x in r])
    runner = np.zeros(len(r))
    for yr in set(years):
        w = fit(X[years != yr], y[years != yr])
        runner[years == yr] = 1 / (1 + np.exp(-X[years == yr] @ w))
    print(kind, 'runner-turnout coefficients (all years):', fit(X, y).round(2))
    for weight in (0, 0.25, 0.5):
        p = (1 - weight) * team + weight * runner
        by_year = [round(float(((p[years == yr] - y[years == yr]) ** 2).mean()), 3) for yr in sorted(set(years))]
        print(f"  runner weight {weight}: Brier {((p - y) ** 2).mean():.4f} by year {by_year}")
