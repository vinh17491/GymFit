import { useMutation } from "@tanstack/react-query";
import { api } from "../../../app/api";

export const usePurchasePlan = () => {
    return useMutation({
        mutationFn: async (planId: number) => {
            const { data } = await api.post("/membership/purchase", { planId });
            return data;
        }
    });
};