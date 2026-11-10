// Strava redirects here after the owner approves access.

import { NextResponse, type NextRequest } from 'next/server';
import { saveTokensFromCode } from '@/lib/training/strava';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const back = (msg: string) => NextResponse.redirect(new URL(`/training?strava=${encodeURIComponent(msg)}`, req.url));
  if (url.searchParams.get('error')) return back('denied');
  const state = url.searchParams.get('state');
  if (!state || state !== req.cookies.get('strava_oauth_state')?.value) return back('bad-state');
  if (!(url.searchParams.get('scope') ?? '').split(',').includes('activity:read_all')) return back('need-read-all');
  const code = url.searchParams.get('code');
  if (!code) return back('no-code');
  await saveTokensFromCode(code);
  const res = back('connected');
  res.cookies.delete('strava_oauth_state');
  return res;
}
