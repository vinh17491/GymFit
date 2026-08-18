import { z } from 'zod';
import { productsService } from '../products/products.service';
import { getAvailabilitySnapshot } from '../coaches/coach-availability.service';
import { listBookings } from '../bookings/bookings.service';
import { listCustomerOrders } from '../orders/query.service';
import { getCurrent, getProgress } from '../member-workout/member-workout.service';
import { UserRole } from '../../types';
import type { AssistantProviderToolDefinition } from './assistant.provider';
import type { AssistantActor } from './assistant.types';

export const assistantToolNames = [
  'searchProducts',
  'getCoachAvailability',
  'getMyAppointments',
  'getMyOrders',
  'getWorkoutContext',
] as const;

export type AssistantToolName = (typeof assistantToolNames)[number];

const publicAssistantToolNames = ['searchProducts', 'getCoachAvailability'] as const satisfies readonly AssistantToolName[];

export function assistantToolNamesForActor(actor: AssistantActor | null): AssistantToolName[] {
  if (!actor) return [...publicAssistantToolNames];
  switch (actor.role) {
    case UserRole.MEMBER:
      return [...publicAssistantToolNames, 'getMyAppointments', 'getMyOrders', 'getWorkoutContext'];
    case UserRole.COACH:
      return [...publicAssistantToolNames, 'getMyAppointments', 'getMyOrders'];
    case UserRole.ADMIN:
    case UserRole.SELLER:
    default:
      return [...publicAssistantToolNames];
  }
}

