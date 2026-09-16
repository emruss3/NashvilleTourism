'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { site } from '@/lib/site';

type State = 'idle' | 'submitting' | 'done' | 'error';

/**
 * Newsletter capture (SITE-LAYOUT.md §Newsletter). No subscriber counts are
 * shown because we do not have real ones.
 *
 * INTEGRATION STATUS: no email provider is connected. The form validates and
 * records the analytics event, then tells the reader plainly that nothing was
 * saved. Success copy must only appear on a confirmed provider response.
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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setState('error');
      return;
    }
    setState('submitting');
    track(ANALYTICS_EVENTS.NEWSLETTER_SIGNUP, { placement: 'editorial', item_id: location });
    // Connect an ESP endpoint here; only a confirmed response may show success.
    window.setTimeout(() => setState('done'), 300);
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
        <strong className="font-semibold">Thanks for your interest.</strong> The weekly edit has not
        launched yet, so we did not keep your address. Check back soon.
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
          Enter a valid email address.
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
