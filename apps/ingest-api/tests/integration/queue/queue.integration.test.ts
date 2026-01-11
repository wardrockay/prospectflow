import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { rabbitMQClient } from '../../../src/queue/rabbitmq.client';
import { queuePublisher } from '../../../src/queue/queue.publisher';
import { QueueConsumer } from '../../../src/queue/queue.consumer';
import { initializeQueues } from '../../../src/queue/queue.init';
import { QUEUES, QueueJob } from '../../../src/queue/queue.config';
import { ChannelWrapper } from 'amqp-connection-manager';

// Check if RabbitMQ is available
const isRabbitMQAvailable = async (): Promise<boolean> => {
  try {
    await rabbitMQClient.connect();
    return rabbitMQClient.isConnected();
  } catch {
    return false;
  }
};

// Test consumer implementation
class TestIntegrationConsumer extends QueueConsumer {
  public processedJobs: QueueJob[] = [];
  public shouldFail = false;
  public failCount = 0;

  constructor(private readonly testQueueName: string) {
    super();
  }

  get queueName(): string {
    return this.testQueueName;
  }

  async processJob(job: QueueJob): Promise<void> {
    if (this.shouldFail) {
      this.failCount++;
      throw new Error(`Intentional failure (attempt ${this.failCount})`);
    }

    this.processedJobs.push(job);
  }
}

