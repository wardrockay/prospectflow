import { Request, Response, NextFunction } from 'express';
import { LRUCache } from 'lru-cache';
import { createChildLogger } from '../utils/logger.js';
import { leadMagnetIpRateLimitHitsTotal } from '../config/metrics.js';

const logger = createChildLogger('rate-limit-middleware');

// Configuration from environment
const IP_RATE_LIMIT_MAX = parseInt(process.env.LEAD_MAGNET_IP_RATE_LIMIT_MAX || '10', 10);
const IP_RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.LEAD_MAGNET_IP_RATE_LIMIT_WINDOW_MS || '3600000',
  10,
);
const RATE_LIMIT_CACHE_SIZE = parseInt(
  process.env.RATE_LIMIT_CACHE_SIZE || '10000',
  10,
);

// Sliding window: store array of request timestamps
interface RateLimitEntry {
  timestamps: number[];
}

// In-memory fallback (Redis integration can be added later)
const rateLimitCache = new LRUCache<string, RateLimitEntry>({
  max: RATE_LIMIT_CACHE_SIZE,
  ttl: IP_RATE_LIMIT_WINDOW_MS * 2, // Keep entries longer for sliding window
});

/**
 * Extract client IP with proxy awareness
 * Handles X-Forwarded-For from nginx/cloudflare
 * AC6.2: Returns both forwarded and original IP for logging
 */
function getClientIp(req: Request): { clientIp: string; originalIp?: string; forwardedIp?: string } {
  const originalIp = req.ip || req.socket.remoteAddress || 'unknown';
  const forwarded = req.headers['x-forwarded-for'];
  
  if (forwarded) {
    const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    const clientIp = forwardedIp.trim();
    return { clientIp, originalIp, forwardedIp: clientIp };
  }
  
  return { clientIp: originalIp, originalIp };
}

/**
 * Rate limit middleware for lead magnet signup
 * AC6.1: Enforce max 10 submissions per IP per hour using SLIDING WINDOW algorithm
 * AC6.2: Extract IP from X-Forwarded-For or fallback to req.ip, log both
 * AC6.3: Configurable via environment variables
 */
export function leadMagnetIpRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // BYPASS for tests (MEDIUM FIX #5)
  if (process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true') {
    next();
    return;
  }

  const { clientIp, originalIp, forwardedIp } = getClientIp(req);
  const now = Date.now();
  const windowStart = now - IP_RATE_LIMIT_WINDOW_MS;

  // Get or create entry
  let entry = rateLimitCache.get(clientIp);
  
  if (!entry) {
    entry = { timestamps: [] };
  }

  // SLIDING WINDOW: Remove timestamps outside current window
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
  
  // Add current request timestamp
  entry.timestamps.push(now);
  
  const requestCount = entry.timestamps.length;

  // AC6.2: Log both original and forwarded IPs for debugging (MEDIUM FIX #6)
  if (forwardedIp && forwardedIp !== originalIp) {
    logger.debug(
      {
        clientIp,
        forwardedIp,
        originalIp,
        requestCount,
      },
      'Request with proxy header',
    );
  }

  if (requestCount > IP_RATE_LIMIT_MAX) {
    const oldestTimestamp = entry.timestamps[0];
    const retryAfterMs = oldestTimestamp + IP_RATE_LIMIT_WINDOW_MS - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    // AC6.9: Increment Prometheus metric
    leadMagnetIpRateLimitHitsTotal.inc();

    // AC6.8: Structured logging with both IPs
    logger.warn(
      {
        ip: clientIp,
        forwardedIp,
        originalIp,
        count: requestCount,
        limit: IP_RATE_LIMIT_MAX,
        userAgent: req.get('user-agent')?.substring(0, 100),
      },
      'IP rate limit exceeded',
    );

    res.setHeader('Retry-After', retryAfterSeconds);
    res.status(429).json({
      success: false,
      error: 'IP_RATE_LIMIT_EXCEEDED',
      message: `Trop de demandes depuis cette adresse IP. Réessayez dans ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
      retryAfter: retryAfterSeconds,
    });
    return;
  }

  rateLimitCache.set(clientIp, entry);
  next();
}
