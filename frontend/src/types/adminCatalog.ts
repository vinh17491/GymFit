export interface Pagination { page:number; limit:number; total:number; pages:number }
export interface ApiResponse<T>{ success:boolean; data:T; message?:string; pagination?:Pagination }
export interface Category { id:number; name:string; slug:string; description:string|null; image_url:string|null; is_active:boolean; sort_order:number; product_count:number; updated_at:string }
export interface Brand { id:number; name:string; slug:string; description:string|null; logo_url:string|null; is_active:boolean; product_count:number; updated_at:string }
export interface CategoryInput { name:string; slug?:string; description?:string|null; image_url?:string|null; sort_order?:number; is_active?:boolean }
export interface BrandInput { name:string; slug?:string; description?:string|null; logo_url?:string|null; is_active?:boolean }
export type CatalogSortField = 'name'|'created_at'|'product_count'|'sort_order';
export type CatalogSortOrder = 'asc'|'desc';
export interface CatalogListFilters { page:number; limit:number; search?:string; status?:''|'active'|'inactive'; sortBy:CatalogSortField; sortOrder:CatalogSortOrder }
export interface CatalogActionResult { id:number; action:'DELETED'|'DISABLED_REFERENCED' }
export interface CatalogFormErrors { name?:string; slug?:string; description?:string; imageUrl?:string; sortOrder?:string }
export interface ProductVariant { id:number; product_id:number; variant_name:string; sku:string; barcode:string|null; price:number; sale_price:number|null; weight:number|null; is_active:boolean; is_default:boolean; on_hand:number; reserved:number; available:number; low_stock_threshold:number; stock_status:'IN_STOCK'|'LOW_STOCK'|'OUT_OF_STOCK' }
export interface InventoryItem { inventory_id:number; variant_id:number; product_id:number; product_name:string; category:string|null; brand:string|null; variant_name:string; sku:string; on_hand:number; reserved:number; available:number; low_stock_threshold:number; stock_status:'IN_STOCK'|'LOW_STOCK'|'OUT_OF_STOCK'; last_restocked:string|null; updated_at:string }
export interface InventoryAdjustment { id:string; adjustment_type:'RESTOCK'|'MANUAL_CORRECTION'; quantity_delta:number; previous_on_hand:number; new_on_hand:number; reason:string; reference_type:string|null; reference_id:string|null; created_at:string; admin_name:string; admin_email:string }
export interface ThresholdUpdateInput { lowStockThreshold:number }
export interface AdjustmentHistoryFilters { type:''|'RESTOCK'|'MANUAL_CORRECTION'; dateFrom:string; dateTo:string; page:number; limit:10|20|50|100 }
export interface AdjustmentHistoryResponse { success:boolean; data:InventoryAdjustment[]; pagination:Pagination; message?:string }
export interface InventoryDetail extends InventoryItem { latest_adjustments:InventoryAdjustment[] }
export interface VariantUpdateInput { variant_name?:string;sku?:string;barcode?:string|null;price?:number;sale_price?:number|null;weight?:number|null;is_active?:boolean;is_default?:boolean;option_value_ids?:number[] }
export interface VariantCreateInput extends VariantUpdateInput { variant_name:string;sku:string;price:number;initial_on_hand?:number;low_stock_threshold?:number }
export interface AdminProductSummary { id:number; product_name:string; slug:string; is_active:boolean }
export interface VariantFormErrors { sku?:string }

export type InventoryStatus = '' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type InventorySortBy = 'product_name' | 'sku' | 'on_hand' | 'reserved' | 'available' | 'low_stock_threshold' | 'updated_at';
export interface InventoryFilters { search:string; categoryId:string; brandId:string; productId:string; status:InventoryStatus; lowStock:boolean; sortBy:InventorySortBy; sortOrder:'asc'|'desc'; page:number; limit:number }
export interface AdminProductOption { id:number; product_name:string; is_active:boolean }
export type InventoryAdjustmentInput =
 | { type:'RESTOCK'|'MANUAL_CORRECTION'; quantityDelta:number; reason:string; referenceType?:string|null; referenceId?:string|null }
 | { type:'MANUAL_CORRECTION'; targetOnHand:number; reason:string; referenceType?:string|null; referenceId?:string|null };
export interface InventoryAdjustmentResult { adjustmentId:string; variantId:number; previousOnHand:number; quantityDelta:number; newOnHand:number; reserved:number; available:number; type:'RESTOCK'|'MANUAL_CORRECTION' }
