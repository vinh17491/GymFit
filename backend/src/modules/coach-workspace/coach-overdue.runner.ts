import { logger } from '../../utils/logger';
import { reconcileOverdueSchedules } from './coach-overdue.service';

const positiveSafeInteger = (value: string | undefined, fallback: number, max: number): number => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
};

const batchSize = positiveSafeInteger(process.env.COACH_OVERDUE_BATCH_SIZE, 100, 1000);
const intervalSeconds = positiveSafeInteger(process.env.COACH_OVERDUE_INTERVAL_SECONDS, 60, 86400);
let timer: NodeJS.Timeout | null = null;
let running = false;

async function runOverdueBatch(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const result = await reconcileOverdueSchedules(batchSize);
    if (result.skipped > 0) logger.info(`Coach overdue schedule batch: selected=${result.selected} skipped=${result.skipped}`);
  } catch (error: unknown) {
    logger.error('Coach overdue schedule batch failed', error instanceof Error ? error.message : String(error));
  } finally {
    running = false;
  }
}

export function startCoachOverdueRunner(): void {
  if (timer) return;
  timer = setInterval(() => { void runOverdueBatch(); }, intervalSeconds * 1000);
  timer.unref();
  void runOverdueBatch();
}

export function stopCoachOverdueRunner(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
