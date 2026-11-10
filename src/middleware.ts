// Password gate for the training tracker. Everything else on the site is public.

import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, isAuthed } from '@/lib/training/auth';

const PUBLIC = ['/training/login', '/api/training/login', '/api/strava/webhook', '/training/plan.ics'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p)) return NextResponse.next();
  if (await isAuthed(req.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/training/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/training/:path*', '/api/training/:path*', '/api/strava/:path*'],
};
