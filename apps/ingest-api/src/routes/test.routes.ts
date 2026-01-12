import { Router } from 'express';

const router = Router();

if (process.env.NODE_ENV !== 'production') {
  router.get('/error', (_req, _res) => {
    throw new Error('Test error for Sentry');
  });

  router.get('/async-error', async (_req, _res) => {
    await Promise.reject(new Error('Test async error for Sentry'));
  });
}

export default router;
