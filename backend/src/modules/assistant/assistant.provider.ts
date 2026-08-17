import { config } from '../../config/config';

export type AssistantProviderFailureKind =
  | 'NOT_CONFIGURED'
  | 'TIMEOUT'
  | 'INVALID_CREDENTIALS'
  | 'QUOTA'
  | 'PROVIDER_UNAVAILABLE'
  | 'CONNECTION_FAILURE'
  | 'INVALID_PROVIDER_RESPONSE';

export class AssistantProviderError extends Error {
  constructor(public readonly kind: AssistantProviderFailureKind) {
    super('Assistant provider request failed');
    this.name = 'AssistantProviderError';
  }
}

export interface AssistantProviderToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AssistantProviderMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: AssistantProviderToolCall[];
}

export interface AssistantProviderToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AssistantProviderCompletion {
  message: AssistantProviderMessage;
}

function endpointFor(baseUrl: string): string {
  return baseUrl.endsWith('/chat/completions') ? baseUrl : baseUrl + '/chat/completions';
}

function classifyStatus(status: number): AssistantProviderFailureKind {
  if (status === 401 || status === 403) return 'INVALID_CREDENTIALS';
  if (status === 408) return 'TIMEOUT';
  if (status === 429) return 'QUOTA';
  if (status >= 500) return 'PROVIDER_UNAVAILABLE';
  return 'INVALID_PROVIDER_RESPONSE';
}

function providerMessage(value: unknown): AssistantProviderMessage | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as { role?: unknown; content?: unknown; tool_calls?: unknown };
  if (item.role !== 'assistant') return null;
  const rawCalls = Array.isArray(item.tool_calls) ? item.tool_calls : [];
  const toolCalls = rawCalls.flatMap(call => {
    if (!call || typeof call !== 'object') return [];
    const raw = call as { id?: unknown; function?: { name?: unknown; arguments?: unknown } };
    if (typeof raw.id !== 'string' || typeof raw.function?.name !== 'string' || typeof raw.function.arguments !== 'string') return [];
    return [{ id: raw.id.slice(0, 160), type: 'function' as const, function: { name: raw.function.name.slice(0, 100), arguments: raw.function.arguments.slice(0, 4000) } }];
  });
  const content = item.content === null || typeof item.content === 'string' ? item.content : null;
  if (!content && !toolCalls.length) return null;
  return { role: 'assistant', content, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) };
}

export class AssistantProvider {
  async complete(messages: AssistantProviderMessage[], tools: AssistantProviderToolDefinition[]): Promise<AssistantProviderCompletion> {
    if (!config.ai.configured) throw new AssistantProviderError('NOT_CONFIGURED');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);
    try {
      const response = await fetch(endpointFor(config.ai.baseUrl), {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + config.ai.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.ai.model, messages, temperature: 0.2, tools, tool_choice: 'auto' }),
        signal: controller.signal,
      });
      if (!response.ok) throw new AssistantProviderError(classifyStatus(response.status));
      let payload: unknown;
      try { payload = await response.json(); } catch { throw new AssistantProviderError('INVALID_PROVIDER_RESPONSE'); }
      const choices = payload && typeof payload === 'object' && Array.isArray((payload as { choices?: unknown }).choices)
        ? (payload as { choices: unknown[] }).choices : [];
      const message = providerMessage((choices[0] as { message?: unknown } | undefined)?.message);
      if (!message) throw new AssistantProviderError('INVALID_PROVIDER_RESPONSE');
      return { message };
    } catch (error) {
      if (error instanceof AssistantProviderError) throw error;
      if (error instanceof Error && error.name === 'AbortError') throw new AssistantProviderError('TIMEOUT');
      throw new AssistantProviderError('CONNECTION_FAILURE');
    } finally {
      clearTimeout(timer);
    }
  }
}
