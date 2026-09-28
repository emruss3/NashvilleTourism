import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed, expiring tokens for the venue reply page. A token names one lead
 * and one purpose; it is `lead.exp.sig` where sig is HMAC-SHA256 over the
 * first two parts with EVENTS_MAGIC_LINK_SECRET. Nothing sensitive is in the
 * token itself; possession of a valid one lets a venue write its first reply
 * to that one lead and nothing else. Server only.
 */

const DEFAULT_TTL_DAYS = 30;

function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payload: string, secret: string): string {
  return base64url(createHmac('sha256', secret).update(payload).digest());
}

export function magicLinkSecret(): string | undefined {
  const s = process.env.EVENTS_MAGIC_LINK_SECRET?.trim();
  return s && s.length >= 16 ? s : undefined;
}

export function createReplyToken(leadId: string, opts: { secret?: string; now?: Date; ttlDays?: number } = {}): string | undefined {
  const secret = opts.secret ?? magicLinkSecret();
  if (!secret) return undefined;
  const exp = Math.floor((opts.now ?? new Date()).getTime() / 1000) + (opts.ttlDays ?? DEFAULT_TTL_DAYS) * 86_400;
  const payload = `${leadId}.${exp}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyReplyToken(token: string, opts: { secret?: string; now?: Date } = {}): { leadId: string } | { error: 'malformed' | 'expired' | 'bad_signature' | 'no_secret' } {
  const secret = opts.secret ?? magicLinkSecret();
  if (!secret) return { error: 'no_secret' };
  const parts = token.split('.');
  if (parts.length !== 3) return { error: 'malformed' };
  const [leadId, expText, sig] = parts;
  if (!/^[0-9a-f-]{36}$/.test(leadId) || !/^\d+$/.test(expText) || !sig) return { error: 'malformed' };
  const expected = sign(`${leadId}.${expText}`, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { error: 'bad_signature' };
  if (Number(expText) * 1000 < (opts.now ?? new Date()).getTime()) return { error: 'expired' };
  return { leadId };
}

/** Absolute URL of the reply page for a lead, or undefined when the secret is unset. */
export function replyUrl(siteUrl: string, leadId: string, opts: { secret?: string; now?: Date } = {}): string | undefined {
  const token = createReplyToken(leadId, opts);
  return token ? `${siteUrl.replace(/\/$/, '')}/private-events/reply/${token}/` : undefined;
}
