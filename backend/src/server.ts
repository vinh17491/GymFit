import app from './app';
import { config } from './config/config';
import { closePool, getPool } from './config/database';
import { logger } from './utils/logger';
import {
  startOrderExpirationRunner,
  stopOrderExpirationRunner,
} from './modules/orders/order-expiration.runner';
import {
  startCoachOverdueRunner,
  stopCoachOverdueRunner,
} from './modules/coach-workspace/coach-overdue.runner';

const shutdownTimeoutMs = 10_000;
let httpServer: ReturnType<typeof app.listen> | null = null;
let shutdownStarted = false;

async function closeHttpServer(): Promise<void> {
  const server = httpServer;
  if (!server || !server.listening) {
    httpServer = null;
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(forceCloseTimer);
      httpServer = null;
      resolve();
    };

    const forceCloseTimer = setTimeout(() => {
      logger.warn('HTTP server close timed out; closing active connections');
      server.closeAllConnections();
      settle();
    }, shutdownTimeoutMs);
    forceCloseTimer.unref();

    server.close((error?: Error) => {
      if (error) logger.warn('HTTP server close returned an error', { error });
      settle();
    });
  });
}

async function shutdown(signal: string): Promise<void> {
  if (shutdownStarted) {
    logger.warn('Shutdown already in progress', { signal });
    return;
  }

  shutdownStarted = true;
  logger.info('Graceful shutdown started', { signal });

  try {
    const runnerStops = await Promise.allSettled([
      stopOrderExpirationRunner(),
      stopCoachOverdueRunner(),
    ]);
    for (const result of runnerStops) {
      if (result.status === 'rejected') logger.error('Background runner shutdown failed', { error: result.reason });
    }
    await closeHttpServer();
    await closePool();
    logger.info('Graceful shutdown complete');
  } catch (error: unknown) {
    logger.error('Graceful shutdown failed', { error });
    process.exitCode = 1;
  }
}

function handleFatalError(signal: string, error: unknown): void {
  process.exitCode = 1;
  logger.error(signal, { error });
  void shutdown(signal);
}

process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

// Fatal process errors must not leave the application running in an unknown state.
process.on('uncaughtException', (err) => {
  handleFatalError('UNCAUGHT_EXCEPTION', err);
});
process.on('unhandledRejection', (reason) => {
  handleFatalError('UNHANDLED_REJECTION', reason);
});

async function start() {
  try { await getPool(); logger.info('Database connected'); }
  catch (err) { logger.warn('DB unavailable - server starts anyway', { error: err }); }

  if (process.env.DISABLE_BACKGROUND_RUNNERS !== '1') {
    startOrderExpirationRunner();
    startCoachOverdueRunner();
  }

  const server = app.listen(config.port, () => {
    logger.info(`GymFit API on :${config.port} [${config.nodeEnv}]`);
    console.log(`🚀 http://localhost:${config.port}`);
  });
  httpServer = server;
  server.on('error', (error) => {
    handleFatalError('HTTP_SERVER_ERROR', error);
  });
}

start().catch(err => { handleFatalError('STARTUP_FAILURE', err); });
