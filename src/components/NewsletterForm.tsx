'use client';

import { useState } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';

type State = 'idle' | 'submitting' | 'done' | 'error';

/**
 * Newsletter capture. No subscriber counts are shown because we do not have
 * real ones, and inventing social proof would undermine the whole site.
 */
export default function NewsletterForm({ location }: { location: string }) {
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
    // No email provider is wired up yet. Connect an ESP endpoint here.
    window.setTimeout(() => setState('done'), 400);
  }

  if (state === 'done') {
    return (
      <div
        role="status"
        className="rounded border border-moss/20 bg-moss-wash p-4 text-sm text-moss"
      >
        <strong className="font-semibold">Almost there.</strong> This demo build does not send email
        yet. Connect an email provider to complete signup.
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
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === 'error') setState('idle');
            }}
            aria-invalid={state === 'error'}
            aria-describedby={state === 'error' ? `newsletter-error-${location}` : undefined}
            className="field-input"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Signing up…' : 'Sign up'}
        </button>
      </div>
      {state === 'error' && (
        <p id={`newsletter-error-${location}`} role="alert" className="mt-2 text-sm text-clay-deep">
          Enter a valid email address.
        </p>
      )}
      {/* ink-soft, not ink-faint: this renders on tinted section backgrounds
          where ink-faint measures 4.31:1 at this size and fails WCAG AA. */}
      <p className="mt-2 text-2xs text-ink-soft">
        One email a week. Unsubscribe anytime. We do not sell reader data.
      </p>
    </form>
  );
}
