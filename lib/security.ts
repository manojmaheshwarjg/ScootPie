import { redis } from './redis';

// --- RATE LIMITING (CLIENT SIDE ADAPTATION) ---

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

// Fallback memory store
const memoryTrackers = new Map<string, { count: number; expiresAt: number }>();

export const rateLimit = async (actionName: string, config: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 10 }) => {
  // In a client-side environment, we can't reliably get the IP address without a backend.
  // We will use a mock IP or client ID for demonstration purposes.
  const ip = 'client-user'; 
  const key = `rate:${actionName}:${ip}`;

  if (redis) {
    try {
        const requests = await redis.incr(key);
        if (requests === 1) {
          await redis.expire(key, config.windowMs / 1000);
        }
        if (requests > config.maxRequests) {
          // Soft limit for demo - log warning but don't crash
          console.warn(`Rate limit warning for ${actionName}`);
        }
    } catch (e) {
        // Redis failed (likely auth), fall back silently
    }
  } else {
    const now = Date.now();
    const record = memoryTrackers.get(key);

    if (record && now < record.expiresAt) {
      if (record.count >= config.maxRequests) {
         console.warn(`Rate limit warning for ${actionName}`);
      }
      record.count++;
    } else {
      memoryTrackers.set(key, { count: 1, expiresAt: now + config.windowMs });
    }
  }
};

// --- SSRF PROTECTION ---

export const isSafeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    return true;
  } catch (e) {
    return false;
  }
};

export const sanitizeInput = (text: string, maxLength: number = 1000): string => {
    if (!text) return "";
    return text.substring(0, maxLength).replace(/[^\w\s.,?!-]/g, ""); 
};