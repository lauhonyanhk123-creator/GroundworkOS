import type { NextConfig } from "next";
import path from "path";
// @ts-expect-error next-pwa does not ship TypeScript declarations
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  output: "standalone",
  // Trace deps from the monorepo root so workspace node_modules are included
  outputFileTracingRoot: path.join(__dirname, "../"),
  reactStrictMode: true,
  compiler: {
    removeConsole: false,
  },
  // Security headers applied by Next itself so they hold behind Nginx on the
  // Oracle deployment (previously defined only in the unused vercel.json).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})(nextConfig);
