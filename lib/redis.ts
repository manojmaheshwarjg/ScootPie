import { Redis } from '@upstash/redis';

// Determine if we have Redis credentials configured
const hasRedis = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

// Export the client or null. This allows the app to gracefully degrade to memory if Redis isn't set up.
export const redis = hasRedis 
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;
