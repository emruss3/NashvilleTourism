/** @type {import('next').NextConfig} */
import { readFileSync } from 'node:fs';

// NashRoam is deployed on Vercel. Keep BASE_PATH support for previews or
// alternate hosts, but do not use a full static export: event feeds need the
// server runtime so Ticketmaster data can refresh without a manual redeploy.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * nashville.com → Nashroam exact-match 301s, read from the generated map
 * (data/migration/redirects.json, built by `npm run redirects:build`). Never
 * inline rules here. Each rule is scoped to the nashville.com hosts, so it is
 * inert on nashroam.com and only takes effect once DNS points nashville.com
 * at this project. `statusCode: 301` rather than `permanent: true`, which Next
 * serves as 308. Both trailing-slash forms are emitted (Next's own
 * trailing-slash redirect still runs first, so a slash-less request takes two
 * hops); query strings pass through (Next's default). Mixed-case, query-addressed and wildcard sources
 * are handled in src/middleware.ts, and 410s live there too because
 * `redirects()` cannot return 410.
 */
function migrationRedirects() {
  const map = JSON.parse(readFileSync(new URL('./data/migration/redirects.json', import.meta.url), 'utf8'));
  const hostPattern = `(${map.hosts.map((h) => h.replace(/\./g, '\\.')).join('|')})`;
  const target = String(map.target || 'https://nashroam.com').replace(/\/$/, '');
  const out = [];
  for (const rule of map.rules) {
    if (rule.status !== 301 || !rule.destination || rule.source.includes('?')) continue;
    // Absolute destination: a relative one would stay on the nashville.com host and redirect forever.
    const destination = /^https?:\/\//.test(rule.destination) ? rule.destination : `${target}${rule.destination}`;
    const bare = rule.source === '/' ? '/' : rule.source.replace(/\/$/, '');
    const forms = bare === '/' ? ['/'] : [bare, `${bare}/`];
    for (const source of forms) {
      out.push({ source, destination, statusCode: 301, has: [{ type: 'host', value: hostPattern }] });
    }
  }
  return out;
}

const nextConfig = {
  trailingSlash: true,
  basePath,
  images: {
    // Existing media components use their own responsive image handling.
    unoptimized: true,
  },
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return migrationRedirects();
  },
};

export default nextConfig;
