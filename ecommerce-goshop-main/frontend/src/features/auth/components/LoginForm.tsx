import { Link, useNavigate } from "react-router-dom";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";
import { Spinner } from "../../../components/Elements/Spinner";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

const loginValidationSchema = yup.object({
    email: yup
        .string()
        .email("Please enter a valid email address")
        .required("Email is required"),
    password: yup
        .string()
        .required("Password is required")
        .matches(/^\S*$/, "Password cannot contain spaces"),
});
type LoginForm = yup.InferType<typeof loginValidationSchema>;

const LoginForm = () => {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: yupResolver(loginValidationSchema) as any,
    });

    const { signIn, signInWithGoogle } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const handleLogin = async (data: LoginForm) => {
        try {
            setIsLoading(true);
            const email = data.email.trim();
            const password = data.password;
            await signIn(email, password);
            navigate("/");
        } catch (error) {
            toast.error("Invalid email or password");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        try {
            setIsLoading(true);
            await signInWithGoogle(credentialResponse.credential);
            navigate("/");
        } catch (error) {
            toast.error("Google sign in failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleError = () => {
        toast.error("Google sign in was cancelled or failed");
    };

    return (
        <>
            <form className="w-full relative" onSubmit={handleSubmit(handleLogin)}>
                {isLoading && <Spinner />}
                <div className="flex flex-col mb-4">
                    <label htmlFor="email" className="text-secondary">
            Email Address
                    </label>
                    <input
                        {...register("email")}
                        type="email"
                        id="email"
                        placeholder="Enter Email Address"
                        className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-1 border focus:border-primary focus:bg-white focus:outline-none"
                    />
                    {
                        <p className="text-red-500 font-semibold mt-1">
                            {errors.email?.message}
                        </p>
                    }
                </div>
                <div className="flex flex-col mb-1">
                    <label htmlFor="password" className="text-secondary">
            Password
                    </label>
                    <input
                        {...register("password")}
                        type="password"
                        id="password"
                        placeholder="Enter Password"
                        className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-1 border focus:border-primary focus:bg-white focus:outline-none"
                    />
                    {
                        <p className="text-red-500 font-semibold mt-1">
                            {errors.password?.message}
                        </p>
                    }
                </div>
                <div className="mb-10 text-right">
                    <Link
                        className="text-sm font-semibold transition-colors hover:text-primary"
                        to="/auth/forgot-password"
                    >
            Forgot Password?
                    </Link>
                </div>
                <button className="w-full font-semibold text-sm bg-dark text-white transition hover:bg-opacity-90 rounded-xl py-3 px-4 mb-2">
          Sign In
                </button>
            </form>

            <hr className="my-6 border-gray-300 w-full" />
            <div className="flex justify-center w-full mb-4">
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="outline"
                    size="large"
                    shape="rectangular"
                    text="signin_with"
                />
            </div>
            <p className="text-sm text-center">
        Need an account?{" "}
                <Link
                    className="font-semibold text-primary transition-colors hover:text-dark"
                    to="/auth/signup"
                >
          Create an account
                </Link>
            </p>
        </>
    );
};

export default LoginForm;