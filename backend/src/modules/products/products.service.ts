import { getPool, sql } from '../../config/database';
import { productScopes } from './product-ownership.service';

export type MarketplaceSort =
  | 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc'
  | 'featured' | 'sale' | 'rating' | 'best_selling';

export interface ProductListParams {
  q?: string;
  categoryId?: number;
  categorySlug?: string;
  brandId?: number;
  brandSlug?: string;
  shopSlug?: string;
  verifiedShop?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  featured?: boolean;
  saleOnly?: boolean;
  page: number;
  pageSize: number;
  sort: MarketplaceSort;
}

export interface ProductListResult {
  products: any[];
  page: number;
  pageSize: number;
  total: number;
}

const variantStatsApply = `
CROSS APPLY (
  SELECT MIN(x.effective_price) min_price, MAX(x.effective_price) max_price,
    SUM(COALESCE(x.available,0)) available_quantity,
    MAX(CASE WHEN COALESCE(x.available,0)>0 THEN 1 ELSE 0 END) in_stock
  FROM (
    SELECT CASE WHEN v.sale_price IS NOT NULL AND v.sale_price<v.price THEN v.sale_price ELSE v.price END effective_price,
      i.available
    FROM dbo.ProductVariants v
    LEFT JOIN dbo.Inventory i ON i.variant_id=v.id
    WHERE v.product_id=p.id AND v.is_active=1
  ) x
  HAVING COUNT(*)>0
) stats`;

const displayVariantApply = `
CROSS APPLY (
  SELECT TOP (1) v.id,v.variant_name,v.sku,v.barcode,v.price,v.sale_price,
    CASE WHEN v.sale_price IS NOT NULL AND v.sale_price<v.price THEN v.sale_price ELSE v.price END effective_price,
    v.weight,v.is_active,v.is_default,COALESCE(i.available,0) available
  FROM dbo.ProductVariants v LEFT JOIN dbo.Inventory i ON i.variant_id=v.id
  WHERE v.product_id=p.id AND v.is_active=1
  ORDER BY CASE WHEN COALESCE(i.available,0)>0 THEN 0 ELSE 1 END,v.is_default DESC,v.id
) dv`;

const joins = `
JOIN dbo.Shops shop ON shop.id=p.shop_id
LEFT JOIN dbo.Brands b ON b.id=p.brand_id
LEFT JOIN dbo.Categories c ON c.id=p.category_id
${variantStatsApply}
${displayVariantApply}
OUTER APPLY (
  SELECT TOP (1) pi.id,pi.image_url,pi.is_primary,pi.sort_order
  FROM dbo.ProductImages pi WHERE pi.product_id=p.id
  ORDER BY pi.is_primary DESC,pi.sort_order,pi.id
) primary_image
OUTER APPLY (
  SELECT CAST(AVG(CAST(r.rating AS DECIMAL(10,4))) AS DECIMAL(4,2)) average_rating,
    COUNT_BIG(*) review_count,
    SUM(CASE WHEN r.comment IS NOT NULL THEN CAST(1 AS BIGINT) ELSE CAST(0 AS BIGINT) END) comment_count
  FROM dbo.ProductReviews r WHERE r.product_id=p.id AND r.status=N'PUBLISHED'
) review_stats
OUTER APPLY (
  SELECT COALESCE(SUM(CAST(oi.quantity AS BIGINT)),0) sold_count
  FROM dbo.OrderItems oi JOIN dbo.ShopOrders so ON so.id=oi.shop_order_id
  JOIN dbo.Orders delivered_order ON delivered_order.id=oi.order_id
  WHERE oi.product_id=p.id AND so.delivered_at IS NOT NULL
    AND so.status NOT IN(N'CANCELLED',N'UNABLE_TO_FULFILL')
    AND delivered_order.logistics_status=N'DELIVERED'
) sold_stats`;

function bind(request: sql.Request, params: ProductListParams) {
  if (params.q) {
    request.input('q', sql.NVarChar(120), params.q);
    request.input('qPrefix', sql.NVarChar(121), `${params.q}%`);
    request.input('qLike', sql.NVarChar(122), `%${params.q}%`);
  }
  if (params.categoryId !== undefined) request.input('categoryId', sql.Int, params.categoryId);
  if (params.categorySlug) request.input('categorySlug', sql.NVarChar(200), params.categorySlug);
  if (params.brandId !== undefined) request.input('brandId', sql.Int, params.brandId);
  if (params.brandSlug) request.input('brandSlug', sql.NVarChar(200), params.brandSlug);
  if (params.shopSlug) request.input('shopSlug', sql.NVarChar(200), params.shopSlug);
  if (params.verifiedShop !== undefined) request.input('verifiedShop', sql.Bit, params.verifiedShop);
  if (params.minPrice !== undefined) request.input('minPrice', sql.Decimal(18, 2), params.minPrice);
  if (params.maxPrice !== undefined) request.input('maxPrice', sql.Decimal(18, 2), params.maxPrice);
  if (params.minRating !== undefined) request.input('minRating', sql.Decimal(3, 2), params.minRating);
}

