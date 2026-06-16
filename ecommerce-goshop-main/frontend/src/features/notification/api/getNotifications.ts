import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../../../app/api";

export const useGetNotifications = () => {
    return useQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
            const { data } = await api.get("/notifications");
            return data;
        }
    });
};

export const useMarkNotificationRead = () => {
    return useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.post(`/notifications/read/${id}`);
            return data;
        }
    });
};

export const useMarkAllRead = () => {
    return useMutation({
        mutationFn: async () => {
            const { data } = await api.post("/notifications/read-all");
            return data;
        }
    });
};