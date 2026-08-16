import type { Product, ProductImage as ProductImageType } from '../types/product';

export const PRODUCT_PLACEHOLDER = '/assets/product-placeholder.png';

export function getProductImageUrl(value?: string | null): string {
  const image = value?.trim();
  if (!image || image === 'null' || image === 'undefined') return PRODUCT_PLACEHOLDER;
  if (/^https?:\/\//i.test(image) || image.startsWith('data:') || image.startsWith('blob:')) return image;
  return image.startsWith('/') ? image : `/${image.replace(/^\/+/, '')}`;
}

export function getPrimaryProductImage(product: Pick<Product, 'primary_image' | 'images' | 'main_image'>): string {
  return getProductImageUrl(product.primary_image?.image_url ?? product.images?.[0]?.image_url ?? product.main_image);
}

export function productImagePaths(images?: ProductImageType[]): string[] {
  return (images || []).map(image => getProductImageUrl(image.image_url));
}
