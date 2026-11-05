import { jsonResponse } from '../_lib/http.js';
import { isSameOrigin, verifyStaffSession } from '../_lib/auth.js';
import { DEFAULT_SITE, validateSite } from '../_lib/site.js';

const SITE_KEY = 'public-site';
const MAX_BODY_BYTES = 1024 * 1024;

export async function onRequestGet({ env }) {
  if (!env.SITE_CONTENT) return jsonResponse({ error: 'The SITE_CONTENT KV binding is not configured.' }, 503);
  try {
    const stored = await env.SITE_CONTENT.get(SITE_KEY, 'json');
    return jsonResponse(stored ? validateSite(stored) || DEFAULT_SITE : DEFAULT_SITE);
  } catch {
    return jsonResponse({ error: 'Could not load site content.' }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  if (!isSameOrigin(request)) return jsonResponse({ error: 'Request origin is not allowed.' }, 403);
  if (!await verifyStaffSession(request, env)) return jsonResponse({ error: 'Sign in to update the site.' }, 401);
  if (!env.SITE_CONTENT) return jsonResponse({ error: 'The SITE_CONTENT KV binding is not configured.' }, 503);

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_BYTES) return jsonResponse({ error: 'Update is too large.' }, 413);
  let payload;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) return jsonResponse({ error: 'Update is too large.' }, 413);
    payload = JSON.parse(body);
  } catch {
    return jsonResponse({ error: 'Update must be valid JSON.' }, 400);
  }

  const site = validateSite(payload);
  if (!site) return jsonResponse({ error: 'The site data is invalid or exceeds a content limit.' }, 400);
  try {
    await env.SITE_CONTENT.put(SITE_KEY, JSON.stringify(site));
    return jsonResponse(site);
  } catch {
    return jsonResponse({ error: 'Could not save site content.' }, 500);
  }
}