import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Heart,
  Star,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Shield,
  Truck,
  RefreshCw,
  CheckCircle,
  X,
  Minus,
  Plus,
  StarHalf,
} from "lucide-react";
import { cn, formatCurrency } from "../../lib/utils";
import api from "../../api/axios";
import { reviewsApi } from "../../services/reviewsApi";
import type { MarketplaceReview } from "../../types/reviews";
import { useAuthStore } from "../../stores/authStore";
import { useProductsStore } from "../../stores/productsStore";
import type {
  Product,
  ProductDetail,
  ProductDetailResponse,
  ProductImage,
} from "../../types/product";
import SafeProductImage from "../../components/products/ProductImage";
import {
  getPrimaryProductImage,
  getProductImageUrl,
  PRODUCT_PLACEHOLDER,
} from "../../lib/productImages";

/* ──────────────────────────────── Types ──────────────────────────────── */
/* ──────────────────────────────── Helpers ──────────────────────────────── */
const discountPct = (p: Product) =>
  p.display_variant.sale_price != null &&
  p.display_variant.sale_price < p.display_variant.price
    ? Math.round(
        ((p.display_variant.price - p.display_variant.sale_price) /
          p.display_variant.price) *
          100,
      )
    : 0;

const primaryImageUrl = getPrimaryProductImage;

/* ──────────────────────────────── Sub-components ──────────────────────────────── */

/* Star rating row (display only) */
const Stars = ({ rating, size = 16 }: { rating: number; size?: number }) => {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.25;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < full)
          return (
            <Star
              key={i}
              size={size}
              className="fill-yellow-400 text-yellow-400"
            />
          );
        if (i === full && hasHalf)
          return (
            <StarHalf
              key={i}
              size={size}
              className="fill-yellow-400 text-yellow-400"
            />
          );
        return <Star key={i} size={size} className="text-gray-600" />;
      })}
    </div>
  );
};

