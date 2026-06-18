import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../app/api";

export interface HealthProfileData {
    Gender: "MALE" | "FEMALE";
    DateOfBirth?: string;
    HeightCm: number;
    WeightKg: number;
    NeckCm: number;
    WaistCm: number;
    HipCm?: number;
    FitnessGoal?: string;
    ActivityLevel?: string;
}

export const useGetHealthProfile = () => {
    return useQuery({
        queryKey: ["health-profile"],
        queryFn: async () => {
            const { data } = await api.get("/health/profile");
            return data;
        },
        retry: false
    });
};

export const useUpsertHealthProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (profile: HealthProfileData) => {
            const { data } = await api.post("/health/profile", profile);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["health-profile"]);
        }
    });
};

export const useCalculateBMI = () => {
    return useMutation({
        mutationFn: async (data: { HeightCm: number; WeightKg: number }) => {
            const res = await api.post("/health/bmi-calculate", data);
            return res.data;
        }
    });
};

export const useStartFreeTrial = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const { data } = await api.post("/health/trial/start");
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["trial"]);
        }
    });
};

export const useGetFreeTrial = () => {
    return useQuery({
        queryKey: ["trial"],
        queryFn: async () => {
            const { data } = await api.get("/health/trial");
            return data;
        }
    });
};