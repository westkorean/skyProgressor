import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'minotar.net',
      },
      {
        protocol: 'https',
        hostname: 'static.wikia.nocookie.net',
      },
      {
        protocol: 'https',
        hostname: 'vignette.wikia.nocookie.net',
      },
      {
        protocol: 'https',
        hostname: 'hypixel-skyblock.fandom.com',
      },
      {
        protocol: 'https',
        hostname: 'mc-heads.net',
      },
      {
        protocol: 'https',
        hostname: 'sky.shiiyu.moe',
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
