import { Link, useNavigate } from "react-router-dom";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/Elements/Spinner";
import { toast } from "react-toastify";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

const signupValidationSchema = yup.object({
    fullName: yup.string().required("Full Name is required").min(6, "Full Name must be at least 6 characters"),
    email: yup
        .string()
        .email("Please enter a valid email address")
        .required("Email is required"),
    password: yup
        .string()
        .required("Password is required")
        .matches(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d@$!%*?&]{8,}$/,
            "Password must contain uppercase, lowercase, number, special character, min 8"
        ),
});

type SignupForm = yup.InferType<typeof signupValidationSchema>;

const SignupForm = () => {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
        resolver: yupResolver(signupValidationSchema) as any,
    });
    const { signUp, signInWithGoogle } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async (data: SignupForm) => {
        try {
            setIsLoading(true);
            const { email, password, fullName } = data;
            await signUp({ email, password, fullName });
            navigate("/");
        } catch (error) {
            toast.error("Sign up failed");
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
            toast.error("Google sign up failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleError = () => {
        toast.error("Google sign up was cancelled or failed");
    };

    return (
        <>
            <form className="w-full relative" onSubmit={handleSubmit(handleSignup)}>
                {isLoading && <Spinner />}
                <div className="flex flex-col mb-4">
                    <label htmlFor="fullName" className="text-secondary">Full Name</label>
                    <input {...register("fullName")} type="text" id="fullName" placeholder="Enter Full Name"
                        className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-1 border focus:border-primary focus:bg-white focus:outline-none" />
                    {errors.fullName?.message && <p className="text-red-500 font-semibold mt-1">{errors.fullName.message}</p>}
                </div>
                <div className="flex flex-col mb-4">
                    <label htmlFor="email" className="text-secondary">Email Address</label>
                    <input {...register("email")} type="email" id="email" placeholder="Enter Email Address"
                        className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-1 border focus:border-primary focus:bg-white focus:outline-none" />
                    {errors.email?.message && <p className="text-red-500 font-semibold mt-1">{errors.email.message}</p>}
                </div>
                <div className="flex flex-col mb-4">
                    <label htmlFor="password" className="text-secondary">Password</label>
                    <input {...register("password")} type="password" id="password" placeholder="Enter Password"
                        className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-1 border focus:border-primary focus:bg-white focus:outline-none" />
                    {errors.password?.message && <p className="text-red-500 font-semibold mt-1">{errors.password.message}</p>}
                </div>
                <p className="text-xs text-gray-400 mb-2">Password must have uppercase, lowercase, number, special char, min 8</p>
                <button className="w-full font-semibold text-sm bg-dark text-white transition hover:bg-opacity-90 rounded-xl py-3 px-4 mb-2">Create Account</button>
            </form>
            <hr className="my-6 border-gray-300 w-full" />
            <div className="flex justify-center w-full mb-4">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} theme="outline" size="large" shape="rectangular" text="signup_with" />
            </div>
            <p className="text-sm text-center">
                Already have an account?{" "}
                <Link className="font-semibold text-primary transition-colors hover:text-dark" to="/auth/login">Sign in</Link>
            </p>
        </>
    );
};

export default SignupForm;