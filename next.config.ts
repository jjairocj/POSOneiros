import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Only HTTPS hosts. Add the hosts you actually serve product images from.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
