// Single-password gate for /training. Works in middleware (edge) and route handlers.
// The cookie holds an HMAC of a fixed label keyed by TRAINING_PASSWORD, so changing the
// password logs everyone out.

export const AUTH_COOKIE = 'training_auth';

async function hmac(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Cookie value for a logged-in browser. null when no password is configured. */
export async function sessionToken(): Promise<string | null> {
  const pw = process.env.TRAINING_PASSWORD;
  return pw ? hmac(pw, 'training-session') : null;
}

/** Secret for the calendar feed URL (calendar apps can't send cookies). */
export async function calendarKey(): Promise<string | null> {
  const pw = process.env.TRAINING_PASSWORD;
  return pw ? (await hmac(pw, 'training-calendar')).slice(0, 32) : null;
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isAuthed(cookieValue: string | undefined): Promise<boolean> {
  const token = await sessionToken();
  return !!token && !!cookieValue && safeEqual(cookieValue, token);
}
