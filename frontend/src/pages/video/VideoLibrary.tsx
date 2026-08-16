import { useState, useEffect, useCallback } from 'react';
import { Search, Play, Clock, ChevronRight, TrendingUp, Star, Lock, Users, ArrowRight, AlertTriangle, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import Badge from '../../components/ui/badge';
import Skeleton from '../../components/ui/skeleton';
import { getVideos, type Video } from '../../services/videos';

const categories = ['All', 'Strength', 'Cardio', 'Yoga', 'HIIT', 'Recovery', 'Nutrition'];

function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

function formatViews(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

export default function VideoLibrary() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { category?: string; search?: string; limit?: number } = { limit: 50 };
      if (category !== 'All') params.category = category;
      if (search) params.search = search;
      const data = await getVideos(params);
      setVideos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    const debounce = setTimeout(fetchVideos, 300);
    return () => clearTimeout(debounce);
  }, [fetchVideos]);

  const featuredVideo = videos[0] || null;
  const continueWatching = videos.slice(1, 5);
  const gridVideos = isLoggedIn ? videos : videos.filter(v => v.isFree);

  const VideoCard = ({ video, showLock = false }: { video: Video; showLock?: boolean }) => (
    <motion.div
      key={video.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="group cursor-pointer relative overflow-hidden"
      onClick={() => setPlayingVideo(video.videoUrl)}
    >
      <div className="aspect-video rounded-lg mb-3 relative overflow-hidden bg-[#0f172a] border border-[#1e293b]">
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb] to-[#0ea5e9] opacity-50" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <Play size={32} className="text-white opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="absolute bottom-3 left-3 flex gap-2">
          <div className="flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
            <Clock size={12} /> {formatDuration(video.duration_minutes)}
          </div>
          {showLock ? (
            <div className="flex items-center gap-1 rounded bg-red-600/80 px-2 py-1 text-xs font-medium text-white">
              <Lock size={12} /> Premium
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded bg-green-600/80 px-2 py-1 text-xs font-medium text-white">
              <Play size={12} /> Free
            </div>
          )}
        </div>
        <div className="absolute top-3 left-3">
          <Badge variant="blue" className="text-xs">{video.category}</Badge>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-semibold text-white mb-1 truncate">{video.title}</h3>
            <p className="text-xs text-[#94a3b8] mb-2">by {video.instructor_name}</p>
            <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
              <span className="flex items-center gap-1"><Star size={12} className="text-[#fbbf24]" />{video.difficulty}</span>
            </div>
          </div>
        </div>
      </div>
      <h3 className="font-medium text-sm truncate text-white group-hover:text-[#60a5fa] transition-colors">{video.title}</h3>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-[#94a3b8]">{video.instructor_name}</p>
        <span className="text-[10px] text-[#64748b]">{formatDuration(video.duration_minutes)}</span>
      </div>
    </motion.div>
  );

  const VideoCardSkeleton = () => (
    <div className="overflow-hidden">
      <Skeleton className="aspect-video rounded-lg mb-3 bg-[#1e293b]" />
      <Skeleton className="h-4 w-3/4 mb-2 bg-[#1e293b]" />
      <Skeleton className="h-3 w-1/2 bg-[#1e293b]" />
    </div>
  );

  const ContinueWatchingCard = ({ video, index }: { video: Video; index: number }) => (
    <motion.div
      key={video.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="group cursor-pointer relative overflow-hidden"
      onClick={() => setPlayingVideo(video.videoUrl)}
    >
      <div className="aspect-video rounded-lg mb-3 relative overflow-hidden border-2 border-[#2563eb] shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb]/30 to-[#0ea5e9]/30" />
        {video.thumbnailUrl && (
          <img src={video.thumbnailUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-[#2563eb] flex items-center justify-center shadow-lg">
            <Play size={20} className="text-white ml-1" />
          </div>
        </div>
        <div className="absolute top-2 left-2">
          <Badge variant="green" className="text-xs flex items-center gap-1">
            <TrendingUp size={12} /> Continue
          </Badge>
        </div>
        <div className="absolute bottom-2 right-2">
          <div className="flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
            <Clock size={12} /> {formatDuration(video.duration_minutes)}
          </div>
        </div>
      </div>
      <h3 className="font-medium text-sm truncate text-white group-hover:text-[#60a5fa] transition-colors mb-1">{video.title}</h3>
      <p className="text-xs text-[#94a3b8]">{video.instructor_name}</p>
    </motion.div>
  );

  return (
    <div className="space-y-10">
      {!isLoggedIn && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto max-w-6xl rounded-3xl border border-[#1e293b] bg-gradient-to-br from-[#2563eb]/20 to-[#0ea5e9]/20 p-8 md:p-12 mb-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Personalized Fitness Video Library</h1>
            <p className="text-lg text-[#94a3b8] mb-8">
              Browse hundreds of expert-led workout videos. <strong className="text-white">Free previews available</strong> - <strong className="text-[#22c55e]">unlimited access with membership.</strong>
            </p>
            <button onClick={() => setIsLoggedIn(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-[#1d4ed8] hover:scale-105">
              Sign Up Free <ChevronRight size={20} />
            </button>
          </div>
          <div className="absolute top-4 right-4 hidden md:block">
            <div className="flex items-center gap-2 rounded-full bg-[#22c55e]/20 px-4 py-2 text-sm text-[#22c55e]">
              <Users size={16} /> 50K+ happy members
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={20} />
          <input type="text" placeholder="Search workouts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-[#1e293b] bg-[#0f172a] pl-10 pr-4 py-3 text-white placeholder-[#64748b] focus:border-[#2563eb] focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${category === cat ? 'bg-[#2563eb] text-white' : 'bg-[#0f172a] text-[#94a3b8] border border-[#1e293b] hover:border-[#2563eb] hover:text-white'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <AlertTriangle size={40} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Videos</h3>
          <p className="text-[#94a3b8] mb-4">{error}</p>
          <button onClick={fetchVideos} className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-6 py-3 font-semibold text-white transition-all hover:bg-[#1d4ed8]">
            <RefreshCw size={16} /> Retry
          </button>
        </motion.div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <VideoCardSkeleton key={i} />)}
          </div>
          <div>
            <Skeleton className="h-7 w-48 mb-6 bg-[#1e293b]" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {isLoggedIn && featuredVideo && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-3xl overflow-hidden border border-[#1e293b] bg-gradient-to-br from-[#1e293b] to-[#0f172a] group cursor-pointer mb-12">
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-8 md:p-10 relative">
                  <Badge variant="green" className="mb-4">Featured Content</Badge>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{featuredVideo.title}</h2>
                  <p className="text-[#60a5fa] text-lg font-semibold mb-2">with {featuredVideo.instructor_name}</p>
                  <div className="flex items-center gap-6 text-[#94a3b8] mb-6">
                    <span className="flex items-center gap-2"><Clock size={16} /> {formatDuration(featuredVideo.duration_minutes)}</span>
                    <span className="flex items-center gap-2"><Star size={16} className="text-[#fbbf24]" /> {featuredVideo.difficulty}</span>
                  </div>
                  <button 
                    onClick={() => setPlayingVideo(featuredVideo.videoUrl)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-8 py-4 font-semibold text-white transition-all hover:bg-[#1d4ed8] hover:scale-105"
                  >
                    <Play size={20} /> Watch Now
                  </button>
                </div>
                <div className="w-full md:w-96 h-64 md:h-auto bg-gradient-to-br from-[#2563eb] to-[#0ea5e9] flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-transparent" />
                  {featuredVideo.thumbnailUrl && (
                    <img src={featuredVideo.thumbnailUrl} alt={featuredVideo.title} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="text-center z-10">
                    <div className="mb-4 inline-flex h-24 w-24 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                      <Play size={40} className="text-white ml-2" />
                    </div>
                    <p className="text-white/80 text-sm">Featured Video</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {isLoggedIn && continueWatching.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><TrendingUp size={24} className="text-[#60a5fa]" /> Continue Watching</h2>
                <button className="text-sm text-[#60a5fa] hover:text-[#93c5fd] transition-colors">View All <ChevronRight size={16} /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {continueWatching.map((video, i) => (
                  <ContinueWatchingCard key={video.id} video={video} index={i} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-bold text-white mb-6">{isLoggedIn ? 'All Available Videos' : 'Free Preview Videos'}</h2>
            {gridVideos.length === 0 ? (
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-12 text-center">
                <Search size={40} className="text-[#64748b] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Videos Found</h3>
                <p className="text-[#94a3b8]">Try adjusting your search or filter to find what you're looking for.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {gridVideos.map(video => (
                  <VideoCard key={video.id} video={video} showLock={!isLoggedIn && !video.isFree} />
                ))}
              </div>
            )}
            {!isLoggedIn && gridVideos.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 20 }} className="mt-12 text-center rounded-2xl border border-[#2563eb]/30 bg-gradient-to-r from-[#2563eb]/10 to-[#0ea5e9]/10 p-8 md:p-12">
                <h3 className="text-2xl font-bold text-white mb-4">Ready for More Content?</h3>
                <p className="text-[#94a3b8] mb-8 max-w-2xl mx-auto">Unlock 100+ premium workout videos, personalized playlists, and advanced fitness tracking. Join our community of 50,000+ members today!</p>
                <button onClick={() => setIsLoggedIn(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-8 py-4 font-semibold text-white shadow-lg transition-all hover:bg-[#1d4ed8] hover:scale-105">
                  Start Free Trial <ArrowRight size={20} />
                </button>
              </motion.div>
            )}
          </section>
        </>
      )}

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
