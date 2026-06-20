import { api } from '../../../app/api';

export const videoApi = {
  getVideos: (params?: { page?: number; limit?: number; category?: string }) =>
    api.get('/video', { params }).then(r => r.data),
  getVideo: (id: string) =>
    api.get(`/video/${id}`).then(r => r.data),
  getCategories: () =>
    api.get('/video/categories').then(r => r.data),
  };