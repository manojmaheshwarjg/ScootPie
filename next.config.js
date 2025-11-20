/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Increase timeout for slow external images (like Google Shopping)
    minimumCacheTTL: 60,
    // Disable optimization for problematic domains (handled via unoptimized prop in components)
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
