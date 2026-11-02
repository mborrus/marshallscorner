// Projected final points per team: bar = likely range (10th-90th percentile),
// dot = average, tick = points that count today

import type { ForecastTeam } from '@/lib/nyrr/forecast';
import styles from './page.module.css';

const HIGHLIGHT = '#d62828';
const BASE = '#336699';

interface Props {
  teams: ForecastTeam[];
  highlightCode: string;
}

// Axis labels centred on their tick, except at the edges where they stay inside
export function axisLabel(fraction: number): React.CSSProperties {
  const shift = fraction > 0.92 ? '-100%' : fraction < 0.08 ? '0' : '-50%';
  return { left: `${fraction * 100}%`, transform: `translateX(${shift})` };
}

export default function RangeChart({ teams, highlightCode }: Props) {
  const lo = Math.floor(Math.min(...teams.map((t) => t.counted)) / 10) * 10;
  const hi = Math.ceil(Math.max(...teams.map((t) => t.p90Points)) / 10) * 10;
  const pct = (v: number) => `${((v - lo) / Math.max(1, hi - lo)) * 100}%`;
  const ticks = Array.from({ length: Math.floor((hi - lo) / 10) + 1 }, (_, i) => lo + i * 10);

  return (
    <figure className={styles.chart}>
      <div className={styles.hbars}>
        {teams.map((t) => {
          const color = t.teamCode === highlightCode ? HIGHLIGHT : BASE;
          return (
            <div
              key={t.teamCode}
              className={styles.hbarRow}
              title={`${t.teamName}: ${t.counted} counted now, about ${Math.round(t.meanPoints)} projected (likely ${Math.round(t.p10Points)}–${Math.round(t.p90Points)})`}
            >
              <span className={t.teamCode === highlightCode ? styles.focusName : undefined}>{t.teamName}</span>
              <span className={styles.rangeTrack}>
                <span className={styles.rangeTick} style={{ left: pct(t.counted) }} />
                <span
                  className={styles.rangeBar}
                  style={{ left: pct(t.p10Points), width: `calc(${pct(t.p90Points)} - ${pct(t.p10Points)})`, background: color }}
                />
                <span className={styles.rangeDot} style={{ left: pct(t.meanPoints), background: color }} />
              </span>
            </div>
          );
        })}
        <div className={styles.hbarRow}>
          <span />
          <span className={styles.rangeAxis}>
            {ticks.map((t) => (
              <span key={t} style={axisLabel((t - lo) / Math.max(1, hi - lo))}>
                {t}
              </span>
            ))}
          </span>
        </div>
      </div>
      <figcaption className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.tickSwatch} /> points now
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotSwatch} /> projected final
        </span>
        <span className={styles.legendItem}>
          <span className={styles.rangeSwatch} /> likely range (8 in 10 sims)
        </span>
      </figcaption>
    </figure>
  );
}
