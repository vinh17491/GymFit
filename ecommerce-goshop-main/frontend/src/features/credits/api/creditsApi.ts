import { api } from '../../../app/api';

export const creditsApi = {
  getBalance: () =>
    api.get('/credits/balance').then(r => r.data),
  getTransactions: (params?: { page?: number; limit?: number }) =>
    api.get('/credits/history', { params }).then(r => r.data),
  purchaseCredits: (data: { amount: number }) =>
    api.post('/credits/purchase', data).then(r => r.data),
};