import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute, AuthRoute } from "./ProtectedRoute";
import { PageSkeleton } from "../components/Elements/LoadingSkeleton";

// Lazy-loaded feature routes
const Home = lazy(() => import("../features/misc/routes/Home").then(m => ({ default: m.Home })));
const Contact = lazy(() => import("../features/misc/routes/Contact").then(m => ({ default: m.Contact })));
const NotFound = lazy(() => import("../features/misc/routes/NotFound").then(m => ({ default: m.NotFound })));
const AuthRoutes = lazy(() => import("../features/auth").then(m => ({ default: m.AuthRoutes })));
const MembershipRoutes = lazy(() => import("../features/membership/routes").then(m => ({ default: m.MembershipRoutes })));
const CoachRoutes = lazy(() => import("../features/coach/routes").then(m => ({ default: m.CoachRoutes })));
const WorkoutRoutes = lazy(() => import("../features/workout").then(m => ({ default: m.WorkoutRoutes })));
const DietRoutes = lazy(() => import("../features/diet").then(m => ({ default: m.DietRoutes })));
const BlogRoutes = lazy(() => import("../features/blog").then(m => ({ default: m.BlogRoutes })));
const NotificationRoutes = lazy(() => import("../features/notification").then(m => ({ default: m.NotificationRoutes })));
const MemberDashboard = lazy(() => import("../features/dashboard").then(m => ({ default: m.MemberDashboard })));
const AdminDashboard = lazy(() => import("../features/dashboard").then(m => ({ default: m.AdminDashboard })));
const CoachDashboard = lazy(() => import("../features/dashboard").then(m => ({ default: m.CoachDashboard })));
const HealthRoutes = lazy(() => import("../features/health").then(m => ({ default: m.HealthRoutes })));
const ChatRoutes = lazy(() => import("../features/chat").then(m => ({ default: m.ChatRoutes })));
const CommunityRoutes = lazy(() => import("../features/community").then(m => ({ default: m.CommunityRoutes })));
const VideoRoutes = lazy(() => import("../features/video").then(m => ({ default: m.VideoRoutes })));
const CreditsRoutes = lazy(() => import("../features/credits/routes").then(m => ({ default: m.CreditsRoutes })));
const AIRoutes = lazy(() => import("../features/ai/routes").then(m => ({ default: m.AIRoutes })));
const ProductRoutes = lazy(() => import("../features/products/routes").then(m => ({ default: m.ProductRoutes })));
const CartRoutes = lazy(() => import("../features/cart/routes").then(m => ({ default: m.CartRoutes })));
const CheckoutRoutes = lazy(() => import("../features/checkout/routes").then(m => ({ default: m.CheckoutRoutes })));

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <PageSkeleton />
    </div>
);

export const AppRoutes = () => {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/">
                    <Route index element={<Home />} />
                    <Route path="contact" element={<Contact />} />
                    <Route element={<AuthRoute />}>
                        <Route path="auth/*" element={<AuthRoutes />} />
                        <Route path="register" element={<AuthRoutes />} />
                        <Route path="login" element={<AuthRoutes />} />
                    </Route>
                    <Route element={<ProtectedRoute />}>
                        <Route path="membership/*" element={<MembershipRoutes />} />
                        <Route path="coaches/*" element={<CoachRoutes />} />
                        <Route path="workouts/*" element={<WorkoutRoutes />} />
                        <Route path="diet/*" element={<DietRoutes />} />
                        <Route path="blogs/*" element={<BlogRoutes />} />
                        <Route path="notifications/*" element={<NotificationRoutes />} />
                        <Route path="health/*" element={<HealthRoutes />} />
                        <Route path="chat/*" element={<ChatRoutes />} />
                        <Route path="community/*" element={<CommunityRoutes />} />
                        <Route path="videos/*" element={<VideoRoutes />} />
                        <Route path="credits/*" element={<CreditsRoutes />} />
                        <Route path="ai/*" element={<AIRoutes />} />
                        <Route path="products/*" element={<ProductRoutes />} />
                        <Route path="cart" element={<CartRoutes />} />
                        <Route path="checkout/*" element={<CheckoutRoutes />} />
                    </Route>
                </Route>

                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<MemberDashboard />} />
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/coach/dashboard" element={<CoachDashboard />} />
                </Route>

                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );
};
