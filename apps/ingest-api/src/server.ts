import app from './app.js';
import { logger } from './utils/logger.js';
import { env } from './config/env.js';
import { rabbitMQClient } from './queue/rabbitmq.client.js';
import { initializeQueues } from './queue/queue.init.js';
import { pool } from './config/database.js';
import type { Server } from 'node:http';

let server: Server;

/**
 * Initialize application services
 */
async function initialize() {
  try {
    logger.info('Initializing application services...');

    // Connect to RabbitMQ
    logger.info('Connecting to RabbitMQ...');
    await rabbitMQClient.connect();
    logger.info('✅ RabbitMQ connected');

    // Initialize queues
    logger.info('Initializing queues...');
    await initializeQueues(rabbitMQClient);
    logger.info('✅ Queues initialized');

    logger.info('🎉 Application initialization complete');
  } catch (error) {
    logger.error('Failed to initialize application', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
}

/**
 * Start HTTP server
 */
function startServer() {
  server = app.listen(env.port, () => {
    logger.info(`🚀 Server running on http://localhost:${env.port}`);
    logger.info(`🟢 Environment: ${env.node_env}`);
  });
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  logger.info(`${signal} received, starting graceful shutdown`);

  try {
    // 1. Stop accepting new HTTP requests
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      logger.info('✅ HTTP server closed');
    }

    // 2. Close RabbitMQ connection
    await rabbitMQClient.disconnect();
    logger.info('✅ RabbitMQ connection closed');

    // 3. Close database pool
    await pool.end();
    logger.info('✅ Database pool closed');

    logger.info('🎉 Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason,
  });
  shutdown('unhandledRejection');
});

// Start application
(async () => {
  try {
    await initialize();
    startServer();
  } catch (error) {
    logger.error('Failed to start application', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
})();
