import app from './app';
import { config } from './config/config';
import { getPool } from './config/database';
import { logger } from './utils/logger';
import { startOrderExpirationRunner } from './modules/orders/order-expiration.runner';
import { startCoachOverdueRunner } from './modules/coach-workspace/coach-overdue.runner';

// Global handlers to capture silent crashes
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT_EXCEPTION:', err);
  console.error('UNCAUGHT_EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED_REJECTION:', reason);
  console.error('UNHANDLED_REJECTION:', reason);
});

async function start() {
  try { await getPool(); logger.info('Database connected'); }
  catch (err) { logger.warn('DB unavailable - server starts anyway:', (err as Error).message); }

  if (process.env.DISABLE_BACKGROUND_RUNNERS !== '1') {
    startOrderExpirationRunner();
    startCoachOverdueRunner();
  }

  app.listen(config.port, () => {
    logger.info(`Gymer API on :${config.port} [${config.nodeEnv}]`);
    console.log(`🚀 http://localhost:${config.port}`);
  });
}

start().catch(err => { logger.error('Startup failed:', err); process.exit(1); });
