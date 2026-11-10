// "Sync now" button, and the automatic sync when the page is opened.

import { NextResponse } from 'next/server';
import { loadPlan } from '@/lib/training/plan';
import { syncActivities } from '@/lib/training/strava';

export async function POST(req: Request) {
  const manual = new URL(req.url).searchParams.get('manual') === '1';
  try {
    const count = await syncActivities(loadPlan().plan, { manual });
    return NextResponse.json({ ok: true, synced: count, skipped: count === null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
