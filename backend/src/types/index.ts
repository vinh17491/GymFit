export enum UserRole {
  MEMBER = 'member',
  COACH = 'coach',
  ADMIN = 'admin',
  SELLER = 'seller',
}

export interface IUser {
  id: number; email: string; password: string; name: string; phone: string;
  role: UserRole; referral_code: string; avatar_url: string | null;
  is_active: boolean; email_verified: boolean;
  last_login_at: Date | null; created_at: Date; updated_at: Date;
}

export interface IJwtPayload { userId: number; email: string; role: UserRole; tokenVersion: number; sessionId: number; }

export interface IPagination { page: number; limit: number; total: number; totalPages: number; }

export interface IApiResponse<T = any> {
  success: boolean; message: string; data?: T; errors?: any; pagination?: IPagination;
}

export interface IReferralCode { id: number; user_id: number; code: string; status: string; created_at: Date; }
export interface ICoupon { id: number; code: string; type: string; value: number; min_purchase: number; start_date: Date; end_date: Date; usage_limit: number; user_limit: number; applicable_plans: string; }
export interface IPoints { id: number; user_id: number; balance: number; lifetime_earned: number; lifetime_spent: number; }
export interface ITicket { id: number; user_id: number; subject: string; category: string; priority: string; status: string; assigned_to: number | null; created_at: Date; updated_at: Date; }
export interface IInvoice { id: number; invoice_number: string; user_id: number; transaction_id: number; amount: number; tax: number; discount: number; total: number; pdf_path: string | null; created_at: Date; }
export interface IAuditLog { id: number; user_id: number; action: string; entity_type: string; entity_id: number; old_value: string | null; new_value: string | null; ip: string; device: string; timestamp: Date; }
