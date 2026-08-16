export type ShopStatus = 'ACTIVE' | 'SUSPENDED';

export interface SellerShopPatch {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  pickupAddress?: string | null;
}

export interface AdminShopFilters {
  page: number;
  limit: number;
  search?: string;
  status?: ShopStatus;
  verified?: boolean;
  system?: boolean;
  sort: 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';
}
