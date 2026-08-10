import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'nashroam_admin_session';
const SESSION_LABEL = 'nashroam-admin-session-v1';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function adminToken(): string | undefined {
  return process.env.NASHROAM_ADMIN_TOKEN?.trim() || undefined;
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function signature(expiresAt: number): string | undefined {
  const token = adminToken();
  if (!token) return undefined;
  return createHmac('sha256', token)
    .update(`${SESSION_LABEL}.${expiresAt}`)
    .digest('hex');
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(adminToken());
}

export function verifyAdminToken(candidate: string): boolean {
  const expected = adminToken();
  return Boolean(expected && candidate && safeEqual(candidate, expected));
}

export function adminSessionCookieValue(): string | undefined {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const sig = signature(expiresAt);
  if (!sig) return undefined;
  return `v1.${expiresAt}.${sig}`;
}

export function adminSessionMaxAge(): number {
  return SESSION_MAX_AGE_SECONDS;
}

export function hasAdminSession(): boolean {
  const actual = cookies().get(ADMIN_SESSION_COOKIE)?.value || '';
  const [version, rawExpiry, actualSig] = actual.split('.');
  if (version !== 'v1' || !rawExpiry || !actualSig) return false;

  const expiresAt = Number(rawExpiry);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;

  const expectedSig = signature(expiresAt);
  return Boolean(expectedSig && safeEqual(actualSig, expectedSig));
}
