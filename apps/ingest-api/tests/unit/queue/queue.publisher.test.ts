import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { QueuePublisher } from '../../../src/queue/queue.publisher';
import { rabbitMQClient } from '../../../src/queue/rabbitmq.client';
import { QueueJob } from '../../../src/queue/queue.config';

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
  },
}));

describe('QueuePublisher', () => {
  let publisher: QueuePublisher;
  let mockChannel: any;
  let mockSendToQueue: Mock;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock channel
    mockSendToQueue = vi.fn().mockResolvedValue(true);
    mockChannel = {
      sendToQueue: mockSendToQueue,
      waitForConnect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Mock createChannelWrapper to return our mock channel
    (rabbitMQClient.createChannelWrapper as Mock).mockReturnValue(mockChannel);

    // Create fresh publisher instance
    publisher = new QueuePublisher();
  });

  afterEach(async () => {
    await publisher.close();
  });

  describe('publish()', () => {
    const testJob: QueueJob = {
      id: 'test-job-123',
      type: 'draft_generation',
      organisation_id: 'org-456',
      payload: { test: true },
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    it('should publish message successfully with default options', async () => {
      const result = await publisher.publish('test_queue', testJob);

      expect(result).toBe(true);
      expect(mockSendToQueue).toHaveBeenCalledTimes(1);
      expect(mockSendToQueue).toHaveBeenCalledWith(
        'test_queue',
        expect.any(Buffer),
        expect.objectContaining({
          persistent: true,
          priority: 0,
        }),
      );

      // Verify job was serialized correctly
      const sentBuffer = mockSendToQueue.mock.calls[0][1];
      const sentJob = JSON.parse(sentBuffer.toString());
      expect(sentJob).toEqual(testJob);
    });

    it('should publish message with custom options', async () => {
      const options = {
        persistent: false,
        priority: 5,
        expiration: '3600000',
        headers: { 'x-custom': 'value' },
      };

      await publisher.publish('test_queue', testJob, options);

      expect(mockSendToQueue).toHaveBeenCalledWith(
        'test_queue',
        expect.any(Buffer),
        expect.objectContaining({
          persistent: false,
          priority: 5,
          expiration: '3600000',
          headers: { 'x-custom': 'value' },
        }),
      );
    });

    it('should receive publish confirmation', async () => {
      mockSendToQueue.mockResolvedValue(true);

      const result = await publisher.publish('test_queue', testJob);

      expect(result).toBe(true);
    });

    it('should handle publish timeout and retry', async () => {
      // First attempt times out, second succeeds
      mockSendToQueue
        .mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 10000)))
        .mockResolvedValueOnce(true);

      const result = await publisher.publish('test_queue', testJob);

      expect(result).toBe(true);
      expect(mockSendToQueue).toHaveBeenCalledTimes(2);
    }, 10000); // 10 second timeout for this test

    it('should throw error after max retries on timeout', async () => {
      // Both attempts timeout
      mockSendToQueue.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)),
      );

      await expect(publisher.publish('test_queue', testJob)).rejects.toThrow(
        /Failed to publish message.*after 2 attempts/,
      );

      expect(mockSendToQueue).toHaveBeenCalledTimes(2);
    }, 15000); // 15 second timeout for this test

    it('should retry failed publish once', async () => {
      // First attempt fails, second succeeds
      mockSendToQueue.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce(true);

      const result = await publisher.publish('test_queue', testJob);

      expect(result).toBe(true);
      expect(mockSendToQueue).toHaveBeenCalledTimes(2);
    });

    it('should throw error if both publish attempts fail', async () => {
      mockSendToQueue.mockRejectedValue(new Error('Connection lost'));

      await expect(publisher.publish('test_queue', testJob)).rejects.toThrow(
        /Failed to publish message.*Connection lost/,
      );

      expect(mockSendToQueue).toHaveBeenCalledTimes(2);
    });
  });

  describe('publishBatch()', () => {
    const testJobs: QueueJob[] = [
      {
        id: 'job-1',
        type: 'draft_generation',
        organisation_id: 'org-456',
        payload: { index: 1 },
        created_at: new Date().toISOString(),
        retry_count: 0,
      },
      {
        id: 'job-2',
        type: 'draft_generation',
        organisation_id: 'org-456',
        payload: { index: 2 },
        created_at: new Date().toISOString(),
        retry_count: 0,
      },
      {
        id: 'job-3',
        type: 'draft_generation',
        organisation_id: 'org-456',
        payload: { index: 3 },
        created_at: new Date().toISOString(),
        retry_count: 0,
      },
    ];

    it('should publish all messages successfully', async () => {
      mockSendToQueue.mockResolvedValue(true);

      const result = await publisher.publishBatch('test_queue', testJobs);

      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockSendToQueue).toHaveBeenCalledTimes(3);
    });

    it('should handle partial batch failures', async () => {
      // First succeeds, second fails (with retries), third succeeds
      mockSendToQueue
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce(true);

      const result = await publisher.publishBatch('test_queue', testJobs);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].job.id).toBe('job-2');
      expect(result.errors[0].error.message).toContain('Failed to publish message');
    });

    it('should handle complete batch failure', async () => {
      mockSendToQueue.mockRejectedValue(new Error('All fail'));

      const result = await publisher.publishBatch('test_queue', testJobs);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(3);
      expect(result.errors).toHaveLength(3);
    });

    it('should return empty result for empty job array', async () => {
      const result = await publisher.publishBatch('test_queue', []);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockSendToQueue).not.toHaveBeenCalled();
    });
  });

  describe('close()', () => {
    it('should close the channel', async () => {
      // Force channel creation
      await publisher.publish('test_queue', {
        id: 'test',
        type: 'test',
        organisation_id: 'test',
        payload: {},
        created_at: new Date().toISOString(),
        retry_count: 0,
      });

      await publisher.close();

      expect(mockChannel.close).toHaveBeenCalledTimes(1);
    });

    it('should handle close when no channel exists', async () => {
      // Don't create channel, just close
      await expect(publisher.close()).resolves.not.toThrow();
    });
  });
});
