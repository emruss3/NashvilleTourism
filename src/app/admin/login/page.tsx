import { redirect } from 'next/navigation';
import { hasAdminSession, isAdminAuthConfigured } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Nashroam Admin',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  if (hasAdminSession()) redirect('/admin/experiences');

  const configured = isAdminAuthConfigured();
  const error = searchParams?.error;
  const message =
    error === 'invalid'
      ? 'That admin token was not accepted.'
      : error === 'not-configured'
        ? 'NASHROAM_ADMIN_TOKEN is not configured on the server.'
        : undefined;

  return (
    <main className="shell min-h-[70vh] py-16">
      <div className="mx-auto max-w-md rounded-card border border-paper-edge bg-paper-card p-7 shadow-card">
        <p className="eyebrow">Internal</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-navy">Nashroam Admin</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Private curation access. The token is exchanged server-side for an HttpOnly session cookie and is never stored in the browser URL.
        </p>

        {message ? (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {message}
          </p>
        ) : null}

        {!configured ? (
          <div className="mt-6 rounded-lg border border-paper-edge bg-paper p-4 text-sm text-ink-soft">
            Add <code className="font-mono text-navy">NASHROAM_ADMIN_TOKEN</code> as a server-only Vercel environment variable before using this screen.
          </div>
        ) : (
          <form action="/api/admin/session" method="post" className="mt-6 space-y-4">
            <div>
              <label htmlFor="token" className="text-sm font-semibold text-navy">
                Admin token
              </label>
              <input
                id="token"
                name="token"
                type="password"
                autoComplete="current-password"
                required
                className="mt-2 min-h-[44px] w-full rounded-lg border border-paper-edge bg-white px-3 text-navy outline-none focus:border-navy"
              />
            </div>
            <button type="submit" className="btn-primary min-h-[44px] w-full justify-center">
              Sign in
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
