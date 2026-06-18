import { Routes, Route } from "react-router-dom";
import { AuthRoutes } from "../features/auth";
import { ProtectedRoute } from "./ProtectedRoute";
import { Home, NotFound } from "../features/misc";
import { MembershipRoutes } from "../features/membership/routes";
import { CoachRoutes } from "../features/coach/routes";
import { WorkoutRoutes } from "../features/workout";
import { DietRoutes } from "../features/diet";
import { BlogRoutes } from "../features/blog";
import { NotificationRoutes } from "../features/notification";
import { AdminDashboard, CoachDashboard, MemberDashboard } from "../features/dashboard";
import { HealthRoutes } from "../features/health";
import { ChatRoutes } from "../features/chat";
import { CommunityRoutes } from "../features/community";
import { VideoRoutes } from "../features/video";
import { CreditsRoutes } from "../features/credits/routes";
import { AIRoutes } from "../features/ai/routes";

export const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/">
                <Route index element={<Home />} />
                <Route path="auth/*" element={<AuthRoutes />} />
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
            </Route>

            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<MemberDashboard />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/coach/dashboard" element={<CoachDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};