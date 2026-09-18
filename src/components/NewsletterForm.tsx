'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { site } from '@/lib/site';

type State = 'idle' | 'submitting' | 'done' | 'error';

/**
 * Newsletter capture (SITE-LAYOUT.md §Newsletter). Posts to /api/newsletter/,
 * which stores the address in the subscribers table with a consent timestamp.
 * Success copy appears only on a confirmed response; no subscriber counts are
 * shown because we do not publish them.
 */
export default function NewsletterForm({
  location,
  tone = 'light',
}: {
  location: string;
  /** `dark` renders the small print for charcoal backgrounds. */
  tone?: 'light' | 'dark';
}) {
  const [state, setState] = useState<State>('idle');
  const [email, setEmail] = useState('');

  const [failure, setFailure] = useState<'invalid' | 'unavailable' | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFailure('invalid');
      setState('error');
      return;
    }
    setState('submitting');
    try {
      const res = await fetch('/api/newsletter/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: `site:${location}` }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (res.ok && json.ok) {
        track(ANALYTICS_EVENTS.NEWSLETTER_SIGNUP, { placement: 'editorial', item_id: location });
        setState('done');
        return;
      }
      setFailure('unavailable');
      setState('error');
    } catch {
      setFailure('unavailable');
      setState('error');
    }
  }

  const dark = tone === 'dark';
  const smallPrint = dark ? 'text-paper/75' : 'text-ink-soft';
  const errorText = dark ? 'text-paper' : 'text-clay';
  const linkClass = dark ? 'underline hover:text-paper' : 'underline hover:text-ink';

  if (state === 'done') {
    return (
      <div
        role="status"
        className={`rounded border p-4 text-sm ${
          dark ? 'border-paper/30 bg-paper/10 text-paper' : 'border-ink bg-paper-sunk text-ink'
        }`}
      >
        <strong className="font-semibold">You&rsquo;re on the list.</strong> The weekly edit lands in your inbox
        with the shows, tables and places worth the week. Unsubscribe with one click, any time.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <label htmlFor={`newsletter-${location}`} className="sr-only">
            Email address
          </label>
          <input
            id={`newsletter-${location}`}
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === 'error') setState('idle');
            }}
            aria-invalid={state === 'error'}
            aria-describedby={state === 'error' ? `newsletter-error-${location}` : undefined}
            className={`field-input ${dark ? 'border-paper/60 bg-transparent text-paper placeholder:text-paper/60 focus:border-paper' : ''}`}
          />
        </div>
        <button
          type="submit"
          className={dark ? 'btn-reverse shrink-0' : 'btn-primary shrink-0'}
          disabled={state === 'submitting'}
        >
          {state === 'submitting' ? 'Sending…' : site.newsletter.cta}
        </button>
      </div>
      {state === 'error' && (
        <p id={`newsletter-error-${location}`} role="alert" className={`mt-2 text-sm ${errorText}`}>
          {failure === 'unavailable' ? (
            <>
              We couldn&rsquo;t save that just now. Try again in a moment, or email{' '}
              <a href={`mailto:${site.org.email}?subject=${encodeURIComponent('Sign me up for the weekly edit')}`} className={linkClass}>
                {site.org.email}
              </a>
              .
            </>
          ) : (
            'Enter a valid email address.'
          )}
        </p>
      )}
      <p className={`mt-2 text-2xs ${smallPrint}`}>
        One email a week. Unsubscribe anytime. We do not sell reader data; see our{' '}
        <Link href="/privacy/" className={linkClass}>
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
