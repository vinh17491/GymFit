import * as winston from 'winston';

const SENSITIVE_KEY = /(?:password|token|secret|api[_-]?key|authorization|cookie|csrf|prompt|conversation|chat[_-]?history|messages)/i;
const SENSITIVE_ASSIGNMENT = /((?:password|pass|token|access[_-]?token|refresh[_-]?token|api[_-]?key|secret|authorization|cookie|csrf[_-]?token|prompt|conversation)\s*[:=]\s*)("[^"]*"|'[^']*'|[^,\s&}]+)/gi;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;

export function redactLogText(value: string): string {
  return value.replace(BEARER_TOKEN, 'Bearer [REDACTED]').replace(SENSITIVE_ASSIGNMENT, '$1[REDACTED]');
}

export function redactLogValue(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return redactLogText(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactLogText(value.message),
      ...(value.stack ? { stack: redactLogText(value.stack) } : {}),
    };
  }
  if (Array.isArray(value)) return value.map(item => redactLogValue(item));
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) result[childKey] = redactLogValue(childValue, childKey);
    return result;
  }
  return value;
}

export const redactWinstonFormat = winston.format((info) => {
  const record = info as unknown as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== 'level') record[key] = redactLogValue(record[key], key);
  }
  return info;
});
