import { ChannelWrapper } from 'amqp-connection-manager';
import { ConsumeMessage, ConfirmChannel } from 'amqplib';
import { rabbitMQClient } from './rabbitmq.client.js';
import { QueueJob } from './queue.config.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('QueueConsumer');

/**
 * Abstract base class for queue consumers
 * Implements retry logic, error handling, and message acknowledgment
 */
export abstract class QueueConsumer {
  private channel: ChannelWrapper | null = null;
  private isConsuming = false;
  private readonly MAX_RETRIES = 3;
  private readonly PREFETCH_COUNT = 1;

  /**
   * Queue name to consume from - must be implemented by subclass
   */
  abstract get queueName(): string;

  /**
   * Process a single job - must be implemented by subclass
   * @param job - The job to process
   * @throws Error if processing fails
   */
  abstract processJob(job: QueueJob): Promise<void>;

  /**
   * Start consuming messages from the queue
   */
  async start(): Promise<void> {
    if (this.isConsuming) {
      logger.warn({ queue: this.queueName }, 'Consumer already started');
      return;
    }

    try {
      const queueName = this.queueName;
      const prefetchCount = this.PREFETCH_COUNT;

      this.channel = rabbitMQClient.createChannelWrapper();

      // Configure channel with prefetch using addSetup
      await this.channel.addSetup(async (channel: ConfirmChannel) => {
        await channel.prefetch(prefetchCount);
        logger.debug({ prefetch: prefetchCount }, 'Channel prefetch configured');
      });

      await this.channel.waitForConnect();

      logger.info(
        {
          queue: queueName,
          prefetch: prefetchCount,
        },
        'Starting consumer',
      );

      // Start consuming messages
      await this.channel.consume(
        queueName,
        async (msg: ConsumeMessage | null) => {
          if (!msg) {
            logger.warn({ queue: queueName }, 'Received null message');
            return;
          }

          await this.handleMessage(msg);
        },
        { noAck: false }, // Manual acknowledgment
      );

      this.isConsuming = true;
      logger.info({ queue: queueName }, 'Consumer started successfully');
    } catch (error) {
      logger.error(
        {
          queue: this.queueName,
          error: (error as Error).message,
        },
        'Failed to start consumer',
      );
      throw error;
    }
  }

