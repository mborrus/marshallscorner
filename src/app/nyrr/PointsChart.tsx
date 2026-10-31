// Cumulative club points over the season, one line per team (server-rendered SVG)

import type { TeamResult } from '@/lib/nyrr/standings';
import styles from './page.module.css';

const COLORS = ['#336699', '#b5651d', '#7a5c99', '#8a8a3c', '#4a8a8a'];
const HIGHLIGHT = '#d62828';

interface Props {
  teams: TeamResult[];
  highlightCode: string;
}

export default function PointsChart({ teams, highlightCode }: Props) {
  const events = (teams[0]?.eventDetails ?? []).filter((e) => e.isClubPointsPublished);
  if (events.length === 0) return null;

  const series = teams.map((team) => {
    let total = 0;
    const points = events.map((ev) => {
      const match = team.eventDetails?.find((e) => e.eventCode === ev.eventCode);
      total += match?.points ?? 0;
      return total;
    });
    return { team, points };
  });

  const width = 640;
  const height = 280;
  const pad = { top: 16, right: 16, bottom: 28, left: 36 };
  const maxY = Math.max(10, ...series.map((s) => s.points[s.points.length - 1]));
  const yTop = Math.ceil(maxY / 25) * 25;
  const x = (i: number) =>
    pad.left + (events.length === 1 ? 0 : (i / (events.length - 1)) * (width - pad.left - pad.right));
  const y = (v: number) => height - pad.bottom - (v / yTop) * (height - pad.top - pad.bottom);
  const ticks = Array.from({ length: yTop / 25 + 1 }, (_, i) => i * 25);

  let colorIndex = 0;
  const colored = series.map((s) => ({
    ...s,
    color: s.team.teamCode === highlightCode ? HIGHLIGHT : COLORS[colorIndex++ % COLORS.length],
  }));
  // Draw the highlighted team last so it sits on top
  const ordered = [...colored].sort(
    (a, b) => Number(a.team.teamCode === highlightCode) - Number(b.team.teamCode === highlightCode)
  );

  return (
    <figure className={styles.chart}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cumulative club points by race">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#e0d9cc" />
            <text x={pad.left - 6} y={y(t) + 4} textAnchor="end" className={styles.axisText}>
              {t}
            </text>
          </g>
        ))}
        {events.map((ev, i) => (
          <text key={ev.eventCode} x={x(i)} y={height - 8} textAnchor="middle" className={styles.axisText}>
            {i + 1}
          </text>
        ))}
        {ordered.map(({ team, points, color }) => {
          const isHighlight = team.teamCode === highlightCode;
          return (
            <g key={team.teamCode}>
              <polyline
                fill="none"
                stroke={color}
                strokeWidth={isHighlight ? 3 : 1.75}
                points={points.map((p, i) => `${x(i)},${y(p)}`).join(' ')}
              >
                <title>{`${team.teamName}: ${points[points.length - 1]} pts`}</title>
              </polyline>
              {points.map((p, i) => (
                <circle key={i} cx={x(i)} cy={y(p)} r={isHighlight ? 3 : 2} fill={color}>
                  <title>{`${team.teamName} after ${events[i].eventName.replace(/^\d{4} /, '')}: ${p} pts`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption className={styles.legend}>
        {colored.map(({ team, color }) => (
          <span key={team.teamCode} className={styles.legendItem}>
            <span className={styles.swatch} style={{ background: color }} />
            {team.teamName}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
