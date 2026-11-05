const COOKIE_NAME = 'bobby_staff_session';
const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function getSigningKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export function staffConfigReady(env) {
  return Boolean(env.ADMIN_PASSWORD && env.SESSION_SECRET && env.SESSION_SECRET.length >= 32);
}

export function isSameOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}

export async function verifyStaffSession(request, env) {
  if (!staffConfigReady(env)) return false;
  const cookie = request.headers.get('Cookie') || '';
  const value = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!value) return false;

  const separator = value.indexOf('.');
  if (separator < 0) return false;
  const expires = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!/^\d+$/.test(expires) || Number(expires) <= Math.floor(Date.now() / 1000)) return false;

  try {
    const key = await getSigningKey(env.SESSION_SECRET);
    return await crypto.subtle.verify('HMAC', key, base64UrlDecode(signature), encoder.encode(`staff-session:${expires}`));
  } catch {
    return false;
  }
}

export async function createStaffCookie(env) {
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const key = await getSigningKey(env.SESSION_SECRET);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`staff-session:${expires}`));
  const token = `${expires}.${base64UrlEncode(new Uint8Array(signature))}`;
  return `${COOKIE_NAME}=${token}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function clearStaffCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export async function passwordMatches(password, expected) {
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(password)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected))
  ]);
  const actual = new Uint8Array(actualHash);
  const target = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ target[index];
  return difference === 0;
}