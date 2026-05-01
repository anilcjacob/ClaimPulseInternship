const ALLOWED_ORIGINS = [
  'https://anilcjacob.github.io',
  'http://localhost',
  'http://127.0.0.1',
];

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (url.pathname === '/models') {
      const res = await fetch(`${BASE}?key=${env.GEMINI_API_KEY}`);
      const data = await res.text();
      return new Response(data, { status: res.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    if (request.method === 'OPTIONS') return corsResponse(null, 204, origin);
    if (request.method !== 'POST') return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405, origin);
    if (origin && !ALLOWED_ORIGINS.some(o => origin.startsWith(o))) return corsResponse(JSON.stringify({ error: 'Forbidden' }), 403, origin);

    let body;
    try { body = await request.text(); } catch { return corsResponse(JSON.stringify({ error: 'Bad request body' }), 400, origin); }

    for (const model of MODELS) {
      const res = await fetch(`${BASE}/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (res.status !== 404) {
        const data = await res.text();
        return corsResponse(data, res.status, origin, res.headers.get('Content-Type'));
      }
    }

    return corsResponse(JSON.stringify({ error: 'No available models found.' }), 503, origin);
  },
};

function corsResponse(body, status, origin, contentType = 'application/json') {
  const allowedOrigin = ALLOWED_ORIGINS.some(o => origin.startsWith(o)) ? origin : ALLOWED_ORIGINS[0];
  return new Response(body, { status, headers: { 'Content-Type': contentType || 'application/json', 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
