export const STATIC_DELAY_MIN_MS = 350;
export const STATIC_DELAY_MAX_MS = 1_100;
export const POLISH_DELAY_MIN_MS = 150;
export const POLISH_DELAY_MAX_MS = 500;

export interface ChatbotDelayProvider {
  random: () => number;
  setTimeout: typeof globalThis.setTimeout;
  clearTimeout: typeof globalThis.clearTimeout;
}

const productionProvider: ChatbotDelayProvider = {
  random: () => Math.random(),
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
};

export function boundedRandomDelay(min: number, max: number, random = Math.random): number {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));
  const sampled = random();
  const value = Number.isFinite(sampled) ? sampled : 0;
  return Math.min(upper, Math.max(lower, Math.floor(lower + Math.max(0, Math.min(1, value)) * (upper - lower + 1))));
}

export function staticReplyDelayMs(provider: Pick<ChatbotDelayProvider, 'random'> = productionProvider): number {
  return boundedRandomDelay(STATIC_DELAY_MIN_MS, STATIC_DELAY_MAX_MS, provider.random);
}

export function polishDelayMs(provider: Pick<ChatbotDelayProvider, 'random'> = productionProvider): number {
  return boundedRandomDelay(POLISH_DELAY_MIN_MS, POLISH_DELAY_MAX_MS, provider.random);
}

function abortError(): Error {
  const error = new Error('Chatbot delay aborted');
  error.name = 'AbortError';
  return error;
}

export function waitForChatbotDelay(milliseconds: number, signal: AbortSignal, provider: ChatbotDelayProvider = productionProvider): Promise<void> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      callback();
    };
    const timer = provider.setTimeout(() => finish(resolve), Math.max(0, milliseconds));
    const onAbort = () => {
      provider.clearTimeout(timer);
      finish(() => reject(abortError()));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export const chatbotDelayProvider = productionProvider;
