import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { sanitizeMiddleware } from './middleware/sanitize';
import { createAuditMiddleware } from './middleware/auditLogger';
import { securityHeaders } from './middleware/securityHeaders';
import authRoutes from './modules/auth/auth.routes';
import referralRoutes from './modules/referral/referral.routes';
import couponRoutes from './modules/coupon/coupon.routes';
import loyaltyRoutes from './modules/loyalty/loyalty.routes';
import auditRoutes from './modules/audit/audit.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import crmRoutes from './modules/crm/crm.routes';
import ticketRoutes from './modules/tickets/ticket.routes';
import invoiceRoutes from './modules/invoices/invoice.routes';
import backupRoutes from './modules/backup/backup.routes';
import revenueRoutes from './modules/revenue/revenue.routes';
import coachRoutes from './modules/coaches/coach.routes';
import planRoutes from './modules/plans/plans.routes';
import videoRoutes from './modules/videos/videos.routes';
import exercisesRoutes from './modules/exercises';
import coachWorkspaceRoutes from './modules/coach-workspace/coach-workspace.routes';
import memberWorkoutRoutes from './modules/member-workout/member-workout.routes';
import adminCoachRoutes from './modules/admin-coaches/admin-coaches.routes';
import adminExerciseRoutes from './modules/admin-exercises/admin-exercises.routes';
import adminWorkoutRoutes from './modules/admin-workouts/admin-workouts.routes';
import bookingRoutes from './modules/bookings/bookings.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import productRoutes from './modules/products/products.routes';
import mediaRoutes from './modules/media/media.routes';
import adminProductRoutes from './modules/admin-products/admin-products.routes';
import adminCatalogRoutes from './modules/admin-catalog/admin-catalog.routes';
import adminVariantRoutes from './modules/admin-variants/admin-variants.routes';
import adminInventoryRoutes from './modules/admin-inventory/admin-inventory.routes';
import productModerationRoutes from './modules/product-moderation/product-moderation.routes';
import adminOrderRoutes from './modules/admin-orders/admin-orders.routes';
import orderRoutes from './modules/orders/orders.routes';
import userRoutes from './modules/users/users.routes';
import sellerApplicationRoutes from './modules/seller-applications/seller-applications.routes';
import adminSellerApplicationRoutes from './modules/seller-applications/admin-seller-applications.routes';
import { adminShopRouter, publicShopRouter, sellerShopRouter } from './modules/shops/shops.routes';
import brandRequestRoutes from './modules/brand-requests/brand-requests.routes';
import adminBrandRequestRoutes from './modules/brand-requests/admin-brand-requests.routes';
import sellerProductRoutes from './modules/products/seller-products.routes';
import sellerOrderRoutes from './modules/seller-orders/seller-orders.routes';
import cartRoutes from './modules/cart/cart.routes';
import marketplaceCompensationRoutes from './modules/marketplace-compensation/marketplace-compensation.routes';
import refundRoutes from './modules/refunds/refunds.routes';
import {adminFinanceRouter,sellerFinanceRouter} from './modules/marketplace-finance/marketplace-finance.routes';
import { adminComplaintsRouter, complaintsRouter, sellerComplaintsRouter } from './modules/complaints/complaints.routes';
import { adminReviewsRouter,buyerReviewsRouter,sellerReviewsRouter } from './modules/reviews/reviews.routes';
import path from 'path';

const app = express();

// Security middleware stack
app.use(securityHeaders);
const allowedOrigins=config.cors.origin.split(',').map(value=>value.trim()).filter(Boolean);
app.use(cors({ origin:(origin,callback)=>!origin||allowedOrigins.includes(origin)?callback(null,true):callback(new Error('Origin not allowed')), credentials:false }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeMiddleware);
app.use(createAuditMiddleware());
app.use(apiLimiter);
if (config.nodeEnv === 'development') app.use(morgan('dev'));

app.use('/uploads', express.static(path.resolve(config.upload.dir), { fallthrough: true, index: false, dotfiles: 'deny' }));
app.use('/image', express.static(path.resolve(__dirname, '../../image'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
  }
}));
app.use('/media', express.static('public/media', {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.svg') || filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', filePath.endsWith('.svg') ? 'image/svg+xml' : 'image/webp');
    }
  }
}));

app.get('/api/health', (_req, res) => res.json({ success: true, message: 'Gymer API running', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/coach', coachWorkspaceRoutes);
app.use('/api/member/workouts', memberWorkoutRoutes);
app.use('/api/admin/coaches', adminCoachRoutes);
app.use('/api/admin/exercises', adminExerciseRoutes);
app.use('/api/admin/workouts', adminWorkoutRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin', adminCatalogRoutes);
app.use('/api/admin', adminVariantRoutes);
app.use('/api/admin', adminInventoryRoutes);
app.use('/api/admin/product-moderation', productModerationRoutes);
app.use('/api/admin', adminOrderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart',cartRoutes);
app.use('/api/marketplace',marketplaceCompensationRoutes);
app.use('/api/admin/refunds',refundRoutes);
app.use('/api/seller/finance',sellerFinanceRouter);
app.use('/api/admin/marketplace-finance',adminFinanceRouter);
app.use('/api/complaints',complaintsRouter);
app.use('/api/seller/complaints',sellerComplaintsRouter);
app.use('/api/admin/complaints',adminComplaintsRouter);
app.use('/api/reviews',buyerReviewsRouter);
app.use('/api/seller/reviews',sellerReviewsRouter);
app.use('/api/admin/reviews',adminReviewsRouter);
app.use('/api/users', userRoutes);
app.use('/api/seller-applications', sellerApplicationRoutes);
app.use('/api/admin/seller-applications', adminSellerApplicationRoutes);
app.use('/api/seller/shop', sellerShopRouter);
app.use('/api/shops', publicShopRouter);
app.use('/api/admin/shops', adminShopRouter);
app.use('/api/seller/brand-requests',brandRequestRoutes);
app.use('/api/admin/brand-requests',adminBrandRequestRoutes);
app.use('/api/seller/products',sellerProductRoutes);
app.use('/api/seller/orders',sellerOrderRoutes);
app.use('/api/media', mediaRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
