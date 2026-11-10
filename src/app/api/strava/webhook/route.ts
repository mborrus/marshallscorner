// Strava push subscription: new, edited and deleted activities arrive here without
// the app being open. Public route; events for other athletes are ignored.
// Register once with: npx tsx scripts/strava_webhook.ts create https://<site>/api/strava/webhook

import { after, NextResponse } from 'next/server';
import { deleteActivity, disconnect, getConnection, syncOneActivity } from '@/lib/training/strava';

// Strava checks the endpoint when the subscription is created
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const expected = process.env.STRAVA_VERIFY_TOKEN;
  if (p.get('hub.mode') !== 'subscribe' || !expected || p.get('hub.verify_token') !== expected) {
    return NextResponse.json({ error: 'bad verify token' }, { status: 403 });
  }
  return NextResponse.json({ 'hub.challenge': p.get('hub.challenge') });
}

interface StravaEvent {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  owner_id: number;
  subscription_id: number;
  updates?: Record<string, string>;
}

export async function POST(req: Request) {
  const event = (await req.json().catch(() => null)) as StravaEvent | null;
  if (!event) return NextResponse.json({ ok: false }, { status: 400 });
  const expectedSub = process.env.STRAVA_SUBSCRIPTION_ID;
  if (expectedSub && String(event.subscription_id) !== expectedSub) return NextResponse.json({ ok: true });

  // Strava wants a 200 within 2 seconds, so do the work after responding
  after(async () => {
    const conn = await getConnection();
    if (!conn || (conn.athleteId && conn.athleteId !== event.owner_id)) return;
    if (event.object_type === 'athlete' && event.updates?.authorized === 'false') {
      await disconnect();
    } else if (event.object_type === 'activity') {
      if (event.aspect_type === 'delete') await deleteActivity(event.object_id);
      else await syncOneActivity(event.object_id);
    }
  });
  return NextResponse.json({ ok: true });
}
