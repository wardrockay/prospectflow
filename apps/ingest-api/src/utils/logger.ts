// src/utils/logger.ts
import { env } from '../config/env.js';
import { pino } from 'pino';


export const logger = pino({
  level: env.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});
