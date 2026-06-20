import { Route, Routes } from "react-router-dom";
import Auth from "./Auth";
import ForgotPasswordForm from "../components/ForgotPasswordForm";

export const AuthRoutes = () => {
    return (
        <Routes>
            <Route path="signup" element={<Auth />} />
            <Route path="login" element={<Auth />} />
            <Route path="forgot-password" element={<ForgotPasswordForm />} />
        </Routes>
    );
};
