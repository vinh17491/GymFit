import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import CommandMenu from './components/layout/CommandMenu';
import MarketingHeader from './components/layout/MarketingHeader';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCoachManagementPage from './pages/admin/coaches/AdminCoachManagementPage';
import AdminCoachDetailPage from './pages/admin/coaches/AdminCoachDetailPage';
import AdminExerciseLibraryPage from './pages/admin/exercises/AdminExerciseLibraryPage';
import AdminWorkoutGovernancePage from './pages/admin/workouts/AdminWorkoutGovernancePage';
import CoachDashboard from './pages/coaches/CoachDashboard';
import CoachExerciseLibraryPage from './pages/coaches/CoachExerciseLibraryPage';
import CoachExerciseDetailPage from './pages/coaches/CoachExerciseDetailPage';
import CoachProgramsPage from './pages/coaches/CoachProgramsPage';
import CoachProgramNewPage from './pages/coaches/CoachProgramNewPage';
import CoachProgramBuilderPage from './pages/coaches/CoachProgramBuilderPage';
import CoachMembersPage from './pages/coaches/CoachMembersPage';
import CoachMemberDetailPage from './pages/coaches/CoachMemberDetailPage';
import CoachAssignmentsPage from './pages/coaches/CoachAssignmentsPage';
import CoachAssignmentNewPage from './pages/coaches/CoachAssignmentNewPage';
import CoachAssignmentDetailPage from './pages/coaches/CoachAssignmentDetailPage';
import CoachSchedulesPage from './pages/coaches/CoachSchedulesPage';
import CoachSessionsPage from './pages/coaches/CoachSessionsPage';
import CoachSessionDetailPage from './pages/coaches/CoachSessionDetailPage';
import CoachProgressPage from './pages/coaches/CoachProgressPage';
import CoachListPage from './pages/coaches/CoachListPage';
import CoachProfilePage from './pages/coaches/CoachProfilePage';
import CoachSelfProfilePage from './pages/coaches/CoachSelfProfilePage';
import CoachAvailabilityPage from './pages/coaches/CoachAvailabilityPage';
import MembersPage from './pages/members/MembersPage';
import ReferralPage from './pages/referral/ReferralPage';
import CouponPage from './pages/coupon/CouponPage';
import LoyaltyPage from './pages/loyalty/LoyaltyPage';
import AuditPage from './pages/audit/AuditPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import CRMPage from './pages/crm/CRMPage';
import TicketPage from './pages/tickets/TicketPage';
import InvoicePage from './pages/invoices/InvoicePage';
import BackupPage from './pages/backup/BackupPage';
import RevenuePage from './pages/revenue/RevenuePage';
import SettingsPage from './pages/settings/SettingsPage';
import MembershipPlans from './pages/membership/MembershipPlans';
import MembershipAccountPage from './pages/membership/MembershipAccountPage';
import VideoLibrary from './pages/video/VideoLibrary';
import VideosPreviewPage from './pages/video/VideosPreviewPage';
import CoachBooking from './pages/booking/CoachBooking';
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import AppointmentDetailPage from './pages/appointments/AppointmentDetailPage';
import CoachAppointmentsPage from './pages/coaches/CoachAppointmentsPage';
import CoachAppointmentDetailPage from './pages/coaches/CoachAppointmentDetailPage';
import UserProfile from './pages/profile/UserProfile';
import LandingPage from './pages/landing/LandingPage';
import AboutPage from './pages/about/AboutPage';
import ContactPage from './pages/contact/ContactPage';
import BlogPage from './pages/blog/BlogPage';
import SuccessStoriesPage from './pages/success-stories/SuccessStoriesPage';
import ExerciseLibraryPage from './pages/exercises/ExerciseLibraryPage';
import ExerciseDetail from './pages/exercises/ExerciseDetail';
import WorkoutPrograms from './pages/exercises/WorkoutPrograms';
import ProductsListPage from './pages/products/ProductsListPage';
import ProductDetailPage from './pages/products/ProductDetailPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminProductModerationPage from './pages/admin/AdminProductModerationPage';
import AdminProductModerationDetailPage from './pages/admin/AdminProductModerationDetailPage';
import AdminCatalogPage from './pages/admin/AdminCatalogPage';
import AdminInventoryPage from './pages/admin/AdminInventoryPage';
import AdminProductVariantsPage from './pages/admin/AdminProductVariantsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage';
import AdminRefundsPage from './pages/admin/AdminRefundsPage';
import CustomerOrderDetailPage from './pages/orders/CustomerOrderDetailPage';
import CheckoutPage from './pages/checkout/CheckoutPage';
import CartPage from './pages/cart/CartPage';
import CustomerOrdersPage from './pages/orders/CustomerOrdersPage';
import SellerApplicationPage from './pages/seller/SellerApplicationPage';
import SellerFoundationPage from './pages/seller/SellerFoundationPage';
import AdminSellerApplicationsPage from './pages/admin/AdminSellerApplicationsPage';
import AdminSellerApplicationDetailPage from './pages/admin/AdminSellerApplicationDetailPage';
import SellerShopPage from './pages/seller/SellerShopPage';
import PublicShopPage from './pages/shops/PublicShopPage';
import AdminShopsPage from './pages/admin/AdminShopsPage';
import AdminShopDetailPage from './pages/admin/AdminShopDetailPage';
import SellerBrandRequestsPage from './pages/seller/SellerBrandRequestsPage';
import AdminBrandRequestsPage from './pages/admin/AdminBrandRequestsPage';
import SellerProductsPage from './pages/seller/SellerProductsPage';
import SellerProductDetailPage from './pages/seller/SellerProductDetailPage';
import SellerProductFormPage from './pages/seller/SellerProductFormPage';
import SellerOrdersPage from './pages/seller/SellerOrdersPage';
import SellerOrderDetailPage from './pages/seller/SellerOrderDetailPage';
import SellerRevenuePage from './pages/seller/SellerRevenuePage';
import AdminSettlementsPage from './pages/admin/AdminSettlementsPage';
import ComplaintsPage from './pages/complaints/ComplaintsPage';
import ReviewsPage from './pages/reviews/ReviewsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import { MemberProgressExercisesPage, MemberProgressPage, MemberProgressSessionsPage, MemberWorkoutHomePage, MemberWorkoutProgramPage, MemberWorkoutScheduleDetailPage, MemberWorkoutSchedulePage, MemberWorkoutSessionDetailPage, MemberWorkoutSessionsPage } from './pages/workouts/MemberWorkoutPages';
import { canAccess, roleHome, Role } from './auth/accessPolicy';
import ChatbotWidget from './features/chatbot/ChatbotWidget';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated,initialized } = useAuthStore();
  const location=useLocation();
  if(!initialized)return null;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{from:location}} />;
  return <>{children}</>;
}

