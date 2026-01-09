import { ChannelWrapper } from 'amqp-connection-manager';
import { rabbitMQClient } from './rabbitmq.client.js';
import { QueueJob } from './queue.config.js';
import { logger } from '../utils/logger.js';

export interface PublishOptions {
  persistent?: boolean; // default: true
  priority?: number; // 0-10, default: 0
  expiration?: string; // message TTL in ms
  headers?: Record<string, any>;
}

export interface BatchResult {
  successful: number;
  failed: number;
  errors: Array<{ job: QueueJob; error: Error }>;
}

/**
 * RabbitMQ message publisher with confirmation and retry logic
 */
export class QueuePublisher {
  private channel: ChannelWrapper | null = null;
  private readonly PUBLISH_TIMEOUT = 5000; // 5 seconds
  private readonly MAX_RETRIES = 1; // Retry once on timeout

  /**
   * Initialize channel wrapper for publishing
   */
  private async getChannel(): Promise<ChannelWrapper> {
    if (!this.channel) {
      this.channel = rabbitMQClient.createChannelWrapper();
      await this.channel.waitForConnect();
    }
    if (!this.channel) {
      throw new Error('Failed to create channel wrapper');
    }
    return this.channel;
  }

  /**
   * Publish a single job to a queue with confirmation
   *
   * @param queue - Target queue name
   * @param job - Job payload to publish
   * @param options - Publishing options (persistence, priority, etc.)
   * @returns Promise<boolean> - True if published successfully
   * @throws Error if both publish attempts fail
   */
  async publish(queue: string, job: QueueJob, options?: PublishOptions): Promise<boolean> {
    const publishOptions = {
      persistent: options?.persistent ?? true,
      priority: options?.priority ?? 0,
      expiration: options?.expiration,
      headers: options?.headers,
    };

    let lastError: Error | null = null;

    // Try publish with one retry
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const channel = await this.getChannel();

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`Publish timeout after ${this.PUBLISH_TIMEOUT}ms`)),
            this.PUBLISH_TIMEOUT,
          );
        });

        // Publish with confirmation
        const publishPromise = channel.sendToQueue(
          queue,
          Buffer.from(JSON.stringify(job)),
          publishOptions,
        );

        // Race between publish and timeout
        await Promise.race([publishPromise, timeoutPromise]);

        logger.info(
          {
            queue,
            jobId: job.id,
            attempt: attempt + 1,
          },
          'Message published successfully',
        );

        return true;
      } catch (error) {
        lastError = error as Error;

        logger.warn(
          {
            queue,
            jobId: job.id,
            attempt: attempt + 1,
            maxRetries: this.MAX_RETRIES + 1,
            error: (error as Error).message,
          },
          'Publish attempt failed',
        );

        // Don't retry if this was the last attempt
        if (attempt >= this.MAX_RETRIES) {
          break;
        }

        // Small delay before retry
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Both attempts failed
    logger.error(
      {
        queue,
        jobId: job.id,
        error: lastError?.message,
      },
      'Failed to publish message after retries',
    );

    throw new Error(
      `Failed to publish message to queue ${queue} after ${this.MAX_RETRIES + 1} attempts: ${
        lastError?.message
      }`,
    );
  }

  /**
   * Publish multiple jobs to a queue in batch
   *
   * @param queue - Target queue name
   * @param jobs - Array of jobs to publish
   * @returns BatchResult with success/failure counts
   */
  async publishBatch(queue: string, jobs: QueueJob[]): Promise<BatchResult> {
    const result: BatchResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    logger.info(
      {
        queue,
        totalJobs: jobs.length,
      },
      'Starting batch publish',
    );

    for (const job of jobs) {
      try {
        await this.publish(queue, job);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          job,
          error: error as Error,
        });
      }
    }

    logger.info(
      {
        queue,
        successful: result.successful,
        failed: result.failed,
        total: jobs.length,
      },
      'Batch publish completed',
    );

    return result;
  }

  /**
   * Close the publisher channel
   */
  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
  }
}

// Export singleton instance
export const queuePublisher = new QueuePublisher();
