import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Trace deps from the monorepo root so workspace node_modules are included
  outputFileTracingRoot: path.join(__dirname, "../"),
  reactStrictMode: true,
  compiler: {
    removeConsole: false,
  },
};

export default nextConfig;
