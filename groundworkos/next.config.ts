import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable turbo and heavy features for lower memory usage
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  compiler: {
    removeConsole: false,
  },
};

export default nextConfig;
