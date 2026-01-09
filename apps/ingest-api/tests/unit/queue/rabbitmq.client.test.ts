import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { RabbitMQClient } from '../../../src/queue/rabbitmq.client.js';

describe('RabbitMQClient', () => {
  let client: RabbitMQClient;

  beforeAll(async () => {
    // Single shared client for all tests
    client = new RabbitMQClient();
    await client.connect();
  }, 20000);

  afterAll(async () => {
    if (client.isConnected()) {
      await client.disconnect();
    }
  });

  describe('connect()', () => {
    it('should be connected after initialization', () => {
      expect(client.isConnected()).toBe(true);
    });

    it('should not reconnect if already connected', async () => {
      const firstConnection = client.getConnection();
      await client.connect(); // Should not create new connection
      const secondConnection = client.getConnection();
      expect(firstConnection).toBe(secondConnection);
    });
  });

  describe('createChannelWrapper()', () => {
    it('should create a channel wrapper when connected', () => {
      const channel = client.createChannelWrapper();
      expect(channel).toBeDefined();
      expect(channel).toHaveProperty('sendToQueue');
    });
  });

  describe('isConnected()', () => {
    it('should return true when connected', () => {
      expect(client.isConnected()).toBe(true);
    });
  });

  describe('disconnect and reconnect', () => {
    it('should handle disconnect and reconnect', async () => {
      // Disconnect
      await client.disconnect();
      expect(client.isConnected()).toBe(false);

      // Reconnect
      await client.connect();
      expect(client.isConnected()).toBe(true);
    }, 15000);
  });
});

describe('RabbitMQClient - error cases', () => {
  it('should throw error when creating channel without connection', () => {
    const disconnectedClient = new RabbitMQClient();
    expect(() => disconnectedClient.createChannelWrapper()).toThrow('RabbitMQ not connected');
  });

  it('should handle disconnect when not connected', async () => {
    const disconnectedClient = new RabbitMQClient();
    await expect(disconnectedClient.disconnect()).resolves.not.toThrow();
  });

  it('should return false for isConnected when not connected', () => {
    const disconnectedClient = new RabbitMQClient();
    expect(disconnectedClient.isConnected()).toBe(false);
  });
});
