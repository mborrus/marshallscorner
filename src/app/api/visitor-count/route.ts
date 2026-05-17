import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.counter_KV_REST_API_URL!,
  token: process.env.counter_KV_REST_API_TOKEN!,
});

export async function GET() {
  try {
    const count = await redis.incr('visitor_count');
    return Response.json({ count });
  } catch (error) {
    console.error('Redis error:', error);
    return Response.json({ count: 1, error: 'Redis not configured' });
  }
}
