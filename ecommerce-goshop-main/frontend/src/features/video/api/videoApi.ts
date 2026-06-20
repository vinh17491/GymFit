import { api } from '../../../app/api';

export const videoApi = {
  getVideos: (params?: { page?: number; limit?: number; category?: string }) =>
    api.get('/videos', { params }).then(r => r.data),
  getVideo: (id: string) =>
    api.get(`/videos/${id}`).then(r => r.data),
  getCategories: () =>
    api.get('/videos/categories').then(r => r.data),
  };