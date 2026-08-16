import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  return {
    user,
    isAuthenticated,
    login,
    logout,
    userRole: user?.role || null,
    userName: user?.name || null,
    userEmail: user?.email || null,
    isAdmin: user?.role === 'admin',
    isCoach: user?.role === 'coach',
    isMember: user?.role === 'member',
  };
};
