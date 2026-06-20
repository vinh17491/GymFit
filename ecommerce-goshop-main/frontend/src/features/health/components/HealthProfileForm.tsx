import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useEffect } from "react";
import { useGetHealthProfile, useUpsertHealthProfile, HealthProfileData } from "../api/healthApi";
import { toast } from "react-toastify";
import { PageSkeleton } from "../../../components/Elements/LoadingSkeleton";

const schema = yup.object().shape({
  Gender: yup.string().oneOf(["MALE", "FEMALE"]).required("Gender is required"),
  DateOfBirth: yup.string().optional(),
  HeightCm: yup.number().positive().required("Height is required"),
  WeightKg: yup.number().positive().required("Weight is required"),
  NeckCm: yup.number().positive().required("Neck measurement is required"),
  WaistCm: yup.number().positive().required("Waist measurement is required"),
  HipCm: yup.number().positive().when("Gender", {
    is: "FEMALE",
    then: (schema) => schema.required("Hip measurement is required for females"),
    otherwise: (schema) => schema.optional()
  }),
  FitnessGoal: yup.string().optional(),
  ActivityLevel: yup.string().optional()
});

export const HealthProfileForm = () => {
  const { data: profile, isLoading } = useGetHealthProfile();
  const upsertMutation = useUpsertHealthProfile();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const gender = watch("Gender");

  useEffect(() => {
    if (profile) {
      reset({
        Gender: profile.Gender,
        DateOfBirth: profile.DateOfBirth ? profile.DateOfBirth.split('T')[0] : "",
        HeightCm: profile.HeightCm,
        WeightKg: profile.WeightKg,
        NeckCm: profile.NeckCm,
        WaistCm: profile.WaistCm,
        HipCm: profile.HipCm,
        FitnessGoal: profile.FitnessGoal,
        ActivityLevel: profile.ActivityLevel
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: any) => {
    try {
      const res = await upsertMutation.mutateAsync(data as HealthProfileData);
      toast.success("Health profile saved!");
      if (res.bmi || res.bodyFatPct) {
        toast.info(`BMI: ${res.bmi} | Body Fat: ${res.bodyFatPct}%`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save profile");
    }
  };

  if (isLoading) return <PageSkeleton rows={6} />;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Health Profile</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select {...register("Gender")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border">
              <option value="">Select...</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            {errors.Gender && <p className="text-red-500 text-sm mt-1">{errors.Gender.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input type="date" {...register("DateOfBirth")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
            <input type="number" step="0.1" {...register("HeightCm")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" />
            {errors.HeightCm && <p className="text-red-500 text-sm mt-1">{errors.HeightCm.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
            <input type="number" step="0.1" {...register("WeightKg")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" />
            {errors.WeightKg && <p className="text-red-500 text-sm mt-1">{errors.WeightKg.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Neck (cm)</label>
            <input type="number" step="0.1" {...register("NeckCm")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" />
            {errors.NeckCm && <p className="text-red-500 text-sm mt-1">{errors.NeckCm.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Waist (cm)</label>
            <input type="number" step="0.1" {...register("WaistCm")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" />
            {errors.WaistCm && <p className="text-red-500 text-sm mt-1">{errors.WaistCm.message}</p>}
          </div>

          {gender === "FEMALE" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Hip (cm)</label>
              <input type="number" step="0.1" {...register("HipCm")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" />
              {errors.HipCm && <p className="text-red-500 text-sm mt-1">{errors.HipCm.message as string}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Fitness Goal</label>
            <select {...register("FitnessGoal")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border">
              <option value="">Select...</option>
              <option value="Weight Loss">Weight Loss</option>
              <option value="Muscle Gain">Muscle Gain</option>
              <option value="Maintenance">Maintenance</option>
              <option value="General Health">General Health</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Activity Level</label>
            <select {...register("ActivityLevel")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border">
              <option value="">Select...</option>
              <option value="Sedentary">Sedentary</option>
              <option value="Lightly Active">Lightly Active</option>
              <option value="Moderately Active">Moderately Active</option>
              <option value="Very Active">Very Active</option>
              <option value="Super Active">Super Active</option>
            </select>
          </div>

        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={upsertMutation.isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {upsertMutation.isLoading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
};
