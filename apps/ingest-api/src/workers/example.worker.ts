import { QueueConsumer } from '../queue/queue.consumer';
import { QueueJob } from '../queue/queue.config';
import { logger } from '../utils/logger';

/**
 * Example worker implementation for testing queue functionality
 * Demonstrates how to extend QueueConsumer base class
 */
export class ExampleWorker extends QueueConsumer {
  /**
   * Queue to consume from
   */
  get queueName(): string {
    return 'draft_queue';
  }

  /**
   * Process a single job from the queue
   * @param job - The job to process
   */
  async processJob(job: QueueJob): Promise<void> {
    logger.info('Example worker processing job', {
      jobId: job.id,
      jobType: job.type,
      organisationId: job.organisation_id,
      payload: job.payload,
    });

    // Simulate some processing work
    await this.simulateWork(1000);

    logger.info('Example worker completed job', {
      jobId: job.id,
      processingTime: '1000ms',
    });
  }

  /**
   * Simulate async work with a delay
   */
  private async simulateWork(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  /**
   * Custom error handler
   */
  protected onError(error: Error, job: QueueJob): void {
    logger.error('Example worker error handler', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
    });

    // Add custom error handling logic here
    // e.g., send alerts, update database, etc.
  }
}

// Allow running worker directly from command line (ESM)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const worker = new ExampleWorker();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down worker...`);

    try {
      await worker.stop();
      logger.info('Worker shut down successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: (error as Error).message });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start the worker
  worker
    .start()
    .then(() => {
      logger.info('Example worker started successfully');
    })
    .catch((error) => {
      logger.error('Failed to start worker', { error: error.message });
      process.exit(1);
    });
}
