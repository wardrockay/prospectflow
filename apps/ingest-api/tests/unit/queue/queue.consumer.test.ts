import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { QueueConsumer } from '../../../src/queue/queue.consumer';
import { rabbitMQClient } from '../../../src/queue/rabbitmq.client';
import { QueueJob } from '../../../src/queue/queue.config';
import { ConsumeMessage } from 'amqplib';

// Mock the RabbitMQ client
vi.mock('../../../src/queue/rabbitmq.client', () => ({
  rabbitMQClient: {
    createChannelWrapper: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Test implementation of QueueConsumer
class TestConsumer extends QueueConsumer {
  public processJobMock: Mock;

  constructor() {
    super();
    this.processJobMock = vi.fn().mockResolvedValue(undefined);
  }

  get queueName(): string {
    return 'test_queue';
  }

  async processJob(job: QueueJob): Promise<void> {
    return this.processJobMock(job);
  }
}

describe('QueueConsumer', () => {
  let consumer: TestConsumer;
  let mockChannel: any;
  let mockConsume: Mock;
  let mockAck: Mock;
  let mockNack: Mock;
  let mockPrefetch: Mock;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock channel methods
    mockConsume = vi.fn();
    mockAck = vi.fn();
    mockNack = vi.fn();
    mockPrefetch = vi.fn().mockResolvedValue(undefined);

    // Create mock channel
    mockChannel = {
      consume: mockConsume,
      ack: mockAck,
      nack: mockNack,
      prefetch: mockPrefetch,
      sendToQueue: vi.fn().mockResolvedValue(true), // Required for retry mechanism
      addSetup: vi.fn().mockImplementation(async (setupFn) => {
        // Execute setup function with mock channel that has prefetch
        await setupFn({ prefetch: mockPrefetch });
      }),
      waitForConnect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Mock createChannelWrapper to return our mock channel
    (rabbitMQClient.createChannelWrapper as Mock).mockReturnValue(mockChannel);

    // Create fresh consumer instance
    consumer = new TestConsumer();
  });

  afterEach(async () => {
    await consumer.stop();
  });

  describe('start()', () => {
    it('should start consuming from queue', async () => {
      await consumer.start();

      expect(mockPrefetch).toHaveBeenCalledWith(1);
      expect(mockConsume).toHaveBeenCalledWith('test_queue', expect.any(Function), {
        noAck: false,
      });
      expect(consumer.isActive()).toBe(true);
    });

    it('should not start if already consuming', async () => {
      await consumer.start();
      const firstCallCount = mockConsume.mock.calls.length;

      await consumer.start();
      const secondCallCount = mockConsume.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should set prefetch count to 1', async () => {
      await consumer.start();

      expect(mockPrefetch).toHaveBeenCalledWith(1);
    });
  });

  describe('stop()', () => {
    it('should stop consuming and close channel', async () => {
      await consumer.start();
      await consumer.stop();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(consumer.isActive()).toBe(false);
    });

    it('should handle stop when not consuming', async () => {
      await expect(consumer.stop()).resolves.not.toThrow();
    });
  });

  describe('message handling', () => {
    let messageHandler: (msg: ConsumeMessage | null) => Promise<void>;
    let testJob: QueueJob;

    beforeEach(async () => {
      testJob = {
        id: 'test-job-123',
        type: 'draft_generation',
        organisation_id: 'org-456',
        payload: { test: true },
        created_at: new Date().toISOString(),
        retry_count: 0,
      };

      await consumer.start();

      // Extract the message handler passed to consume()
      messageHandler = mockConsume.mock.calls[0][1];
    });

    it('should process message and acknowledge on success', async () => {
      const mockMessage = {
        content: Buffer.from(JSON.stringify(testJob)),
      } as ConsumeMessage;

      await messageHandler(mockMessage);

      expect(consumer.processJobMock).toHaveBeenCalledWith(testJob);
      expect(mockAck).toHaveBeenCalledWith(mockMessage);
      expect(mockNack).not.toHaveBeenCalled();
    });

    it('should handle null message gracefully', async () => {
      await messageHandler(null);

      expect(consumer.processJobMock).not.toHaveBeenCalled();
      expect(mockAck).not.toHaveBeenCalled();
    });

    it('should requeue message on processing failure when retries remain', async () => {
      consumer.processJobMock.mockRejectedValueOnce(new Error('Processing failed'));

      const mockMessage = {
        content: Buffer.from(JSON.stringify(testJob)),
      } as ConsumeMessage;

      await messageHandler(mockMessage);

      // Implementation ACKs original and republishes with incremented retry_count
      expect(mockAck).toHaveBeenCalledWith(mockMessage);
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith('test_queue', expect.any(Buffer), {
        persistent: true,
      });
    });

    it('should route to DLQ after max retries', async () => {
      const jobWithMaxRetries = {
        ...testJob,
        retry_count: 3, // Max retries reached
      };

      consumer.processJobMock.mockRejectedValueOnce(new Error('Processing failed'));

      const mockMessage = {
        content: Buffer.from(JSON.stringify(jobWithMaxRetries)),
      } as ConsumeMessage;

      await messageHandler(mockMessage);

      expect(mockNack).toHaveBeenCalledWith(mockMessage, false, false); // requeue = false (DLQ)
      expect(mockAck).not.toHaveBeenCalled();
    });

    it('should route invalid message to DLQ immediately', async () => {
      const invalidMessage = {
        content: Buffer.from('not valid json'),
      } as ConsumeMessage;

      await messageHandler(invalidMessage);

      expect(mockNack).toHaveBeenCalledWith(invalidMessage, false, false); // DLQ
      expect(consumer.processJobMock).not.toHaveBeenCalled();
    });

    it('should validate job structure', async () => {
      const invalidJob = {
        id: 'test-123',
        // Missing required fields
      };

      const mockMessage = {
        content: Buffer.from(JSON.stringify(invalidJob)),
      } as ConsumeMessage;

      await messageHandler(mockMessage);

      expect(mockNack).toHaveBeenCalledWith(mockMessage, false, false); // DLQ
      expect(consumer.processJobMock).not.toHaveBeenCalled();
    });
  });

  describe('job validation', () => {
    let messageHandler: (msg: ConsumeMessage | null) => Promise<void>;

    beforeEach(async () => {
      await consumer.start();
      messageHandler = mockConsume.mock.calls[0][1];
    });

    const testInvalidJob = async (invalidJob: any, description: string) => {
      const mockMessage = {
        content: Buffer.from(JSON.stringify(invalidJob)),
      } as ConsumeMessage;

      await messageHandler(mockMessage);

      expect(mockNack).toHaveBeenCalledWith(mockMessage, false, false);
      expect(consumer.processJobMock).not.toHaveBeenCalled();
    };

    it('should reject job without id', async () => {
      await testInvalidJob(
        {
          type: 'test',
          organisation_id: 'org',
          payload: {},
          created_at: new Date().toISOString(),
          retry_count: 0,
        },
        'missing id',
      );
    });

    it('should reject job without type', async () => {
      await testInvalidJob(
        {
          id: 'test-123',
          organisation_id: 'org',
          payload: {},
          created_at: new Date().toISOString(),
          retry_count: 0,
        },
        'missing type',
      );
    });

    it('should reject job without organisation_id', async () => {
      await testInvalidJob(
        {
          id: 'test-123',
          type: 'test',
          payload: {},
          created_at: new Date().toISOString(),
          retry_count: 0,
        },
        'missing organisation_id',
      );
    });

    it('should reject job without payload', async () => {
      await testInvalidJob(
        {
          id: 'test-123',
          type: 'test',
          organisation_id: 'org',
          created_at: new Date().toISOString(),
          retry_count: 0,
        },
        'missing payload',
      );
    });
  });
});
