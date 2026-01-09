import { ChannelWrapper } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';
import { rabbitMQClient } from './rabbitmq.client';
import { QueueJob } from './queue.config';
import { logger } from '../utils/logger';

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
      logger.warn('Consumer already started', { queue: this.queueName });
      return;
    }

    try {
      this.channel = rabbitMQClient.createChannelWrapper();
      await this.channel.waitForConnect();

      // Set prefetch to 1 for even distribution across workers
      await this.channel.prefetch(this.PREFETCH_COUNT);

      logger.info('Starting consumer', {
        queue: this.queueName,
        prefetch: this.PREFETCH_COUNT,
      });

      // Start consuming messages
      await this.channel.consume(
        this.queueName,
        async (msg: ConsumeMessage | null) => {
          if (!msg) {
            logger.warn('Received null message', { queue: this.queueName });
            return;
          }

          await this.handleMessage(msg);
        },
        { noAck: false }, // Manual acknowledgment
      );

      this.isConsuming = true;
      logger.info('Consumer started successfully', { queue: this.queueName });
    } catch (error) {
      logger.error('Failed to start consumer', {
        queue: this.queueName,
        error: (error as Error).message,
      });
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
      logger.info('Consumer stopped', { queue: this.queueName });
    } catch (error) {
      logger.error('Error stopping consumer', {
        queue: this.queueName,
        error: (error as Error).message,
      });
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
      logger.error('Failed to parse message', {
        queue: this.queueName,
        error: (error as Error).message,
      });
      this.channel!.nack(msg, false, false); // Don't requeue
      return;
    }

    try {
      logger.info('Processing message', {
        queue: this.queueName,
        jobId: job.id,
        jobType: job.type,
        retryCount: job.retry_count,
      });

      // Validate job structure
      this.validateJob(job);

      // Process the job
      await this.processJob(job);

      // Success - acknowledge message
      this.channel!.ack(msg);

      logger.info('Message processed successfully', {
        queue: this.queueName,
        jobId: job.id,
      });
    } catch (error) {
      const err = error as Error;

      logger.error('Error processing message', {
        queue: this.queueName,
        jobId: job?.id,
        error: err.message,
        stack: err.stack,
      });

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
      logger.error('Invalid message format - routing to DLQ', {
        queue: this.queueName,
        error: error.message,
      });
      this.channel!.nack(msg, false, false); // Don't requeue
      return;
    }

    // Check if this is a validation error (don't retry validation errors)
    if (error.message.includes('Invalid job:')) {
      logger.error('Job validation failed - routing to DLQ', {
        queue: this.queueName,
        jobId: job.id,
        error: error.message,
      });
      this.channel!.nack(msg, false, false); // Don't requeue
      this.onError(error, job);
      return;
    }

    // Check retry count
    if (job.retry_count < this.MAX_RETRIES) {
      // Increment retry count and requeue
      job.retry_count++;

      logger.warn('Requeuing message for retry', {
        queue: this.queueName,
        jobId: job.id,
        retryCount: job.retry_count,
        maxRetries: this.MAX_RETRIES,
      });

      // NACK with requeue
      this.channel!.nack(msg, false, true);
    } else {
      // Max retries exceeded - send to DLQ
      logger.error('Max retries exceeded - routing to DLQ', {
        queue: this.queueName,
        jobId: job.id,
        retryCount: job.retry_count,
        maxRetries: this.MAX_RETRIES,
      });

      // NACK without requeue (routes to DLQ via dead letter exchange)
      this.channel!.nack(msg, false, false);
    }

    // Call error handler for custom error handling
    this.onError(error, job);
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
      throw new Error('Invalid job: missing or invalid retry_count');
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
    logger.error('Job processing failed', {
      queue: this.queueName,
      jobId: job.id,
      error: error.message,
    });
  }

  /**
   * Check if consumer is currently consuming
   */
  isActive(): boolean {
    return this.isConsuming;
  }
}
