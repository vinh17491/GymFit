import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { communityApi } from '../api/communityApi';
import { Link } from 'react-router-dom';

export const CommunityList = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityApi.getPosts().then(d => setPosts(d?.posts || d || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Community</h1>
        <Link to="/community/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">New Post</Link>
      </div>
      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No posts yet. Be the first to share!</div>
      ) : (
        <div className="space-y-4">
          {posts.map((p: any) => (
            <Link to={`/community/${p.id}`} key={p.id} className="block bg-white border rounded-lg p-4 hover:shadow">
              <h3 className="font-semibold text-lg">{p.title}</h3>
              <p className="text-gray-600 text-sm mt-1">{p.content?.substring(0, 150)}...</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span>{p.likes_count || 0} likes</span>
                <span>{p.comments_count || 0} comments</span>
                {p.category && <span className="bg-gray-100 px-2 py-0.5 rounded">{p.category}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export const CommunityDetail = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const id = routeId || '';
  const [post, setPost] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityApi.getPost(id).then(setPost).finally(() => setLoading(false));
  }, [id]);

  const handleComment = async () => {
    if (!comment.trim()) return;
    await communityApi.addComment(id, { content: comment });
    setComment('');
    const updated = await communityApi.getPost(id);
    setPost(updated);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!post) return <div className="p-8 text-center">Post not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link to="/community" className="text-blue-600 hover:underline text-sm">&larr; Back</Link>
      <h1 className="text-2xl font-bold mt-4">{post.title}</h1>
      <p className="text-gray-700 mt-4 whitespace-pre-wrap">{post.content}</p>
      <div className="flex gap-4 mt-4 text-sm text-gray-500">
        <button onClick={() => communityApi.likePost(id).then(() => communityApi.getPost(id).then(setPost))} className="hover:text-red-500">
          {post.likes_count || 0} Likes
        </button>
      </div>
      <hr className="my-6" />
      <h3 className="font-semibold mb-4">Comments</h3>
      {(post.comments || []).length === 0 && <p className="text-gray-400 text-sm">No comments yet</p>}
      {(post.comments || []).map((c: any, i: number) => (
        <div key={i} className="bg-gray-50 rounded p-3 mb-2 text-sm">
          <span className="font-medium">{c.user_name || 'User'}:</span> {c.content}
        </div>
      ))}
      <div className="flex gap-2 mt-4">
        <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." className="flex-1 border rounded px-3 py-2 text-sm" />
        <button onClick={handleComment} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Post</button>
      </div>
    </div>
  );
};

export const CommunityNew = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    await communityApi.createPost({ title, content, category });
    window.location.href = '/community';
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">New Post</h1>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full border rounded px-3 py-2 mb-4" />
      <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded px-3 py-2 mb-4">
        <option value="">Select category</option>
        <option value="general">General</option>
        <option value="workout">Workout</option>
        <option value="nutrition">Nutrition</option>
        <option value="motivation">Motivation</option>
      </select>
      <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Share your thoughts..." rows={8} className="w-full border rounded px-3 py-2 mb-4" />
      <button onClick={handleSubmit} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {saving ? 'Posting...' : 'Post'}
      </button>
    </div>
  );
};