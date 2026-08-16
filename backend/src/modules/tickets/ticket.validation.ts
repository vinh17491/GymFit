import { z } from 'zod';
export const createTicketSchema = z.object({ subject: z.string().trim().min(3).max(200), description: z.string().trim().min(5).max(10000), category: z.string().trim().max(50).default('general'), priority: z.enum(['low','medium','high','urgent']).default('medium') }).strict();
export const replyTicketSchema = z.object({ message: z.string().trim().min(1).max(10000), is_internal: z.boolean().default(false) }).strict();
