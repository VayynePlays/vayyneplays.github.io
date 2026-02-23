/**
 * Cloudflare Worker — Uber Mileage Report
 *
 * Handles two things:
 *   POST /token   — OAuth authorization_code → access_token exchange
 *   GET  /api/*   — CORS proxy to Uber API (sandbox or live)
 *
 * Required secrets (set via `wrangler secret put`):
 *   UBER_CLIENT_ID
 *   UBER_CLIENT_SECRET
 */

const UBER_TOKEN_URL  = 'https://login.uber.com/oauth/v2/token';
const UBER_API_LIVE   = 'https://api.uber.com';
const UBER_API_SAND   = 'https://sandbox-api.uber.com';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── POST /token — exchange authorization code for access token ──
    if (url.pathname === '/token' && request.method === 'POST') {
      let body;
      try { body = await request.json(); }
      catch { return err('Invalid JSON body'); }

      const { code, redirect_uri } = body;
      if (!code || !redirect_uri) return err('Missing code or redirect_uri');

      const resp = await fetch(UBER_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     env.UBER_CLIENT_ID,
          client_secret: env.UBER_CLIENT_SECRET,
          grant_type:    'authorization_code',
          code,
          redirect_uri,
        }),
      });

      const data = await resp.json();
      return json(data, resp.status);
    }

    // ── GET /api/<uber-path> — CORS proxy ──
    if (url.pathname.startsWith('/api/')) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) return err('Missing Authorization header', 401);

      const sandbox  = url.searchParams.get('sandbox') === '1';
      const base     = sandbox ? UBER_API_SAND : UBER_API_LIVE;

      // Strip /api/ prefix and the sandbox param, keep the rest
      const uberPath = url.pathname.slice(5); // e.g. "v1/partners/trips"
      const qs = new URLSearchParams(url.search);
      qs.delete('sandbox');
      const queryStr = qs.toString() ? `?${qs}` : '';

      const uberUrl = `${base}/${uberPath}${queryStr}`;

      const resp = await fetch(uberUrl, {
        method: request.method,
        headers: {
          'Authorization':  authHeader,
          'Accept-Language': 'en_US',
          'Content-Type':   'application/json',
        },
      });

      const data = await resp.json();
      return json(data, resp.status);
    }

    return err('Not found', 404);
  },
};