  /**
   * Stop consuming messages and close channel
   */
  async stop(): Promise<void> {
    if (!this.isConsuming) {
      return;
    }

    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      this.isConsuming = false;
      logger.info({ queue: this.queueName }, 'Consumer stopped');
    } catch (error) {
      logger.error(
        {
          queue: this.queueName,
          error: (error as Error).message,
        },
        'Error stopping consumer',
      );
      throw error;
    }
  }

  /**
   * Handle incoming message with retry logic
   */
  private async handleMessage(msg: ConsumeMessage): Promise<void> {
    let job: QueueJob | undefined;
    let isParseError = false;

    try {
      // Parse message content
      const content = msg.content.toString();
      job = JSON.parse(content) as QueueJob;
    } catch (error) {
      // Invalid JSON - send to DLQ immediately
      logger.error(
        {
          queue: this.queueName,
          error: (error as Error).message,
        },
        'Failed to parse message',
      );
      this.channel!.nack(msg, false, false); // Don't requeue
      return;
    }

    try {
      logger.info(
        {
          queue: this.queueName,
          jobId: job.id,
          jobType: job.type,
          retryCount: job.retry_count,
        },
        'Processing message',
      );

      // Validate job structure
      this.validateJob(job);

      // Process the job with timeout (30 seconds default)
      await this.processJobWithTimeout(job);

      // Success - acknowledge message
      this.channel!.ack(msg);

      logger.info(
        {
          queue: this.queueName,
          jobId: job.id,
        },
        'Message processed successfully',
      );
    } catch (error) {
      const err = error as Error;

      logger.error(
        {
          queue: this.queueName,
          jobId: job?.id,
          error: err.message,
          stack: err.stack,
        },
        'Error processing message',
      );

      // Handle error with retry logic
      await this.handleError(msg, job, err);
    }
  }

  /**
   * Handle processing errors with retry/DLQ logic
   */
  private async handleError(
    msg: ConsumeMessage,
    job: QueueJob | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) {
      // Invalid message format - send to DLQ immediately
      logger.error(
        {
          queue: this.queueName,
          error: error.message,
        },
        'Invalid message format - routing to DLQ',
      );
      this.channel!.nack(msg, false, false); // Don't requeue
      return;
    }

    // Check if this is a validation error (don't retry validation errors)
    if (error.message.includes('Invalid job:')) {
      logger.error(
        {
          queue: this.queueName,
          jobId: job.id,
          error: error.message,
        },
        'Job validation failed - routing to DLQ',
      );
      this.channel!.nack(msg, false, false); // Don't requeue
      this.onError(error, job);
      return;
    }

    // Check retry count
    if (job.retry_count < this.MAX_RETRIES) {
      // Increment retry count
      job.retry_count++;

      logger.warn(
        {
          queue: this.queueName,
          jobId: job.id,
          retryCount: job.retry_count,
          maxRetries: this.MAX_RETRIES,
        },
        'Requeuing message for retry',
      );

      // ACK original message and republish with updated retry count
      this.channel!.ack(msg);
      await this.channel!.sendToQueue(this.queueName, Buffer.from(JSON.stringify(job)), {
        persistent: true,
      });
    } else {
      // Max retries exceeded - send to DLQ
      logger.error(
        {
          queue: this.queueName,
          jobId: job.id,
          retryCount: job.retry_count,
          maxRetries: this.MAX_RETRIES,
        },
        'Max retries exceeded - routing to DLQ',
      );

      // NACK without requeue (routes to DLQ via dead letter exchange)
      this.channel!.nack(msg, false, false);
    }

    // Call error handler for custom error handling
    this.onError(error, job);
  }

  /**
   * Process job with timeout to prevent infinite blocking
   */
  private async processJobWithTimeout(job: QueueJob): Promise<void> {
    const timeout = this.getProcessTimeout();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Job processing timeout after ${timeout}ms`)), timeout);
    });

    await Promise.race([this.processJob(job), timeoutPromise]);
  }

  /**
   * Get processing timeout in milliseconds
   * Override in subclass to customize
   */
  protected getProcessTimeout(): number {
    return 30000; // 30 seconds default
  }

  /**
   * Validate job structure
   * @throws Error if job is invalid
   */
  private validateJob(job: QueueJob): void {
    if (!job.id || typeof job.id !== 'string') {
      throw new Error('Invalid job: missing or invalid id');
    }

    if (!job.type || typeof job.type !== 'string') {
      throw new Error('Invalid job: missing or invalid type');
    }

    if (!job.organisation_id || typeof job.organisation_id !== 'string') {
      throw new Error('Invalid job: missing or invalid organisation_id');
    }

    if (!job.created_at || typeof job.created_at !== 'string') {
      throw new Error('Invalid job: missing or invalid created_at');
    }

    if (typeof job.retry_count !== 'number') {
      throw new TypeError('Invalid job: missing or invalid retry_count');
    }

    if (!job.payload || typeof job.payload !== 'object') {
      throw new Error('Invalid job: missing or invalid payload');
    }
  }

  /**
   * Hook for custom error handling - can be overridden by subclasses
   */
  protected onError(error: Error, job: QueueJob): void {
    // Default implementation - just log
    logger.error(
      {
        queue: this.queueName,
        jobId: job.id,
        error: error.message,
      },
      'Job processing failed',
    );
  }

  /**
   * Check if consumer is currently consuming
   */
  isActive(): boolean {
    return this.isConsuming;
  }
}