function where(params: ProductListParams) {
  const clauses = [productScopes.public];
  if (params.q) clauses.push(`(p.product_name LIKE @qLike OR p.slug LIKE @qLike OR b.name LIKE @qLike
    OR c.name LIKE @qLike OR shop.name LIKE @qLike
    OR EXISTS(SELECT 1 FROM dbo.ProductVariants sv WHERE sv.product_id=p.id AND sv.is_active=1 AND sv.sku LIKE @qLike))`);
  if (params.categoryId !== undefined) clauses.push('p.category_id=@categoryId');
  if (params.categorySlug) clauses.push('c.slug=@categorySlug');
  if (params.brandId !== undefined) clauses.push('p.brand_id=@brandId');
  if (params.brandSlug) clauses.push('b.slug=@brandSlug');
  if (params.shopSlug) clauses.push('shop.slug=@shopSlug');
  if (params.verifiedShop !== undefined) clauses.push('shop.is_verified=@verifiedShop');
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const range = [
      'rv.product_id=p.id', 'rv.is_active=1',
      params.minPrice !== undefined ? '(CASE WHEN rv.sale_price IS NOT NULL AND rv.sale_price<rv.price THEN rv.sale_price ELSE rv.price END)>=@minPrice' : '',
      params.maxPrice !== undefined ? '(CASE WHEN rv.sale_price IS NOT NULL AND rv.sale_price<rv.price THEN rv.sale_price ELSE rv.price END)<=@maxPrice' : ''
    ].filter(Boolean).join(' AND ');
    clauses.push(`EXISTS(SELECT 1 FROM dbo.ProductVariants rv WHERE ${range})`);
  }
  if (params.inStock !== undefined) clauses.push(params.inStock ? 'stats.in_stock=1' : 'stats.in_stock=0');
  if (params.featured) clauses.push('p.is_featured=1');
  if (params.saleOnly) clauses.push('EXISTS(SELECT 1 FROM dbo.ProductVariants sv WHERE sv.product_id=p.id AND sv.is_active=1 AND sv.sale_price IS NOT NULL AND sv.sale_price<sv.price)');
  if (params.minRating !== undefined) clauses.push('review_stats.average_rating>=@minRating');
  return `WHERE ${clauses.join(' AND ')}`;
}

function order(params: ProductListParams) {
  switch (params.sort) {
    case 'price_asc': return 'ORDER BY stats.min_price ASC,p.id ASC';
    case 'price_desc': return 'ORDER BY stats.max_price DESC,p.id ASC';
    case 'name_asc': return 'ORDER BY p.product_name ASC,p.id ASC';
    case 'name_desc': return 'ORDER BY p.product_name DESC,p.id DESC';
    case 'featured': return 'ORDER BY p.is_featured DESC,p.created_at DESC,p.id DESC';
    case 'sale': return 'ORDER BY CASE WHEN dv.sale_price IS NOT NULL AND dv.sale_price<dv.price THEN 0 ELSE 1 END,stats.min_price,p.id';
    case 'rating': return 'ORDER BY review_stats.average_rating DESC,review_stats.review_count DESC,p.id DESC';
    case 'best_selling': return 'ORDER BY sold_stats.sold_count DESC,p.id DESC';
    case 'relevance':
      if (params.q) return `ORDER BY CASE
        WHEN p.product_name=@q THEN 0 WHEN p.product_name LIKE @qPrefix THEN 1
        WHEN p.product_name LIKE @qLike THEN 2
        WHEN b.name LIKE @qLike OR c.name LIKE @qLike OR shop.name LIKE @qLike THEN 3 ELSE 4 END,
        p.created_at DESC,p.id DESC`;
      return 'ORDER BY p.created_at DESC,p.id DESC';
    default: return 'ORDER BY p.created_at DESC,p.id DESC';
  }
}

const select = `SELECT p.id,p.product_name,p.slug,p.description,p.description short_description,p.specifications,
  p.is_active,p.is_featured,p.is_on_sale,p.created_at,
  b.id brand_id,b.name brand,b.slug brand_slug,c.id category_id,c.name category,c.slug category_slug,
  shop.id shop_id,shop.name shop_name,shop.slug shop_slug,shop.logo_url shop_logo_url,shop.is_verified shop_verified,
  stats.min_price,stats.max_price,stats.available_quantity,stats.in_stock,
  dv.id variant_id,dv.variant_name,dv.sku variant_sku,dv.barcode variant_barcode,dv.price variant_price,
  dv.sale_price variant_sale_price,dv.effective_price,dv.weight variant_weight,dv.is_active variant_is_active,
  dv.is_default variant_is_default,dv.available variant_available,
  primary_image.id image_id,primary_image.image_url,primary_image.is_primary image_is_primary,
  primary_image.sort_order image_sort_order,review_stats.average_rating,review_stats.review_count,
  review_stats.comment_count,sold_stats.sold_count
FROM dbo.Products p ${joins}`;

