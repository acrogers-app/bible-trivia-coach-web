// /api/analytics is retired: every POST must get 410 Gone and nothing may be forwarded.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANALYTICS_GONE_BODY, analyticsGoneResponse } from '../../src/lib/analyticsGone.ts';

test('the retired analytics response is 410 Gone, JSON, not cached, and not "ok"', async () => {
  const res = analyticsGoneResponse();
  assert.equal(res.status, 410);
  assert.equal(res.headers.get('content-type'), 'application/json');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const body = await res.json();
  assert.deepEqual(body, ANALYTICS_GONE_BODY);
  assert.equal(body.ok, false);
});

test('CORS headers passed in are kept on the 410', () => {
  const res = analyticsGoneResponse({ 'Access-Control-Allow-Origin': 'capacitor://localhost' });
  assert.equal(res.status, 410);
  assert.equal(res.headers.get('access-control-allow-origin'), 'capacitor://localhost');
});

// The route file imports Next-style extensionless paths, which node --test cannot load, so
// its wiring is checked from source.
test('the route answers POST with the 410 and no longer reads, forwards or rate-limits', () => {
  const src = readFileSync(new URL('../../src/app/api/analytics/route.ts', import.meta.url), 'utf8');
  assert.match(src, /export function POST\([^)]*\)\s*\{\s*return analyticsGoneResponse\(/);
  assert.doesNotMatch(src, /langfuse/i);
  assert.doesNotMatch(src, /req\.(text|json|body|formData)\b/);
  assert.doesNotMatch(src, /allowRequest|ok:\s*true/);
});

test('the CSP no longer allows Langfuse hosts', () => {
  const cfg = readFileSync(new URL('../../next.config.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(cfg, /langfuse/i);
});
