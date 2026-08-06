/** @type {import('next').NextConfig} */

// Vercel server rendering is required for the private Shopify Storefront token,
// dynamic product routes, and anonymous cart mutations. BASE_PATH remains for
// non-production previews, but nashroam.com should leave it blank.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  trailingSlash: true,
  basePath,
  images: {
    // Product media is served by Shopify's image CDN. Existing local media
    // continues to use plain <img> elements and does not require a loader.
    unoptimized: true,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
