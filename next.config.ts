import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'minotar.net',
      },
    ],
  },
  turbopack: {
    ignoreIssue: [
      { path: 'app/**', title: 'Module not found' },
    ],
  },
};

export default nextConfig;