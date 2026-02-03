import promClient from 'prom-client';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('Metrics');

/**
 * Global Prometheus registry
 */
export const register = new promClient.Registry();

/**
 * Initialize Prometheus metrics
 * - Collects Node.js default metrics (CPU, memory, GC, event loop)
 * - Configures custom metrics for HTTP, database, queue, business
 */
export const initMetrics = (): void => {
  // Add default labels to all metrics
  register.setDefaultLabels({
    service: 'ingest-api',
    environment: process.env.NODE_ENV || 'development',
  });

  // Enable default Node.js metrics
  promClient.collectDefaultMetrics({
    register,
    prefix: 'nodejs_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // GC duration buckets in seconds
    eventLoopMonitoringPrecision: 10, // Event loop lag precision in milliseconds
  });

  logger.info('Prometheus metrics initialized');
};

/**
 * HTTP request duration histogram
 * Tracks latency by endpoint, method, status code
 */
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // Exponential buckets
  registers: [register],
});

/**
 * HTTP request counter
 * Tracks total requests by method and status code
 */
export const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * Database query duration histogram
 * Tracks query performance by operation type
 */
export const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'schema'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register],
});

/**
 * Database connection pool gauge
 * Tracks active and idle connections
 */
export const dbConnectionPool = new promClient.Gauge({
  name: 'db_connection_pool_size',
  help: 'Number of connections in the pool',
  labelNames: ['state'], // 'active' or 'idle'
  registers: [register],
});

/**
 * Queue message counter
 * Tracks messages published and consumed
 */
export const queueMessagesTotal = new promClient.Counter({
  name: 'queue_messages_total',
  help: 'Total number of queue messages',
  labelNames: ['queue', 'action'], // action: 'published' or 'consumed'
  registers: [register],
});

/**
 * Queue processing duration histogram
 */
export const queueProcessingDuration = new promClient.Histogram({
  name: 'queue_processing_duration_seconds',
  help: 'Duration of queue message processing in seconds',
  labelNames: ['queue', 'success'], // success: 'true' or 'false'
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

/**
 * Queue depth gauge (requires RabbitMQ Management API)
 */
export const queueDepth = new promClient.Gauge({
  name: 'queue_depth',
  help: 'Number of messages in queue',
  labelNames: ['queue'],
  registers: [register],
});

/**
 * Business metric: Emails sent counter
 */
export const emailsSentTotal = new promClient.Counter({
  name: 'emails_sent_total',
  help: 'Total number of emails sent',
  labelNames: ['organisation_id', 'campaign_id', 'success'], // success: 'true' or 'false'
  registers: [register],
});

/**
 * Business metric: Drafts generated counter
 */
export const draftsGeneratedTotal = new promClient.Counter({
  name: 'drafts_generated_total',
  help: 'Total number of email drafts generated',
  labelNames: ['organisation_id', 'success'], // success: 'true' or 'false'
  registers: [register],
});

/**
 * Business metric: Prospects processed counter
 */
export const prospectsProcessedTotal = new promClient.Counter({
  name: 'prospects_processed_total',
  help: 'Total number of prospects processed',
  labelNames: ['organisation_id', 'action'], // action: 'imported', 'validated', 'researched'
  registers: [register],
});

/**
 * Duplicate detection metrics (Story 2-5)
 */

/**
 * Total number of duplicate checks performed
 */
export const duplicateChecksTotal = new promClient.Counter({
  name: 'duplicate_checks_total',
  help: 'Total number of duplicate checks performed',
  labelNames: ['organisation_id', 'check_type'], // check_type: 'campaign' | 'organization'
  registers: [register],
});

/**
 * Total number of duplicates detected
 */
export const duplicatesDetectedTotal = new promClient.Counter({
  name: 'duplicates_detected_total',
  help: 'Total number of duplicates detected',
  labelNames: ['organisation_id', 'duplicate_type'], // duplicate_type: 'campaign' | 'organization' | 'within_upload'
  registers: [register],
});

/**
 * Total number of duplicate overrides by users
 */
export const duplicateOverridesTotal = new promClient.Counter({
  name: 'duplicate_overrides_total',
  help: 'Total number of duplicate overrides by users',
  labelNames: ['organisation_id'],
  registers: [register],
});

/**
 * Duplicate check query duration histogram
 */
export const duplicateCheckDuration = new promClient.Histogram({
  name: 'duplicate_check_duration_seconds',
  help: 'Duration of duplicate check queries in seconds',
  labelNames: ['organisation_id', 'email_count_bucket'], // email_count_bucket: '1-10', '11-50', '51-100', '100+'
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * Lead Magnet Abuse Prevention Metrics (Story LM-006)
 */

/**
 * IP rate limit hits counter (AC6.9)
 */
export const leadMagnetIpRateLimitHitsTotal = new promClient.Counter({
  name: 'lead_magnet_ip_rate_limit_hits_total',
  help: 'Total number of IP rate limit hits',
  labelNames: [],
  registers: [register],
});

/**
 * Honeypot detections counter (AC6.9)
 */
export const leadMagnetHoneypotDetectionsTotal = new promClient.Counter({
  name: 'lead_magnet_honeypot_detections_total',
  help: 'Total number of honeypot field detections',
  labelNames: [],
  registers: [register],
});

/**
 * Turnstile validation failures counter (AC6.9)
 */
export const leadMagnetTurnstileFailuresTotal = new promClient.Counter({
  name: 'lead_magnet_turnstile_failures_total',
  help: 'Total number of Turnstile validation failures',
  labelNames: [],
  registers: [register],
});

/**
 * Disposable email blocks counter (AC6.9)
 */
export const leadMagnetDisposableEmailBlocksTotal = new promClient.Counter({
  name: 'lead_magnet_disposable_email_blocks_total',
  help: 'Total number of disposable email blocks',
  labelNames: [],
  registers: [register],
});
