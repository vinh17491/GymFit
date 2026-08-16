import { Router,Request,Response,NextFunction } from 'express';
import { validate } from '../../middleware/validate';
import { productsService,ProductListParams } from './products.service';
import { productListQuerySchema,productLookupSchema } from './products.validation';
import { reviewsService } from '../reviews/reviews.service';
import { publicProductParams,reviewListQuery } from '../reviews/reviews.validation';

const router=Router();
export default router;

function params(query:any,overrides:Partial<ProductListParams>={}):ProductListParams{return{
  q:query.q,categoryId:query.categoryId,categorySlug:query.category,brandId:query.brandId,brandSlug:query.brand,shopSlug:query.shopSlug,
  verifiedShop:query.verifiedShop,minPrice:query.minPrice,maxPrice:query.maxPrice,inStock:query.inStock,
  minRating:query.minRating,
  featured:query.featured,saleOnly:query.saleOnly,page:query.page,pageSize:query.pageSize,sort:query.sort,...overrides
};}
function response(res:Response,result:Awaited<ReturnType<typeof productsService.list>>){
  res.json({success:true,data:result.products,pagination:{page:result.page,limit:result.pageSize,pageSize:result.pageSize,total:result.total,pages:Math.ceil(result.total/result.pageSize),totalPages:Math.ceil(result.total/result.pageSize)}});
}
const list=async(req:Request,res:Response,next:NextFunction)=>{try{response(res,await productsService.list(params(req.query)));}catch(e){next(e);}};
router.get('/',validate(productListQuerySchema,'query'),list);
router.get('/featured',validate(productListQuerySchema,'query'),async(req,res,next)=>{try{response(res,await productsService.list(params(req.query,{page:1,pageSize:12,featured:true,sort:'featured'})));}catch(e){next(e);}});
router.get('/new',validate(productListQuerySchema,'query'),async(req,res,next)=>{try{response(res,await productsService.list(params(req.query,{page:1,pageSize:12,sort:'newest'})));}catch(e){next(e);}});
router.get('/sale',validate(productListQuerySchema,'query'),async(req,res,next)=>{try{response(res,await productsService.list(params(req.query,{page:1,pageSize:12,saleOnly:true,sort:'sale'})));}catch(e){next(e);}});
router.get('/filters',async(_req,res,next)=>{try{res.json({success:true,data:await productsService.getFilters()});}catch(e){next(e);}});
router.get('/:identifier/reviews',validate(publicProductParams,'params'),validate(reviewListQuery,'query'),async(req,res,next)=>{try{
  res.json({success:true,data:await reviewsService.publicProduct(req.params.identifier,req.query as any)});
}catch(e){next(e);}});
router.get('/:slug',validate(productLookupSchema,'params'),async(req,res,next)=>{try{
  let product=await productsService.getBySlug(req.params.slug);
  if(!product&&/^\d+$/.test(req.params.slug))product=await productsService.getById(Number(req.params.slug));
  if(!product)return res.status(404).json({success:false,message:'Product not found'});
  res.json({success:true,data:product});
}catch(e){next(e);}});
