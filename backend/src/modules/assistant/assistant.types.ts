import type { UserRole } from '../../types';

export type AssistantMode = 'AI_ONLINE' | 'LOCAL_FALLBACK';
export type AssistantFailureClass =
  | 'NOT_CONFIGURED'
  | 'CIRCUIT_OPEN'
  | 'TIMEOUT'
  | 'INVALID_CREDENTIALS'
  | 'QUOTA'
  | 'PROVIDER_UNAVAILABLE'
  | 'CONNECTION_FAILURE'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'TOOL_LIMIT';

export interface AssistantHistoryMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantChatInput {
  message: string;
  history?: AssistantHistoryMessage[];
}

export interface AssistantActor {
  userId: number;
  role: UserRole;
}

export interface AssistantChatResponse {
  mode: AssistantMode;
  message?: string;
}

export interface AssistantCircuitStatus {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  failureThreshold: number;
  cooldownMs: number;
  lastKnownSuccessAt: string | null;
  lastKnownFailureAt: string | null;
  recoveryProbeAvailable: boolean;
}

export interface AssistantStatusResponse {
  enabled: boolean;
  configured: boolean;
  model: string | null;
  mode: AssistantMode;
  circuit: AssistantCircuitStatus;
}
