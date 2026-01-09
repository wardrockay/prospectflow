import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { EventEmitter } from 'node:events';
import { logger } from '../utils/logger.js';
import { getRabbitMQUrl } from '../config/rabbitmq.js';

/**
 * RabbitMQ Client - Connection Manager
 *
 * Manages connection to RabbitMQ with automatic reconnection,
 * channel pooling, and graceful shutdown.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection health monitoring
 * - Event-driven architecture
 * - Channel factory for publishers/consumers
 */
export class RabbitMQClient extends EventEmitter {
  private connection: amqp.AmqpConnectionManager | null = null;
  private connected: boolean = false;
  private connecting: boolean = false;

  /**
   * Connect to RabbitMQ server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      logger.info('RabbitMQ already connected');
      return;
    }

    if (this.connecting) {
      logger.info('RabbitMQ connection in progress, waiting...');
      // Wait for existing connection attempt
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection wait timeout')), 15000);
        this.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });
        this.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      return;
    }

    this.connecting = true;

    try {
      const url = getRabbitMQUrl();
      logger.info('Connecting to RabbitMQ...');

      // Create connection with automatic reconnection
      this.connection = amqp.connect([url], {
        heartbeatIntervalInSeconds: 60,
        reconnectTimeInSeconds: 2,
        connectionOptions: {
          // Add connection timeout
          timeout: 10000,
        },
      });

      // Connection event handlers
      this.connection.on('connect', () => {
        this.connected = true;
        this.connecting = false;
        logger.info('RabbitMQ connected successfully');
        this.emit('connected');
      });

      this.connection.on('disconnect', ({ err }) => {
        this.connected = false;
        if (err) {
          logger.error({ err }, 'RabbitMQ disconnected with error');
        } else {
          logger.warn('RabbitMQ disconnected');
        }
        this.emit('disconnected', err);
      });

      this.connection.on('connectFailed', ({ err }) => {
        this.connecting = false;
        logger.error({ err }, 'RabbitMQ connection failed');
        this.emit('error', err);
      });

      // Wait for initial connection with extended timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.connecting = false;
          reject(new Error('RabbitMQ connection timeout after 15s'));
        }, 15000);

        this.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.once('error', (err) => {
          clearTimeout(timeout);
          this.connecting = false;
          reject(err);
        });
      });
    } catch (error) {
      this.connecting = false;
      this.connected = false;
      logger.error({ error }, 'Failed to connect to RabbitMQ');
      throw error;
    }
  }

  /**
   * Disconnect from RabbitMQ server
   */
  async disconnect(): Promise<void> {
    if (!this.connection) {
      logger.info('No RabbitMQ connection to close');
      return;
    }

    try {
      logger.info('Closing RabbitMQ connection...');
      await this.connection.close();
      this.connection = null;
      this.connected = false;
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error({ error }, 'Error closing RabbitMQ connection');
      throw error;
    }
  }

  /**
   * Create a channel wrapper for publishing/consuming messages
   */
  createChannelWrapper(): ChannelWrapper {
    if (!this.connection) {
      throw new Error('RabbitMQ not connected. Call connect() first.');
    }

    return this.connection.createChannel({
      // Enable publisher confirms automatically handled by connection manager
      confirm: true,
      setup: async (channel: ConfirmChannel) => {
        logger.debug('Channel created with publisher confirms enabled');
      },
    });
  }

  /**
   * Check if RabbitMQ is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get connection instance (for advanced use cases)
   */
  getConnection(): amqp.AmqpConnectionManager | null {
    return this.connection;
  }
}

// Singleton instance
export const rabbitMQClient = new RabbitMQClient();
