import { useQuery } from "@tanstack/react-query";
import { api } from "../../../app/api";

export const useGetCoaches = () => {
    return useQuery({
        queryKey: ["coaches"],
        queryFn: async () => {
            const { data } = await api.get("/coaches");
            return data;
        }
    });
};

export const useGetCoachById = (id: string) => {
    return useQuery({
        queryKey: ["coach", id],
        queryFn: async () => {
            const { data } = await api.get(`/coaches/${id}`);
            return data;
        },
        enabled: !!id
    });
};

export const useGetCoachSchedules = (id: string) => {
    return useQuery({
        queryKey: ["coach-schedules", id],
        queryFn: async () => {
            const { data } = await api.get(`/coaches/${id}/schedules`);
            return data;
        },
        enabled: !!id
    });
};