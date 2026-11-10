// Planned vs actual miles per week, current week marked. Plain SVG, server rendered.

import type { WeekResult } from '@/lib/training/match';

export default function BuildChart({ weeks, current }: { weeks: WeekResult[]; current: number }) {
  const W = 360;
  const H = 160;
  const pad = { l: 26, r: 4, t: 8, b: 18 };
  const max = Math.max(10, ...weeks.map((w) => Math.max(w.plannedMiles, w.actualMiles)));
  const top = Math.ceil(max / 10) * 10;
  const slot = (W - pad.l - pad.r) / weeks.length;
  const y = (mi: number) => pad.t + (H - pad.t - pad.b) * (1 - mi / top);
  const ticks = [0, top / 2, top];

  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Planned versus actual miles per week">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#c9c0b0" strokeWidth="0.5" />
            <text x={pad.l - 4} y={y(t) + 3} fontSize="8" textAnchor="end" fill="#5a5a5a">
              {t}
            </text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const x = pad.l + i * slot;
          const bw = slot * 0.7;
          return (
            <g key={w.week.start}>
              {i === current && (
                <rect x={x} y={pad.t} width={slot} height={H - pad.t - pad.b} fill="#1e90ff" opacity="0.12" />
              )}
              <rect
                x={x + (slot - bw) / 2}
                y={y(w.plannedMiles)}
                width={bw}
                height={y(0) - y(w.plannedMiles)}
                fill="none"
                stroke="#336699"
                strokeWidth="1"
              >
                <title>{`Week ${i + 1}: planned ${w.plannedMiles} mi, ran ${w.actualMiles} mi`}</title>
              </rect>
              {w.actualMiles > 0 && (
                <rect
                  x={x + (slot - bw) / 2 + 1.5}
                  y={y(w.actualMiles)}
                  width={bw - 3}
                  height={y(0) - y(w.actualMiles)}
                  fill={w.flags.length ? '#d2691e' : '#2e8b57'}
                />
              )}
              {(i % 2 === 0 || i === current) && (
                <text x={x + slot / 2} y={H - 6} fontSize="7" textAnchor="middle" fill={i === current ? '#1e90ff' : '#5a5a5a'}>
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption style={{ fontSize: '0.8rem' }}>
        <span style={{ border: '1px solid #336699', padding: '0 6px' }} /> planned{' '}
        <span style={{ background: '#2e8b57', padding: '0 6px' }} /> ran{' '}
        <span style={{ background: '#d2691e', padding: '0 6px' }} /> ran, flagged ·{' '}
        <span style={{ background: 'rgba(30,144,255,0.2)', padding: '0 6px' }} /> this week
      </figcaption>
    </figure>
  );
}
