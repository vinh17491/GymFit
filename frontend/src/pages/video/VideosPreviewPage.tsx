import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, Eye, Search, Filter, Lock, Star, ArrowRight, Loader2, AlertTriangle, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getVideos, Video } from '../../services/videos';

const categories = ['All', 'Strength', 'Cardio', 'Yoga', 'HIIT', 'Stretching', 'CrossFit'];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatViews(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

export default function VideosPreviewPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { category?: string; search?: string } = {};
      if (activeCategory !== 'All') params.category = activeCategory;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const data = await getVideos(params);
      setVideos(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load videos';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchTerm]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchVideos();
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchVideos]);

  const featured = videos.length > 0 ? videos[0] : null;
  const gridVideos = videos.length > 1 ? videos.slice(1) : [];

  return (
    <div className="min-h-screen bg-[#020617] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">Workout Video Library</h1>
          <p className="text-[#94a3b8] text-lg max-w-2xl mx-auto">
            Preview free workout videos. Sign up for full access to our complete library of professional training sessions.
          </p>
        </motion.div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={20} />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-[#1e293b] bg-[#0f172a] pl-10 pr-4 py-3 text-white placeholder-[#64748b] focus:border-[#2563eb] focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-[#0f172a] text-[#94a3b8] border border-[#1e293b] hover:border-[#2563eb] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-[#2563eb] mb-4" />
            <p className="text-[#94a3b8]">Loading videos...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle size={40} className="text-red-400 mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchVideos}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-6 py-3 text-sm font-medium text-white hover:bg-[#1d4ed8] transition-colors"
            >
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        )}

        {!loading && !error && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Play size={40} className="text-[#64748b] mb-4" />
            <p className="text-[#94a3b8] text-lg">No videos found</p>
            <p className="text-[#64748b] text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}

        {!loading && !error && videos.length > 0 && (
          <>
            {featured && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                <div className="relative rounded-2xl overflow-hidden border border-[#1e293b] bg-[#0f172a]">
                  <div className="aspect-video bg-gradient-to-br from-[#1e293b] to-[#020617] flex items-center justify-center relative">
                    {featured.thumbnailUrl && (
                      <img src={featured.thumbnailUrl} alt={featured.title} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="text-center z-10 relative">
                      <button 
                        onClick={() => setPlayingVideo(featured.videoUrl)}
                        className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#2563eb]/20 cursor-pointer hover:bg-[#2563eb]/30 transition-colors"
                      >
                        <Play size={36} className="text-[#2563eb] ml-1" />
                      </button>
                      <h3 className="text-2xl font-bold text-white mb-2">{featured.title}</h3>
                      <p className="text-[#94a3b8]">By {featured.instructor_name} &bull; {formatDuration(featured.duration_minutes)} &bull; {featured.difficulty}</p>
                    </div>
                  </div>
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-[#94a3b8]">
                      <span className="flex items-center gap-1"><Clock size={16} />{formatDuration(featured.duration_minutes)}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                      featured.isFree
                        ? 'bg-[#22c55e]/20 text-[#22c55e]'
                        : 'bg-[#94a3b8]/20 text-[#94a3b8]'
                    }`}>
                      {featured.isFree ? <><Play size={12} /> Free Preview</> : <><Lock size={12} /> Premium</>}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {gridVideos.map((video, i) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="group rounded-xl border border-[#1e293b] bg-[#0f172a] overflow-hidden transition-all hover:border-[#2563eb]/50 cursor-pointer"
                  onClick={() => setPlayingVideo(video.videoUrl)}
                >
                  <div className="relative aspect-video bg-gradient-to-br from-[#1e293b] to-[#0a0f1a]">
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-[#2563eb]/20 flex items-center justify-center group-hover:bg-[#2563eb]/30 transition-colors">
                        <Play size={24} className="text-[#2563eb] ml-1" />
                      </div>
                    </div>
                    <div className="absolute top-3 right-3">
                      {video.isFree ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/20 px-2 py-1 text-xs font-medium text-[#22c55e]">
                          Free Preview
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#94a3b8]/20 px-2 py-1 text-xs font-medium text-[#94a3b8]">
                          <Lock size={12} /> Premium
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <span className="rounded bg-black/60 px-2 py-1 text-xs text-white">{formatDuration(video.duration_minutes)}</span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="mb-2 font-semibold text-white group-hover:text-[#60a5fa] transition-colors">{video.title}</h3>
                    <p className="mb-3 text-sm text-[#64748b]">By {video.instructor_name}</p>
                    <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                      <span>{video.difficulty}</span>
                      <span>{formatDuration(video.duration_minutes)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-16 text-center">
          <div className="rounded-2xl border border-[#2563eb]/30 bg-gradient-to-r from-[#2563eb]/10 to-[#0ea5e9]/10 p-12">
            <h2 className="mb-4 text-3xl font-bold text-white">Ready for Full Access?</h2>
            <p className="mx-auto mb-8 max-w-xl text-[#94a3b8]">Get unlimited access to workout videos, personalized plans, and expert coaching with a Gymer membership.</p>
            <Link to="/membership" className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-[#1d4ed8] hover:scale-105">
              View Membership Plans <ArrowRight size={20} />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Video Modal */}
      {playingVideo && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPlayingVideo(null)}
        >
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="relative w-full max-w-4xl rounded-xl overflow-hidden bg-[#0f172a]"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setPlayingVideo(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
            
            <div className="relative aspect-video">
              <video
                src={playingVideo}
                controls
                autoPlay
                muted={muted}
                className="w-full h-full object-contain bg-black"
              />
              
              <button 
                onClick={() => setMuted(!muted)}
                className="absolute bottom-4 right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}