function mapProduct(row: any) {
  const stockStatus = Number(row.variant_available) <= 0 ? 'OUT_OF_STOCK' : Number(row.variant_available) <= 5 ? 'LOW_STOCK' : 'IN_STOCK';
  const displayVariant = {
    id:Number(row.variant_id),product_id:Number(row.id),variant_name:row.variant_name,sku:row.variant_sku,
    barcode:row.variant_barcode??null,price:Number(row.variant_price),sale_price:row.variant_sale_price==null?null:Number(row.variant_sale_price),
    effective_price:Number(row.effective_price),weight:row.variant_weight==null?null:Number(row.variant_weight),
    is_active:Boolean(row.variant_is_active),available:Number(row.variant_available),is_default:Boolean(row.variant_is_default),
    stock_status:stockStatus,productId:Number(row.id),variantName:row.variant_name,salePrice:row.variant_sale_price==null?null:Number(row.variant_sale_price),
    effectivePrice:Number(row.effective_price),isDefault:Boolean(row.variant_is_default),stockStatus,options:[]
  };
  const primaryImage = row.image_id==null ? null : {
    id:Number(row.image_id),image_url:row.image_url,is_primary:Boolean(row.image_is_primary),sort_order:Number(row.image_sort_order)
  };
  return {
    id:Number(row.id),product_name:row.product_name,slug:row.slug,description:row.description??null,
    short_description:row.short_description??null,specifications:row.specifications??null,
    brand:row.brand??null,brand_id:row.brand_id==null?null:Number(row.brand_id),brand_slug:row.brand_slug??null,
    category:row.category??null,category_id:row.category_id==null?null:Number(row.category_id),category_slug:row.category_slug??null,
    shop:{id:Number(row.shop_id),name:row.shop_name,slug:row.shop_slug,logoUrl:row.shop_logo_url??null,isVerified:Boolean(row.shop_verified)},
    is_active:Boolean(row.is_active),is_featured:Boolean(row.is_featured),is_on_sale:Boolean(row.is_on_sale),created_at:row.created_at,
    minPrice:Number(row.min_price),maxPrice:Number(row.max_price),inStock:Boolean(row.in_stock),
    availableQuantity:Number(row.available_quantity),display_variant:displayVariant,primary_image:primaryImage,images:primaryImage?[primaryImage]:[],
    price:displayVariant.price,sale_price:displayVariant.sale_price,stock:displayVariant.available,sku:displayVariant.sku,
    main_image:row.image_url??null,additional_images:null
    ,averageRating:row.average_rating==null?null:Number(row.average_rating),reviewCount:Number(row.review_count??0),
    commentCount:Number(row.comment_count??0),soldCount:Number(row.sold_count??0),
    rating:row.average_rating==null?null:Number(row.average_rating),review_count:Number(row.review_count??0)
  };
}

