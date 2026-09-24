import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Only HTTPS hosts. Add the hosts you actually serve product images from.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Belt-and-suspenders alongside app/robots.ts and the root layout's
  // metadata.robots: an HTTP header a crawler can't miss, on every route
  // (including ones that don't render the root layout, like /api/*).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
      {
        // The POS shell's service worker — never let a stale copy of it get cached,
        // or an outdated cache strategy could stick to a device indefinitely.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

export default nextConfig;
