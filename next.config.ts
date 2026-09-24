import type { NextConfig } from "next";
import pkg from "./package.json";

// Shown at the bottom of the login screen (app/login/page.tsx). GIT_SHA is
// baked in as a build-time ARG in the Dockerfile (and by docker/build-image.sh
// / docker/publish.sh for manual builds) — "dev" is only what you see running
// `next dev` locally with no build arg set.
const gitSha = (process.env.GIT_SHA ?? "dev").slice(0, 7);
const appVersion = `${pkg.version} (${gitSha})`;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
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
