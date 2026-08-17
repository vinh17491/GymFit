import { lazy, type ReactNode } from 'react';
import { Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Layout from '../components/layout/Layout';
import MarketingHeader from '../components/layout/MarketingHeader';
import { canAccess, roleHome, type Role } from '../auth/accessPolicy';

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminCoachManagementPage = lazy(() => import('../pages/admin/coaches/AdminCoachManagementPage'));
const AdminCoachDetailPage = lazy(() => import('../pages/admin/coaches/AdminCoachDetailPage'));
const AdminExerciseLibraryPage = lazy(() => import('../pages/admin/exercises/AdminExerciseLibraryPage'));
const AdminWorkoutGovernancePage = lazy(() => import('../pages/admin/workouts/AdminWorkoutGovernancePage'));
const CoachDashboard = lazy(() => import('../pages/coaches/CoachDashboard'));
const CoachExerciseLibraryPage = lazy(() => import('../pages/coaches/CoachExerciseLibraryPage'));
const CoachExerciseDetailPage = lazy(() => import('../pages/coaches/CoachExerciseDetailPage'));
const CoachProgramsPage = lazy(() => import('../pages/coaches/CoachProgramsPage'));
const CoachProgramNewPage = lazy(() => import('../pages/coaches/CoachProgramNewPage'));
const CoachProgramBuilderPage = lazy(() => import('../pages/coaches/CoachProgramBuilderPage'));
const CoachMembersPage = lazy(() => import('../pages/coaches/CoachMembersPage'));
const CoachMemberDetailPage = lazy(() => import('../pages/coaches/CoachMemberDetailPage'));
const CoachAssignmentsPage = lazy(() => import('../pages/coaches/CoachAssignmentsPage'));
const CoachAssignmentNewPage = lazy(() => import('../pages/coaches/CoachAssignmentNewPage'));
const CoachAssignmentDetailPage = lazy(() => import('../pages/coaches/CoachAssignmentDetailPage'));
const CoachSchedulesPage = lazy(() => import('../pages/coaches/CoachSchedulesPage'));
const CoachSessionsPage = lazy(() => import('../pages/coaches/CoachSessionsPage'));
const CoachSessionDetailPage = lazy(() => import('../pages/coaches/CoachSessionDetailPage'));
const CoachProgressPage = lazy(() => import('../pages/coaches/CoachProgressPage'));
const CoachListPage = lazy(() => import('../pages/coaches/CoachListPage'));
const CoachProfilePage = lazy(() => import('../pages/coaches/CoachProfilePage'));
const CoachSelfProfilePage = lazy(() => import('../pages/coaches/CoachSelfProfilePage'));
const CoachAvailabilityPage = lazy(() => import('../pages/coaches/CoachAvailabilityPage'));
const MembersPage = lazy(() => import('../pages/members/MembersPage'));
const ReferralPage = lazy(() => import('../pages/referral/ReferralPage'));
const CouponPage = lazy(() => import('../pages/coupon/CouponPage'));
const LoyaltyPage = lazy(() => import('../pages/loyalty/LoyaltyPage'));
const AuditPage = lazy(() => import('../pages/audit/AuditPage'));
const AnalyticsPage = lazy(() => import('../pages/analytics/AnalyticsPage'));
const CRMPage = lazy(() => import('../pages/crm/CRMPage'));
const TicketPage = lazy(() => import('../pages/tickets/TicketPage'));
const InvoicePage = lazy(() => import('../pages/invoices/InvoicePage'));
const BackupPage = lazy(() => import('../pages/backup/BackupPage'));
const RevenuePage = lazy(() => import('../pages/revenue/RevenuePage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const MembershipPlans = lazy(() => import('../pages/membership/MembershipPlans'));
const MembershipAccountPage = lazy(() => import('../pages/membership/MembershipAccountPage'));
const VideoLibrary = lazy(() => import('../pages/video/VideoLibrary'));
const VideosPreviewPage = lazy(() => import('../pages/video/VideosPreviewPage'));
const CoachBooking = lazy(() => import('../pages/booking/CoachBooking'));
const AppointmentsPage = lazy(() => import('../pages/appointments/AppointmentsPage'));
const AppointmentDetailPage = lazy(() => import('../pages/appointments/AppointmentDetailPage'));
const CoachAppointmentsPage = lazy(() => import('../pages/coaches/CoachAppointmentsPage'));
const CoachAppointmentDetailPage = lazy(() => import('../pages/coaches/CoachAppointmentDetailPage'));
const UserProfile = lazy(() => import('../pages/profile/UserProfile'));
const LandingPage = lazy(() => import('../pages/landing/LandingPage'));
const AboutPage = lazy(() => import('../pages/about/AboutPage'));
const ContactPage = lazy(() => import('../pages/contact/ContactPage'));
const BlogPage = lazy(() => import('../pages/blog/BlogPage'));
const SuccessStoriesPage = lazy(() => import('../pages/success-stories/SuccessStoriesPage'));
const ExerciseLibraryPage = lazy(() => import('../pages/exercises/ExerciseLibraryPage'));
const ExerciseDetail = lazy(() => import('../pages/exercises/ExerciseDetail'));
const WorkoutPrograms = lazy(() => import('../pages/exercises/WorkoutPrograms'));
const ProductsListPage = lazy(() => import('../pages/products/ProductsListPage'));
const ProductDetailPage = lazy(() => import('../pages/products/ProductDetailPage'));
const AdminProductsPage = lazy(() => import('../pages/admin/AdminProductsPage'));
const AdminProductModerationPage = lazy(() => import('../pages/admin/AdminProductModerationPage'));
const AdminProductModerationDetailPage = lazy(() => import('../pages/admin/AdminProductModerationDetailPage'));
const AdminCatalogPage = lazy(() => import('../pages/admin/AdminCatalogPage'));
const AdminInventoryPage = lazy(() => import('../pages/admin/AdminInventoryPage'));
const AdminProductVariantsPage = lazy(() => import('../pages/admin/AdminProductVariantsPage'));
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = lazy(() => import('../pages/admin/AdminOrderDetailPage'));
const AdminRefundsPage = lazy(() => import('../pages/admin/AdminRefundsPage'));
const CustomerOrderDetailPage = lazy(() => import('../pages/orders/CustomerOrderDetailPage'));
const CheckoutPage = lazy(() => import('../pages/checkout/CheckoutPage'));
const CartPage = lazy(() => import('../pages/cart/CartPage'));
const CustomerOrdersPage = lazy(() => import('../pages/orders/CustomerOrdersPage'));
const SellerApplicationPage = lazy(() => import('../pages/seller/SellerApplicationPage'));
const SellerFoundationPage = lazy(() => import('../pages/seller/SellerFoundationPage'));
const AdminSellerApplicationsPage = lazy(() => import('../pages/admin/AdminSellerApplicationsPage'));
const AdminSellerApplicationDetailPage = lazy(() => import('../pages/admin/AdminSellerApplicationDetailPage'));
const SellerShopPage = lazy(() => import('../pages/seller/SellerShopPage'));
const PublicShopPage = lazy(() => import('../pages/shops/PublicShopPage'));
const AdminShopsPage = lazy(() => import('../pages/admin/AdminShopsPage'));
const AdminShopDetailPage = lazy(() => import('../pages/admin/AdminShopDetailPage'));
const SellerBrandRequestsPage = lazy(() => import('../pages/seller/SellerBrandRequestsPage'));
const AdminBrandRequestsPage = lazy(() => import('../pages/admin/AdminBrandRequestsPage'));
const SellerProductsPage = lazy(() => import('../pages/seller/SellerProductsPage'));
const SellerProductDetailPage = lazy(() => import('../pages/seller/SellerProductDetailPage'));
const SellerProductFormPage = lazy(() => import('../pages/seller/SellerProductFormPage'));
const SellerOrdersPage = lazy(() => import('../pages/seller/SellerOrdersPage'));
const SellerOrderDetailPage = lazy(() => import('../pages/seller/SellerOrderDetailPage'));
const SellerRevenuePage = lazy(() => import('../pages/seller/SellerRevenuePage'));
const AdminSettlementsPage = lazy(() => import('../pages/admin/AdminSettlementsPage'));
const ComplaintsPage = lazy(() => import('../pages/complaints/ComplaintsPage'));
const ReviewsPage = lazy(() => import('../pages/reviews/ReviewsPage'));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage'));
const MemberWorkoutHomePage = lazy(() => import('../pages/workouts/MemberWorkoutPages').then(module => ({ default: module.MemberWorkoutHomePage })));
const MemberWorkoutProgramPage = lazy(() => import('../pages/workouts/MemberWorkoutPages').then(module => ({ default: module.MemberWorkoutProgramPage })));
const MemberWorkoutSchedulePage = lazy(() => import('../pages/workouts/MemberWorkoutPages').then(module => ({ default: module.MemberWorkoutSchedulePage })));
const MemberWorkoutScheduleDetailPage = lazy(() => import('../pages/workouts/MemberWorkoutPages').then(module => ({ default: module.MemberWorkoutScheduleDetailPage })));
const MemberWorkoutSessionsPage = lazy(() => import('../pages/workouts/MemberWorkoutPages').then(module => ({ default: module.MemberWorkoutSessionsPage })));
const MemberWorkoutSessionDetailPage = lazy(() => import('../pages/workouts/MemberWorkoutPages').then(module => ({ default: module.MemberWorkoutSessionDetailPage })));
const MemberProgressPage = lazy(() => import('../pages/workouts/MemberWorkoutPages').then(module => ({ default: module.MemberProgressPage })));
const MemberProgressSessionsPage = lazy(() => import('../pages/workouts/MemberWorkoutPages').then(module => ({ default: module.MemberProgressSessionsPage })));
const MemberProgressExercisesPage = lazy(() => import('../pages/workouts/MemberWorkoutPages').then(module => ({ default: module.MemberProgressExercisesPage })));

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, initialized } = useAuthStore();
  const location = useLocation();
  if (!initialized) return <GuardLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

function AccessRoute({ path, children, roles }: { path: string; children: ReactNode; roles?: Role[] }) {
  const { user, isAuthenticated, initialized } = useAuthStore();
  if (!initialized) return <GuardLoading />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return (roles ? roles.includes(user.role) : canAccess(user.role, path)) ? <>{children}</> : <Navigate to="/access-denied" replace />;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, initialized } = useAuthStore();
  if (!initialized) return <GuardLoading />;
  return isAuthenticated && user ? <Navigate to={roleHome(user.role)} replace /> : <>{children}</>;
}

function GuardLoading() {
  return <div className="flex min-h-[40vh] items-center justify-center text-slate-400" role="status" aria-live="polite">Checking session…</div>;
}

function AccessDenied() {
  const user = useAuthStore(state => state.user);
  return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4"><h1 className="text-3xl font-bold">Access denied</h1><p className="text-slate-400">Your account is not allowed to open this page.</p><Link className="btn-primary" to={user ? roleHome(user.role) : '/login'}>Return safely</Link></div>;
}

function MarketingHeaderWrapper({ children }: { children: ReactNode }) {
  return <><MarketingHeader /><main className="pt-16">{children}</main></>;
}

export const publicRouteElements = [
  <Route key="public-home" path="/" element={<MarketingHeaderWrapper><LandingPage /></MarketingHeaderWrapper>} />,
  <Route key="public-about" path="/about" element={<MarketingHeaderWrapper><AboutPage /></MarketingHeaderWrapper>} />,
  <Route key="public-contact" path="/contact" element={<MarketingHeaderWrapper><ContactPage /></MarketingHeaderWrapper>} />,
  <Route key="public-blog" path="/blog" element={<MarketingHeaderWrapper><BlogPage /></MarketingHeaderWrapper>} />,
  <Route key="public-membership" path="/membership" element={<MarketingHeaderWrapper><MembershipPlans /></MarketingHeaderWrapper>} />,
  <Route key="public-coaches" path="/coaches" element={<MarketingHeaderWrapper><CoachListPage /></MarketingHeaderWrapper>} />,
  <Route key="public-coach-profile" path="/coaches/:id" element={<MarketingHeaderWrapper><CoachProfilePage /></MarketingHeaderWrapper>} />,
  <Route key="public-coach-booking" path="/coaches/:id/book" element={<MarketingHeaderWrapper><CoachBooking /></MarketingHeaderWrapper>} />,
  <Route key="public-booking-redirect" path="/booking" element={<Navigate to="/coaches" replace />} />,
  <Route key="public-videos" path="/videos" element={<MarketingHeaderWrapper><VideosPreviewPage /></MarketingHeaderWrapper>} />,
  <Route key="public-success-stories" path="/success-stories" element={<MarketingHeaderWrapper><SuccessStoriesPage /></MarketingHeaderWrapper>} />,
  <Route key="public-exercises" path="/exercises" element={<MarketingHeaderWrapper><ExerciseLibraryPage /></MarketingHeaderWrapper>} />,
  <Route key="public-exercise-detail" path="/exercises/:id" element={<MarketingHeaderWrapper><ExerciseDetail /></MarketingHeaderWrapper>} />,
  <Route key="public-workout-programs" path="/workout-programs" element={<MarketingHeaderWrapper><WorkoutPrograms /></MarketingHeaderWrapper>} />,
  <Route key="public-products" path="/products" element={<MarketingHeaderWrapper><ProductsListPage /></MarketingHeaderWrapper>} />,
  <Route key="public-product-detail" path="/products/:id" element={<MarketingHeaderWrapper><ProductDetailPage /></MarketingHeaderWrapper>} />,
  <Route key="public-shop" path="/shops/:shopSlug" element={<MarketingHeaderWrapper><PublicShopPage /></MarketingHeaderWrapper>} />,
  <Route key="public-cart" path="/cart" element={<MarketingHeaderWrapper><CartPage /></MarketingHeaderWrapper>} />,
];

export const authRouteElements = [
  <Route key="auth-login" path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />,
  <Route key="auth-register" path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />,
];

export const protectedRouteElements = [
  <Route key="protected-layout" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
    <Route key="dashboard" path="/dashboard" element={<AccessRoute path="/dashboard"><DashboardPage /></AccessRoute>} />
    <Route key="membership-account" path="/membership/account" element={<AccessRoute path="/membership/account"><MembershipAccountPage /></AccessRoute>} />
    <Route key="membership-checkout" path="/membership/checkout" element={<AccessRoute path="/membership/checkout"><MembershipAccountPage /></AccessRoute>} />
    <Route key="workouts" path="/workouts" element={<AccessRoute path="/workouts"><MemberWorkoutHomePage /></AccessRoute>} />
    <Route key="workout-program" path="/workouts/program" element={<AccessRoute path="/workouts"><MemberWorkoutProgramPage /></AccessRoute>} />
    <Route key="workout-schedule" path="/workouts/schedule" element={<AccessRoute path="/workouts"><MemberWorkoutSchedulePage /></AccessRoute>} />
    <Route key="workout-schedule-detail" path="/workouts/schedule/:scheduleId" element={<AccessRoute path="/workouts"><MemberWorkoutScheduleDetailPage /></AccessRoute>} />
    <Route key="workout-sessions" path="/workouts/sessions" element={<AccessRoute path="/workouts"><MemberWorkoutSessionsPage /></AccessRoute>} />
    <Route key="workout-session-detail" path="/workouts/sessions/:sessionId" element={<AccessRoute path="/workouts"><MemberWorkoutSessionDetailPage /></AccessRoute>} />
    <Route key="progress" path="/progress" element={<AccessRoute path="/progress"><MemberProgressPage /></AccessRoute>} />
    <Route key="progress-sessions" path="/progress/sessions" element={<AccessRoute path="/progress"><MemberProgressSessionsPage /></AccessRoute>} />
    <Route key="progress-exercises" path="/progress/exercises/:exerciseId" element={<AccessRoute path="/progress"><MemberProgressExercisesPage /></AccessRoute>} />
    <Route key="members" path="/members" element={<AccessRoute path="/members"><MembersPage /></AccessRoute>} />
    <Route key="referral" path="/referral" element={<AccessRoute path="/referral"><ReferralPage /></AccessRoute>} />
    <Route key="coupons" path="/coupons" element={<AccessRoute path="/coupons"><CouponPage /></AccessRoute>} />
    <Route key="loyalty" path="/loyalty" element={<AccessRoute path="/loyalty"><LoyaltyPage /></AccessRoute>} />
    <Route key="tickets" path="/tickets" element={<AccessRoute path="/tickets"><TicketPage /></AccessRoute>} />
    <Route key="invoices" path="/invoices" element={<AccessRoute path="/invoices"><InvoicePage /></AccessRoute>} />
    <Route key="crm" path="/crm" element={<AccessRoute path="/crm"><CRMPage /></AccessRoute>} />
    <Route key="settings" path="/settings" element={<SettingsPage />} />
    <Route key="appointments" path="/appointments" element={<AccessRoute path="/appointments"><AppointmentsPage /></AccessRoute>} />
    <Route key="appointment-detail" path="/appointments/:bookingId" element={<AccessRoute path="/appointments"><AppointmentDetailPage /></AccessRoute>} />
    <Route key="profile" path="/profile" element={<UserProfile />} />
    <Route key="notifications" path="/notifications" element={<AccessRoute path="/notifications"><NotificationsPage /></AccessRoute>} />
    <Route key="seller-apply" path="/seller/apply" element={<AccessRoute path="/seller/apply"><SellerApplicationPage /></AccessRoute>} />
    <Route key="seller" path="/seller" element={<AccessRoute path="/seller"><SellerFoundationPage /></AccessRoute>} />
    <Route key="seller-shop" path="/seller/shop" element={<AccessRoute path="/seller/shop"><SellerShopPage /></AccessRoute>} />
    <Route key="seller-brand-requests" path="/seller/brand-requests" element={<AccessRoute path="/seller/brand-requests"><SellerBrandRequestsPage /></AccessRoute>} />
    <Route key="seller-products" path="/seller/products" element={<AccessRoute path="/seller/products"><SellerProductsPage /></AccessRoute>} />
    <Route key="seller-products-new" path="/seller/products/new" element={<AccessRoute path="/seller/products"><SellerProductFormPage /></AccessRoute>} />
    <Route key="seller-product-edit" path="/seller/products/:id/edit" element={<AccessRoute path="/seller/products"><SellerProductFormPage /></AccessRoute>} />
    <Route key="seller-product-detail" path="/seller/products/:id" element={<AccessRoute path="/seller/products"><SellerProductDetailPage /></AccessRoute>} />
    <Route key="seller-orders" path="/seller/orders" element={<AccessRoute path="/seller/orders"><SellerOrdersPage /></AccessRoute>} />
    <Route key="seller-order-detail" path="/seller/orders/:shopOrderId" element={<AccessRoute path="/seller/orders"><SellerOrderDetailPage /></AccessRoute>} />
    <Route key="seller-revenue" path="/seller/revenue" element={<AccessRoute path="/seller/revenue"><SellerRevenuePage /></AccessRoute>} />
    <Route key="seller-complaints" path="/seller/complaints" element={<AccessRoute path="/seller/complaints"><ComplaintsPage role="seller" /></AccessRoute>} />
    <Route key="customer-order-detail" path="/orders/:orderId" element={<AccessRoute path="/orders"><CustomerOrderDetailPage /></AccessRoute>} />
    <Route key="customer-orders" path="/orders" element={<AccessRoute path="/orders"><CustomerOrdersPage /></AccessRoute>} />
    <Route key="customer-complaints" path="/complaints" element={<AccessRoute path="/complaints"><ComplaintsPage role="buyer" /></AccessRoute>} />
    <Route key="customer-reviews" path="/reviews" element={<AccessRoute path="/reviews"><ReviewsPage role="buyer" /></AccessRoute>} />
    <Route key="checkout" path="/checkout" element={<AccessRoute path="/checkout"><CheckoutPage /></AccessRoute>} />
    <Route key="video" path="/video" element={<AccessRoute path="/video"><VideoLibrary /></AccessRoute>} />
    <Route key="admin" path="/admin" element={<AccessRoute path="/admin"><AdminDashboard /></AccessRoute>} />
    <Route key="admin-coaches" path="/admin/coaches" element={<AccessRoute path="/admin/coaches"><AdminCoachManagementPage /></AccessRoute>} />
    <Route key="admin-coach-detail" path="/admin/coaches/:coachId" element={<AccessRoute path="/admin/coaches"><AdminCoachDetailPage /></AccessRoute>} />
    <Route key="admin-exercises" path="/admin/exercises" element={<AccessRoute path="/admin/exercises"><AdminExerciseLibraryPage /></AccessRoute>} />
    <Route key="admin-workouts" path="/admin/workouts" element={<AccessRoute path="/admin/workouts"><AdminWorkoutGovernancePage /></AccessRoute>} />
    <Route key="admin-analytics" path="/admin/analytics" element={<AccessRoute path="/admin"><AnalyticsPage /></AccessRoute>} />
    <Route key="admin-audit" path="/admin/audit" element={<AccessRoute path="/admin"><AuditPage /></AccessRoute>} />
    <Route key="admin-revenue" path="/admin/revenue" element={<AccessRoute path="/admin"><RevenuePage /></AccessRoute>} />
    <Route key="admin-backup" path="/admin/backup" element={<AccessRoute path="/admin"><BackupPage /></AccessRoute>} />
    <Route key="admin-products" path="/admin/products" element={<AccessRoute path="/admin"><AdminProductsPage /></AccessRoute>} />
    <Route key="admin-product-moderation" path="/admin/product-moderation" element={<AccessRoute path="/admin"><AdminProductModerationPage /></AccessRoute>} />
    <Route key="admin-product-moderation-detail" path="/admin/product-moderation/:productId" element={<AccessRoute path="/admin"><AdminProductModerationDetailPage /></AccessRoute>} />
    <Route key="admin-orders" path="/admin/orders" element={<AccessRoute path="/admin"><AdminOrdersPage /></AccessRoute>} />
    <Route key="admin-order-detail" path="/admin/orders/:orderId" element={<AccessRoute path="/admin"><AdminOrderDetailPage /></AccessRoute>} />
    <Route key="admin-refunds" path="/admin/refunds" element={<AccessRoute path="/admin"><AdminRefundsPage /></AccessRoute>} />
    <Route key="admin-settlements" path="/admin/settlements" element={<AccessRoute path="/admin"><AdminSettlementsPage /></AccessRoute>} />
    <Route key="admin-complaints" path="/admin/complaints" element={<AccessRoute path="/admin"><ComplaintsPage role="admin" /></AccessRoute>} />
    <Route key="admin-reviews" path="/admin/reviews" element={<AccessRoute path="/admin"><ReviewsPage role="admin" /></AccessRoute>} />
    <Route key="seller-reviews" path="/seller/reviews" element={<AccessRoute path="/seller/reviews"><ReviewsPage role="seller" /></AccessRoute>} />
    <Route key="admin-seller-applications" path="/admin/seller-applications" element={<AccessRoute path="/admin"><AdminSellerApplicationsPage /></AccessRoute>} />
    <Route key="admin-seller-application-detail" path="/admin/seller-applications/:applicationId" element={<AccessRoute path="/admin"><AdminSellerApplicationDetailPage /></AccessRoute>} />
    <Route key="admin-shops" path="/admin/shops" element={<AccessRoute path="/admin"><AdminShopsPage /></AccessRoute>} />
    <Route key="admin-shop-detail" path="/admin/shops/:shopId" element={<AccessRoute path="/admin"><AdminShopDetailPage /></AccessRoute>} />
    <Route key="admin-brand-requests" path="/admin/brand-requests" element={<AccessRoute path="/admin"><AdminBrandRequestsPage /></AccessRoute>} />
    <Route key="admin-categories" path="/admin/categories" element={<AccessRoute path="/admin"><AdminCatalogPage entity="categories" /></AccessRoute>} />
    <Route key="admin-brands" path="/admin/brands" element={<AccessRoute path="/admin"><AdminCatalogPage entity="brands" /></AccessRoute>} />
    <Route key="admin-inventory" path="/admin/inventory" element={<AccessRoute path="/admin"><AdminInventoryPage /></AccessRoute>} />
    <Route key="admin-variants" path="/admin/products/:productId/variants" element={<AccessRoute path="/admin"><AdminProductVariantsPage /></AccessRoute>} />
    <Route key="coach" path="/coach" element={<AccessRoute path="/coach"><CoachDashboard /></AccessRoute>} />
    <Route key="coach-profile" path="/coach/profile" element={<AccessRoute path="/coach/profile"><CoachSelfProfilePage /></AccessRoute>} />
    <Route key="coach-availability" path="/coach/availability" element={<AccessRoute path="/coach/availability"><CoachAvailabilityPage /></AccessRoute>} />
    <Route key="coach-appointments" path="/coach/appointments" element={<AccessRoute path="/coach/appointments"><CoachAppointmentsPage /></AccessRoute>} />
    <Route key="coach-appointment-detail" path="/coach/appointments/:bookingId" element={<AccessRoute path="/coach/appointments"><CoachAppointmentDetailPage /></AccessRoute>} />
    <Route key="coach-sessions-redirect" path="/coach/sessions" element={<AccessRoute path="/coach/sessions"><Navigate to="/coach/members" replace /></AccessRoute>} />
    <Route key="coach-progress-redirect" path="/coach/progress" element={<AccessRoute path="/coach/progress"><Navigate to="/coach/members" replace /></AccessRoute>} />
    <Route key="coach-exercises" path="/coach/exercises" element={<AccessRoute path="/coach"><CoachExerciseLibraryPage /></AccessRoute>} />
    <Route key="coach-exercise-detail" path="/coach/exercises/:exerciseId" element={<AccessRoute path="/coach"><CoachExerciseDetailPage /></AccessRoute>} />
    <Route key="coach-workout-programs" path="/coach/workout-programs" element={<AccessRoute path="/coach"><CoachProgramsPage /></AccessRoute>} />
    <Route key="coach-workout-program-new" path="/coach/workout-programs/new" element={<AccessRoute path="/coach"><CoachProgramNewPage /></AccessRoute>} />
    <Route key="coach-workout-program" path="/coach/workout-programs/:programId" element={<AccessRoute path="/coach"><CoachProgramBuilderPage /></AccessRoute>} />
    <Route key="coach-workout-program-edit" path="/coach/workout-programs/:programId/edit" element={<AccessRoute path="/coach"><CoachProgramBuilderPage /></AccessRoute>} />
    <Route key="coach-members" path="/coach/members" element={<AccessRoute path="/coach"><CoachMembersPage /></AccessRoute>} />
    <Route key="coach-member-detail" path="/coach/members/:memberId" element={<AccessRoute path="/coach"><CoachMemberDetailPage /></AccessRoute>} />
    <Route key="coach-assignments" path="/coach/assignments" element={<AccessRoute path="/coach"><CoachAssignmentsPage /></AccessRoute>} />
    <Route key="coach-assignment-new" path="/coach/assignments/new" element={<AccessRoute path="/coach"><CoachAssignmentNewPage /></AccessRoute>} />
    <Route key="coach-assignment-detail" path="/coach/assignments/:assignmentId" element={<AccessRoute path="/coach"><CoachAssignmentDetailPage /></AccessRoute>} />
    <Route key="coach-schedules" path="/coach/schedules" element={<AccessRoute path="/coach"><CoachSchedulesPage /></AccessRoute>} />
    <Route key="coach-member-schedule" path="/coach/members/:memberId/schedule" element={<AccessRoute path="/coach"><CoachSchedulesPage /></AccessRoute>} />
    <Route key="coach-member-sessions" path="/coach/members/:memberId/sessions" element={<AccessRoute path="/coach"><CoachSessionsPage /></AccessRoute>} />
    <Route key="coach-member-session-source" path="/coach/members/:memberId/sessions/:source/:sessionId" element={<AccessRoute path="/coach"><CoachSessionDetailPage /></AccessRoute>} />
    <Route key="coach-member-session" path="/coach/members/:memberId/sessions/:sessionId" element={<AccessRoute path="/coach"><CoachSessionDetailPage /></AccessRoute>} />
    <Route key="coach-member-progress" path="/coach/members/:memberId/progress" element={<AccessRoute path="/coach"><CoachProgressPage /></AccessRoute>} />
    <Route key="access-denied" path="/access-denied" element={<AccessDenied />} />
  </Route>,
];

export const fallbackRouteElements = [
  <Route key="not-found" path="*" element={<MarketingHeaderWrapper><div className="min-h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-6xl font-bold mb-4 text-white">404</h1><p className="text-[#94A3B8] text-lg mb-8">Page not found</p><Link to="/" className="inline-block rounded-lg bg-[#2563eb] px-6 py-3 font-semibold text-white transition-all hover:bg-[#1d4ed8]">Back to Home</Link></div></div></MarketingHeaderWrapper>} />,
];
