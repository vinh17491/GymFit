import api from '../../api/axios';
import { chatbotDataAdapters } from './chatbotDataAdapters';
import { resolveChatbotMessage } from './chatbotEngine';
import type { ChatbotContext, ChatbotMessage, ChatbotReply, ChatbotRole } from './chatbotTypes';

export type AssistantMode = 'AI_ONLINE' | 'LOCAL_FALLBACK';

export interface AssistantStatus {
  enabled: boolean;
  configured: boolean;
  model: string | null;
  mode: AssistantMode;
  circuit: {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    failureThreshold: number;
    cooldownMs: number;
    lastKnownSuccessAt: string | null;
    lastKnownFailureAt: string | null;
    recoveryProbeAvailable: boolean;
  };
}

export interface ProviderInput {
  text: string;
  role: ChatbotRole;
  context: ChatbotContext;
  routeContext: string;
  history: ChatbotMessage[];
  signal: AbortSignal;
}

export interface LocalProviderResult {
  mode: 'LOCAL_FALLBACK';
  reply: ChatbotReply;
}

export interface AIProviderResult {
  mode: AssistantMode;
  message?: string;
}

function statusFrom(value: unknown): AssistantStatus {
  const raw = value as Partial<AssistantStatus>;
  const circuit = raw.circuit as Partial<AssistantStatus['circuit']> | undefined;
  return {
    enabled: raw.enabled === true,
    configured: raw.configured === true,
    model: typeof raw.model === 'string' ? raw.model : null,
    mode: raw.mode === 'AI_ONLINE' ? 'AI_ONLINE' : 'LOCAL_FALLBACK',
    circuit: {
      state: circuit?.state === 'OPEN' || circuit?.state === 'HALF_OPEN' ? circuit.state : 'CLOSED',
      failureCount: Number.isSafeInteger(circuit?.failureCount) ? Number(circuit?.failureCount) : 0,
      // The backend status is authoritative; do not duplicate circuit policy
      // defaults in the browser when a malformed/partial status is received.
      failureThreshold: Number.isSafeInteger(circuit?.failureThreshold) ? Number(circuit?.failureThreshold) : 0,
      cooldownMs: Number.isSafeInteger(circuit?.cooldownMs) ? Number(circuit?.cooldownMs) : 0,
      lastKnownSuccessAt: typeof circuit?.lastKnownSuccessAt === 'string' ? circuit.lastKnownSuccessAt : null,
      lastKnownFailureAt: typeof circuit?.lastKnownFailureAt === 'string' ? circuit.lastKnownFailureAt : null,
      recoveryProbeAvailable: circuit?.recoveryProbeAvailable === true,
    },
  };
}

export const LocalProvider = {
  async chat(input: ProviderInput): Promise<LocalProviderResult> {
    const reply = await resolveChatbotMessage(input.text, input.role, input.context, {
      adapterRegistry: chatbotDataAdapters,
      routeContext: input.routeContext,
      signal: input.signal,
    });
    return { mode: 'LOCAL_FALLBACK', reply };
  },
};

export const AIProvider = {
  async status(signal?: AbortSignal): Promise<AssistantStatus> {
    const response = await api.get('/assistant/status', signal ? { signal } : undefined);
    return statusFrom(response.data?.data);
  },

  async chat(input: ProviderInput): Promise<AIProviderResult> {
    const history = input.history.slice(-12).map(message => ({
      role: message.role,
      text: message.text.slice(0, 1200),
    }));
    const response = await api.post('/assistant/chat', {
      message: input.text,
      history,
    }, { signal: input.signal });
    const result = response.data?.data as { mode?: unknown; message?: unknown } | undefined;
    if (result?.mode === 'AI_ONLINE' && typeof result.message === 'string' && result.message.trim()) {
      return { mode: 'AI_ONLINE', message: result.message.slice(0, 4000) };
    }
    return { mode: 'LOCAL_FALLBACK' };
  },
};
