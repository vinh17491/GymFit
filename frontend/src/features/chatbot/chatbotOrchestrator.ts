import {
  AI_INTERACTIVE_TIMEOUT_MS,
  AIProvider,
  AI_RETRY_COOLDOWN_MS,
  LocalProvider,
  type AssistantMode,
  type AssistantStatus,
  type AIProviderResult,
} from './chatbotProviders';
import type { ChatbotContext, ChatbotMessage, ChatbotReply, ChatbotRole } from './chatbotTypes';

export interface AssistantClientState {
  assistantMode: AssistantMode;
  configured: boolean | null;
  circuit: AssistantStatus['circuit'] | null;
  lastStatusCheck: number | null;
  nextAiAttemptAt: number;
}

export const initialAssistantState: AssistantClientState = {
  assistantMode: 'LOCAL_FALLBACK',
  configured: null,
  circuit: null,
  lastStatusCheck: null,
  nextAiAttemptAt: 0,
};

const UNKNOWN_STATUS_PROBE_TIMEOUT_MS = 3_000;
const LOCAL_INTERACTIVE_TIMEOUT_MS = 5_000;

export function retryAtFromStatus(status: AssistantStatus, now: number): number {
  if (!status.configured) return now + AI_RETRY_COOLDOWN_MS;
  const cooldownMs = Math.max(status.circuit.cooldownMs, AI_RETRY_COOLDOWN_MS);
  const failureAt = status.circuit.lastKnownFailureAt ? Date.parse(status.circuit.lastKnownFailureAt) : Number.NaN;
  if (status.circuit.state === 'OPEN' || status.circuit.failureCount > 0)
    return Number.isFinite(failureAt) ? failureAt + cooldownMs : now + cooldownMs;
  if (status.circuit.state === 'HALF_OPEN' && !status.circuit.recoveryProbeAvailable)
    return now + cooldownMs;
  return 0;
}

export function getAssistantModeStatus(signal?: AbortSignal): Promise<AssistantStatus> {
  const controller = new AbortController();
  let rejectGuard: ((reason?: unknown) => void) | undefined;
  const guard = new Promise<never>((_, reject) => { rejectGuard = reject; });
  const forwardAbort = () => {
    controller.abort();
    rejectGuard?.(abortError());
  };
  if (signal?.aborted) return Promise.reject(abortError());
  signal?.addEventListener('abort', forwardAbort, { once: true });
  const timer = globalThis.setTimeout(() => {
    controller.abort();
    rejectGuard?.(new Error('Assistant status probe timed out'));
  }, UNKNOWN_STATUS_PROBE_TIMEOUT_MS);
  return Promise.race([AIProvider.status(controller.signal), guard]).finally(() => {
    globalThis.clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  });
}

export function retryAtAfterStatusFailure(now: number): number {
  return now + AI_RETRY_COOLDOWN_MS;
}

function abortError(): Error {
  const error = new Error('Chatbot request aborted');
  error.name = 'AbortError';
  return error;
}

function retryAtAfterFailure(state: AssistantClientState, now: number): number {
  return now + Math.max(state.circuit?.cooldownMs ?? 0, AI_RETRY_COOLDOWN_MS);
}

function canAttemptAi(state: AssistantClientState, now: number): boolean {
  return state.configured === true && state.nextAiAttemptAt <= now;
}

async function probeAssistantStatus(signal: AbortSignal): Promise<AssistantStatus> {
  const status = await getAssistantModeStatus(signal);
  if (signal.aborted) throw abortError();
  return status;
}

async function runLocalProvider(input: ChatbotOrchestratorInput) {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  if (input.signal.aborted) throw abortError();
  input.signal.addEventListener('abort', forwardAbort, { once: true });
  let rejectGuard: ((reason?: unknown) => void) | undefined;
  const guard = new Promise<never>((_, reject) => { rejectGuard = reject; });
  const timer = globalThis.setTimeout(() => {
    controller.abort();
    rejectGuard?.(new Error('Local assistant response timed out'));
  }, LOCAL_INTERACTIVE_TIMEOUT_MS);
  try {
    const result = await Promise.race([LocalProvider.chat(providerInput(input, controller.signal)), guard]);
    if (input.signal.aborted) throw abortError();
    return result;
  } catch (error) {
    if (input.signal.aborted) throw abortError();
    throw error;
  } finally {
    globalThis.clearTimeout(timer);
    input.signal.removeEventListener('abort', forwardAbort);
  }
}

export interface ChatbotOrchestratorInput {
  text: string;
  role: ChatbotRole;
  context: ChatbotContext;
  routeContext: string;
  history: ChatbotMessage[];
  assistantState: AssistantClientState;
  signal: AbortSignal;
}

export interface ChatbotOrchestratorResult {
  mode: AssistantMode;
  message?: string;
  reply?: ChatbotReply;
  assistantState: AssistantClientState;
}

function providerInput(input: ChatbotOrchestratorInput, signal: AbortSignal) {
  return {
    text: input.text,
    role: input.role,
    context: input.context,
    routeContext: input.routeContext,
    history: input.history,
    signal,
  };
}

export async function runChatbotOrchestrator(input: ChatbotOrchestratorInput): Promise<ChatbotOrchestratorResult> {
  let state = input.assistantState;
  let aiResult: AIProviderResult | null = null;

  // Unknown or unavailable configuration is re-probed only on a later user
  // message after the cooldown; this allows recovery on the same page without
  // a timer or a background request loop.
  if (state.configured !== true && state.nextAiAttemptAt <= Date.now()) {
    try {
      const status = await probeAssistantStatus(input.signal);
      const now = Date.now();
      state = {
        ...state,
        assistantMode: status.mode,
        configured: status.configured,
        circuit: status.circuit,
        lastStatusCheck: now,
        nextAiAttemptAt: retryAtFromStatus(status, now),
      };
    } catch {
      if (input.signal.aborted) throw abortError();
      const now = Date.now();
      state = {
        ...state,
        assistantMode: 'LOCAL_FALLBACK',
        lastStatusCheck: now,
        nextAiAttemptAt: retryAtAfterStatusFailure(now),
      };
    }
  }

  if (canAttemptAi(state, Date.now())) {
    const aiController = new AbortController();
    const abortAi = () => aiController.abort();
    input.signal.addEventListener('abort', abortAi, { once: true });
    const aiTimeout = globalThis.setTimeout(() => aiController.abort(), AI_INTERACTIVE_TIMEOUT_MS);
    try {
      aiResult = await AIProvider.chat(providerInput(input, aiController.signal));
    } catch {
      if (input.signal.aborted) throw abortError();
      state = { ...state, assistantMode: 'LOCAL_FALLBACK', nextAiAttemptAt: retryAtAfterFailure(state, Date.now()) };
    } finally {
      globalThis.clearTimeout(aiTimeout);
      input.signal.removeEventListener('abort', abortAi);
    }
    if (input.signal.aborted) throw abortError();
  }

  if (aiResult?.mode === 'AI_ONLINE' && aiResult.message) {
    return {
      mode: 'AI_ONLINE',
      message: aiResult.message,
      assistantState: { ...state, assistantMode: 'AI_ONLINE', configured: true, nextAiAttemptAt: 0 },
    };
  }

  state = aiResult
    ? { ...state, assistantMode: 'LOCAL_FALLBACK', nextAiAttemptAt: retryAtAfterFailure(state, Date.now()) }
    : { ...state, assistantMode: 'LOCAL_FALLBACK' };
  const localResult = await runLocalProvider(input);
  return { mode: 'LOCAL_FALLBACK', reply: localResult.reply, assistantState: state };
}
