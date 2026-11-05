import { jsonResponse } from '../_lib/http.js';
import { clearStaffCookie, isSameOrigin } from '../_lib/auth.js';

export async function onRequestPost({ request }) {
  if (!isSameOrigin(request)) return jsonResponse({ error: 'Request origin is not allowed.' }, 403);
  return jsonResponse({ authenticated: false }, 200, { 'Set-Cookie': clearStaffCookie() });
}