import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../app/api";

export interface ChatConversation {
    Id: number;
    UserId: number;
    CoachId: number;
    UserName: string;
    UserAvatar: string;
    CoachName: string;
    CoachAvatar: string;
    LastMessage?: string;
    LastMessageAt?: string;
}

export interface ChatMessage {
    Id: number;
    ConversationId: number;
    SenderId: number;
    Content: string;
    IsRead: boolean;
    CreatedAt: string;
    FullName: string;
    Avatar: string;
}

export const useGetConversations = () => {
    return useQuery({
        queryKey: ["chat-conversations"],
        queryFn: async () => {
            const { data } = await api.get("/chat/conversations");
            return data as ChatConversation[];
        }
    });
};

export const useGetOrCreateConversation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (coachId: number) => {
            const { data } = await api.post("/chat/conversations", { coachId });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["chat-conversations"]);
        }
    });
};

export const useGetMessages = (conversationId: number) => {
    return useQuery({
        queryKey: ["chat-messages", conversationId],
        queryFn: async () => {
            const { data } = await api.get(`/chat/conversations/${conversationId}/messages`);
            return data as ChatMessage[];
        },
        enabled: !!conversationId
    });
};

export const useSendMessage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { conversationId: number; content: string }) => {
            const { data } = await api.post(`/chat/conversations/${payload.conversationId}/messages`, {
                conversationId: payload.conversationId,
                content: payload.content
            });
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(["chat-messages", variables.conversationId]);
        }
    });
};

export const useMarkAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (conversationId: number) => {
            const { data } = await api.put(`/chat/conversations/${conversationId}/read`);
            return data;
        },
        onSuccess: (_, conversationId) => {
            queryClient.invalidateQueries(["chat-messages", conversationId]);
        }
    });
};

export const useGetUnreadCount = () => {
    return useQuery({
        queryKey: ["chat-unread-count"],
        queryFn: async () => {
            const { data } = await api.get("/chat/unread-count");
            return data.unread as number;
        }
    });
};