export interface ProductImage {
  id: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductVariantOption {
  option_id: number;
  option_name: string;
  value_id: number;
  value: string;
  optionId?: number;
  optionName?: string;
  valueId?: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  variant_name: string;
  sku: string;
  barcode?: string | null;
  price: number;
  sale_price?: number | null;
  effective_price: number;
  weight?: number | null;
  is_active: boolean;
  available: number;
  is_default: boolean;
  stock_status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  productId?: number;
  variantName?: string;
  salePrice?: number | null;
  effectivePrice?: number;
  stockStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  isDefault?: boolean;
  options: ProductVariantOption[];
}

export interface Product {
  id: number;
  product_name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  specifications?: Record<string, unknown> | string | null;
  brand?: string | null;
  brand_slug?: string | null;
  category?: string | null;
  category_slug?: string | null;
  brand_id?: number | null;
  category_id?: number | null;
  shop: { id: number; name: string; slug: string; logoUrl?: string | null; isVerified: boolean };
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  availableQuantity: number;
  is_active?: boolean;
  is_featured?: boolean;
  is_on_sale?: boolean;
  created_at?: string;
  display_variant: ProductVariant;
  variants?: ProductVariant[];
  images?: ProductImage[];
  primary_image?: ProductImage | null;

  // Temporary compatibility aliases, derived by the API from canonical tables.
  price: number;
  sale_price?: number | null;
  stock: number;
  sku: string;
  main_image?: string | null;
  additional_images?: string | null;

  averageRating: number | null;
  reviewCount: number;
  commentCount: number;
  soldCount: number;
  rating?: number | null;
  review_count?: number;
  features?: string[];
}

export interface ProductListResponse {
  success: boolean;
  data: Product[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface ProductDetail extends Omit<
  Product,
  "display_variant" | "variants"
> {
  display_variant: ProductVariant | null;
  variants: ProductVariant[];
}

export interface ProductDetailResponse {
  success: boolean;
  data: ProductDetail;
  related_products?: Product[];
}
