// Starts Strava OAuth. Logged-in only (middleware).

import { NextResponse } from 'next/server';
import { authorizeUrl } from '@/lib/training/strava';

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(origin, state));
  res.cookies.set('strava_oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  return res;
}
