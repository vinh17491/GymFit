import { useAuth } from "../../../context/AuthContext";
import { useForm, SubmitHandler } from "react-hook-form";
import { useUpdateUserMutation } from "../api/updateUser";
import { Spinner } from "../../../components/Elements/Spinner";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

const userFormValidationSchema = yup.object({
    firstName: yup
        .string()
        .required("First name is required")
        .trim()
        .matches(/^[aA-zZ\s]+$/, "Name can only contain alphabets"),
    lastName: yup
        .string()
        .required("Last Name is required")
        .trim()
        .matches(/^[aA-zZ\s]+$/, "Name can only contain alphabets"),
    image: yup.mixed<FileList>().nullable(),
});
type UserForm = yup.InferType<typeof userFormValidationSchema>;

const UserForm = () => {
    const { currentUser, token } = useAuth();
    const [preview, setPreview] = useState<string | null>(null);
    const { mutateAsync: updateUserOnBackend } = useUpdateUserMutation(currentUser?.id?.toString() || "", token);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<UserForm>({
        resolver: yupResolver<UserForm>(userFormValidationSchema),
    });

    useEffect(() => {
        if (currentUser) {
            const names = currentUser.fullName?.split(" ") || ["", ""];
            reset({
                firstName: names[0] || "",
                lastName: names[1] || "",
            });
        }
    }, [currentUser, reset]);

    const handleFormSubmit: SubmitHandler<UserForm> = async (data) => {
        const userFormData = new FormData();
        userFormData.append("fullName", `${data.firstName.trim()} ${data.lastName.trim()}`);
        if (data.image?.length) {
            userFormData.append("image", data.image[0]);
        }
        try {
            await updateUserOnBackend(userFormData);
            toast.success("Profile updated successfully");
        } catch (error) {
            toast.error("Failed to update profile");
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setPreview(null);
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    return (
        <form
            noValidate
            className="relative"
            onSubmit={handleSubmit(handleFormSubmit)}
        >
            {!currentUser && <Spinner />}
            <div className="flex flex-col w-full mb-3">
                <label htmlFor="firstName" className="text-secondary">
                    First Name
                </label>
                <input
                    {...register("firstName")}
                    type="text"
                    id="firstName"
                    placeholder="Enter First Name"
                    className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-1 border focus:border-primary focus:bg-white focus:outline-none"
                />
                {
                    <p className="text-red-500 font-semibold mt-1">
                        {errors.firstName?.message}
                    </p>
                }
            </div>
            <div className="flex flex-col w-full mb-3">
                <label htmlFor="lastName" className="text-secondary">
                    Last Name
                </label>
                <input
                    {...register("lastName")}
                    type="text"
                    id="lastName"
                    placeholder="Enter Last Name"
                    className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-1 border focus:border-primary focus:bg-white focus:outline-none"
                />
                {
                    <p className="text-red-500 font-semibold mt-1">
                        {errors.lastName?.message}
                    </p>
                }
            </div>
            <div className="flex flex-col w-full mb-3">
                <label htmlFor="image" className="text-secondary">
                    Image
                </label>
                <input
                    {...register("image")}
                    type="file"
                    accept="image/*"
                    id="image"
                    onChange={handleImageChange}
                    className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-1 border focus:border-primary focus:bg-white focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white"
                />
            </div>
            {preview && (
                <div className="mb-3">
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-24 h-24 rounded-full object-cover"
                    />
                </div>
            )}
            <button
                type="submit"
                className="w-full font-semibold text-sm bg-dark text-white transition hover:bg-opacity-90 rounded-xl py-3 px-4"
            >
                Update User
            </button>
        </form>
    );
};

export default UserForm;