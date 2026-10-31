// Simulated vs actual winning team marathon times per division-season. This is the check
// that caught the original bug (Men B winners predicted ~2:28 vs real 2:35-2:49).

import { collectDivision, collectHistory, collectPastScores } from '../../src/lib/nyrr/collect';
import { fitRace, fieldProbability, isMarathon, DEFAULT_PARAMS, paramsForDivision } from '../../src/lib/nyrr/model';
const hms = (s: number) => {
  s = Math.round(s);
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
let rnd = 1;
const rand = () => {
  rnd = (rnd * 16807) % 2147483647;
  return rnd / 2147483647;
};
const normal = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
(async () => {
  for (const year of [2022, 2023, 2024, 2025])
    for (const [dc, g] of [
      ['AM', 'M'],
      ['AW', 'W'],
      ['BM', 'M'],
      ['BW', 'W'],
    ]) {
      const s = await collectDivision(year, dc, g);
      const mara = s.races.find(isMarathon)!;
      const train = s.races.map((r) => (Date.parse(r.date) >= Date.parse(mara.date) ? { ...r, published: false } : r));
      const P = process.env.LEVELS === '0' ? DEFAULT_PARAMS : paramsForDivision(dc);
      const fit = fitRace(
        s.teams,
        train,
        mara,
        P,
        await collectPastScores(
          year,
          s.teams.map((t) => t.teamCode),
          g,
        ),
      );
      const { history } = await collectHistory(
        mara,
        s.teams.map((t) => t.teamCode),
        g,
        [year - 1, year - 2],
      );
      const p = s.teams.map((t) => fieldProbability(t, train, history[t.teamCode]));
      const actual = s.teams
        .map((t) => t.races[mara.eventCode]?.score)
        .filter((x): x is number => x != null)
        .sort((a, b) => a - b);
      const mins: number[] = [],
        seconds: number[] = [];
      for (let i = 0; i < 4000; i++) {
        const xs = s.teams
          .map((t, j) => {
            const f = fit.teams[t.teamCode];
            if (rand() >= p[j]) return Infinity;
            const k = P.strengthScaleMarathon;
            return (
              fit.targetEffect +
              k * (f.strength + f.strengthSe * normal()) +
              Math.sqrt(k * k * f.sigma ** 2 + P.extraSigmaMarathon ** 2) * normal()
            );
          })
          .sort((a, b) => a - b);
        mins.push(xs[0]);
        seconds.push(xs[1]);
      }
      mins.sort((a, b) => a - b);
      seconds.sort((a, b) => a - b);
      const q = (a: number[], f: number) => a[Math.floor(a.length * f)];
      const sig = s.teams.map((t) => fit.teams[t.teamCode].sigma);
      console.log(
        year,
        dc,
        'win actual',
        hms(Math.exp(actual[0])),
        'sim median',
        hms(Math.exp(q(mins, 0.5))),
        `(10-90%: ${hms(Math.exp(q(mins, 0.1)))}-${hms(Math.exp(q(mins, 0.9)))})`,
        '| 2nd actual',
        hms(Math.exp(actual[1])),
        'sim',
        hms(Math.exp(q(seconds, 0.5))),
        '| team sigma range',
        Math.min(...sig).toFixed(3),
        Math.max(...sig).toFixed(3),
      );
    }
})();
