import { Options } from 'amqplib';

/**
 * Queue Job Interface
 *
 * Standard format for all jobs in RabbitMQ queues
 */
export interface QueueJob {
  id: string; // UUID
  type: string; // 'draft_generation' | 'followup_scheduling' | 'reply_detection'
  organisation_id: string; // UUID (for multi-tenant isolation)
  payload: Record<string, any>;
  created_at: string; // ISO timestamp
  retry_count: number; // Current retry attempt
}

/**
 * Queue Names Constants
 */
export const QUEUES = {
  DRAFT: 'draft_queue',
  FOLLOWUP: 'followup_queue',
  REPLY: 'reply_queue',
} as const;

/**
 * Dead Letter Queue Names
 */
export const DLQ_NAMES = {
  DRAFT: 'draft_queue_dlq',
  FOLLOWUP: 'followup_queue_dlq',
  REPLY: 'reply_queue_dlq',
} as const;

/**
 * Exchange Names
 */
export const EXCHANGES = {
  DLX: 'dlx_exchange',
} as const;

/**
 * Queue Options for Main Queues
 */
export const QUEUE_OPTIONS: Record<string, Options.AssertQueue> = {
  [QUEUES.DRAFT]: {
    durable: true,
    arguments: {
      'x-message-ttl': 3600000, // 1 hour
      'x-dead-letter-exchange': EXCHANGES.DLX,
      'x-dead-letter-routing-key': DLQ_NAMES.DRAFT,
    },
  },
  [QUEUES.FOLLOWUP]: {
    durable: true,
    arguments: {
      'x-message-ttl': 86400000, // 24 hours
      'x-dead-letter-exchange': EXCHANGES.DLX,
      'x-dead-letter-routing-key': DLQ_NAMES.FOLLOWUP,
    },
  },
  [QUEUES.REPLY]: {
    durable: true,
    arguments: {
      'x-message-ttl': 3600000, // 1 hour
      'x-dead-letter-exchange': EXCHANGES.DLX,
      'x-dead-letter-routing-key': DLQ_NAMES.REPLY,
    },
  },
};

/**
 * Queue Options for Dead Letter Queues
 */
export const DLQ_OPTIONS: Record<string, Options.AssertQueue> = {
  [DLQ_NAMES.DRAFT]: {
    durable: true,
    // No message TTL - keep forever for monitoring
    // No DLX - prevent infinite loops
  },
  [DLQ_NAMES.FOLLOWUP]: {
    durable: true,
  },
  [DLQ_NAMES.REPLY]: {
    durable: true,
  },
};

/**
 * Exchange Options
 */
export const EXCHANGE_OPTIONS: Record<string, Options.AssertExchange> = {
  [EXCHANGES.DLX]: {
    durable: true,
  },
};

/**
 * Consumer Configuration
 */
export const CONSUMER_CONFIG = {
  prefetch: 1, // Process one message at a time per worker
  maxRetries: 3, // Maximum retry attempts before DLQ
};
