// Manual fix for one planned run: { weekStart, runIndex, mode: 'auto' | 'skipped' | 'date', activityDate? }

import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/training/db';
import { loadPlan } from '@/lib/training/plan';
import { overrides } from '@/lib/training/schema';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    weekStart?: string;
    runIndex?: number;
    mode?: string;
    activityDate?: string;
  };
  const { plan } = loadPlan();
  const week = plan.weeks.find((w) => w.start === body.weekStart);
  if (!week || typeof body.runIndex !== 'number' || !week.runs[body.runIndex]) {
    return NextResponse.json({ error: 'unknown run' }, { status: 400 });
  }
  const db = await getDb();
  const key = and(eq(overrides.weekStart, week.start), eq(overrides.runIndex, body.runIndex));
  if (body.mode === 'auto') {
    await db.delete(overrides).where(key);
  } else if (body.mode === 'skipped' || (body.mode === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(body.activityDate ?? ''))) {
    const row = {
      weekStart: week.start,
      runIndex: body.runIndex,
      skipped: body.mode === 'skipped',
      activityDate: body.mode === 'date' ? body.activityDate! : null,
    };
    await db
      .insert(overrides)
      .values(row)
      .onConflictDoUpdate({ target: [overrides.weekStart, overrides.runIndex], set: row });
  } else {
    return NextResponse.json({ error: 'bad mode' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
