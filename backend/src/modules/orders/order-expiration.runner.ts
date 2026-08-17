import { logger } from '../../utils/logger';
import { expireEligibleOrders } from './order-expiration.service';
import { orderReservationConfig } from './order-reservation.config';

let timer: NodeJS.Timeout | null = null;
let running = false;
let stopping = false;
let activeRun: Promise<void> | null = null;
let stopPromise: Promise<void> | null = null;

function runExpirationBatch(): Promise<void> {
  if (running || stopping) return Promise.resolve();
  running = true;
  const currentRun = (async () => {
    try {
      const result = await expireEligibleOrders();
      if (result.expired > 0 || result.failed > 0) {
        logger.info(`Order expiration batch: selected=${result.selected} expired=${result.expired} failed=${result.failed}`);
      }
    } catch (error: unknown) {
      logger.error('Order expiration batch failed', error instanceof Error ? error.message : String(error));
    } finally {
      running = false;
      activeRun = null;
    }
  })();
  activeRun = currentRun;
  return currentRun;
}

export function startOrderExpirationRunner(): void {
  if (timer || stopping) return;
  timer = setInterval(() => { void runExpirationBatch(); }, orderReservationConfig.expirationIntervalSeconds * 1000);
  timer.unref();
  void runExpirationBatch();
}

export function stopOrderExpirationRunner(): Promise<void> {
  if (stopPromise) return stopPromise;
  stopping = true;
  stopPromise = (async () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (activeRun) await activeRun;
  })().finally(() => {
    stopping = false;
    stopPromise = null;
  });
  return stopPromise;
}
