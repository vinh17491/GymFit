import { useQuery } from "@tanstack/react-query";
import { api } from "../../../app/api";

export const useGetWorkouts = () => {
    return useQuery({
        queryKey: ["workouts"],
        queryFn: async () => {
            const { data } = await api.get("/workouts");
            return data;
        }
    });
};

export const useGetWorkoutById = (id: string) => {
    return useQuery({
        queryKey: ["workout", id],
        queryFn: async () => {
            const { data } = await api.get(`/workouts/${id}`);
            return data;
        },
        enabled: !!id
    });
};