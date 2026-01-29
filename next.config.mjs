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
};

export default nextConfig;