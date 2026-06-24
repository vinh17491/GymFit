import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/Elements/Spinner";
import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "../../../app/firebase";
import { toast } from "react-toastify";

const registerValidationSchema = yup.object({
    email: yup.string().email("Please enter a valid email address").required("Email is required"),
    password: yup.string()
        .required("Password is required")
        .min(6, "Password must be at least 6 characters")
        .matches(/^\S*$/, "Password cannot contain spaces"),
    password2: yup.string()
        .oneOf([yup.ref("password")], "Passwords do not match")
        .required("Password confirmation is required"),
    firstName: yup.string().required("First name is required").trim().matches(/^[aA-zZ\s]+$/, "Name can only contain alphabets"),
    lastName: yup.string().required("Last name is required").trim().matches(/^[aA-zZ\s]+$/, "Name can only contain alphabets")
});
type SignupForm = yup.InferType<typeof registerValidationSchema>;


const SignupForm = () => {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
        resolver: yupResolver<SignupForm>(registerValidationSchema),
    });

    const { signUp, signInWithGoogle } = useAuth();
    const handleRegister = async (data: SignupForm) => {
        try {
            setIsLoading(true);
            const credentials = {
                email: data.email.trim(),
                password: data.password,
                fullName: `${data.firstName.trim()} ${data.lastName.trim()}`,
            };
        
            await signUp(credentials);
            navigate("/");
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
            <form
                noValidate
                className="w-full relative"
                onSubmit={handleSubmit(handleRegister)}
            >
                {isLoading && <Spinner />}
                <div className="flex flex-col mb-3">
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
                <div className="flex flex-col w-full mb-3">
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
                <div className="flex flex-col w-full mb-3">
                    <label htmlFor="password2" className="text-secondary">
              Confirm Password
                    </label>
                    <input
                        {...register("password2")}
                        type="password"
                        id="password2"
                        placeholder="Confirm Password"
                        className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-1 border focus:border-primary focus:bg-white focus:outline-none"
                    />
                    {
                        <p className="text-red-500 font-semibold mt-1">
                            {errors.password2?.message}
                        </p>
                    }
                </div>
                <div className="flex flex-row mb-3">
                    <div className="flex flex-col w-[48.5%] mr-[3%]">
                        <label htmlFor="firstName" className="text-secondary">
                First Name
                        </label>
                        <input
                            {...register("firstName")}
                            type="text"
                            id="firstName"
                            placeholder="Enter First Name"
                            className="px-4 py-3 rounded-lg bg-gray-200 mt-1 border focus:border-primary focus:bg-white focus:outline-none"
                        />
                        {
                            <p className="text-red-500 font-semibold mt-1">
                                {errors.firstName?.message}
                            </p>
                        }
                    </div>
                    <div className="flex flex-col w-[48.5%]">
                        <label htmlFor="lastName" className="text-secondary">
                Last Name
                        </label>
                        <input
                            {...register("lastName")}
                            type="text"
                            id="lastName"
                            placeholder="Enter Last Name"
                            className="px-4 py-3 rounded-lg bg-gray-200 mt-1 border focus:border-primary focus:bg-white focus:outline-none"
                        />
                        {
                            <p className="text-red-500 font-semibold mt-1">
                                {errors.lastName?.message}
                            </p>
                        }
                    </div>
                </div>
                <button className="w-full font-semibold text-sm bg-dark text-white transition hover:bg-opacity-90 rounded-xl py-3 px-4">
            Sign up
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
                    text="signup_with"
                />
            </div>
            <p className="text-sm">
          Already have an account?{" "}
                <Link
                    className="font-semibold text-primary transition-colors hover:text-dark"
                    to="/auth/login"
                >
            Sign in
                </Link>
            </p>
        </>
    );
};

export default SignupForm;
