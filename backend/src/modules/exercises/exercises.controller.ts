import { Request, Response, NextFunction } from 'express';
import { exercisesService } from './exercises.service';

export const exercisesController = {
  // GET /api/exercises
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, category, difficulty, bodyPart, target, equipment, page, limit } = req.query;
      const result = await exercisesService.list({
        search: search as string,
        category: category as string,
        difficulty: difficulty as string,
        bodyPart: bodyPart as string,
        target: target as string,
        equipment: equipment as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        is_active: true
      });
      res.json({ success: true, data: result.exercises, pagination: { page: result.page, limit: result.limit, total: result.total, pages: Math.ceil(result.total / result.limit) } });
    } catch (err) { next(err); }
  },

  // GET /api/exercises/:id
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
      const exercise = await exercisesService.getById(id);
      if (!exercise) return res.status(404).json({ success: false, message: 'Exercise not found' });
      res.json({ success: true, data: exercise });
    } catch (err) { next(err); }
  },

  // GET /api/exercises/categories
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await exercisesService.getCategories();
      res.json({ success: true, data: categories });
    } catch (err) { next(err); }
  },

  // GET /api/exercises/difficulties
  async getDifficulties(req: Request, res: Response, next: NextFunction) {
    try {
      const difficulties = await exercisesService.getDifficulties();
      res.json({ success: true, data: difficulties });
    } catch (err) { next(err); }
  },

  // GET /api/exercises/bodyParts
  async getBodyParts(req: Request, res: Response, next: NextFunction) {
    try {
      const bodyParts = await exercisesService.getBodyParts();
      res.json({ success: true, data: bodyParts });
    } catch (err) { next(err); }
  },

  // GET /api/exercises/muscles
  async getMuscles(req: Request, res: Response, next: NextFunction) {
    try {
      const muscles = await exercisesService.getMuscles();
      res.json({ success: true, data: muscles });
    } catch (err) { next(err); }
  },

  // GET /api/exercises/equipment
  async getEquipment(req: Request, res: Response, next: NextFunction) {
    try {
      const equipment = await exercisesService.getEquipment();
      res.json({ success: true, data: equipment });
    } catch (err) { next(err); }
  },

  // PUT /api/exercises/:id
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
      const exercise = await exercisesService.update(id, req.body);
      if (!exercise) return res.status(404).json({ success: false, message: 'Exercise not found' });
      res.json({ success: true, data: exercise });
    } catch (err) { next(err); }
  }
};

export default exercisesController;
