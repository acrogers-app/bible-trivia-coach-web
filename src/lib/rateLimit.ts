/**
 * Minimal per-instance rate limiter for API routes. Fluid Compute reuses
 * function instances across requests, so this throttles bursts effectively,
 * though counts reset when an instance recycles — it is a backstop against
 * abuse, not a billing-grade quota.
 */

type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export function allowRequest(req: Request, limit: number, windowMs = 60_000): boolean {
  const ip =
    (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim() || 'unknown';
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (now > b.reset) buckets.delete(k);
    }
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }

  const b = buckets.get(ip);
  if (!b || now > b.reset) {
    buckets.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}
