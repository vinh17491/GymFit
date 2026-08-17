import axios from 'axios';

export interface SafeApiError {
  status: number | null;
  code?: string;
  message: string;
  fieldErrors: Record<string, string>;
}

const defaultMessage = 'Something went wrong. Please try again.';
const statusMessages: Record<number, string> = {
  400: 'The request could not be processed. Check the highlighted fields.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You are not allowed to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This action conflicts with the current state. Please refresh and try again.',
  422: 'Some submitted information is invalid. Check the highlighted fields.',
  429: 'Too many requests. Please wait a moment and try again.',
};

const unsafeMessage = /<[^>]*>|\b(?:select|insert|update|delete|drop|alter|truncate)\s+.+\b|\b(?:sql|stack trace|at\s+\w+\s*\(|jwt|refresh token|access token|api key|secret|authorization|cookie|provider exception|internal server)\b/i;
const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function safeText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const text = value.trim();
  if (!text || text.length > 300 || controlCharacters.test(text) || unsafeMessage.test(text)) return fallback;
  return text;
}

function payloadOf(error: unknown): Record<string, unknown> | null {
  if (!axios.isAxiosError(error) || !error.response || typeof error.response.data !== 'object' || error.response.data === null) return null;
  return error.response.data as Record<string, unknown>;
}

function statusMessage(status: number | null, fallback: string): string {
  if (status !== null && status >= 500) return 'GymFit is temporarily unavailable. Please try again later.';
  if (status !== null && statusMessages[status]) return statusMessages[status];
  if (status === null) return 'Unable to reach GymFit right now. Please try again.';
  return fallback;
}

function fieldErrorsOf(payload: Record<string, unknown> | null): Record<string, string> {
  const raw = payload?.errors;
  if (!Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const field = (item as { field?: unknown }).field;
    const message = (item as { message?: unknown }).message;
    if (typeof field !== 'string' || !/^[A-Za-z][A-Za-z0-9_.-]{0,80}$/.test(field)) continue;
    const safeMessage = safeText(message, 'Invalid value.');
    if (safeMessage !== 'Invalid value.' || typeof message === 'string') result[field] = safeMessage;
  }
  return result;
}

export function safeDisplayMessage(value: unknown, fallback = defaultMessage): string {
  return safeText(value, fallback);
}

export function normalizeApiError(error: unknown, fallback = defaultMessage): SafeApiError {
  const response = axios.isAxiosError(error) ? error.response : undefined;
  const status = typeof response?.status === 'number' ? response.status : null;
  const payload = payloadOf(error);
  const message = safeText(payload?.message, statusMessage(status, fallback));
  const code = typeof payload?.code === 'string' && /^[A-Z0-9_.-]{1,80}$/.test(payload.code) ? payload.code : undefined;
  return { status, code, message, fieldErrors: fieldErrorsOf(payload) };
}

export function apiErrorMessage(error: unknown, fallback = defaultMessage): string {
  return normalizeApiError(error, fallback).message;
}

export function sanitizeAxiosError(error: unknown): unknown {
  if (!axios.isAxiosError(error)) return error;
  const normalized = normalizeApiError(error);
  error.message = normalized.message;
  if (error.response && typeof error.response.data === 'object' && error.response.data !== null) {
    const payload: Record<string, unknown> = {
      ...(error.response.data as Record<string, unknown>),
      message: normalized.message,
    };
    if (Array.isArray(payload.errors)) {
      payload.errors = Object.entries(normalized.fieldErrors).map(([field, message]) => ({ field, message }));
    }
    error.response.data = payload;
  }
  return error;
}
