import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RabbitMQClient } from '../../../src/queue/rabbitmq.client.js';
import { initializeQueues } from '../../../src/queue/queue.init.js';

describe('Queue Initialization', () => {
  let client: RabbitMQClient;
  let isRabbitMQAvailable = false;

  beforeAll(async () => {
    client = new RabbitMQClient();
    try {
      await client.connect();
      isRabbitMQAvailable = true;
    } catch (error) {
      console.log('⏭️  RabbitMQ not available, skipping queue initialization tests');
      isRabbitMQAvailable = false;
    }
  }, 20000);

  afterAll(async () => {
    if (client.isConnected()) {
      await client.disconnect();
    }
  });

  it('should initialize all queues and exchanges without errors', async () => {
    if (!isRabbitMQAvailable) return; // Skip if RabbitMQ not available
    // This test verifies that initializeQueues completes successfully
    // It creates all queues, DLQs, exchanges, and bindings
    await expect(initializeQueues(client)).resolves.not.toThrow();
  }, 10000);
});
