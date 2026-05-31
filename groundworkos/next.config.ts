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
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})(nextConfig);
