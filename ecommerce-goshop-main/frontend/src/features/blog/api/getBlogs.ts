import { useQuery } from "@tanstack/react-query";
import { api } from "../../../app/api";

export const useGetBlogs = () => {
    return useQuery({
        queryKey: ["blogs"],
        queryFn: async () => {
            const { data } = await api.get("/blogs");
            return data;
        }
    });
};

export const useGetBlogById = (id: string) => {
    return useQuery({
        queryKey: ["blog", id],
        queryFn: async () => {
            const { data } = await api.get(`/blogs/${id}`);
            return data;
        },
        enabled: !!id
    });
};