/**
 * Cloudflare Worker — Gemini API Proxy
 *
 * Keeps the Gemini API key out of the browser by storing it as
 * a Cloudflare Worker secret environment variable (GEMINI_API_KEY).
 *
 * Deploy steps:
 *   1. Install Wrangler:   npm install -g wrangler
 *   2. Login:              wrangler login
 *   3. Create project:     wrangler init gemini-proxy  (choose "No" for git, "No" for TypeScript)
 *                          Then REPLACE the generated worker.js with this file.
 *   4. Add secret:         wrangler secret put GEMINI_API_KEY
 *                          (paste your Gemini key when prompted — it never touches source control)
 *   5. Deploy:             wrangler deploy
 *   6. Copy the Worker URL shown after deploy (e.g. https://gemini-proxy.YOUR-NAME.workers.dev)
 *   7. In all HTML files, replace  REPLACE_WITH_YOUR_WORKER_URL  with that URL.
 *
 * Allowed origins: update ALLOWED_ORIGINS below to match your GitHub Pages domain.
 */

const ALLOWED_ORIGINS = [
  'https://anilcjacob.github.io',
  'http://localhost',        // handy for local dev
  'http://127.0.0.1',
];

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // CORS pre-flight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, origin);
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405, origin);
    }

    // Validate origin (skip check when no Origin header, e.g. direct curl tests)
    if (origin && !ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
      return corsResponse(JSON.stringify({ error: 'Forbidden' }), 403, origin);
    }

    // Forward request body to Gemini with the secret key
    let body;
    try {
      body = await request.text();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Bad request body' }), 400, origin);
    }

    const geminiRes = await fetch(`${GEMINI_BASE}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const data = await geminiRes.text();
    return corsResponse(data, geminiRes.status, origin, geminiRes.headers.get('Content-Type'));
  },
};

function corsResponse(body, status, origin, contentType = 'application/json') {
  const allowedOrigin = ALLOWED_ORIGINS.some(o => origin.startsWith(o))
    ? origin
    : ALLOWED_ORIGINS[0];

  const headers = {
    'Content-Type': contentType || 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  return new Response(body, { status, headers });
}
