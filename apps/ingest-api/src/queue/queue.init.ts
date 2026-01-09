import { ChannelWrapper } from 'amqp-connection-manager';
import { logger } from '../utils/logger.js';
import { RabbitMQClient } from './rabbitmq.client.js';
import {
  QUEUES,
  DLQ_NAMES,
  EXCHANGES,
  QUEUE_OPTIONS,
  DLQ_OPTIONS,
  EXCHANGE_OPTIONS,
} from './queue.config.js';

/**
 * Initialize all RabbitMQ queues, exchanges, and bindings
 *
 * This function should be called once during application startup
 * to ensure all queue infrastructure is properly configured.
 *
 * @param client - RabbitMQ client instance
 */
export async function initializeQueues(client: RabbitMQClient): Promise<void> {
  try {
    logger.info('Initializing RabbitMQ queues...');

    const channel: ChannelWrapper = client.createChannelWrapper();

    // 1. Create dead letter exchange
    logger.debug(`Creating dead letter exchange: ${EXCHANGES.DLX}`);
    await channel.assertExchange(EXCHANGES.DLX, 'direct', EXCHANGE_OPTIONS[EXCHANGES.DLX]);

    // 2. Create dead letter queues
    for (const [dlqName, options] of Object.entries(DLQ_OPTIONS)) {
      logger.debug(`Creating dead letter queue: ${dlqName}`);
      await channel.assertQueue(dlqName, options);
    }

    // 3. Bind DLQs to DLX
    logger.debug('Binding dead letter queues to exchange');
    await channel.bindQueue(DLQ_NAMES.DRAFT, EXCHANGES.DLX, DLQ_NAMES.DRAFT);
    await channel.bindQueue(DLQ_NAMES.FOLLOWUP, EXCHANGES.DLX, DLQ_NAMES.FOLLOWUP);
    await channel.bindQueue(DLQ_NAMES.REPLY, EXCHANGES.DLX, DLQ_NAMES.REPLY);

    // 4. Create main queues
    for (const [queueName, options] of Object.entries(QUEUE_OPTIONS)) {
      logger.debug(`Creating main queue: ${queueName}`);
      await channel.assertQueue(queueName, options);
    }

    await channel.close();

    logger.info({
      queues: Object.values(QUEUES),
      dlqs: Object.values(DLQ_NAMES),
      exchanges: Object.values(EXCHANGES),
    }, 'RabbitMQ queues initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize RabbitMQ queues');
    throw error;
  }
}
