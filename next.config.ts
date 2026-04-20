import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // playwright, @sparticuz/chromium 등은 번들링하지 않고 runtime require()로 사용
  serverExternalPackages: ['xlsx', 'playwright', 'playwright-core', '@sparticuz/chromium'],

  // Vercel 배포 시 파일 추적(file tracing)에서 누락되는 바이너리 파일을 명시적으로 포함
  // @sparticuz/chromium의 bin/ 폴더(Chromium 바이너리)가 /var/task에 포함되도록 강제
  outputFileTracingIncludes: {
    'app/api/meta-ads-scrape/route': [
      './node_modules/@sparticuz/chromium/bin/**/*',
    ],
  },
};

export default nextConfig;
