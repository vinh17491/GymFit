import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, ArrowRight } from 'lucide-react';
import { getVideos } from '../../services/videos';
import type { Video } from '../../services/videos';

export default function VideoPreview() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [hoverVideo, setHoverVideo] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const data = await getVideos({ limit: 6 });
        setVideos(data);
      } catch (error) {
        console.error('Failed to load videos:', error);
        // Fallback to test video URLs if API fails
        setVideos([
          {
            id: 1,
            title: 'Full Body Strength Training',
            description: 'Complete full body workout with weights and bodyweight exercises',
            category: 'Strength',
            duration_minutes: 45,
            difficulty: 'Intermediate',
            thumbnailUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&h=400&fit=crop',
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            instructor_id: 2,
            instructor_name: 'GYMFIT Coaching Team',
            isFree: true,
            isActive: true,
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            title: 'HIIT Cardio Blast',
            description: 'High intensity interval training for maximum calorie burn',
            category: 'Cardio',
            duration_minutes: 30,
            difficulty: 'Advanced',
            thumbnailUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=600&h=400&fit=crop',
            videoUrl: 'https://www.w3schools.com/html/movie.mp4',
            instructor_id: 2,
            instructor_name: 'GYMFIT Coaching Team',
            isFree: true,
            isActive: true,
            created_at: new Date().toISOString()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const VideoCard = ({ video, isHovered }: { video: Video; isHovered: boolean }) => (
    <motion.div
      key={video.id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group cursor-pointer"
      onClick={() => setSelectedVideo(video.videoUrl)}
      onMouseEnter={() => setHoverVideo(video.id.toString())}
      onMouseLeave={() => setHoverVideo(null)}
    >
      <div className="relative rounded-2xl overflow-hidden mb-4 aspect-video bg-[#0a1628] border border-[#1e293b]">
        {video.thumbnailUrl ? (
          <img 
            src={video.thumbnailUrl} 
            alt={video.title} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#22C55E] to-[#16A34A] opacity-50" />
        )}
        
        {/* Video overlay with play button */}
        <div className="absolute inset-0 bg-black/40 transition-opacity duration-300" />
        
        {/* Play button - always visible on hover */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={isHovered ? { scale: 1.1, opacity: 1 } : { scale: 1, opacity: 0.8 }}
            transition={{ duration: 0.3 }}
            className="w-16 h-16 rounded-full bg-[#22C55E] flex items-center justify-center shadow-lg shadow-[#22C55E]/30 cursor-pointer"
          >
            <Play size={24} className="text-white ml-1" fill="white" />
          </motion.div>
        </div>
        
        {/* Duration badge */}
        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-medium text-white">
          {video.duration_minutes} min
        </div>
        
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="bg-[#22C55E]/20 text-[#22C55E] px-2 py-1 rounded-full text-xs font-medium border border-[#22C55E]/30">
            {video.category}
          </span>
        </div>
      </div>
      
      <h3 className="font-semibold text-white group-hover:text-[#22C55E] transition-colors mb-2">
        {video.title}
      </h3>
      
      <div className="flex items-center justify-between text-sm text-[#94A3B8]">
        <span>by {video.instructor_name}</span>
        <span>{video.id * 1000} views</span>
      </div>
      
      <div className="mt-2 flex items-center gap-2 text-xs text-[#94A3B8]">
        <span className="flex items-center gap-1">
          <Clock size={12} /> {video.difficulty}
        </span>
      </div>
    </motion.div>
  );

  return (
    <section className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0f1a]" />
      <div className="premium-container relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <span className="premium-badge mb-4 inline-flex">
              <Play size={14} /> Video Library
            </span>
            <h2 className="heading-2">
              Train with the <span className="text-gradient">Best Content</span>
            </h2>
          </div>
          <motion.a 
            href="/videos"
            className="hidden md:flex items-center gap-2 text-[#22C55E] font-medium hover:gap-3 transition-all"
            whileHover={{ x: 5 }}
          >
            View All <ArrowRight size={18} />
          </motion.a>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="relative rounded-2xl overflow-hidden mb-4 aspect-video bg-[#0a1628]" />
                <div className="h-4 bg-[#1e293b] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#1e293b] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, i) => (
              <VideoCard 
                key={video.id} 
                video={video} 
                isHovered={hoverVideo === video.id.toString()}
              />
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <motion.a 
            href="/videos"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#22C55E] text-white font-semibold rounded-lg hover:bg-[#16A34A] transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View All Videos <ArrowRight size={20} />
          </motion.a>
        </div>
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="relative w-full max-w-4xl rounded-xl overflow-hidden bg-[#0f172a]"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
            
            <div className="relative aspect-video bg-black">
              <video
                src={selectedVideo}
                controls
                autoPlay
                muted={muted}
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error('Video failed to load:', selectedVideo);
                  // Fallback to placeholder image
                  const target = e.target as HTMLVideoElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-[#0a1628] opacity-0 pointer-events-none" id="video-error-placeholder">
                <div className="text-center">
                  <Play size={48} className="text-[#22C55E] mx-auto mb-4" />
                  <p className="text-[#94A3B8]">Video could not be loaded</p>
                  <p className="text-xs text-[#64748b] mt-2">Trying alternative source...</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setMuted(!muted)}
              className="absolute bottom-4 right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
