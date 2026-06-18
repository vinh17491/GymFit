import { api } from '../../../app/api';

export const aiApi = {
  generateWorkout: (data: any) => api.post('/ai/workout', data).then(r => r.data),
  generateMeal: (data: any) => api.post('/ai/meal', data).then(r => r.data),
  getHistory: () => api.get('/ai/history').then(r => r.data),
};