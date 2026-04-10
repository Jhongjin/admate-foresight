import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['xlsx', 'playwright', 'playwright-core'],
};

export default nextConfig;
