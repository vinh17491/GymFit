import { query } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

const fields = 'e.id,e.name,e.slug,e.description,e.instructions,e.muscle_group,e.equipment,e.difficulty,e.video_url,e.thumbnail_url,e.is_active,e.created_at,e.updated_at';
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180) || 'exercise';

export async function list(input: { search?: string; status?: 'ACTIVE' | 'INACTIVE'; muscleGroup?: string; difficulty?: string; page: number; limit: number }) {
  const page = Math.max(1, input.page); const limit = Math.min(50, Math.max(1, input.limit));
  const params: Record<string, unknown> = { offset: (page - 1) * limit, limit }; const conditions: string[] = [];
  if (input.search) { conditions.push('(e.name LIKE @search OR e.description LIKE @search OR e.instructions LIKE @search)'); params.search = `%${input.search}%`; }
  if (input.status) { conditions.push('e.is_active=@active'); params.active = input.status === 'ACTIVE' ? 1 : 0; }
  if (input.muscleGroup) { conditions.push('e.muscle_group=@muscleGroup'); params.muscleGroup = input.muscleGroup; }
  if (input.difficulty) { conditions.push('e.difficulty=@difficulty'); params.difficulty = input.difficulty; }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const [rows, count] = await Promise.all([
    query(`SELECT ${fields} FROM dbo.Exercises e${where} ORDER BY e.name,e.id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params),
    query(`SELECT COUNT(*) AS total FROM dbo.Exercises e${where}`, params),
  ]);
  const total = Number(count.recordset[0]?.total ?? 0);
  return { items: rows.recordset, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function get(exerciseId: number) {
  const result = await query(`SELECT ${fields} FROM dbo.Exercises e WHERE e.id=@exerciseId`, { exerciseId });
  if (!result.recordset[0]) throw new AppError(404, 'Exercise not found');
  return result.recordset[0];
}

export async function create(data: Record<string, unknown>) {
  const slug = String(data.slug ?? slugify(String(data.name)));
  const result = await query(`INSERT dbo.Exercises(name,slug,description,instructions,muscle_group,equipment,difficulty,video_url,thumbnail_url,is_active)
    OUTPUT INSERTED.* VALUES(@name,@slug,@description,@instructions,@muscleGroup,@equipment,@difficulty,@videoUrl,@thumbnailUrl,1)`, {
    name: data.name, slug, description: data.description ?? null, instructions: data.instructions ?? null,
    muscleGroup: data.muscle_group ?? null, equipment: data.equipment ?? null, difficulty: data.difficulty ?? null,
    videoUrl: data.video_url ?? null, thumbnailUrl: data.thumbnail_url ?? null,
  });
  return result.recordset[0];
}

export async function update(exerciseId: number, data: Record<string, unknown>) {
  const current = await get(exerciseId); const assignments: string[] = []; const params: Record<string, unknown> = { exerciseId };
  const values: Array<[string, string]> = [['name', 'name'], ['slug', 'slug'], ['description', 'description'], ['instructions', 'instructions'], ['muscle_group', 'muscleGroup'], ['equipment', 'equipment'], ['difficulty', 'difficulty'], ['video_url', 'videoUrl'], ['thumbnail_url', 'thumbnailUrl']];
  for (const [key, parameter] of values) if (data[key] !== undefined) { assignments.push(`${key}=@${parameter}`); params[parameter] = data[key] ?? null; }
  if (data.is_active !== undefined) { assignments.push('is_active=@isActive'); params.isActive = data.is_active ? 1 : 0; }
  if (!assignments.length) return current;
  const result = await query(`UPDATE dbo.Exercises SET ${assignments.join(',')},updated_at=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE id=@exerciseId`, params);
  return result.recordset[0];
}
