/**
 * /api/analytics is retired (2026-11-26). Quiz analytics are hard-disabled in the app
 * (ANALYTICS_ENABLED=false in src/lib/analytics.ts), and the route used to forward any POST it
 * received to Langfuse when LANGFUSE_* keys were set. It now answers every POST with 410 Gone:
 * the body is never read, nothing is forwarded or stored, and nothing is acknowledged as accepted.
 *
 * Kept free of imports so tests/learn can load it directly.
 */
export const ANALYTICS_GONE_BODY = {
  ok: false,
  error: 'gone',
  message: 'Quiz analytics have been retired. This endpoint no longer accepts data.',
} as const;

export function analyticsGoneResponse(extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(ANALYTICS_GONE_BODY), {
    status: 410,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}
