import { useQuery } from "@tanstack/react-query";
import { api } from "../../../app/api";

export const useGetAdminDashboard = () => {
    return useQuery({
        queryKey: ["dashboard", "admin"],
        queryFn: async () => {
            const { data } = await api.get("/dashboard/admin");
            return data;
        }
    });
};

export const useGetCoachDashboard = () => {
    return useQuery({
        queryKey: ["dashboard", "coach"],
        queryFn: async () => {
            const { data } = await api.get("/dashboard/coach");
            return data;
        }
    });
};

export const useGetMemberDashboard = () => {
    return useQuery({
        queryKey: ["dashboard", "member"],
        queryFn: async () => {
            const { data } = await api.get("/dashboard/member");
            return data;
        }
    });
};