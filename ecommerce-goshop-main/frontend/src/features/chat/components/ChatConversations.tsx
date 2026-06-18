import { useNavigate } from "react-router-dom";
import { useGetConversations } from "../api/chatApi";

export const ChatConversations = () => {
    const navigate = useNavigate();
    const { data: conversations = [], isLoading, error } = useGetConversations();

    if (isLoading) return <div className="text-center py-8">Loading conversations...</div>;
    if (error) return <div className="text-center py-8 text-red-500">Error loading conversations</div>;

    return (
        <div className="space-y-4">
            {conversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No conversations yet</div>
            ) : (
                <div className="grid gap-4">
                    {conversations.map((conv) => (
                        <div
                            key={conv.Id}
                            onClick={() => navigate(`/chat/${conv.Id}`)}
                            className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition"
                        >
                            <div className="flex items-start gap-4">
                                <img
                                    src={conv.CoachAvatar || "/avatar-default.png"}
                                    alt={conv.CoachName}
                                    className="w-12 h-12 rounded-full"
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{conv.CoachName}</h3>
                                    <p className="text-gray-600 text-sm truncate">
                                        {conv.LastMessage || "No messages yet"}
                                    </p>
                                    {conv.LastMessageAt && (
                                        <p className="text-gray-400 text-xs">
                                            {new Date(conv.LastMessageAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};