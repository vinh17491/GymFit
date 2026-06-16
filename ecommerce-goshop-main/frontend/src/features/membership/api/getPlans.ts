import { useQuery } from "@tanstack/react-query";
import { api } from "../../../app/api";

export const useGetPlans = () => {
    return useQuery({
        queryKey: ["membership-plans"],
        queryFn: async () => {
            const { data } = await api.get("/membership/plans");
            return data;
        }
    });
};