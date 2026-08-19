import { z } from 'zod';

export const videoListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  difficulty: z.string().trim().max(20).optional(),
}).strict();

export type VideoListQuery = z.infer<typeof videoListQuerySchema>;
