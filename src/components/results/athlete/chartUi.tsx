'use client';

// Bits every athlete chart needs: a hover/focus tooltip anchored to the mark,
// and a measured width so SVG units stay real pixels (labels don't shrink on
// a phone).

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './athlete.module.css';

export interface TooltipPayload {
  title: string;
  lines: string[];
}

interface TooltipState extends TooltipPayload {
  x: number;
  y: number;
  below: boolean;
}

export function useChartTooltip<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const show = useCallback((target: Element, payload: TooltipPayload) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = target.getBoundingClientRect();
    const bounds = container.getBoundingClientRect();
    const top = rect.top - bounds.top;
    const below = top < 80;
    setTooltip({
      x: rect.left - bounds.left + rect.width / 2,
      y: below ? rect.bottom - bounds.top : top,
      below,
      ...payload,
    });
  }, []);

  const hide = useCallback(() => setTooltip(null), []);

  return { containerRef, tooltip, show, hide };
}

export function ChartTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  return (
    <div
      className={`${styles.tooltip} ${tooltip.below ? styles.tooltipBelow : ''}`}
      style={{ left: tooltip.x, top: tooltip.y }}
      role="presentation"
    >
      <strong>{tooltip.title}</strong>
      {tooltip.lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

/** Width of an element, tracked through resizes. */
export function useElementWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || fallback);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fallback]);

  return { ref, width };
}

/** True once mounted - lets a chart skip its first, unmeasured paint. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
