import { Routes, Route } from "react-router-dom";
import { ChatConversations } from "../components/ChatConversations";
import { ChatDetail } from "../components/ChatDetail";

export const ChatRoutes = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Coach Chat</h1>
            <Routes>
                <Route path="" element={<ChatConversations />} />
                <Route path=":conversationId" element={<ChatDetail />} />
            </Routes>
        </div>
    );
};