import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['xlsx', 'playwright', 'playwright-core', '@sparticuz/chromium'],
};

export default nextConfig;
