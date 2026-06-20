import { useState } from "react";
import { useParams } from "react-router-dom";
import { useGetBlogById } from "../api/getBlogs";
import { useCommentOnBlog, useLikeBlog, useUnlikeBlog } from "../api/blogInteractions";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/Elements/Spinner";
import { toast } from "react-toastify";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { IoChatbubbleOutline, IoSend } from "react-icons/io5";

const BlogDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { currentUser } = useAuth();
    const { data: blog, isLoading, refetch } = useGetBlogById(id!);
    const { mutateAsync: comment } = useCommentOnBlog();
    const { mutateAsync: likeBlog } = useLikeBlog();
    const { mutateAsync: unlikeBlog } = useUnlikeBlog();
    const [commentText, setCommentText] = useState("");

    const handleComment = async () => {
        if (!currentUser) { toast.error("Please login first"); return; }
        if (!commentText.trim()) return;
        try {
            await comment({ id: parseInt(id!), content: commentText });
            setCommentText("");
            toast.success("Comment added!");
            refetch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to comment");
        }
    };

    const [liking, setLiking] = useState(false);
    const [likeAnim, setLikeAnim] = useState(false);

    const handleLike = async () => {
        if (!currentUser) { toast.error("Please login first"); return; }
        if (liking) return;
        setLiking(true);
        setLikeAnim(true);
        try {
            if (blog?.likedByUser) {
                await unlikeBlog(parseInt(id!));
            } else {
                await likeBlog(parseInt(id!));
            }
            refetch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed");
        } finally {
            setLiking(false);
            setTimeout(() => setLikeAnim(false), 300);
        }
    };

    if (isLoading) return <Spinner />;
    if (!blog) return <div className="text-center py-20 text-gray-500">Blog not found</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 text-white py-16">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">{blog.title}</h1>
                    <p className="text-indigo-200">{blog.author} - {new Date(blog.createdAt).toLocaleDateString()}</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12">
                <img src={blog.imageUrl || "https://via.placeholder.com/800x400"} alt={blog.title} className="w-full rounded-2xl shadow-lg mb-8" />

                <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
                    <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">{blog.content}</div>
                </div>

                <div className="flex items-center gap-6 mb-8">
                    <button
                        onClick={handleLike}
                        disabled={liking}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-200 ${
                            blog.likedByUser
                                ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                                : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 border border-transparent"
                        } ${likeAnim ? "scale-110" : ""}`}
                    >
                        <FaHeart className={`transition-transform duration-200 ${likeAnim ? "scale-125" : ""} ${blog.likedByUser ? "text-red-500" : ""}`} />
                        <span>{blog.likeCount || 0} {blog.likeCount === 1 ? "Like" : "Likes"}</span>
                    </button>
                    <span className="flex items-center gap-1 text-gray-500 text-sm">
                        <IoChatbubbleOutline className="text-lg" />
                        {blog.comments?.length || 0} {blog.comments?.length === 1 ? "Comment" : "Comments"}
                    </span>
                </div>

                <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Comments ({blog.comments?.length || 0})</h2>

                    {currentUser && (
                        <div className="flex gap-3 mb-6">
                            <img
                                src={currentUser.photoURL || "https://via.placeholder.com/40"}
                                alt=""
                                className="w-10 h-10 rounded-full flex-shrink-0"
                            />
                            <div className="flex-1 flex gap-2">
                                <input
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                                    placeholder="Write a comment..."
                                    className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                <button
                                    onClick={handleComment}
                                    disabled={!commentText.trim()}
                                    className="bg-indigo-600 text-white px-4 rounded-xl hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <IoSend />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {blog.comments?.map((c: any, i: number) => (
                            <div key={i} className="flex gap-3 border-b border-gray-50 pb-4 last:border-b-0">
                                <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    {(c.author || c.userName || "U").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-gray-800 text-sm">{c.author || c.userName}</p>
                                        <p className="text-gray-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <p className="text-gray-600 mt-1">{c.content}</p>
                                </div>
                            </div>
                        ))}
                        {(!blog.comments || blog.comments.length === 0) && (
                            <div className="text-center py-8">
                                <IoChatbubbleOutline className="text-4xl text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-400">No comments yet. Be the first to share your thoughts!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlogDetail;