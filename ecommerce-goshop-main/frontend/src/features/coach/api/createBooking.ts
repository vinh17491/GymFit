import { useMutation } from "@tanstack/react-query";
import { api } from "../../../app/api";

export const useCreateBooking = () => {
  return useMutation({
    mutationFn: async (data: { coachId: number; scheduleId: number }) => {
      const { data: result } = await api.post("/api/payment/booking", data);
      return result;
    },
  });
};