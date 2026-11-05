import { jsonResponse } from '../_lib/http.js';
import { createStaffCookie, isSameOrigin, passwordMatches, staffConfigReady, verifyStaffSession } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  if (!staffConfigReady(env)) return jsonResponse({ error: 'Staff sign-in is not configured.' }, 503);
  return jsonResponse({ authenticated: await verifyStaffSession(request, env) });
}

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return jsonResponse({ error: 'Request origin is not allowed.' }, 403);
  if (!staffConfigReady(env)) return jsonResponse({ error: 'Staff sign-in is not configured.' }, 503);
  let password;
  try {
    const payload = await request.json();
    password = typeof payload.password === 'string' ? payload.password : '';
  } catch {
    return jsonResponse({ error: 'Enter the staff password.' }, 400);
  }
  if (!password || password.length > 1024 || !await passwordMatches(password, env.ADMIN_PASSWORD)) {
    return jsonResponse({ error: 'The password is incorrect.' }, 401);
  }
  return jsonResponse({ authenticated: true }, 200, { 'Set-Cookie': await createStaffCookie(env) });
}