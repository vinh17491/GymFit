import { api } from '../../../app/api';

export const aiApi = {
  generateWorkout: (data: any) => api.post('/ai/generate-workout', data).then(r => r.data),
  generateMeal: (data: any) => api.post('/ai/generate-meal-plan', data).then(r => r.data),
  getHistory: () => api.get('/ai/history').then(r => r.data),
};