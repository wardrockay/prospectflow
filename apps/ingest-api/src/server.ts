import app from './app.js';
import { logger } from './utils/logger.js';
import { env } from './config/env.js';

logger.info(`🟢 Environment: ${env.node_env}`);

app.listen(env.port, () => {
  logger.info(`🚀 Server running on http://localhost:${env.port}`);
});
