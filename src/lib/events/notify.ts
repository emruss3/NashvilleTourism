
/**
 * Outbound notifications for the private events marketplace.
 *
 * Email goes through Resend's REST API with a plain fetch (no SDK). Every
 * attempt returns a NotifyResult that the caller appends to the lead's
 * notify_log, so the desk can see what was sent, to whom, and whether it
 * worked. Nothing here throws: a failed send is a logged result, never a
 * failed intake.
 *
 * Env: RESEND_API_KEY (server only), EVENTS_FROM_EMAIL, EVENTS_DESK_EMAIL,
 * GROUP_HOTELS_EMAIL. With no API key every send is recorded as skipped.
 */

const RESEND_URL = 'https://api.resend.com/emails';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export interface NotifyResult {
  at: string;
  channel: 'email' | 'tripleseat' | 'perfect_venue' | 'webhook';
  to: string;
  kind: string;
  ok: boolean;
  skipped?: boolean;
  status?: number;
  id?: string;
  error?: string;
}

export function eventsEnv() {
  const env = (k: string) => process.env[k]?.trim() || undefined;
  return {
    apiKey: env('RESEND_API_KEY'),
    from: env('EVENTS_FROM_EMAIL') ?? 'Nashville.com events desk <events@mail.nashroam.com>',
    desk: env('EVENTS_DESK_EMAIL'),
    groupHotels: env('GROUP_HOTELS_EMAIL'),
  };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** Plain text to a minimal HTML body: paragraphs, and bare URLs as links. */
export function textToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/).map((p) =>
    escapeHtml(p)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#111111">$1</a>')
      .replace(/\n/g, '<br>'),
  );
  return `<div style="font:15px/1.5 Inter,system-ui,sans-serif;color:#111111;max-width:640px">${paragraphs.map((p) => `<p style="margin:0 0 14px">${p}</p>`).join('')}</div>`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function sendEmail(message: EmailMessage, kind: string): Promise<NotifyResult> {
  const { apiKey, from } = eventsEnv();
  const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
  const base = { at: new Date().toISOString(), channel: 'email' as const, to, kind };
  if (!apiKey) return { ...base, ok: false, skipped: true, error: 'RESEND_API_KEY not set' };

  let last: NotifyResult = { ...base, ok: false, error: 'not attempted' };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: Array.isArray(message.to) ? message.to : [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html ?? textToHtml(message.text),
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
          ...(message.tags ? { tags: Object.entries(message.tags).map(([name, value]) => ({ name, value: value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) })) } : {}),
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
      last = { ...base, at: new Date().toISOString(), ok: res.ok, status: res.status, id: data.id, error: res.ok ? undefined : data.message ?? data.name ?? `HTTP ${res.status}` };
      if (res.ok || ![429, 500, 502, 503, 504].includes(res.status)) return last;
    } catch (error) {
      last = { ...base, at: new Date().toISOString(), ok: false, error: String(error).slice(0, 200) };
    }
    await sleep(500 * (attempt + 1));
  }
  return last;
}

/**
 * Push a lead into a venue's own lead system. Tripleseat lead forms accept a
 * form-encoded POST with `public_key` and `lead[...]` fields; anything else
 * gets a JSON POST of the brief. Always followed by the email, so a failure
 * here never loses the lead.
 */
export async function pushToLeadSystem(
  system: 'tripleseat' | 'perfect_venue' | 'other',
  endpoint: string,
  lead: { name: string; email: string; phone?: string; org?: string; occasion: string; guests?: number; date?: string; flexible: boolean; budget?: string; notes?: string; reference: string },
): Promise<NotifyResult> {
  const base = { at: new Date().toISOString(), channel: (system === 'other' ? 'webhook' : system) as NotifyResult['channel'], to: endpoint, kind: 'lead_push' };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    if (system === 'tripleseat') {
      const url = new URL(endpoint);
      const form = new URLSearchParams();
      const publicKey = url.searchParams.get('public_key');
      if (publicKey) form.set('public_key', publicKey);
      const [first, ...rest] = lead.name.split(' ');
      form.set('lead[first_name]', first);
      form.set('lead[last_name]', rest.join(' ') || first);
      form.set('lead[email_address]', lead.email);
      if (lead.phone) form.set('lead[phone_number]', lead.phone);
      if (lead.org) form.set('lead[company]', lead.org);
      form.set('lead[event_description]', `${lead.occasion} via Nashville.com (${lead.reference})`);
      if (lead.guests) form.set('lead[guest_count]', String(lead.guests));
      if (lead.date) form.set('lead[event_date]', lead.date);
      form.set('lead[additional_information]', [lead.notes ?? '', lead.flexible ? 'Dates are flexible.' : '', lead.budget ? `Budget: ${lead.budget}` : ''].filter(Boolean).join('\n'));
      res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(), signal: controller.signal });
    } else {
      res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'nashville.com', ...lead }), signal: controller.signal });
    }
    clearTimeout(timer);
    return { ...base, ok: res.ok, status: res.status, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (error) {
    return { ...base, ok: false, error: String(error).slice(0, 200) };
  }
}
