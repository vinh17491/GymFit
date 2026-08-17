export class AssistantCircuitOpenError extends Error {
  constructor() {
    super('Assistant provider circuit is open');
    this.name = 'AssistantCircuitOpenError';
  }
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitSnapshot {
  state: CircuitState;
  failureCount: number;
  failureThreshold: number;
  cooldownMs: number;
  lastKnownSuccessAt: string | null;
  lastKnownFailureAt: string | null;
  recoveryProbeAvailable: boolean;
}

export class AssistantCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private openedAt = 0;
  private probeInFlight = false;
  private lastKnownSuccessAt: string | null = null;
  private lastKnownFailureAt: string | null = null;

  constructor(private readonly failureThreshold: number, private readonly cooldownMs: number) {}

  private refreshState(): void {
    if (this.state === 'OPEN' && Date.now() - this.openedAt >= this.cooldownMs) this.state = 'HALF_OPEN';
  }

  private reserve(): void {
    this.refreshState();
    if (this.state === 'OPEN' || (this.state === 'HALF_OPEN' && this.probeInFlight)) throw new AssistantCircuitOpenError();
    if (this.state === 'HALF_OPEN') this.probeInFlight = true;
  }

  private recordSuccess(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.openedAt = 0;
    this.probeInFlight = false;
    this.lastKnownSuccessAt = new Date().toISOString();
  }

  private recordFailure(): void {
    this.failureCount += 1;
    this.lastKnownFailureAt = new Date().toISOString();
    this.probeInFlight = false;
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.reserve();
    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  snapshot(): CircuitSnapshot {
    this.refreshState();
    return {
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      cooldownMs: this.cooldownMs,
      lastKnownSuccessAt: this.lastKnownSuccessAt,
      lastKnownFailureAt: this.lastKnownFailureAt,
      recoveryProbeAvailable: this.state === 'CLOSED' || (this.state === 'HALF_OPEN' && !this.probeInFlight),
    };
  }
}
