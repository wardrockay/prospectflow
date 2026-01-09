import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RabbitMQClient } from '../../../src/queue/rabbitmq.client.js';
import { initializeQueues } from '../../../src/queue/queue.init.js';

describe('Queue Initialization', () => {
  let client: RabbitMQClient;

  beforeAll(async () => {
    client = new RabbitMQClient();
    await client.connect();
  }, 20000);

  afterAll(async () => {
    if (client.isConnected()) {
      await client.disconnect();
    }
  });

  it('should initialize all queues and exchanges without errors', async () => {
    // This test verifies that initializeQueues completes successfully
    // It creates all queues, DLQs, exchanges, and bindings
    await expect(initializeQueues(client)).resolves.not.toThrow();
  }, 10000);
});
