import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star, Zap } from 'lucide-react';
import { useProductsStore } from '../../stores/productsStore';
import { formatCurrency } from '../../lib/utils';
import type { Product } from '../../types/product';
import ProductImage from './ProductImage';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist } = useProductsStore();
  const name = product.product_name;
  const brand = product.brand || '';
  const variant = product.display_variant;
  const hasDiscount = variant.sale_price != null && variant.sale_price < variant.price;
  const discountPercent = hasDiscount ? Math.round((1 - variant.sale_price! / variant.price) * 100) : 0;
  const wishlisted = isInWishlist(product.id);
  const outOfStock = variant.available <= 0;
  const averageRating = product.averageRating;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -8 }}
      className="group relative bg-[#0F172A] border border-[#1e293b] rounded-2xl overflow-hidden shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-500/30 transition-all duration-500 ease-out"
    >
      {/* Image Container */}
      <Link to={`/products/${product.slug || product.id}`} className="block relative overflow-hidden aspect-[4/5]">
        <ProductImage
          src={product.primary_image?.image_url}
          alt={name}
          className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 ${outOfStock ? 'opacity-40 grayscale' : ''}`}
        />
        {/* Gradient Overlay từ dưới lên */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Badges - Glassmorphism */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {hasDiscount && (
            <span className="px-3 py-1 rounded-full text-xs font-bold backdrop-blur-xl bg-gradient-to-r from-orange-500/80 to-orange-600/80 text-white border border-orange-400/30 shadow-lg shadow-orange-500/20">
              -{discountPercent}%
            </span>
          )}
          {product.is_featured && (
            <span className="px-3 py-1 rounded-full text-xs font-bold backdrop-blur-xl bg-gradient-to-r from-yellow-500/80 to-amber-600/80 text-white border border-yellow-400/30 shadow-lg shadow-yellow-500/20 flex items-center gap-1">
              <Zap size={10} /> HOT
            </span>
          )}
        </div>

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-xl bg-black/60 text-white border border-white/10">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-4 space-y-3">
        {/* Brand */}
        {brand && (
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-orange-400/80">
            {brand}
          </p>
        )}

        {/* Product Name */}
        <Link to={`/products/${product.slug || product.id}`}>
          <h3 className="font-bold text-sm leading-tight text-white group-hover:text-orange-400 transition-colors duration-300 line-clamp-2">
            {name}
          </h3>
        </Link>
        <Link className="block text-xs text-slate-400 hover:text-emerald-400" to={`/shops/${product.shop.slug}`}>
          {product.shop.name}{product.shop.isVerified?' · Đã xác minh':''}
        </Link>

        {/* Variant Chips */}
        {(variant.weight || variant.options.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {variant.weight && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-dark-800/80 text-dark-300 border border-dark-700/50">
                {variant.weight}lb
              </span>
            )}
            {variant.options.map(option => (
              <span key={`${option.option_id}-${option.value_id}`} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-500/20">
                {option.option_name}: {option.value}
              </span>
            ))}
          </div>
        )}

        {/* Rating + Price */}
        <div className="flex items-end justify-between">
          <div>
            {hasDiscount ? (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-orange-400">
                  {formatCurrency(variant.effective_price)}
                </span>
                <span className="text-xs text-dark-400 line-through">
                  {formatCurrency(variant.price)}
                </span>
              </div>
            ) : (
              <span className="text-lg font-extrabold text-white">{product.minPrice===product.maxPrice?formatCurrency(product.minPrice):`${formatCurrency(product.minPrice)} – ${formatCurrency(product.maxPrice)}`}</span>
            )}
          </div>
          {product.averageRating != null ? (
            <div className="flex items-center gap-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={10}
                     className={star <= Math.round(averageRating ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-dark-600'}
                  />
                ))}
              </div>
              <span className="text-[10px] font-medium text-dark-400">
                 {averageRating?.toFixed(1)} ({product.reviewCount})
              </span>
            </div>
          ):<span className="text-[10px] text-slate-500">Chưa có đánh giá</span>}
        </div>
        <p className="text-xs text-slate-400">{product.soldCount} đã bán · {product.commentCount} nhận xét</p>

        <p className={`text-xs font-medium ${outOfStock ? 'text-red-400' : 'text-emerald-400'}`}>
          {outOfStock ? 'Out of Stock' : `${variant.available} in stock`}
        </p>

        {/* Action Buttons - ẩn/hiện khi hover */}
        <div className="flex gap-2 pt-1 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
          <button
            onClick={() => addToCart(product.id,product.display_variant.id,1)}
            disabled={outOfStock}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
              bg-gradient-to-r from-orange-500 to-orange-600 text-white
              hover:from-orange-400 hover:to-orange-500
              disabled:from-dark-700 disabled:to-dark-700 disabled:text-dark-400 disabled:cursor-not-allowed
              shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30
              transition-all duration-300"
          >
            <ShoppingCart size={14} />
            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <button
            onClick={() => toggleWishlist(product.id)}
            className={`p-2.5 rounded-xl border transition-all duration-300 ${
              wishlisted
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400'
            }`}
          >
            <Heart size={16} className={wishlisted ? 'fill-red-400' : ''} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
