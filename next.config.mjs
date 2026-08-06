/** @type {import('next').NextConfig} */

// NashRoam is deployed on Vercel. Keep BASE_PATH support for previews or
// alternate hosts, but do not use a full static export: event feeds need the
// server runtime so Ticketmaster data can refresh without a manual redeploy.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  trailingSlash: true,
  basePath,
  images: {
    // Existing media components use their own responsive image handling.
    unoptimized: true,
  },
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
