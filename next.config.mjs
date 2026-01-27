/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security: API_KEY is no longer exposed to the client.
  // It is accessed securely on the server side via 'services/gemini.ts'.
  reactStrictMode: false,
};

export default nextConfig;