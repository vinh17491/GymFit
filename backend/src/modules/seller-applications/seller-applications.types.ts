export const sellerApplicationStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'] as const;
export type SellerApplicationStatus = typeof sellerApplicationStatuses[number];
export const sellerBusinessTypes = ['BRAND', 'SPORTS_STORE', 'SMALL_BUSINESS', 'OTHER'] as const;
export type SellerBusinessType = typeof sellerBusinessTypes[number];

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
  createdAt: Date;
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
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedByUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
  applicant?: { id: number; name: string; email: string; role: string; isActive: boolean };
  history: SellerApplicationHistory[];
}

export interface AdminSellerApplicationFilters {
  status: SellerApplicationStatus;
  search?: string;
  page: number;
  limit: number;
  sortOrder: 'asc' | 'desc';
}

