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
    ];
  },
};

export default nextConfig;
