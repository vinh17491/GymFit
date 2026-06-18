import { useEffect, useState } from 'react';
import { videoApi } from '../api/videoApi';
import { Link } from 'react-router-dom';

export const VideoList = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    videoApi.getCategories().then(d => setCategories(d?.categories || d || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    videoApi.getVideos({ category: category || undefined })
      .then(d => setVideos(d?.videos || d || []))
      .finally(() => setLoading(false));
  }, [category]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Video Library</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setCategory('')} className={`px-3 py-1 rounded text-sm ${!category ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>All</button>
        {categories.map((c: any) => (
          <button key={c.id || c.name} onClick={() => setCategory(c.name || c)} className={`px-3 py-1 rounded text-sm ${category === (c.name || c) ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{c.name || c}</button>
        ))}
      </div>
      {videos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No videos available</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {videos.map((v: any) => (
            <Link to={`/videos/${v.id}`} key={v.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition">
              <div className="aspect-video bg-gray-200 flex items-center justify-center">
                {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" /> : <span className="text-4xl">▶</span>}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm">{v.title}</h3>
                <p className="text-gray-500 text-xs mt-1">{v.duration || ''} • {v.views_count || 0} views</p>
                {v.category && <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded mt-1">{v.category}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export const VideoDetail = () => {
  const id = window.location.pathname.split('/').pop() || '';
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    videoApi.getVideo(id).then(setVideo).finally(() => setLoading(false));
    videoApi.incrementViews(id).catch(() => {});
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!video) return <div className="p-8 text-center">Video not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link to="/videos" className="text-blue-600 hover:underline text-sm">&larr; Back</Link>
      <div className="aspect-video bg-black rounded-lg mt-4 flex items-center justify-center">
        {video.video_url ? <video src={video.video_url} controls className="w-full h-full rounded-lg" /> : <span className="text-white text-2xl">Video Player</span>}
      </div>
      <h1 className="text-xl font-bold mt-4">{video.title}</h1>
      <p className="text-gray-500 text-sm mt-1">{video.views_count || 0} views • {video.duration || ''}</p>
      <p className="text-gray-700 mt-4 whitespace-pre-wrap">{video.description || ''}</p>
      {video.coach_name && <p className="text-sm text-gray-500 mt-2">By: {video.coach_name}</p>}
    </div>
  );
};