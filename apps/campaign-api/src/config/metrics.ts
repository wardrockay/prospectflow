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
    service: 'campaign-api',
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
 * Business metric: Campaigns created counter
 */
export const campaignsCreatedTotal = new promClient.Counter({
  name: 'prospectflow_campaigns_created_total',
  help: 'Total number of campaigns created',
  labelNames: ['organisation_id', 'success'], // success: 'true' or 'false'
  registers: [register],
});

/**
 * Business metric: Active campaigns gauge
 */
export const activeCampaigns = new promClient.Gauge({
  name: 'active_campaigns',
  help: 'Number of currently active campaigns',
  labelNames: ['organisation_id'],
  registers: [register],
});