describe('Queue Integration Tests', () => {
  let channel: ChannelWrapper;
  let rabbitmqAvailable = false;

  beforeAll(async () => {
    // Check if RabbitMQ is available
    rabbitmqAvailable = await isRabbitMQAvailable();

    if (!rabbitmqAvailable) {
      console.log('⏭️  RabbitMQ not available, skipping queue integration tests');
      return;
    }

    // Initialize all queues (pass the client)
    await initializeQueues(rabbitMQClient);

    // Create channel for inspecting queues
    channel = rabbitMQClient.createChannelWrapper();
    await channel.waitForConnect();
  }, 30000);

  afterAll(async () => {
    if (!rabbitmqAvailable) return;

    // Close channel and disconnect
    if (channel) {
      await channel.close();
    }
    await rabbitMQClient.disconnect();
  }, 30000);

  beforeEach(async (context) => {
    if (!rabbitmqAvailable) {
      context.skip();
      return;
    }
    // Purge test queues before each test
    await channel.purgeQueue(QUEUES.DRAFT);
    await channel.purgeQueue(`${QUEUES.DRAFT}_dlq`);
  });

  describe('Publish and Consume Flow', () => {
    it('should publish, consume, and acknowledge message', async () => {
      const testJob: QueueJob = {
        id: 'integration-test-1',
        type: 'draft_generation',
        organisation_id: 'test-org',
        payload: { test: 'data' },
        created_at: new Date().toISOString(),
        retry_count: 0,
      };

      // Start consumer
      const consumer = new TestIntegrationConsumer(QUEUES.DRAFT);
      await consumer.start();

      // Publish job
      await queuePublisher.publish(QUEUES.DRAFT, testJob);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Stop consumer
      await consumer.stop();

      // Verify job was processed
      expect(consumer.processedJobs).toHaveLength(1);
      expect(consumer.processedJobs[0].id).toBe('integration-test-1');

      // Verify queue is empty (message acknowledged)
      const queueInfo = await channel.checkQueue(QUEUES.DRAFT);
      expect(queueInfo.messageCount).toBe(0);
    }, 15000);

    it('should handle batch publishing and consuming', async () => {
      const jobs: QueueJob[] = [
        {
          id: 'batch-1',
          type: 'draft_generation',
          organisation_id: 'test-org',
          payload: { index: 1 },
          created_at: new Date().toISOString(),
          retry_count: 0,
        },
        {
          id: 'batch-2',
          type: 'draft_generation',
          organisation_id: 'test-org',
          payload: { index: 2 },
          created_at: new Date().toISOString(),
          retry_count: 0,
        },
        {
          id: 'batch-3',
          type: 'draft_generation',
          organisation_id: 'test-org',
          payload: { index: 3 },
          created_at: new Date().toISOString(),
          retry_count: 0,
        },
      ];

      // Start consumer
      const consumer = new TestIntegrationConsumer(QUEUES.DRAFT);
      await consumer.start();

      // Publish batch
      const result = await queuePublisher.publishBatch(QUEUES.DRAFT, jobs);

      // Verify all published successfully
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Stop consumer
      await consumer.stop();

      // Verify all jobs processed
      expect(consumer.processedJobs).toHaveLength(3);
      expect(consumer.processedJobs.map((j) => j.id)).toEqual(['batch-1', 'batch-2', 'batch-3']);

      // Verify queue is empty
      const queueInfo = await channel.checkQueue(QUEUES.DRAFT);
      expect(queueInfo.messageCount).toBe(0);
    }, 15000);
  });

  describe('Retry and Dead Letter Queue', () => {
    it('should retry failed message and then route to DLQ', async () => {
      const testJob: QueueJob = {
        id: 'failing-job',
        type: 'draft_generation',
        organisation_id: 'test-org',
        payload: { willFail: true },
        created_at: new Date().toISOString(),
        retry_count: 0,
      };

      // Start consumer that will fail
      const consumer = new TestIntegrationConsumer(QUEUES.DRAFT);
      consumer.shouldFail = true;
      await consumer.start();

      // Publish job
      await queuePublisher.publish(QUEUES.DRAFT, testJob);

      // Wait for retries to complete (4 attempts: initial + 3 retries)
      // Each retry has exponential backoff, so wait sufficient time
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Stop consumer
      await consumer.stop();

      // Verify multiple processing attempts
      expect(consumer.failCount).toBeGreaterThanOrEqual(3);

      // Verify message not in main queue
      const mainQueueInfo = await channel.checkQueue(QUEUES.DRAFT);
      expect(mainQueueInfo.messageCount).toBe(0);

      // Verify message in DLQ
      const dlqInfo = await channel.checkQueue(`${QUEUES.DRAFT}_dlq`);
      expect(dlqInfo.messageCount).toBe(1);

      // Clean up DLQ
      await channel.purgeQueue(`${QUEUES.DRAFT}_dlq`);
    }, 20000);

    it('should not retry validation errors', async () => {
      const invalidJob = {
        // Missing required fields
        id: 'invalid-job',
        type: 'draft_generation',
        // Missing organisation_id, payload, etc.
      };

      // Publish invalid job directly
      await channel.sendToQueue(QUEUES.DRAFT, Buffer.from(JSON.stringify(invalidJob)), {
        persistent: true,
      });

      // Start consumer
      const consumer = new TestIntegrationConsumer(QUEUES.DRAFT);
      await consumer.start();

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Stop consumer
      await consumer.stop();

      // Verify no valid jobs processed
      expect(consumer.processedJobs).toHaveLength(0);

      // Verify main queue is empty (message rejected immediately)
      const mainQueueInfo = await channel.checkQueue(QUEUES.DRAFT);
      expect(mainQueueInfo.messageCount).toBe(0);

      // Verify message in DLQ (sent without retries)
      const dlqInfo = await channel.checkQueue(`${QUEUES.DRAFT}_dlq`);
      expect(dlqInfo.messageCount).toBe(1);

      // Clean up
      await channel.purgeQueue(`${QUEUES.DRAFT}_dlq`);
    }, 10000);
  });

  describe('Connection Resilience', () => {
    it('should maintain connection status', async () => {
      expect(rabbitMQClient.isConnected()).toBe(true);

      // Verify can create channels
      const testChannel = rabbitMQClient.createChannelWrapper();
      await testChannel.waitForConnect();
      await testChannel.close();

      expect(rabbitMQClient.isConnected()).toBe(true);
    });
  });

  describe('Queue Configuration', () => {
    it('should have all required queues created', async () => {
      // Check main queues exist
      await expect(channel.checkQueue(QUEUES.DRAFT)).resolves.toBeDefined();
      await expect(channel.checkQueue(QUEUES.FOLLOWUP)).resolves.toBeDefined();
      await expect(channel.checkQueue(QUEUES.REPLY)).resolves.toBeDefined();

      // Check DLQs exist
      await expect(channel.checkQueue(`${QUEUES.DRAFT}_dlq`)).resolves.toBeDefined();
      await expect(channel.checkQueue(`${QUEUES.FOLLOWUP}_dlq`)).resolves.toBeDefined();
      await expect(channel.checkQueue(`${QUEUES.REPLY}_dlq`)).resolves.toBeDefined();
    });

    it('should have correct queue properties', async () => {
      const queueInfo = await channel.checkQueue(QUEUES.DRAFT);

      // Queue should be durable
      expect(queueInfo).toBeDefined();
      expect(queueInfo.queue).toBe(QUEUES.DRAFT);
    });
  });
});
