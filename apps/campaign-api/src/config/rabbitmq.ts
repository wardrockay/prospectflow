import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment file based on NODE_ENV
const envFile = `.env.${process.env.NODE_ENV ?? 'dev'}`;
dotenv.config({ path: path.resolve(__dirname, '../../env/', envFile) });

// Zod schema for RabbitMQ environment variables validation
const rabbitmqEnvSchema = z.object({
  RABBITMQ_HOST: z.string().default('localhost'),
  RABBITMQ_PORT: z.string().transform(Number).default('5672'),
  RABBITMQ_USER: z.string().default('admin'),
  RABBITMQ_PASS: z.string().default('changeme'),
  RABBITMQ_MANAGEMENT_PORT: z.string().transform(Number).default('15672'),
});

// Parse and validate RabbitMQ environment variables
const parsedRabbitMQEnv = rabbitmqEnvSchema.parse({
  RABBITMQ_HOST: process.env.RABBITMQ_HOST,
  RABBITMQ_PORT: process.env.RABBITMQ_PORT,
  RABBITMQ_USER: process.env.RABBITMQ_USER,
  RABBITMQ_PASS: process.env.RABBITMQ_PASS,
  RABBITMQ_MANAGEMENT_PORT: process.env.RABBITMQ_MANAGEMENT_PORT,
});

// Export typed RabbitMQ configuration
export const rabbitmqConfig = {
  connection: {
    protocol: 'amqp' as const,
    hostname: parsedRabbitMQEnv.RABBITMQ_HOST,
    port: parsedRabbitMQEnv.RABBITMQ_PORT,
    username: parsedRabbitMQEnv.RABBITMQ_USER,
    password: parsedRabbitMQEnv.RABBITMQ_PASS,
    vhost: '/',
    heartbeat: 60, // seconds
    connectionTimeout: 10000, // 10 seconds
  },
  managementPort: parsedRabbitMQEnv.RABBITMQ_MANAGEMENT_PORT,
};

// Connection URL for amqp-connection-manager
export const getRabbitMQUrl = (): string => {
  const { protocol, username, password, hostname, port, vhost } = rabbitmqConfig.connection;
  return `${protocol}://${username}:${password}@${hostname}:${port}${vhost}`;
};
