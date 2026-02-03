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

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory fallback (Redis integration can be added later)
const rateLimitCache = new LRUCache<string, RateLimitEntry>({
  max: 10000, // Max 10k unique IPs tracked
  ttl: IP_RATE_LIMIT_WINDOW_MS,
});

/**
 * Extract client IP with proxy awareness
 * Handles X-Forwarded-For from nginx/cloudflare
 */
function getClientIp(req: Request): string {
  // Trust X-Forwarded-For from nginx/cloudflare
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const firstIp = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return firstIp.trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Rate limit middleware for lead magnet signup
 * AC6.1: Enforce max 10 submissions per IP per hour using sliding window
 * AC6.2: Extract IP from X-Forwarded-For or fallback to req.ip
 * AC6.3: Configurable via environment variables
 */
export function leadMagnetIpRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const clientIp = getClientIp(req);
  const now = Date.now();

  // Get or create entry
  let entry = rateLimitCache.get(clientIp);

  if (!entry || now > entry.resetAt) {
    // New window - reset counter
    entry = { count: 1, resetAt: now + IP_RATE_LIMIT_WINDOW_MS };
    rateLimitCache.set(clientIp, entry);
    next();
    return;
  }

  // Increment count in existing window
  entry.count++;

  if (entry.count > IP_RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);

    // AC6.9: Increment Prometheus metric
    leadMagnetIpRateLimitHitsTotal.inc();

    // AC6.8: Structured logging
    logger.warn(
      {
        ip: clientIp,
        count: entry.count,
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
