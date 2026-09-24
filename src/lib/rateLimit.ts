/**
 * Per-IP rate limiter for API routes: shared sliding window in Supabase, with a
 * per-instance fallback.
 *
 * Fluid Compute reuses instances, but there are still many of them, so the old
 * in-memory Map enforced each limit per warm instance rather than per client.
 * The shared store is the `bible_rate_limit_hit` RPC on the portfolio Supabase
 * project: a SECURITY DEFINER wrapper that namespaces every key under `bible:`
 * and calls the same atomic sliding-window function the dashboard and
 * AssistantNotes use.
 *
 * Credential is LEAST-PRIVILEGE, not the service-role key: RATELIMIT_JWT is a
 * token for the Postgres role `bible_ratelimit`, which can execute exactly one
 * function and read nothing (see scripts/mint-ratelimit-jwt.mjs). The anon key
 * is only the API-gateway key; it is public by design.
 *
 * Env (server, set in Vercel): RATELIMIT_SUPABASE_URL, RATELIMIT_SUPABASE_ANON_KEY,
 * RATELIMIT_JWT. If any is unset, or the store call fails or stalls (>2 s), we
 * fall back to the per-instance window below and log — never fail open.
 */

type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;
const STORE_TIMEOUT_MS = 2000;

function allowLocal(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (now > b.reset) buckets.delete(k);
    }
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }

  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

function storeConfig(): { url: string; anon: string; jwt: string } | null {
  const url = process.env.RATELIMIT_SUPABASE_URL;
  const anon = process.env.RATELIMIT_SUPABASE_ANON_KEY;
  const jwt = process.env.RATELIMIT_JWT;
  return url && anon && jwt ? { url: url.replace(/\/+$/, ''), anon, jwt } : null;
}

/**
 * Client IP for rate-limit keys. Only headers Vercel's proxy sets from the TCP
 * connection are trusted; `x-forwarded-for` is client-writable and let a caller
 * pick its own bucket. Outside Vercel (local dev) there is no proxy, so
 * everything shares the "unknown" bucket — fine for dev.
 */
export function clientIp(req: Request): string {
  return (
    req.headers.get('x-vercel-forwarded-for')?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

/** Route name for the bucket key, so /api/passage and /api/analytics count separately. */
function scope(req: Request): string {
  try {
    return new URL(req.url).pathname.replace(/^\/api\//, '').replace(/\/+$/, '') || 'api';
  } catch {
    return 'api';
  }
}

/** True if this request is allowed; false when the window is full. */
export async function allowRequest(
  req: Request,
  limit: number,
  windowMs = 60_000,
): Promise<boolean> {
  const key = `${scope(req)}:${clientIp(req)}`;
  const cfg = storeConfig();
  if (!cfg) return allowLocal(key, limit, windowMs);

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), STORE_TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/bible_rate_limit_hit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anon,
        Authorization: `Bearer ${cfg.jwt}`,
      },
      body: JSON.stringify({ p_key: key, p_max: limit, p_window_ms: windowMs }),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`bible_rate_limit_hit HTTP ${res.status}`);
    const allowed: unknown = await res.json();
    if (typeof allowed !== 'boolean') throw new Error('bible_rate_limit_hit: non-boolean');
    return allowed;
  } catch (err) {
    console.error('[rateLimit] store failed, using local window:', err instanceof Error ? err.message : err);
    return allowLocal(key, limit, windowMs);
  } finally {
    clearTimeout(timer);
  }
}
