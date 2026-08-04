/** @type {import('next').NextConfig} */

// Static export so the site can be hosted on GitHub Pages / any static host.
// BASE_PATH lets us deploy under a repo subpath (e.g. /NashvilleTourism).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: {
    // next/image optimization requires a server; static export uses the raw src.
    unoptimized: true,
  },
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
