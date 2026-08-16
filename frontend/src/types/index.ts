export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: 'member' | 'coach' | 'admin' | 'seller';
  referral_code?: string;
  avatar_url?: string;
  is_active?: boolean;
  email_verified?: boolean;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}
