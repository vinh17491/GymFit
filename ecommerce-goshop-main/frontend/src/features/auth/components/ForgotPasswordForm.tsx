import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../../app/firebase";
import { toast } from "react-toastify";
import { Spinner } from "../../../components/Elements/Spinner";

const ForgotPasswordForm = () => {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            toast.error("Please enter your email address");
            return;
        }
        try {
            setIsLoading(true);
            await sendPasswordResetEmail(auth, email.trim());
            setEmailSent(true);
            toast.success("Password reset email sent! Check your inbox.");
        } catch (error: any) {
            if (error.code === "auth/user-not-found") {
                toast.error("No account found with this email");
            } else if (error.code === "auth/invalid-email") {
                toast.error("Invalid email address");
            } else {
                toast.error("Failed to send reset email. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="w-full text-center">
                <div className="mb-6">
                    <svg className="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
                <p className="text-gray-600 mb-6">
                    We've sent a password reset link to <strong>{email}</strong>.
                    Please check your inbox and follow the instructions.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                    Didn't receive the email? Check your spam folder or{" "}
                    <button
                        onClick={() => setEmailSent(false)}
                        className="text-primary font-semibold hover:underline"
                    >
                        try again
                    </button>.
                </p>
                <Link
                    to="/auth/login"
                    className="inline-block font-semibold text-sm bg-dark text-white rounded-xl py-3 px-6 hover:bg-opacity-90 transition"
                >
                    Back to Login
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full relative">
            <h2 className="text-2xl font-bold mb-2">Forgot Password?</h2>
            <p className="text-gray-600 mb-6">
                Enter your email address and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit}>
                {isLoading && <Spinner />}
                <div className="flex flex-col mb-6">
                    <label htmlFor="email" className="text-secondary">
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-1 border focus:border-primary focus:bg-white focus:outline-none"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full font-semibold text-sm bg-dark text-white transition hover:bg-opacity-90 rounded-xl py-3 px-4 mb-4"
                >
                    Send Reset Link
                </button>
            </form>
            <p className="text-sm text-center">
                Remember your password?{" "}
                <Link
                    className="font-semibold text-primary transition-colors hover:text-dark"
                    to="/auth/login"
                >
                    Sign in
                </Link>
            </p>
        </div>
    );
};

export default ForgotPasswordForm;