import { useState } from "react";
import { useParams } from "react-router-dom";
import { useGetBlogById } from "../api/getBlogs";
import { useCommentOnBlog, useLikeBlog, useUnlikeBlog } from "../api/blogInteractions";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/Elements/Spinner";
import { toast } from "react-toastify";
import { FaHeart, FaRegHeart } from "react-icons/fa";

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

    const handleLike = async () => {
        if (!currentUser) { toast.error("Please login first"); return; }
        try {
            if (blog?.likedByUser) {
                await unlikeBlog(parseInt(id!));
            } else {
                await likeBlog(parseInt(id!));
            }
            refetch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed");
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

                <div className="flex items-center gap-4 mb-8">
                    <button onClick={handleLike} className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition">
                        {blog.likedByUser ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
                        <span>{blog.likeCount || 0} Likes</span>
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Comments ({blog.comments?.length || 0})</h2>

                    {currentUser && (
                        <div className="flex gap-4 mb-6">
                            <input
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Write a comment..."
                                className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button onClick={handleComment} className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition">
                                Post
                            </button>
                        </div>
                    )}

                    <div className="space-y-4">
                        {blog.comments?.map((c: any, i: number) => (
                            <div key={i} className="border-b pb-4 last:border-b-0">
                                <p className="font-semibold text-gray-800">{c.author || c.userName}</p>
                                <p className="text-gray-600">{c.content}</p>
                                <p className="text-gray-400 text-xs mt-1">{new Date(c.createdAt).toLocaleDateString()}</p>
                            </div>
                        ))}
                        {(!blog.comments || blog.comments.length === 0) && (
                            <p className="text-gray-400">No comments yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlogDetail;