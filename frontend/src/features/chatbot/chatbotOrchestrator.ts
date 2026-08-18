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

export function retryAtFromStatus(status: AssistantStatus, now: number): number {
  if (!status.configured) return 0;
  const cooldownMs = Math.max(status.circuit.cooldownMs, AI_RETRY_COOLDOWN_MS);
  const failureAt = status.circuit.lastKnownFailureAt ? Date.parse(status.circuit.lastKnownFailureAt) : Number.NaN;
  if (status.circuit.state === 'OPEN' || status.circuit.failureCount > 0)
    return Number.isFinite(failureAt) ? failureAt + cooldownMs : now + cooldownMs;
  if (status.circuit.state === 'HALF_OPEN' && !status.circuit.recoveryProbeAvailable)
    return now + cooldownMs;
  return 0;
}

export function getAssistantModeStatus(signal?: AbortSignal): Promise<AssistantStatus> {
  return AIProvider.status(signal);
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

  if (canAttemptAi(state, Date.now())) {
    const aiController = new AbortController();
    const abortAi = () => aiController.abort();
    input.signal.addEventListener('abort', abortAi, { once: true });
    const aiTimeout = window.setTimeout(() => aiController.abort(), AI_INTERACTIVE_TIMEOUT_MS);
    try {
      aiResult = await AIProvider.chat(providerInput(input, aiController.signal));
    } catch {
      if (input.signal.aborted) throw abortError();
      state = { ...state, assistantMode: 'LOCAL_FALLBACK', nextAiAttemptAt: retryAtAfterFailure(state, Date.now()) };
    } finally {
      window.clearTimeout(aiTimeout);
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
  const localResult = await LocalProvider.chat(providerInput(input, input.signal));
  return { mode: 'LOCAL_FALLBACK', reply: localResult.reply, assistantState: state };
}
