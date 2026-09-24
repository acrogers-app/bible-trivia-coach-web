#!/usr/bin/env node
/*
 * Mint the least-privilege token Bible Study Coach web uses for the shared rate limiter.
 *
 * The token is an HS256 JWT whose `role` claim is the Postgres role `bible_ratelimit`
 * (EXECUTE on public.bible_rate_limit_hit and nothing else). Supabase's PostgREST
 * switches to that role for the request, so a leaked token can only bump/deny
 * `bible:`-prefixed rate-limit buckets — it cannot read or write any table.
 *
 * Usage (Allen runs this; the secret never touches a file):
 *   SUPABASE_JWT_SECRET='<Project Settings → JWT Keys → Legacy JWT secret>' \
 *     node scripts/mint-ratelimit-jwt.mjs                # prints the token
 *
 *   ... --test RATELIMIT_SUPABASE_URL=... RATELIMIT_SUPABASE_ANON_KEY=...
 *     also calls the RPC once with the minted token and prints the verdict.
 *
 * Then: vercel env add RATELIMIT_JWT production (from the repo root)
 * (paste the token). Rotate by re-running and replacing the env var; expiry is 2 years.
 */
import { createHmac } from "node:crypto";

const secret = process.env.SUPABASE_JWT_SECRET;
if (!secret) {
  console.error("SUPABASE_JWT_SECRET is required (Supabase → Project Settings → JWT Keys → Legacy JWT secret).");
  process.exit(1);
}
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const exp = now + 2 * 365 * 24 * 3600;
const header = b64({ alg: "HS256", typ: "JWT" });
const payload = b64({ role: "bible_ratelimit", iss: "supabase", iat: now, exp });
const sig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
const token = `${header}.${payload}.${sig}`;

console.log(token);
console.error(`role=bible_ratelimit expires=${new Date(exp * 1000).toISOString()}`);

if (process.argv.includes("--test")) {
  const url = process.env.RATELIMIT_SUPABASE_URL?.replace(/\/+$/, "");
  const anon = process.env.RATELIMIT_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error("--test needs RATELIMIT_SUPABASE_URL and RATELIMIT_SUPABASE_ANON_KEY");
    process.exit(1);
  }
  const res = await fetch(`${url}/rest/v1/rpc/bible_rate_limit_hit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anon, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ p_key: "mint-test", p_max: 100, p_window_ms: 60000 }),
  });
  const body = await res.text();
  console.error(`test call: HTTP ${res.status} body=${body}`);
  // Prove the token is scoped: a table read must be refused.
  const leak = await fetch(`${url}/rest/v1/rate_limit_hits?select=key&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  });
  console.error(`scope check (table read should FAIL): HTTP ${leak.status}`);
  process.exit(res.status === 200 && body === "true" && leak.status >= 400 ? 0 : 2);
}
