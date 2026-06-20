import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const LoadingScreen = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
);

export const ProtectedRoute = () => {
    const { currentUser, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <LoadingScreen />;
    }

    return currentUser ? (
        <Layout />
    ) : (
        <Navigate to="/auth/login" state={{ from: location }} replace />
    );
};

/**
 * AuthRoute: Redirects already-logged-in users to /dashboard.
 * Used on login/signup pages so logged-in users can't access them.
 */
export const AuthRoute = () => {
    const { currentUser, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    return currentUser ? (
        <Navigate to="/dashboard" replace />
    ) : (
        <Outlet />
    );
};