const searchProductsSchema = z.object({
  query: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  minPrice: z.coerce.number().finite().min(0).max(999_999_999_999.99).optional(),
  maxPrice: z.coerce.number().finite().min(0).max(999_999_999_999.99).optional(),
  sort: z.enum(['relevance', 'newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'rating', 'best_selling']).optional(),
}).strict();

const coachAvailabilitySchema = z.object({
  coachId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

const emptySchema = z.object({}).strict();

export const assistantToolDefinitions: AssistantProviderToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'searchProducts',
      description: 'Search public GymFit products using the existing product service. Read-only.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', maxLength: 120 },
          category: { type: 'string', maxLength: 120 },
          minPrice: { type: 'number', minimum: 0 },
          maxPrice: { type: 'number', minimum: 0 },
          sort: { type: 'string', enum: ['relevance', 'newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'rating', 'best_selling'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCoachAvailability',
      description: 'Read public availability for one Coach and optional YYYY-MM-DD date. Read-only.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['coachId'],
        properties: {
          coachId: { type: 'integer', minimum: 1 },
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getMyAppointments',
      description: 'Read appointments scoped to the authenticated user session. Never provide a userId.',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getMyOrders',
      description: 'Read orders scoped to the authenticated user session. Never provide a userId.',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getWorkoutContext',
      description: 'Read the authenticated member workout context and progress. Never provide a userId.',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
    },
  },
];

export function assistantToolDefinitionsForActor(actor: AssistantActor | null): AssistantProviderToolDefinition[] {
  const allowed = new Set(assistantToolNamesForActor(actor));
  return assistantToolDefinitions.filter(definition => allowed.has(definition.function.name as AssistantToolName));
}

function safeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function safeText(value: unknown, max = 240): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function publicProduct(product: Record<string, unknown>) {
  return {
    id: safeNumber(product.id),
    name: safeText(product.product_name) ?? safeText(product.name),
    slug: safeText(product.slug, 160),
    price: safeNumber(product.price) ?? safeNumber(product.minPrice),
    salePrice: safeNumber(product.sale_price),
    inStock: typeof product.inStock === 'boolean' ? product.inStock : null,
    shop: safeText((product.shop as Record<string, unknown> | undefined)?.name),
    category: safeText(product.category),
    brand: safeText(product.brand),
  };
}

async function searchProducts(input: z.infer<typeof searchProductsSchema>) {
  const result = await productsService.list({
    q: input.query,
    categorySlug: input.category,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    page: 1,
    pageSize: 5,
    sort: input.sort ?? 'relevance',
  });
  return {
    items: result.products.slice(0, 5).map(product => publicProduct(product as Record<string, unknown>)),
    total: result.total,
  };
}

async function coachAvailability(input: z.infer<typeof coachAvailabilitySchema>) {
  const snapshot = await getAvailabilitySnapshot(input.coachId, input.date, { includePrivateNotes: false });
  return {
    coachId: snapshot.coach_id,
    date: snapshot.date,
    timezone: snapshot.timezone,
    durationMinutes: snapshot.duration_minutes,
    bookingEnabled: snapshot.booking_enabled,
    mode: snapshot.session_mode,
    availableSlots: snapshot.available_slots.slice(0, 100),
    slots: snapshot.slots.slice(0, 100).map(slot => ({
      start: slot.start_time,
      end: slot.end_time,
      mode: slot.mode,
      booked: slot.booked,
      past: slot.past,
    })),
  };
}

function requireActor(actor: AssistantActor | null): AssistantActor {
  if (!actor) throw new Error('AUTHENTICATION_REQUIRED');
  return actor;
}

async function myAppointments(actor: AssistantActor | null) {
  const current = requireActor(actor);
  if (![UserRole.MEMBER, UserRole.COACH].includes(current.role)) throw new Error('TOOL_NOT_AVAILABLE_FOR_ROLE');
  const result = await listBookings({
    actor: { userId: current.userId, role: current.role },
    filters: { statusFilter: '', dateFilter: '', params: {} },
    page: 1,
    limit: 5,
  });
  return {
    items: result.items.map(item => ({
      id: item.id,
      coach: safeText(item.coach_name),
      member: safeText(item.member_name),
      date: item.booking_date,
      start: item.start_time,
      end: item.end_time,
      mode: item.session_mode,
      status: item.status,
    })),
  };
}

async function myOrders(actor: AssistantActor | null) {
  const current = requireActor(actor);
  if (![UserRole.MEMBER, UserRole.COACH].includes(current.role)) throw new Error('TOOL_NOT_AVAILABLE_FOR_ROLE');
  const result = await listCustomerOrders(current.userId, { page: 1, limit: 10, sortOrder: 'desc' });
  return {
    items: result.items.slice(0, 10).map(item => ({
      id: item.id,
      orderNumber: item.orderNumber,
      orderStatus: item.orderStatus,
      paymentStatus: item.paymentStatus,
      itemCount: item.itemCount,
      totalAmount: item.totalAmount,
      currency: item.currency,
      createdAt: item.createdAt,
    })),
    total: result.total,
  };
}

async function workoutContext(actor: AssistantActor | null) {
  const current = requireActor(actor);
  if (current.role !== UserRole.MEMBER) throw new Error('TOOL_NOT_AVAILABLE_FOR_ROLE');
  const [workout, progress] = await Promise.all([getCurrent(current.userId), getProgress(current.userId)]);
  return {
    assignment: workout.assignment ? {
      id: workout.assignment.id,
      programName: safeText(workout.assignment.program_name),
      coachName: safeText(workout.assignment.coach_name),
      status: safeText(workout.assignment.status),
      startDate: workout.assignment.start_date,
      endDate: workout.assignment.end_date,
    } : null,
    upcomingSchedules: workout.upcomingSchedules.slice(0, 5).map(schedule => ({
      id: schedule.id,
      scheduledDate: schedule.scheduled_date,
      status: schedule.status,
      dayTitle: safeText(schedule.day_title),
      canStart: schedule.can_start,
      blockedReason: schedule.blocked_reason,
    })),
    progress: {
      completedSessions: progress.completed_sessions,
      totalDuration: progress.total_duration,
      trainingVolume: progress.training_volume,
      completionRate: progress.completion_rate,
      dueSchedules: progress.due_schedules,
      completedDueSchedules: progress.completed_due_schedules,
    },
  };
}

function toolErrorCode(error: unknown): string {
  const value = error instanceof Error ? error.message : '';
  if (value === 'AUTHENTICATION_REQUIRED') return value;
  if (value === 'TOOL_NOT_AVAILABLE_FOR_ROLE') return value;
  const status = error && typeof error === 'object' && typeof (error as { statusCode?: unknown }).statusCode === 'number'
    ? (error as { statusCode: number }).statusCode : 0;
  if (status === 404) return 'NOT_FOUND';
  if (status === 403) return 'NOT_AUTHORIZED';
  return 'DATA_UNAVAILABLE';
}

function boundedJson(value: unknown): string {
  try { return JSON.stringify(value).slice(0, 12_000); } catch { return JSON.stringify({ ok: false, error: 'DATA_UNAVAILABLE' }); }
}

export async function executeAssistantTool(name: string, rawArguments: string, actor: AssistantActor | null): Promise<string> {
  if (!assistantToolNamesForActor(actor).includes(name as AssistantToolName)) return boundedJson({ ok: false, error: 'TOOL_NOT_ALLOWED' });
  let parsedArguments: unknown;
  try { parsedArguments = JSON.parse(rawArguments || '{}'); } catch { return boundedJson({ ok: false, error: 'INVALID_ARGUMENTS' }); }

  try {
    let result: unknown;
    switch (name as AssistantToolName) {
      case 'searchProducts': {
        const parsed = searchProductsSchema.safeParse(parsedArguments);
        if (!parsed.success) return boundedJson({ ok: false, error: 'INVALID_ARGUMENTS' });
        result = await searchProducts(parsed.data);
        break;
      }
      case 'getCoachAvailability': {
        const parsed = coachAvailabilitySchema.safeParse(parsedArguments);
        if (!parsed.success) return boundedJson({ ok: false, error: 'INVALID_ARGUMENTS' });
        result = await coachAvailability(parsed.data);
        break;
      }
      case 'getMyAppointments': {
        const parsed = emptySchema.safeParse(parsedArguments);
        if (!parsed.success) return boundedJson({ ok: false, error: 'INVALID_ARGUMENTS' });
        result = await myAppointments(actor);
        break;
      }
      case 'getMyOrders': {
        const parsed = emptySchema.safeParse(parsedArguments);
        if (!parsed.success) return boundedJson({ ok: false, error: 'INVALID_ARGUMENTS' });
        result = await myOrders(actor);
        break;
      }
      case 'getWorkoutContext': {
        const parsed = emptySchema.safeParse(parsedArguments);
        if (!parsed.success) return boundedJson({ ok: false, error: 'INVALID_ARGUMENTS' });
        result = await workoutContext(actor);
        break;
      }
    }
    return boundedJson({ ok: true, data: result });
  } catch (error) {
    return boundedJson({ ok: false, error: toolErrorCode(error) });
  }
}
