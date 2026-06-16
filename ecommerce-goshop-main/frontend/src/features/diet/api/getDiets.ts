import { useQuery } from "@tanstack/react-query";
import { api } from "../../../app/api";

export const useGetDiets = () => {
    return useQuery({
        queryKey: ["diets"],
        queryFn: async () => {
            const { data } = await api.get("/diet");
            return data;
        }
    });
};

export const useGetDietById = (id: string) => {
    return useQuery({
        queryKey: ["diet", id],
        queryFn: async () => {
            const { data } = await api.get(`/diet/${id}`);
            return data;
        },
        enabled: !!id
    });
};