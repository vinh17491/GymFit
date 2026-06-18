import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetMessages, useSendMessage, useMarkAsRead } from "../api/chatApi";

export const ChatDetail = () => {
    const { conversationId } = useParams<{ conversationId: string }>();
    const navigate = useNavigate();
    const idNum = parseInt(conversationId || "0");
    const { data: messages = [], isLoading, error } = useGetMessages(idNum);
    const sendMutation = useSendMessage();
    const markAsRead = useMarkAsRead();
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (idNum) markAsRead.mutate(idNum);
    }, [idNum]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        sendMutation.mutate(
            { conversationId: idNum, content: newMessage },
            { onSuccess: () => setNewMessage("") }
        );
    };

    if (isLoading) return <div className="text-center py-8">Loading messages...</div>;
    if (error) return <div className="text-center py-8 text-red-500">Error loading messages</div>;

    return (
        <div className="flex flex-col h-[70vh]">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => navigate("/chat")} className="text-blue-600 hover:underline">
                    &larr; Back to conversations
                </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg bg-gray-50">
                {messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No messages yet. Start the conversation!</div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.Id} className="flex items-start gap-3">
                            <img
                                src={msg.Avatar || "/avatar-default.png"}
                                alt={msg.FullName}
                                className="w-8 h-8 rounded-full"
                            />
                            <div className="bg-white p-3 rounded-lg shadow-sm max-w-[70%]">
                                <p className="text-xs text-gray-500 font-semibold">{msg.FullName}</p>
                                <p className="text-sm mt-1">{msg.Content}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {new Date(msg.CreatedAt).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="mt-4 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    disabled={sendMutation.isLoading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    Send
                </button>
            </form>
        </div>
    );
};