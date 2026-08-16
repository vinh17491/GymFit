import { query } from '../../config/database';

export interface Exercise {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  instructions?: string;
  muscle_group: string;
  equipment?: string;
  difficulty: string;
  thumbnail_url?: string | null;
  video_url?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ListExerciseParams {
  search?: string;
  category?: string;
  difficulty?: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  page?: number;
  limit?: number;
  is_active?: boolean;
}

export const exercisesService = {
  async list(params: ListExerciseParams): Promise<{ exercises: Exercise[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const countParams: Record<string, any> = {};
    const reqParams: Record<string, any> = {};
    
    if (params.is_active !== undefined) {
      conditions.push('e.is_active = @isActive');
      countParams.isActive = params.is_active ? 1 : 0;
      reqParams.isActive = params.is_active ? 1 : 0;
    } else {
      conditions.push('e.is_active = 1');
    }
    
    if (params.search) {
      conditions.push('(e.name LIKE @search OR e.description LIKE @search OR e.instructions LIKE @search)');
      countParams.search = `%${params.search}%`;
      reqParams.search = `%${params.search}%`;
    }
    
    if (params.category) {
      conditions.push('e.muscle_group = @category');
      countParams.category = params.category;
      reqParams.category = params.category;
    }
    
    if (params.difficulty) {
      conditions.push('e.difficulty = @difficulty');
      countParams.difficulty = params.difficulty;
      reqParams.difficulty = params.difficulty;
    }
    
    if (params.bodyPart) {
      conditions.push('e.muscle_group = @bodyPart');
      countParams.bodyPart = params.bodyPart;
      reqParams.bodyPart = params.bodyPart;
    }
    
    if (params.target) {
      conditions.push('e.muscle_group = @target');
      countParams.target = params.target;
      reqParams.target = params.target;
    }
    
    if (params.equipment) {
      conditions.push('e.equipment = @equipment');
      countParams.equipment = params.equipment;
      reqParams.equipment = params.equipment;
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    const countQuery = `SELECT COUNT(*) as total FROM Exercises e ${whereClause}`;
    const countResult = await query(countQuery, countParams);
    const total = countResult.recordset[0].total;
    
    reqParams.offset = offset;
    reqParams.limit = limit;
    
    const dataQuery = `
      SELECT e.* FROM Exercises e
      ${whereClause}
      ORDER BY e.name
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    
    const dataResult = await query(dataQuery, reqParams);
    
    return { exercises: dataResult.recordset, total, page, limit };
  },

  async getById(id: number): Promise<Exercise | null> {
    const result = await query(
      'SELECT * FROM Exercises WHERE id = @id AND is_active = 1',
      { id }
    );
    return result.recordset[0] || null;
  },

  async update(id: number, data: Partial<Exercise>): Promise<Exercise | null> {
    const fields: string[] = [];
    const params: Record<string, any> = { id };
    
    if (data.name !== undefined) { fields.push('name = @name'); params.name = data.name; }
    if (data.description !== undefined) { fields.push('description = @description'); params.description = data.description; }
    if (data.muscle_group !== undefined) { fields.push('muscle_group = @muscleGroup'); params.muscleGroup = data.muscle_group; }
    if (data.difficulty !== undefined) { fields.push('difficulty = @difficulty'); params.difficulty = data.difficulty; }
    if (data.equipment !== undefined) { fields.push('equipment = @equipment'); params.equipment = data.equipment; }
    if (data.instructions !== undefined) { fields.push('instructions = @instructions'); params.instructions = data.instructions; }
    if (data.is_active !== undefined) { fields.push('is_active = @isActive'); params.isActive = data.is_active ? 1 : 0; }
    
    if (fields.length === 0) return this.getById(id);
    
    const result = await query(
      `UPDATE Exercises SET ${fields.join(', ')} WHERE id = @id; SELECT * FROM Exercises WHERE id = @id`,
      params
    );
    
    return result.recordset[0] || null;
  },

  async getCategories(): Promise<string[]> {
    const result = await query('SELECT DISTINCT muscle_group FROM Exercises WHERE is_active = 1 AND muscle_group IS NOT NULL ORDER BY muscle_group');
    return result.recordset.map((r: any) => r.muscle_group);
  },

  async getDifficulties(): Promise<string[]> {
    const result = await query('SELECT DISTINCT difficulty FROM Exercises WHERE is_active = 1 AND difficulty IS NOT NULL ORDER BY difficulty');
    return result.recordset.map((r: any) => r.difficulty);
  },

  async getBodyParts(): Promise<string[]> {
    const result = await query('SELECT DISTINCT muscle_group FROM Exercises WHERE is_active = 1 AND muscle_group IS NOT NULL ORDER BY muscle_group');
    return result.recordset.map((r: any) => r.muscle_group);
  },

  async getMuscles(): Promise<string[]> {
    const result = await query('SELECT DISTINCT muscle_group FROM Exercises WHERE is_active = 1 AND muscle_group IS NOT NULL ORDER BY muscle_group');
    return result.recordset.map((r: any) => r.muscle_group);
  },

  async getEquipment(): Promise<string[]> {
    const result = await query('SELECT DISTINCT equipment FROM Exercises WHERE is_active = 1 AND equipment IS NOT NULL ORDER BY equipment');
    return result.recordset.map((r: any) => r.equipment);
  }
};

export default exercisesService;