function AccessRoute({path,children,roles}:{path:string;children:React.ReactNode;roles?:Role[]}){
  const user=useAuthStore(state=>state.user);if(!user)return null;
  return (roles?roles.includes(user.role):canAccess(user.role,path))?<>{children}</>:<Navigate to="/access-denied" replace/>;
}
function GuestRoute({children}:{children:React.ReactNode}){const {user,isAuthenticated}=useAuthStore();return isAuthenticated&&user?<Navigate to={roleHome(user.role)} replace/>:<>{children}</>;}
function AccessDenied(){const user=useAuthStore(state=>state.user);return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4"><h1 className="text-3xl font-bold">Access denied</h1><p className="text-slate-400">Your account is not allowed to open this page.</p><a className="btn-primary" href={user?roleHome(user.role):'/login'}>Return safely</a></div>;}

export default function App() {
  return (
    <>
      <CommandMenu />
      <ChatbotWidget />
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<MarketingHeaderWrapper><LandingPage /></MarketingHeaderWrapper>} />
        <Route path="/about" element={<MarketingHeaderWrapper><AboutPage /></MarketingHeaderWrapper>} />
        <Route path="/contact" element={<MarketingHeaderWrapper><ContactPage /></MarketingHeaderWrapper>} />
        <Route path="/blog" element={<MarketingHeaderWrapper><BlogPage /></MarketingHeaderWrapper>} />
        <Route path="/membership" element={<MarketingHeaderWrapper><MembershipPlans /></MarketingHeaderWrapper>} />
        <Route path="/coaches" element={<MarketingHeaderWrapper><CoachListPage /></MarketingHeaderWrapper>} />
        <Route path="/coaches/:id" element={<MarketingHeaderWrapper><CoachProfilePage /></MarketingHeaderWrapper>} />
        <Route path="/coaches/:id/book" element={<MarketingHeaderWrapper><CoachBooking /></MarketingHeaderWrapper>} />
        <Route path="/booking" element={<Navigate to="/coaches" replace />} />
        <Route path="/videos" element={<MarketingHeaderWrapper><VideosPreviewPage /></MarketingHeaderWrapper>} />
        <Route path="/success-stories" element={<MarketingHeaderWrapper><SuccessStoriesPage /></MarketingHeaderWrapper>} />
        <Route path="/exercises" element={<MarketingHeaderWrapper><ExerciseLibraryPage /></MarketingHeaderWrapper>} />
        <Route path="/exercises/:id" element={<MarketingHeaderWrapper><ExerciseDetail /></MarketingHeaderWrapper>} />
        <Route path="/workout-programs" element={<MarketingHeaderWrapper><WorkoutPrograms /></MarketingHeaderWrapper>} />
        <Route path="/products" element={<MarketingHeaderWrapper><ProductsListPage /></MarketingHeaderWrapper>} />
        <Route path="/products/:id" element={<MarketingHeaderWrapper><ProductDetailPage /></MarketingHeaderWrapper>} />
        <Route path="/shops/:shopSlug" element={<MarketingHeaderWrapper><PublicShopPage /></MarketingHeaderWrapper>} />
        <Route path="/cart" element={<MarketingHeaderWrapper><CartPage /></MarketingHeaderWrapper>} />

        {/* AUTH */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* PROTECTED */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/membership/account" element={<AccessRoute path="/membership/account"><MembershipAccountPage /></AccessRoute>} />
          <Route path="/membership/checkout" element={<AccessRoute path="/membership/checkout"><MembershipAccountPage /></AccessRoute>} />
          <Route path="/workouts" element={<AccessRoute path="/workouts"><MemberWorkoutHomePage /></AccessRoute>} />
          <Route path="/workouts/program" element={<AccessRoute path="/workouts"><MemberWorkoutProgramPage /></AccessRoute>} />
          <Route path="/workouts/schedule" element={<AccessRoute path="/workouts"><MemberWorkoutSchedulePage /></AccessRoute>} />
          <Route path="/workouts/schedule/:scheduleId" element={<AccessRoute path="/workouts"><MemberWorkoutScheduleDetailPage /></AccessRoute>} />
          <Route path="/workouts/sessions" element={<AccessRoute path="/workouts"><MemberWorkoutSessionsPage /></AccessRoute>} />
          <Route path="/workouts/sessions/:sessionId" element={<AccessRoute path="/workouts"><MemberWorkoutSessionDetailPage /></AccessRoute>} />
          <Route path="/progress" element={<AccessRoute path="/progress"><MemberProgressPage /></AccessRoute>} />
          <Route path="/progress/sessions" element={<AccessRoute path="/progress"><MemberProgressSessionsPage /></AccessRoute>} />
          <Route path="/progress/exercises/:exerciseId" element={<AccessRoute path="/progress"><MemberProgressExercisesPage /></AccessRoute>} />
          <Route path="/members" element={<AccessRoute path="/members"><MembersPage /></AccessRoute>} />
          <Route path="/referral" element={<AccessRoute path="/referral"><ReferralPage /></AccessRoute>} />
          <Route path="/coupons" element={<AccessRoute path="/coupons"><CouponPage /></AccessRoute>} />
          <Route path="/loyalty" element={<AccessRoute path="/loyalty"><LoyaltyPage /></AccessRoute>} />
          <Route path="/tickets" element={<AccessRoute path="/tickets"><TicketPage /></AccessRoute>} />
          <Route path="/invoices" element={<AccessRoute path="/invoices"><InvoicePage /></AccessRoute>} />
          <Route path="/crm" element={<AccessRoute path="/crm"><CRMPage /></AccessRoute>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/appointments" element={<AccessRoute path="/appointments"><AppointmentsPage /></AccessRoute>} />
          <Route path="/appointments/:bookingId" element={<AccessRoute path="/appointments"><AppointmentDetailPage /></AccessRoute>} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/notifications" element={<AccessRoute path="/notifications"><NotificationsPage /></AccessRoute>} />
          <Route path="/seller/apply" element={<AccessRoute path="/seller/apply"><SellerApplicationPage /></AccessRoute>} />
          <Route path="/seller" element={<AccessRoute path="/seller"><SellerFoundationPage /></AccessRoute>} />
          <Route path="/seller/shop" element={<AccessRoute path="/seller/shop"><SellerShopPage /></AccessRoute>} />
          <Route path="/seller/brand-requests" element={<AccessRoute path="/seller/brand-requests"><SellerBrandRequestsPage /></AccessRoute>} />
          <Route path="/seller/products" element={<AccessRoute path="/seller/products"><SellerProductsPage /></AccessRoute>} />
          <Route path="/seller/products/new" element={<AccessRoute path="/seller/products"><SellerProductFormPage /></AccessRoute>} />
          <Route path="/seller/products/:id/edit" element={<AccessRoute path="/seller/products"><SellerProductFormPage /></AccessRoute>} />
          <Route path="/seller/products/:id" element={<AccessRoute path="/seller/products"><SellerProductDetailPage /></AccessRoute>} />
          <Route path="/seller/orders" element={<AccessRoute path="/seller/orders"><SellerOrdersPage /></AccessRoute>} />
          <Route path="/seller/orders/:shopOrderId" element={<AccessRoute path="/seller/orders"><SellerOrderDetailPage /></AccessRoute>} />
          <Route path="/seller/revenue" element={<AccessRoute path="/seller/revenue"><SellerRevenuePage /></AccessRoute>} />
          <Route path="/seller/complaints" element={<AccessRoute path="/seller/complaints"><ComplaintsPage role="seller" /></AccessRoute>} />
          <Route path="/orders/:orderId" element={<AccessRoute path="/orders"><CustomerOrderDetailPage /></AccessRoute>} />
          <Route path="/orders" element={<AccessRoute path="/orders"><CustomerOrdersPage /></AccessRoute>} />
          <Route path="/complaints" element={<AccessRoute path="/complaints"><ComplaintsPage role="buyer" /></AccessRoute>} />
          <Route path="/reviews" element={<AccessRoute path="/reviews"><ReviewsPage role="buyer" /></AccessRoute>} />
          <Route path="/checkout" element={<AccessRoute path="/checkout"><CheckoutPage /></AccessRoute>} />
          <Route path="/video" element={<AccessRoute path="/video"><VideoLibrary /></AccessRoute>} />
          <Route path="/admin" element={<AccessRoute path="/admin"><AdminDashboard /></AccessRoute>} />
          <Route path="/admin/coaches" element={<AccessRoute path="/admin/coaches"><AdminCoachManagementPage /></AccessRoute>} />
          <Route path="/admin/coaches/:coachId" element={<AccessRoute path="/admin/coaches"><AdminCoachDetailPage /></AccessRoute>} />
          <Route path="/admin/exercises" element={<AccessRoute path="/admin/exercises"><AdminExerciseLibraryPage /></AccessRoute>} />
          <Route path="/admin/workouts" element={<AccessRoute path="/admin/workouts"><AdminWorkoutGovernancePage /></AccessRoute>} />
          <Route path="/admin/analytics" element={<AccessRoute path="/admin"><AnalyticsPage /></AccessRoute>} />
          <Route path="/admin/audit" element={<AccessRoute path="/admin"><AuditPage /></AccessRoute>} />
          <Route path="/admin/revenue" element={<AccessRoute path="/admin"><RevenuePage /></AccessRoute>} />
          <Route path="/admin/backup" element={<AccessRoute path="/admin"><BackupPage /></AccessRoute>} />
          <Route path="/admin/products" element={<AccessRoute path="/admin"><AdminProductsPage /></AccessRoute>} />
          <Route path="/admin/product-moderation" element={<AccessRoute path="/admin"><AdminProductModerationPage /></AccessRoute>} />
          <Route path="/admin/product-moderation/:productId" element={<AccessRoute path="/admin"><AdminProductModerationDetailPage /></AccessRoute>} />
          <Route path="/admin/orders" element={<AccessRoute path="/admin"><AdminOrdersPage /></AccessRoute>} />
          <Route path="/admin/orders/:orderId" element={<AccessRoute path="/admin"><AdminOrderDetailPage /></AccessRoute>} />
          <Route path="/admin/refunds" element={<AccessRoute path="/admin"><AdminRefundsPage /></AccessRoute>} />
          <Route path="/admin/settlements" element={<AccessRoute path="/admin"><AdminSettlementsPage /></AccessRoute>} />
          <Route path="/admin/complaints" element={<AccessRoute path="/admin"><ComplaintsPage role="admin" /></AccessRoute>} />
          <Route path="/admin/reviews" element={<AccessRoute path="/admin"><ReviewsPage role="admin" /></AccessRoute>} />
          <Route path="/seller/reviews" element={<AccessRoute path="/seller/reviews"><ReviewsPage role="seller" /></AccessRoute>} />
          <Route path="/admin/seller-applications" element={<AccessRoute path="/admin"><AdminSellerApplicationsPage /></AccessRoute>} />
          <Route path="/admin/seller-applications/:applicationId" element={<AccessRoute path="/admin"><AdminSellerApplicationDetailPage /></AccessRoute>} />
          <Route path="/admin/shops" element={<AccessRoute path="/admin"><AdminShopsPage /></AccessRoute>} />
          <Route path="/admin/shops/:shopId" element={<AccessRoute path="/admin"><AdminShopDetailPage /></AccessRoute>} />
          <Route path="/admin/brand-requests" element={<AccessRoute path="/admin"><AdminBrandRequestsPage /></AccessRoute>} />
          <Route path="/admin/categories" element={<AccessRoute path="/admin"><AdminCatalogPage entity="categories" /></AccessRoute>} />
          <Route path="/admin/brands" element={<AccessRoute path="/admin"><AdminCatalogPage entity="brands" /></AccessRoute>} />
          <Route path="/admin/inventory" element={<AccessRoute path="/admin"><AdminInventoryPage /></AccessRoute>} />
          <Route path="/admin/products/:productId/variants" element={<AccessRoute path="/admin"><AdminProductVariantsPage /></AccessRoute>} />
          <Route path="/coach" element={<AccessRoute path="/coach"><CoachDashboard /></AccessRoute>} />
          <Route path="/coach/profile" element={<AccessRoute path="/coach/profile"><CoachSelfProfilePage /></AccessRoute>} />
          <Route path="/coach/availability" element={<AccessRoute path="/coach/availability"><CoachAvailabilityPage /></AccessRoute>} />
          <Route path="/coach/appointments" element={<AccessRoute path="/coach/appointments"><CoachAppointmentsPage /></AccessRoute>} />
          <Route path="/coach/appointments/:bookingId" element={<AccessRoute path="/coach/appointments"><CoachAppointmentDetailPage /></AccessRoute>} />
          <Route path="/coach/sessions" element={<AccessRoute path="/coach/sessions"><Navigate to="/coach/members" replace /></AccessRoute>} />
          <Route path="/coach/progress" element={<AccessRoute path="/coach/progress"><Navigate to="/coach/members" replace /></AccessRoute>} />
          <Route path="/coach/exercises" element={<AccessRoute path="/coach"><CoachExerciseLibraryPage /></AccessRoute>} />
          <Route path="/coach/exercises/:exerciseId" element={<AccessRoute path="/coach"><CoachExerciseDetailPage /></AccessRoute>} />
          <Route path="/coach/workout-programs" element={<AccessRoute path="/coach"><CoachProgramsPage /></AccessRoute>} />
          <Route path="/coach/workout-programs/new" element={<AccessRoute path="/coach"><CoachProgramNewPage /></AccessRoute>} />
          <Route path="/coach/workout-programs/:programId" element={<AccessRoute path="/coach"><CoachProgramBuilderPage /></AccessRoute>} />
          <Route path="/coach/workout-programs/:programId/edit" element={<AccessRoute path="/coach"><CoachProgramBuilderPage /></AccessRoute>} />
          <Route path="/coach/members" element={<AccessRoute path="/coach"><CoachMembersPage /></AccessRoute>} />
          <Route path="/coach/members/:memberId" element={<AccessRoute path="/coach"><CoachMemberDetailPage /></AccessRoute>} />
          <Route path="/coach/assignments" element={<AccessRoute path="/coach"><CoachAssignmentsPage /></AccessRoute>} />
          <Route path="/coach/assignments/new" element={<AccessRoute path="/coach"><CoachAssignmentNewPage /></AccessRoute>} />
          <Route path="/coach/assignments/:assignmentId" element={<AccessRoute path="/coach"><CoachAssignmentDetailPage /></AccessRoute>} />
          <Route path="/coach/schedules" element={<AccessRoute path="/coach"><CoachSchedulesPage /></AccessRoute>} />
          <Route path="/coach/members/:memberId/schedule" element={<AccessRoute path="/coach"><CoachSchedulesPage /></AccessRoute>} />
          <Route path="/coach/members/:memberId/sessions" element={<AccessRoute path="/coach"><CoachSessionsPage /></AccessRoute>} />
          <Route path="/coach/members/:memberId/sessions/:source/:sessionId" element={<AccessRoute path="/coach"><CoachSessionDetailPage /></AccessRoute>} />
          <Route path="/coach/members/:memberId/sessions/:sessionId" element={<AccessRoute path="/coach"><CoachSessionDetailPage /></AccessRoute>} />
          <Route path="/coach/members/:memberId/progress" element={<AccessRoute path="/coach"><CoachProgressPage /></AccessRoute>} />
          <Route path="/access-denied" element={<AccessDenied/>}/>
        </Route>

        {/* 404 */}
        <Route path="*" element={
          <MarketingHeaderWrapper>
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold mb-4 text-white">404</h1>
                <p className="text-[#94A3B8] text-lg mb-8">Page not found</p>
                <Link to="/" className="inline-block rounded-lg bg-[#2563eb] px-6 py-3 font-semibold text-white transition-all hover:bg-[#1d4ed8]">Back to Home</Link>
              </div>
            </div>
          </MarketingHeaderWrapper>
        } />
      </Routes>
    </>
  );
}

function MarketingHeaderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main className="pt-16">{children}</main>
    </>
  );
}
