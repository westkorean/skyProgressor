import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    ignoreIssue: [
      { path: 'app/**', title: 'Module not found' },
    ],
  },
};

export default nextConfig;