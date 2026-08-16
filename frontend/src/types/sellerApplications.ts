export type SellerApplicationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type SellerBusinessType = 'BRAND' | 'SPORTS_STORE' | 'SMALL_BUSINESS' | 'OTHER';

export interface SellerApplicationInput {
  businessName?: string | null;
  businessType?: SellerBusinessType | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  businessAddress?: string | null;
  pickupAddress?: string | null;
  taxCode?: string | null;
  websiteUrl?: string | null;
  socialUrl?: string | null;
  description?: string | null;
}

export interface SellerApplicationHistory {
  id: number;
  fromStatus: SellerApplicationStatus | null;
  toStatus: SellerApplicationStatus;
  actorUserId: number | null;
  actorName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface SellerApplication {
  id: number;
  userId: number;
  status: SellerApplicationStatus;
  businessName: string | null;
  businessType: SellerBusinessType | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  businessAddress: string | null;
  pickupAddress: string | null;
  taxCode: string | null;
  websiteUrl: string | null;
  socialUrl: string | null;
  description: string | null;
  reviewReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByUserId: number | null;
  createdAt: string;
  updatedAt: string;
  applicant?: { id: number; name: string; email: string; role: string; isActive: boolean };
  history: SellerApplicationHistory[];
}

export interface AdminSellerApplicationList {
  items: SellerApplication[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

