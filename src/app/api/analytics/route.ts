import { corsHeaders, corsPreflightResponse } from '../../../lib/cors';
import { analyticsGoneResponse } from '../../../lib/analyticsGone';

// Retired: every POST gets 410 Gone. The request body is not read, and nothing is forwarded
// to a third party or stored. See src/lib/analyticsGone.ts.
export function POST(req: Request) {
  return analyticsGoneResponse(corsHeaders(req.headers.get('origin')));
}

// Preflight still answers, so the mobile app (if it ever posts) can read the 410.
export function OPTIONS(req: Request) {
  return corsPreflightResponse(req.headers.get('origin'));
}
