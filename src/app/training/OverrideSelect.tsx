'use client';

// Manual fix for a planned run: let the matcher decide, mark skipped, or pin it to a day.

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface DayOption {
  date: string;
  label: string;
}

export default function OverrideSelect({
  weekStart,
  runIndex,
  value,
  days,
}: {
  weekStart: string;
  runIndex: number;
  value: string; // 'auto' | 'skipped' | YYYY-MM-DD
  days: DayOption[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    setCurrent(next);
    setBusy(true);
    const mode = next === 'auto' || next === 'skipped' ? next : 'date';
    await fetch('/api/training/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart, runIndex, mode, activityDate: mode === 'date' ? next : undefined }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <select aria-label="Fix match" value={current} disabled={busy} onChange={(e) => change(e.target.value)}>
      <option value="auto">Auto match</option>
      <option value="skipped">Skipped</option>
      {days.map((d) => (
        <option key={d.date} value={d.date}>
          {d.label}
        </option>
      ))}
    </select>
  );
}
