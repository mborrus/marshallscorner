import { NextResponse } from 'next/server';
import { AUTH_COOKIE, safeEqual, sessionToken } from '@/lib/training/auth';

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get('password') ?? '');
  const expected = process.env.TRAINING_PASSWORD;
  const ok = !!expected && safeEqual(password, expected);
  const res = NextResponse.redirect(new URL(ok ? '/training' : '/training/login?error=1', req.url), 303);
  if (ok) {
    res.cookies.set(AUTH_COOKIE, (await sessionToken())!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