/* Image Gallery – thumbnails, zoom, lightbox */
const ImageGallery = ({ images }: { images: ProductImage[] }) => {
  const allImages = images.length
    ? images.map((image) => getProductImageUrl(image.image_url))
    : [PRODUCT_PLACEHOLDER];
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  /* keyboard nav in lightbox */
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") setActiveIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight")
        setActiveIdx((i) => Math.min(allImages.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen]);

  return (
    <>
      {/* Main image */}
      <div
        className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-crosshair group bg-gray-900/60"
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onClick={() => setLightboxOpen(true)}
      >
        <SafeProductImage
          src={allImages[activeIdx]}
          alt=""
          className={cn(
            "w-full h-full object-cover transition-transform duration-500",
            zoomed && "scale-125",
          )}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

        {/* Zoom hint */}
        <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm rounded-full p-2 text-white/70">
          <ZoomIn size={18} />
        </div>

        {/* Nav arrows (on hover) */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx((i) => Math.max(0, i - 1));
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={activeIdx === 0}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx((i) => Math.min(allImages.length - 1, i + 1));
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={activeIdx === allImages.length - 1}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200",
                i === activeIdx
                  ? "border-orange-500 ring-1 ring-orange-500/30"
                  : "border-white/10 hover:border-white/30",
              )}
            >
              <SafeProductImage
                src={img}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox overlay */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors"
            >
              <X size={24} />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-4 text-white/60 text-sm font-body">
              {activeIdx + 1} / {allImages.length}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx((i) => Math.max(0, i - 1));
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors"
              disabled={activeIdx === 0}
            >
              <ChevronLeft size={28} />
            </button>

            <motion.img
              key={activeIdx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              src={allImages[activeIdx]}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                if (
                  e.currentTarget.src !==
                  new URL(PRODUCT_PLACEHOLDER, window.location.href).href
                )
                  e.currentTarget.src = PRODUCT_PLACEHOLDER;
                else e.currentTarget.onerror = null;
              }}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx((i) => Math.min(allImages.length - 1, i + 1));
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors"
              disabled={activeIdx === allImages.length - 1}
            >
              <ChevronRight size={28} />
            </button>

            {/* Lightbox thumbnails */}
            <div className="absolute bottom-4 flex gap-2">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIdx(i);
                  }}
                  className={cn(
                    "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                    i === activeIdx
                      ? "border-orange-500"
                      : "border-transparent opacity-60 hover:opacity-100",
                  )}
                >
                  <SafeProductImage
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* Pill selector (flavour / size / colour) */
const PillSelect = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}) => {
  if (!options || options.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-medium text-gray-400 mb-2 font-body">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 font-body",
              value === opt
                ? "border-orange-500 bg-orange-500/10 text-orange-400"
                : "border-white/10 text-gray-300 hover:border-white/30 hover:text-white",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

/* Trust badge row */
const TrustBadges = () => {
  const items = [
    { icon: Truck, label: "Free Shipping", sub: "Orders over $50" },
    { icon: RefreshCw, label: "Easy Returns", sub: "30-day return" },
    { icon: Shield, label: "Secure Checkout", sub: "SSL encrypted" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ icon: Icon, label, sub }) => (
        <div
          key={label}
          className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3"
        >
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Icon size={18} className="text-orange-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white font-body">
              {label}
            </p>
            <p className="text-[10px] text-gray-500 font-body">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* Frequently Bought Together */
const FBTItem = ({
  p,
  checked,
  onToggle,
}: {
  p: Product;
  checked: boolean;
  onToggle: () => void;
}) => (
  <label className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 cursor-pointer hover:bg-white/[0.06] transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={onToggle}
      className="accent-orange-500 w-4 h-4"
    />
    <SafeProductImage
      src={primaryImageUrl(p)}
      alt=""
      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
    />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white truncate font-body">
        {p.product_name}
      </p>
      <p className="text-xs text-gray-400 font-body">
        {formatCurrency(p.display_variant.effective_price)}
      </p>
    </div>
  </label>
);

/* ──────────────────────────────── Loading Skeleton ──────────────────────────────── */
const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-white/[0.06] rounded-xl", className)} />
);

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-[#020617]">
    {/* floating orbs bg */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
    </div>
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-4 w-64 mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery skeleton */}
        <div className="space-y-3">
          <Skeleton className="aspect-[4/3] rounded-2xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-16 h-16 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Info skeleton */}
        <div className="space-y-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-4 h-4 rounded" />
            ))}
          </div>
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20 rounded-full" />
            <Skeleton className="h-10 w-20 rounded-full" />
            <Skeleton className="h-10 w-20 rounded-full" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="mt-12">
        <div className="flex gap-6 border-b border-white/10 pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-24" />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>

      {/* FBT skeleton */}
      <div className="mt-12">
        <Skeleton className="h-7 w-64 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Related skeleton */}
      <div className="mt-12">
        <Skeleton className="h-7 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ──────────────────────────────── Main Component ──────────────────────────────── */
export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [productReviews, setProductReviews] = useState<MarketplaceReview[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("description");
  const [addedToCart, setAddedToCart] = useState(false);
  const [fbtChecked, setFbtChecked] = useState<boolean[]>([]);

  const { isAuthenticated } = useAuthStore();
  const { addToCart, toggleWishlist, isInWishlist } = useProductsStore();
  const inWishlist = isInWishlist(product?.id ?? 0);

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<ProductDetailResponse>(`/products/${id}`);
      const p = res.data.data || null;
      setProduct(p);
      const variants = p?.variants || [];
      const selected =
        variants.find((variant) => variant.id === p?.display_variant?.id) ||
        variants.find((variant) => variant.is_default) ||
        variants[0];
      setSelectedVariantId(selected?.id ?? null);
      setRelatedProducts(res.data.related_products || []);
      try {
        const reviewResponse = await reviewsApi.productPublic(id || String(p?.id ?? ""));
        setProductReviews(reviewResponse.data.data.items);
      } catch {
        setProductReviews([]);
      }
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Product not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchProduct();
  }, [id, fetchProduct]);

  const handleAddToCart = async () => {
    if (!product || selectedVariantId === null) return;
    addToCart(product.id, selectedVariantId, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleWishlist = () => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    if (product) toggleWishlist(product.id);
  };

  /* ──── render ──── */
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center max-w-md mx-auto px-4"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <X size={36} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 font-display">
            Product Not Found
          </h1>
          <p className="text-gray-400 mb-6 font-body">
            {error ||
              "The product you're looking for doesn't exist or has been removed."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={fetchProduct}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-body"
            >
              Try Again
            </button>
            <Link
              to="/products"
              className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 font-semibold rounded-xl hover:bg-white/10 transition-all duration-200 font-body"
            >
              Browse Products
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }
  if (!product.display_variant) {
    return (
      <main className="mx-auto max-w-5xl p-8 text-white">
        <Link className="text-orange-400" to="/products">
          Quay lại sản phẩm
        </Link>
        <h1 className="mt-5 text-3xl font-bold">{product.product_name}</h1>
        <p className="mt-4 text-white/70">{product.description}</p>
        <p className="mt-6 rounded-xl bg-amber-500/10 p-4 text-amber-300">
          Sản phẩm hiện không có lựa chọn khả dụng.
        </p>
      </main>
    );
  }

  const selectedVariant =
    product.variants?.find((variant) => variant.id === selectedVariantId) ??
    null;
  const p: Product = {
    ...product,
    display_variant: selectedVariant ?? product.display_variant,
  };
  const isOnSale = Boolean(
    p.display_variant.sale_price != null &&
    p.display_variant.sale_price < p.display_variant.price,
  );
  const discPct = discountPct(p);
  const fbtProducts = relatedProducts.slice(0, 2);
  const fbtTotal =
    p.display_variant.effective_price +
    fbtProducts.reduce(
      (total, item, index) =>
        total + (fbtChecked[index] ? item.display_variant.effective_price : 0),
      0,
    );

  return (
    <div className="min-h-screen bg-[#020617] relative">
      {/* ── Background gradient orbs ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/8 to-orange-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-green-500/8 to-emerald-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* ── Breadcrumb ── */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm mb-6 font-body"
        >
          <Link
            to="/"
            className="text-gray-500 hover:text-white transition-colors"
          >
            Home
          </Link>
          <span className="text-gray-600">/</span>
          <Link
            to="/products"
            className="text-gray-500 hover:text-white transition-colors"
          >
            Products
          </Link>
          <span className="text-gray-600">/</span>
          {p.category && (
            <>
              <Link
                to={`/products?category=${p.category_slug || ""}`}
                className="text-gray-500 hover:text-white transition-colors"
              >
                {p.category}
              </Link>
              <span className="text-gray-600">/</span>
            </>
          )}
          <span className="text-white/70 truncate max-w-[200px]">
            {p.product_name}
          </span>
        </motion.nav>

        {/* ── Hero section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          {/* ─── Gallery ──────── lg:col-span-7 ~58% */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="lg:col-span-7"
          >
            <ImageGallery images={p.images || []} />
          </motion.div>

          {/* ─── Product Info ──── lg:col-span-5 ~42% */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.1,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="lg:col-span-5"
          >
            <div className="space-y-5">
              {/* Brand */}
              {p.brand && (
                <span className="inline-block text-orange-400 uppercase tracking-[0.2em] text-xs font-semibold font-body">
                  {p.brand}
                </span>
              )}
              <Link className="block text-sm text-emerald-400 hover:text-emerald-300" to={`/shops/${p.shop.slug}`}>
                Bán bởi {p.shop.name}{p.shop.isVerified ? " · Shop đã xác minh" : ""}
              </Link>

              {/* Product name */}
              <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight font-heading">
                {p.product_name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <Stars rating={p.averageRating || 0} size={18} />
                <span className="text-sm text-gray-400 font-body">
                  {p.averageRating != null ? p.averageRating.toFixed(1) : "Chưa có đánh giá"}
                  <span className="text-gray-600">
                    {" "}
                    ({p.reviewCount} reviews · {p.commentCount} comments · {p.soldCount} sold)
                  </span>
                </span>
              </div>

              {/* Price */}
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-white font-heading">
                  {formatCurrency(p.display_variant.effective_price)}
                </span>
                {isOnSale && p.display_variant.sale_price != null && (
                  <>
                    <span className="text-xl text-gray-500 line-through font-body">
                      {formatCurrency(p.display_variant.price)}
                    </span>
                    <span className="px-2.5 py-1 bg-green-500/15 text-green-400 text-xs font-bold rounded-lg font-body">
                      -{discPct}%
                    </span>
                  </>
                )}
              </div>

              {/* Short description */}
              <p className="text-gray-400 leading-relaxed font-body text-sm">
                {p.description}
              </p>

              {(p.variants?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Lựa chọn sản phẩm</p>
                  <div className="flex flex-wrap gap-2">
                    {p.variants?.map((variant) => (
                      <button
                        type="button"
                        key={variant.id}
                        disabled={variant.available <= 0}
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setQuantity((current) =>
                            Math.max(
                              1,
                              Math.min(current, variant.available || 1),
                            ),
                          );
                        }}
                        className={cn(
                          "rounded-xl border px-4 py-2 text-left",
                          variant.id === selectedVariantId
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-white/10",
                          variant.available <= 0 &&
                            "cursor-not-allowed opacity-50",
                        )}
                      >
                        <span className="block font-medium">
                          {variant.variant_name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {variant.sku} ·{" "}
                          {variant.options
                            .map((option) => option.value)
                            .join(" / ") || "Mặc định"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-xl bg-amber-500/10 p-4 text-amber-300">
                  Sản phẩm hiện không có lựa chọn khả dụng.
                </p>
              )}

              {/* Variant options */}
              {p.display_variant.options.map((option) => (
                <div
                  key={`${option.option_id}-${option.value_id}`}
                  className="text-sm text-gray-300 font-body"
                >
                  <span className="text-gray-500">{option.option_name}:</span>{" "}
                  {option.value}
                </div>
              ))}

              {/* Quantity + Add to cart */}
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white/[0.05] border border-white/[0.12] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="px-5 py-2.5 text-white font-semibold min-w-[3rem] text-center tabular-nums font-body">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(p.display_variant.available, q + 1),
                      )
                    }
                    disabled={quantity >= p.display_variant.available}
                    className="px-3 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={
                    !selectedVariant || p.display_variant.available <= 0
                  }
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 font-body",
                    !selectedVariant || p.display_variant.available <= 0
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : addedToCart
                        ? "bg-green-600 text-white"
                        : "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:from-orange-600 hover:to-orange-700 active:scale-[0.98]",
                  )}
                >
                  {p.display_variant.available <= 0 ? (
                    <>Out of Stock</>
                  ) : addedToCart ? (
                    <>
                      <CheckCircle size={20} /> Added!
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={20} /> Add to Cart
                    </>
                  )}
                </button>
                {addedToCart && (
                  <div className="flex gap-2">
                    <Link className="text-orange-400 underline" to="/cart">
                      Xem giỏ hàng
                    </Link>
                    <Link className="text-emerald-400 underline" to="/checkout">
                      Thanh toán
                    </Link>
                  </div>
                )}

                <button
                  onClick={handleWishlist}
                  className={cn(
                    "p-3 rounded-xl border transition-all duration-200",
                    inWishlist
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : "bg-white/[0.05] border-white/[0.12] text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5",
                  )}
                >
                  <Heart
                    size={20}
                    className={inWishlist ? "fill-red-400" : ""}
                  />
                </button>
              </div>

              {/* Stock indicator */}
              <div className="flex items-center gap-2 text-sm font-body">
                {p.display_variant.available > 0 ? (
                  p.display_variant.available <= 5 ? (
                    <span className="text-orange-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                      Only {p.display_variant.available} left in stock
                    </span>
                  ) : (
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle size={14} />
                      In Stock
                    </span>
                  )
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <X size={14} />
                    Out of Stock
                  </span>
                )}
                {p.display_variant.sku && (
                  <span className="text-gray-600 ml-auto">
                    SKU: {p.display_variant.sku}
                  </span>
                )}
              </div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <TrustBadges />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* ── Tabs section ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mt-14 lg:mt-20"
        >
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-sm overflow-hidden">
            {/* Tab buttons */}
            <div className="flex border-b border-white/[0.08] overflow-x-auto">
              {[
                { key: "description", label: "Description" },
                { key: "specifications", label: "Specifications" },
                { key: "ingredients", label: "Ingredients" },
                { key: "reviews", label: `Reviews (${p.reviewCount})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "relative px-5 py-4 text-sm font-semibold whitespace-nowrap transition-colors font-body",
                    activeTab === tab.key
                      ? "text-orange-400"
                      : "text-gray-500 hover:text-gray-300",
                  )}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content with fade */}
            <div className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* ── Description ── */}
                  {activeTab === "description" && (
                    <div className="prose prose-invert max-w-none">
                      <p className="text-gray-300 leading-relaxed font-body">
                        {p.description}
                      </p>
                      {p.features && p.features.length > 0 && (
                        <ul className="mt-4 space-y-2">
                          {p.features.map((f, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-gray-400 font-body"
                            >
                              <CheckCircle
                                size={16}
                                className="text-green-400 mt-0.5 flex-shrink-0"
                              />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* ── Specifications ── */}
                  {activeTab === "specifications" && (
                    <div>
                      {p.specifications &&
                      Object.keys(p.specifications).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Object.entries(p.specifications).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="flex justify-between items-center py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                              >
                                <span className="text-gray-400 text-sm font-medium font-body capitalize">
                                  {key.replace(/_/g, " ")}
                                </span>
                                <span className="text-white text-sm font-semibold font-body">
                                  {String(value)}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8 font-body">
                          No specifications available.
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── Ingredients ── */}
                  {activeTab === "ingredients" && (
                    <div>
                      <p className="text-gray-400 font-body">
                        Ingredient details are not available for this product.
                      </p>
                    </div>
                  )}

                  {/* ── Reviews ── */}
                  {activeTab === "reviews" && (
                    <div>
                      {/* Rating summary */}
                      <div className="flex items-center gap-6 mb-8 p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-white font-heading">
                            {p.averageRating != null ? p.averageRating.toFixed(1) : "—"}
                          </div>
                          <Stars rating={p.averageRating || 0} size={14} />
                          <p className="text-xs text-gray-500 mt-1 font-body">
                            {p.reviewCount} reviews
                          </p>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {[5, 4, 3, 2, 1].map((star) => {
                            const pct = p.reviewCount
                              ? Math.round(
                                  (productReviews.filter(
                                    (r) => r.rating === star,
                                  ).length /
                                    Math.max(
                                      p.reviewCount,
                                      productReviews.length,
                                    )) *
                                    100,
                                )
                              : 0;
                            return (
                              <div
                                key={star}
                                className="flex items-center gap-2 text-xs font-body"
                              >
                                <span className="text-gray-400 w-8">
                                  {star} ★
                                </span>
                                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-yellow-400 rounded-full"
                                    style={{ width: `${pct || 0}%` }}
                                  />
                                </div>
                                <span className="text-gray-600 w-6 text-right">
                                  {pct}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {p.reviewCount === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                            <Star size={28} className="text-gray-500" />
                          </div>
                          <p className="text-gray-400 font-body">
                            No reviews yet. Be the first to review!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {productReviews.map((review) => (
                            <div
                              key={review.id}
                              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-400 font-body">
                                    {review.buyerName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-white text-sm font-body">
                                      {review.buyerName}
                                      {review.verifiedPurchase && <span className="ml-2 text-xs text-emerald-400">Đã mua hàng</span>}
                                    </p>
                                    <Stars rating={review.rating} size={12} />
                                  </div>
                                </div>
                                <span className="text-xs text-gray-500 font-body">
                                  {new Date(review.publishedAt || review.createdAt).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed font-body">
                                {review.comment || "Người mua chỉ chấm điểm."}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* ── Frequently Bought Together ── */}
        {fbtProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-14 lg:mt-20"
          >
            <h2 className="text-2xl font-bold text-white mb-6 font-heading">
              Frequently Bought Together
            </h2>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-sm p-6 md:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {/* This product (always selected) */}
                <div className="flex items-center gap-3 bg-white/[0.05] border border-orange-500/20 rounded-xl p-3">
                  <CheckCircle
                    size={20}
                    className="text-orange-500 flex-shrink-0"
                  />
                  <SafeProductImage
                    src={primaryImageUrl(p)}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate font-body">
                      {p.product_name}
                    </p>
                    <p className="text-xs text-orange-400 font-body">
                      {formatCurrency(p.display_variant.effective_price)}
                    </p>
                  </div>
                </div>
                {fbtProducts.map((fp, i) => (
                  <FBTItem
                    key={fp.id}
                    p={fp}
                    checked={fbtChecked[i] ?? false}
                    onToggle={() => {
                      setFbtChecked((prev) => {
                        const next = [...prev];
                        next[i] = !next[i];
                        return next;
                      });
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
                <div>
                  <p className="text-sm text-gray-400 font-body">
                    Total price:
                  </p>
                  <p className="text-2xl font-bold text-white font-heading">
                    {formatCurrency(fbtTotal)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    /* bulk add all checked */
                    fbtProducts.forEach((fp, i) => {
                      if (fbtChecked[i])
                        addToCart(fp.id, fp.display_variant.id, 1);
                    });
                    handleAddToCart();
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:from-orange-600 hover:to-orange-700 transition-all duration-200 active:scale-[0.98] font-body"
                >
                  Add All to Cart
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* ── Related Products ── */}
        {relatedProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-14 lg:mt-20 pb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-6 font-heading">
              Related Products
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((rp) => (
                <motion.div
                  key={rp.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.35 }}
                >
                  <Link
                    to={`/products/${rp.id}`}
                    className="group block bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <SafeProductImage
                        src={primaryImageUrl(rp)}
                        alt={rp.product_name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-white truncate font-body group-hover:text-orange-400 transition-colors">
                        {rp.product_name}
                      </h3>
                      <p className="text-base font-bold text-orange-400 mt-1 font-heading">
                        {formatCurrency(rp.display_variant.effective_price)}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
