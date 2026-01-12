import { ChannelWrapper } from 'amqp-connection-manager';
import { createChildLogger } from '../utils/logger.js';
import { RabbitMQClient } from './rabbitmq.client.js';

const logger = createChildLogger('QueueInit');
import {
  QUEUES,
  DLQ_NAMES,
  EXCHANGES,
  QUEUE_OPTIONS,
  DLQ_OPTIONS,
  EXCHANGE_OPTIONS,
} from './queue.config.js';

/**
 * Wait for channel to be ready with timeout
 */
async function waitForChannelReady(
  channel: ChannelWrapper,
  timeoutMs: number = 10000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Channel setup timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    // Wait for channel to be ready
    channel.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });

    channel.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    // If already connected, resolve immediately
    if (channel['_channel']) {
      clearTimeout(timeout);
      resolve();
    }
  });
}

/**
 * Retry helper with exponential backoff
 */
async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const backoff = delayMs * Math.pow(2, attempt - 1);
        logger.warn(
          { attempt, maxRetries, backoff, error: lastError.message },
          'Retrying operation after failure',
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw lastError;
}

/**
 * Initialize all RabbitMQ queues, exchanges, and bindings
 *
 * This function should be called once during application startup
 * to ensure all queue infrastructure is properly configured.
 *
 * Features:
 * - Waits for channel to be ready before asserting resources
 * - Automatic retry with exponential backoff
 * - Idempotent operations (safe to run multiple times)
 * - Proper cleanup on failure
 *
 * @param client - RabbitMQ client instance
 */
export async function initializeQueues(client: RabbitMQClient): Promise<void> {
  let channel: ChannelWrapper | null = null;

  try {
    // Verify client is connected
    if (!client.isConnected()) {
      throw new Error('RabbitMQ client not connected. Call connect() first.');
    }

    logger.info('Initializing RabbitMQ queues...');

    // Create channel with retry
    channel = await retry(async () => {
      const ch = client.createChannelWrapper();
      await waitForChannelReady(ch);
      return ch;
    });

    logger.debug('Channel ready, creating queue topology...');

    // 1. Create dead letter exchange
    logger.debug(`Creating dead letter exchange: ${EXCHANGES.DLX}`);
    await retry(() =>
      channel!.assertExchange(EXCHANGES.DLX, 'direct', EXCHANGE_OPTIONS[EXCHANGES.DLX]),
    );

    // 2. Create dead letter queues
    for (const [dlqName, options] of Object.entries(DLQ_OPTIONS)) {
      logger.debug(`Creating dead letter queue: ${dlqName}`);
      await retry(() => channel!.assertQueue(dlqName, options));
    }

    // 3. Bind DLQs to DLX
    logger.debug('Binding dead letter queues to exchange');
    await retry(() => channel!.bindQueue(DLQ_NAMES.DRAFT, EXCHANGES.DLX, DLQ_NAMES.DRAFT));
    await retry(() => channel!.bindQueue(DLQ_NAMES.FOLLOWUP, EXCHANGES.DLX, DLQ_NAMES.FOLLOWUP));
    await retry(() => channel!.bindQueue(DLQ_NAMES.REPLY, EXCHANGES.DLX, DLQ_NAMES.REPLY));

    // 4. Create main queues
    for (const [queueName, options] of Object.entries(QUEUE_OPTIONS)) {
      logger.debug(`Creating main queue: ${queueName}`);
      await retry(() => channel!.assertQueue(queueName, options));
    }

    // Clean up channel
    await channel.close();

    logger.info(
      {
        queues: Object.values(QUEUES),
        dlqs: Object.values(DLQ_NAMES),
        exchanges: Object.values(EXCHANGES),
      },
      'RabbitMQ queues initialized successfully',
    );
  } catch (error) {
    logger.error({ error }, 'Failed to initialize RabbitMQ queues');

    // Clean up channel on failure
    if (channel) {
      try {
        await channel.close();
      } catch (closeError) {
        logger.warn({ error: closeError }, 'Failed to close channel during cleanup');
      }
    }

    throw error;
  }
}
