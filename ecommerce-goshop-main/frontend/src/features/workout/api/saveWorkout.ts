import { useMutation } from "@tanstack/react-query";
import { api } from "../../../app/api";

export const useSaveWorkout = () => {
    return useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.post(`/workouts/save/${id}`);
            return data;
        }
    });
};