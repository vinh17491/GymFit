import { Link } from "react-router-dom";
import { useGetBlogs } from "../api/getBlogs";
import { Spinner } from "../../../components/Elements/Spinner";

const BlogList = () => {
    const { data: blogs, isLoading } = useGetBlogs();

    if (isLoading) return <Spinner />;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">Fitness Blog</h1>
                    <p className="text-xl text-indigo-100">Tips, guides, and inspiration for your fitness journey</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {blogs?.map((blog: any) => (
                        <Link key={blog.id} to={`/blogs/${blog.id}`} className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:scale-105 transition">
                            <img src={blog.imageUrl || "https://via.placeholder.com/400x300"} alt={blog.title} className="w-full h-48 object-cover" />
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-800">{blog.title}</h3>
                                <p className="text-gray-500 text-sm mt-2">{blog.author} - {new Date(blog.createdAt).toLocaleDateString()}</p>
                                <p className="text-gray-400 text-sm mt-3 line-clamp-2">{blog.summary || blog.content?.substring(0, 120)}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlogList;