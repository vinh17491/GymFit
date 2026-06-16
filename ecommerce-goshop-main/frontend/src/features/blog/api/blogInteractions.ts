import { useMutation } from "@tanstack/react-query";
import { api } from "../../../app/api";

export const useCommentOnBlog = () => {
    return useMutation({
        mutationFn: async ({ id, content }: { id: number; content: string }) => {
            const { data } = await api.post(`/blogs/${id}/comment`, { content });
            return data;
        }
    });
};

export const useLikeBlog = () => {
    return useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.post(`/blogs/${id}/like`);
            return data;
        }
    });
};

export const useUnlikeBlog = () => {
    return useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.delete(`/blogs/${id}/like`);
            return data;
        }
    });
};