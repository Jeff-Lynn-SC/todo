/*
 * Cloudflare Worker — English Practice AI Proxy
 *
 * This worker sits between the student app and Anthropic's API,
 * keeping your API key hidden from students.
 *
 * ── Deploy steps ──────────────────────────────────────────────────────────────
 * 1. Go to https://workers.cloudflare.com and sign up (free tier is plenty).
 * 2. Create a new Worker, paste this entire file, and click Deploy.
 * 3. Go to Settings → Variables → Environment Variables and add two secrets:
 *      ANTHROPIC_KEY  →  your Anthropic key (sk-ant-...)
 *      CLASS_CODE     →  any word you choose, e.g. "english2026"
 * 4. Copy the worker URL shown at the top (e.g. https://english-ai.yourname.workers.dev)
 * 5. Paste that URL into WORKER_URL in language-practice.html
 *    and set CLASS_CODE to the same word you chose in step 3.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-class-code',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    // Verify class code (prevents random internet users burning your API quota)
    const classCode = request.headers.get('x-class-code') || '';
    const expected  = env.CLASS_CODE || '';
    if (expected && classCode !== expected) {
      return new Response('Unauthorized', { status: 401, headers: cors });
    }

    let body;
    try { body = await request.json(); }
    catch { return new Response('Bad request', { status: 400, headers: cors }); }

    const apiKey = env.ANTHROPIC_KEY;
    if (!apiKey) {
      return new Response('ANTHROPIC_KEY not configured in Worker settings', { status: 500, headers: cors });
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
