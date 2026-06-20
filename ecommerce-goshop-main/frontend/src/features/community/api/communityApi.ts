import { api } from '../../../app/api';

export const communityApi = {
  getPosts: (params?: { page?: number; limit?: number }) =>
    api.get('/community/posts', { params }).then(r => r.data),
  getPost: (id: string) =>
    api.get(`/community/posts/${id}`).then(r => r.data),
  createPost: (data: { title: string; content: string; category?: string }) =>
    api.post('/community/posts', data).then(r => r.data),
  likePost: (id: string) =>
    api.post(`/community/posts/${id}/like`).then(r => r.data),
  addComment: (id: string, data: { content: string }) =>
    api.post(`/community/posts/${id}/answers`, data).then(r => r.data),
  deletePost: (id: string) =>
    api.delete(`/community/posts/${id}`).then(r => r.data),
};
