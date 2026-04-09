import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['xlsx', 'playwright', 'playwright-core'],
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
