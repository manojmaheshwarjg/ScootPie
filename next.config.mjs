/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security: API_KEY is no longer exposed to the client.
  // It is accessed securely on the server side via 'services/gemini.ts'.
  reactStrictMode: false,

  // Increase body size limit for API routes to handle large base64 images
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Allow external image sources used by try-on results and product thumbnails
  images: {
    remotePatterns: [
      // Google Shopping thumbnails
      { protocol: 'https', hostname: '**.gstatic.com' },
      { protocol: 'https', hostname: '**.google.com' },
      { protocol: 'https', hostname: '**.googleapis.com' },
      // Supabase Storage
      { protocol: 'https', hostname: '**.supabase.co' },
      // Common product image CDNs
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: '**.shopify.com' },
      { protocol: 'https', hostname: '**.shopifycdn.com' },
      { protocol: 'https', hostname: '**.akamaihd.net' },
      { protocol: 'https', hostname: '**.cdn.com' },
      // Catch-all for any other HTTPS source
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;