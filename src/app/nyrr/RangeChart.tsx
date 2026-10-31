// Projected final points per team: bar = likely range (10th-90th percentile),
// dot = average, tick = points today

import type { ForecastTeam } from '@/lib/nyrr/forecast';
import styles from './page.module.css';

const HIGHLIGHT = '#d62828';
const BASE = '#336699';

interface Props {
  teams: ForecastTeam[];
  highlightCode: string;
}

export default function RangeChart({ teams, highlightCode }: Props) {
  const rowH = 30;
  const labelW = 170;
  const width = 640;
  const pad = { top: 8, right: 24, bottom: 28 };
  const height = pad.top + teams.length * rowH + pad.bottom;
  const lo = Math.floor(Math.min(...teams.map((t) => t.points)) / 10) * 10;
  const hi = Math.ceil(Math.max(...teams.map((t) => t.p90Points)) / 10) * 10;
  const x = (v: number) => labelW + ((v - lo) / Math.max(1, hi - lo)) * (width - labelW - pad.right);
  const ticks = Array.from({ length: Math.floor((hi - lo) / 10) + 1 }, (_, i) => lo + i * 10);

  return (
    <figure className={styles.chart}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Projected final points by team">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={pad.top} y2={height - pad.bottom} stroke="#e0d9cc" />
            <text x={x(t)} y={height - 8} textAnchor="middle" className={styles.axisText}>
              {t}
            </text>
          </g>
        ))}
        {teams.map((t, i) => {
          const y = pad.top + i * rowH + rowH / 2;
          const color = t.teamCode === highlightCode ? HIGHLIGHT : BASE;
          const tip = `${t.teamName}: ${t.points} now, about ${Math.round(t.meanPoints)} projected (likely ${Math.round(t.p10Points)}–${Math.round(t.p90Points)})`;
          return (
            <g key={t.teamCode}>
              <title>{tip}</title>
              <rect x={0} y={y - rowH / 2} width={width} height={rowH} fill="transparent" />
              <text
                x={labelW - 8}
                y={y + 4}
                textAnchor="end"
                className={styles.rowLabel}
                fontWeight={t.teamCode === highlightCode ? 'bold' : 'normal'}
              >
                {t.teamName.length > 24 ? `${t.teamName.slice(0, 23)}…` : t.teamName}
              </text>
              <line x1={x(t.points)} x2={x(t.points)} y1={y - 8} y2={y + 8} stroke="#5a5a5a" strokeWidth={2} />
              <rect
                x={x(t.p10Points)}
                y={y - 4}
                width={Math.max(2, x(t.p90Points) - x(t.p10Points))}
                height={8}
                rx={4}
                fill={color}
                opacity={0.35}
              />
              <circle cx={x(t.meanPoints)} cy={y} r={5} fill={color} stroke="#fffef8" strokeWidth={2} />
            </g>
          );
        })}
      </svg>
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
