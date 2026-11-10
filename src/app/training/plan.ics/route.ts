// Calendar feed of the plan (one all-day event per run). Subscribe on iPhone and the runs
// show up in Calendar on the phone and Apple Watch. Calendar apps can't log in, so the URL
// carries a key derived from TRAINING_PASSWORD.

import { calendarKey, safeEqual } from '@/lib/training/auth';
import { addDays, firstPlannedDate, loadPlan, targetPace } from '@/lib/training/plan';

export const dynamic = 'force-dynamic';

const KIND: Record<string, string> = { easy: 'Easy', mtc: 'MTC', long: 'Long run', race: 'Race', extra: 'Extra (optional)' };

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('key') ?? '';
  const expected = await calendarKey();
  if (!expected || !safeEqual(key, expected)) return new Response('Not found', { status: 404 });

  const { plan } = loadPlan();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//marshallscorner//training//EN', 'X-WR-CALNAME:Training plan'];
  plan.weeks.forEach((week, w) => {
    week.runs.forEach((run, i) => {
      const date = firstPlannedDate(week.start, run);
      const pace = targetPace(plan, run.kind);
      const desc = [
        `Week ${w + 1}${week.note ? `: ${week.note}` : ''}`,
        run.day.includes('/') ? `Planned for ${run.day}` : '',
        pace ? `Target pace: ${pace}` : '',
        run.note ?? '',
      ].filter(Boolean);
      lines.push(
        'BEGIN:VEVENT',
        `UID:${week.start}-${i}@training`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${date.replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${addDays(date, 1).replace(/-/g, '')}`,
        `SUMMARY:${esc(`${KIND[run.kind] ?? run.kind} ${run.miles} mi`)}`,
        `DESCRIPTION:${esc(desc.join('\n'))}`,
        'TRANSP:TRANSPARENT',
        'END:VEVENT'
      );
    });
  });
  lines.push('END:VCALENDAR');
  return new Response(lines.join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=3600' },
  });
}