async function attachDetail(product: any) {
  const pool=await getPool();
  const [imagesResult,variantsResult,optionsResult]=await Promise.all([
    pool.request().input('productId',sql.Int,product.id).query(`SELECT id,image_url,is_primary,sort_order FROM dbo.ProductImages WHERE product_id=@productId ORDER BY is_primary DESC,sort_order,id`),
    pool.request().input('productId',sql.Int,product.id).query(`SELECT v.id,v.product_id,v.variant_name,v.sku,v.barcode,v.price,v.sale_price,
      CASE WHEN v.sale_price IS NOT NULL AND v.sale_price<v.price THEN v.sale_price ELSE v.price END effective_price,
      v.weight,v.is_active,v.is_default,COALESCE(i.available,0) available
      FROM dbo.ProductVariants v LEFT JOIN dbo.Inventory i ON i.variant_id=v.id
      WHERE v.product_id=@productId AND v.is_active=1 ORDER BY CASE WHEN COALESCE(i.available,0)>0 THEN 0 ELSE 1 END,v.is_default DESC,v.id`),
    pool.request().input('productId',sql.Int,product.id).query(`SELECT vov.variant_id,po.id option_id,po.name option_name,pov.id value_id,pov.value
      FROM dbo.VariantOptionValues vov JOIN dbo.ProductVariants v ON v.id=vov.variant_id
      JOIN dbo.ProductOptions po ON po.id=vov.product_option_id
      JOIN dbo.ProductOptionValues pov ON pov.product_option_id=vov.product_option_id AND pov.id=vov.product_option_value_id
      WHERE v.product_id=@productId AND v.is_active=1 ORDER BY vov.variant_id,po.sort_order,po.id,pov.sort_order,pov.id`)
  ]);
  const options=new Map<number,any[]>();
  for(const o of optionsResult.recordset){const list=options.get(Number(o.variant_id))??[];list.push({...o,optionId:o.option_id,optionName:o.option_name,valueId:o.value_id});options.set(Number(o.variant_id),list);}
  product.variants=variantsResult.recordset.map((v:any)=>{const status=Number(v.available)<=0?'OUT_OF_STOCK':Number(v.available)<=5?'LOW_STOCK':'IN_STOCK';return{
    ...v,id:Number(v.id),product_id:Number(v.product_id),price:Number(v.price),sale_price:v.sale_price==null?null:Number(v.sale_price),
    effective_price:Number(v.effective_price),available:Number(v.available),is_active:Boolean(v.is_active),is_default:Boolean(v.is_default),
    stock_status:status,productId:Number(v.product_id),variantName:v.variant_name,salePrice:v.sale_price==null?null:Number(v.sale_price),
    effectivePrice:Number(v.effective_price),isDefault:Boolean(v.is_default),stockStatus:status,options:options.get(Number(v.id))??[]
  };});
  product.display_variant=product.variants.find((v:any)=>v.id===product.display_variant.id)??product.variants[0]??null;
  product.images=imagesResult.recordset.map((i:any)=>({...i,id:Number(i.id),is_primary:Boolean(i.is_primary),sort_order:Number(i.sort_order)}));
  product.primary_image=product.images[0]??null;product.main_image=product.images[0]?.image_url??null;
  product.additional_images=product.images.filter((i:any)=>!i.is_primary).map((i:any)=>i.image_url).join(',')||null;
  return product;
}

export const productsService = {
  async list(params:ProductListParams):Promise<ProductListResult>{
    const pool=await getPool(),filter=where(params);
    const countRequest=pool.request();bind(countRequest,params);
    const count=await countRequest.query(`SELECT COUNT_BIG(*) total FROM dbo.Products p ${joins} ${filter}`);
    const request=pool.request();bind(request,params);request.input('offset',sql.Int,(params.page-1)*params.pageSize).input('pageSize',sql.Int,params.pageSize);
    const rows=await request.query(`${select} ${filter} ${order(params)} OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`);
    return{products:rows.recordset.map(mapProduct),page:params.page,pageSize:params.pageSize,total:Number(count.recordset[0].total)};
  },
  async getBySlug(slug:string){return this.getDetail('p.slug=@lookup',slug);},
  async getById(id:number){return this.getDetail('p.id=@lookup',id);},
  async getDetail(predicate:string,lookup:string|number,includeInactive=false){
    const pool=await getPool(),request=pool.request();
    if(typeof lookup==='number')request.input('lookup',sql.Int,lookup);else request.input('lookup',sql.NVarChar(255),lookup);
    const result=await request.query(`${select} WHERE ${predicate}${includeInactive?'':` AND ${productScopes.public}`}`);
    return result.recordset[0]?attachDetail(mapProduct(result.recordset[0])):null;
  },
  async getFilters(){
    const pool=await getPool();
    const [categories,brands,shops]=await Promise.all([
      pool.request().query(`SELECT c.id,c.slug,c.name FROM dbo.Categories c WHERE c.is_active=1 AND EXISTS(SELECT 1 FROM dbo.Products p JOIN dbo.Shops shop ON shop.id=p.shop_id WHERE p.category_id=c.id AND ${productScopes.public}) ORDER BY c.name,c.id`),
      pool.request().query(`SELECT b.id,b.slug,b.name,b.is_generic isGeneric FROM dbo.Brands b WHERE b.is_active=1 AND EXISTS(SELECT 1 FROM dbo.Products p JOIN dbo.Shops shop ON shop.id=p.shop_id WHERE p.brand_id=b.id AND ${productScopes.public}) ORDER BY b.name,b.id`),
      pool.request().query(`SELECT s.id,s.name,s.slug,s.logo_url logoUrl,s.is_verified isVerified FROM dbo.Shops s WHERE s.status=N'ACTIVE' AND EXISTS(SELECT 1 FROM dbo.Products p WHERE p.shop_id=s.id AND p.is_active=1 AND p.moderation_status=N'PUBLISHED') ORDER BY s.name,s.id`)
    ]);
    return{categories:categories.recordset,brands:brands.recordset.map((x:any)=>({...x,isGeneric:Boolean(x.isGeneric)})),shops:shops.recordset.map((x:any)=>({...x,id:Number(x.id),isVerified:Boolean(x.isVerified)}))};
  }
};
