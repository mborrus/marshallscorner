import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const count = await kv.incr('visitor_count');
    return Response.json({ count });
  } catch (error) {
    // If KV is not configured, return a fallback
    console.error('Vercel KV error:', error);
    return Response.json({ count: 1, error: 'KV not configured' });
  }
}
