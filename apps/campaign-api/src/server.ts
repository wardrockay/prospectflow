import app from './app.js';
import { createChildLogger } from './utils/logger.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/auth.js';
import type { Server } from 'node:http';

const logger = createChildLogger('Server');

let server: Server;

/**
 * Initialize application services
 */
async function initialize() {
  try {
    logger.info('Initializing campaign-api services...');

    // Connect to Redis (session store)
    logger.info('Connecting to Redis...');
    await connectRedis();
    logger.info('✅ Redis connected');

    // Test database connection
    logger.info('Testing database connection...');
    if (pool) {
      const result = await pool.query('SELECT NOW()');
      logger.info({ currentTime: result.rows[0].now }, '✅ Database connected');
    } else {
      logger.warn('Database pool not available');
    }

    logger.info('🎉 Campaign API initialization complete');
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Failed to initialize campaign-api',
    );
    throw error;
  }
}

/**
 * Start HTTP server
 */
function startServer() {
  server = app.listen(env.port, () => {
    logger.info(
      {
        port: env.port,
        env: env.node_env,
        service: 'campaign-api',
      },
      '🚀 Campaign API server started',
    );
  });
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received');

  if (server) {
    logger.info('Closing HTTP server...');
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  try {
    logger.info('Closing database pool...');
    if (pool) {
      await pool.end();
      logger.info('Database pool closed');
    }

    logger.info('Disconnecting Redis...');
    await disconnectRedis();
    logger.info('Redis disconnected');

    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Error during shutdown');
    process.exit(1);
  }
}

/**
 * Main startup sequence
 */
async function main() {
  try {
    await initialize();
    startServer();
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Promise Rejection');
  process.exit(1);
});

// Start the server
main();
