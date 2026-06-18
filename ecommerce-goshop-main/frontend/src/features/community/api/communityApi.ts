import { api } from '../../../app/api';

export const communityApi = {
  getPosts: (params?: { page?: number; limit?: number }) =>
    api.get('/community', { params }).then(r => r.data),
  getPost: (id: string) =>
    api.get(`/community/${id}`).then(r => r.data),
  createPost: (data: { title: string; content: string; category?: string }) =>
    api.post('/community', data).then(r => r.data),
  likePost: (id: string) =>
    api.post(`/community/${id}/like`).then(r => r.data),
  addComment: (id: string, data: { content: string }) =>
    api.post(`/community/${id}/comments`, data).then(r => r.data),
  deletePost: (id: string) =>
    api.delete(`/community/${id}`).then(r => r.data),
};