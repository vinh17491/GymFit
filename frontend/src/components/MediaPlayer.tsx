import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  X,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';

interface MediaPlayerProps {
  src: string;
  type?: 'video' | 'image';
  poster?: string;
  alt?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onClose?: () => void;
  fullscreen?: boolean;
}

export default function MediaPlayer({
  src,
  type = 'video',
  poster,
  alt = 'Media content',
  className = '',
  autoPlay = false,
  muted: initialMuted = true,
  loop = false,
  onClose,
  fullscreen = false,
}: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [muted, setMuted] = useState(initialMuted);
  const [isFullscreen, setIsFullscreen] = useState(fullscreen);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [error, setError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || type !== 'video') return;

    const onTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
        setCurrentTime(formatTime(video.currentTime));
      }
    };

    const onLoadedMetadata = () => {
      setDuration(formatTime(video.duration));
    };

    const onError = () => setError(true);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
    };
  }, [type]);

  useEffect(() => {
    if (type !== 'video') return;
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      controlsTimeout.current = setTimeout(() => {
        if (playing) setShowControls(false);
      }, 3000);
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, [type, playing]);

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const value = parseFloat(e.target.value);
    videoRef.current.currentTime = (value / 100) * videoRef.current.duration;
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-[#0f172a] rounded-xl ${className}`}>
        <AlertTriangle size={40} className="text-[#64748B] mb-3" />
        <p className="text-[#64748B] text-sm">Failed to load media</p>
        <p className="text-[#334155] text-xs mt-1">{src}</p>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className={`relative group overflow-hidden rounded-xl ${className}`}>
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            onClick={() => window.open(src, '_blank')}
            className="bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
          >
            <Maximize size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative group ${className} ${isFullscreen ? 'w-full h-full bg-black' : 'rounded-xl overflow-hidden'}`}
      onMouseEnter={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={muted}
        loop={loop}
        playsInline
        className="w-full h-full object-contain bg-black"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setError(true)}
      />

      {/* Center Play Button */}
      <AnimatePresence>
        {!playing && showControls && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#22C55E]/20 backdrop-blur-sm flex items-center justify-center hover:bg-[#22C55E]/30 transition-colors">
              <Play size={32} className="text-[#22C55E] ml-1" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Controls Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-20"
          >
            {/* Progress Bar */}
            <div className="relative mb-3 group/progress">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden group-hover/progress:h-1.5 transition-all">
                <div
                  className="h-full bg-[#22C55E] rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={handleSeek}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-white text-sm">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="hover:text-[#22C55E] transition-colors">
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button onClick={() => setMuted(!muted)} className="hover:text-[#22C55E] transition-colors">
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <span className="text-xs text-white/70">
                  {currentTime} / {duration}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleFullscreen} className="hover:text-[#22C55E] transition-colors">
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
                {onClose && (
                  <button onClick={onClose} className="hover:text-red-400 transition-colors ml-2">
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ImageWithFallbackProps {
  src: string;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
}

export function ImageWithFallback({
  src,
  alt = 'Image',
  className = '',
  fallbackSrc,
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const finalSrc = error ? (fallbackSrc || generatePlaceholder(alt)) : src;

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-[#0f172a] animate-pulse flex items-center justify-center">
          <ImageIcon size={24} className="text-[#334155]" />
        </div>
      )}
      <img
        src={finalSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

function generatePlaceholder(text: string): string {
  const colors = ['#22C55E', '#3B82F6', '#A855F7', '#FB923C', '#EF4444'];
  const color = colors[Math.abs(hashString(text)) % colors.length];
  const initial = text.charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
    <rect fill="%230f172a" width="400" height="300"/>
    <rect fill="${color}20" width="400" height="300"/>
    <text x="200" y="150" font-family="Arial,sans-serif" font-size="48" fill="${color}" text-anchor="middle" dominant-baseline="central">${initial}</text>
  </svg>`;
  return `data:image/svg+xml,${svg}`;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
