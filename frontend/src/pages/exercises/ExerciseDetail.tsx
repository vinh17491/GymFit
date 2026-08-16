import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Target,
  Shield,
  BarChart3,
  Dumbbell,
  ChevronRight,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Tag,
  CheckCircle,
  Clock,
  Zap,
  Info,
  BookOpen,
} from 'lucide-react';
import { getExercise, getExercises } from '../../services/exercises';
import type { ExerciseDBExercise } from '../../types/exercise';
import MediaPlayer from '../../components/MediaPlayer';
import { ImageWithFallback } from '../../components/MediaPlayer';
const difficultyConfig: Record<string, { color: string; label: string; level: number }> = {
  beginner: { color: '#22C55E', label: 'Beginner', level: 1 },
  intermediate: { color: '#FB923C', label: 'Intermediate', level: 2 },
  advanced: { color: '#EF4444', label: 'Advanced', level: 3 },
  expert: { color: '#A855F7', label: 'Expert', level: 4 },
};

/* ──────────── SECTION REVEAL ──────────── */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ──────────── DIFFICULTY INDICATOR ──────────── */
function DifficultyIndicator({ difficulty }: { difficulty: string }) {
  const config = difficultyConfig[difficulty?.toLowerCase()] || {
    color: '#94A3B8',
    label: difficulty || 'Unknown',
    level: 1,
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-8 h-2 rounded-full transition-all"
            style={{
              background: i <= config.level ? config.color : '#1e293b',
            }}
          />
        ))}
      </div>
      <span
        className="text-sm font-semibold"
        style={{ color: config.color }}
      >
        {config.label}
      </span>
    </div>
  );
}

/* ──────────── MAIN COMPONENT ──────────── */
export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<ExerciseDBExercise | null>(null);
  const [relatedExercises, setRelatedExercises] = useState<ExerciseDBExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  const fetchExercise = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getExercise(parseInt(id, 10));
      setExercise(data);

      // Fetch related exercises (same muscle_group)
      if (data.muscle_group) {
        try {
          const related = await getExercises({ category: data.muscle_group, limit: 4 });
          setRelatedExercises((related.exercises || []).filter((e) => e.id !== data.id).slice(0, 3));
        } catch {
          // Non-critical
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load exercise';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercise();
    window.scrollTo(0, 0);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#22C55E] mb-4" />
        <p className="text-[#64748B]">Loading exercise...</p>
      </div>
    );
  }

  // Error state
  if (error || !exercise) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-4">
        <AlertTriangle size={48} className="text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Exercise Not Found</h2>
        <p className="text-[#64748B] mb-6">{error || 'The exercise you are looking for does not exist.'}</p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#1e293b] text-[#94A3B8] hover:text-white hover:border-[#22C55E]/40 transition-all"
          >
            <ArrowLeft size={18} /> Go Back
          </button>
          <Link
            to="/exercises"
            className="hero-btn-primary inline-flex items-center gap-2"
          >
            Browse Library <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

    const videoUrl = exercise.video_url || null;
  const imageUrl = exercise.thumbnail_url || '';
  const config = difficultyConfig[exercise.difficulty?.toLowerCase()] || {
    color: '#94A3B8',
    label: exercise.difficulty,
    level: 1,
  };

  // Parse instructions into steps
  const instructions = exercise.instructions
    ? exercise.instructions
        .split(/\n|\d+[\.\)]\s/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Breadcrumb */}
      <div className="bg-[#0a1628] border-b border-[#1e293b]">
        <div className="premium-container py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/exercises" className="text-[#64748B] hover:text-[#22C55E] transition-colors">
              Exercises
            </Link>
            <ChevronRight size={14} className="text-[#334155]" />
            {exercise.muscle_group && (
              <>
                <span className="text-[#64748B] capitalize">{exercise.muscle_group}</span>
                <ChevronRight size={14} className="text-[#334155]" />
              </>
            )}
            <span className="text-white font-medium">{exercise.name}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="premium-container py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Left Column - Media & Video (3 cols) */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Main Media */}
              {showVideo && videoUrl ? (
                <div className="rounded-2xl overflow-hidden border border-[#1e293b]">
                  <MediaPlayer
                    src={videoUrl}
                    type="video"
                    poster={imageUrl}
                    className="aspect-video"
                    muted={false}
                    loop
                  />
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-[#1e293b] aspect-video bg-[#0f172a]">
                  <ImageWithFallback
                    src={imageUrl || ''}
                    alt={exercise.name}
                    className="w-full h-full"
                  />
                  {videoUrl && (
                    <button
                      onClick={() => setShowVideo(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
                    >
                      <div className="w-20 h-20 rounded-full bg-[#22C55E]/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-[#22C55E]/30 group-hover:scale-110 transition-all duration-300">
                        <Play size={36} className="text-[#22C55E] ml-1" />
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Exercise Gallery — using thumbnail_url */}
              {exercise.thumbnail_url && (
                <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                  <button className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-[#22C55E]">
                    <ImageWithFallback
                      src={exercise.thumbnail_url}
                      alt={exercise.name}
                      className="w-full h-full"
                    />
                  </button>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column - Info (2 cols) */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Back button */}
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-white transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>

              {/* Title & Badges */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {exercise.muscle_group && (
                    <span className="premium-badge text-xs capitalize">{exercise.muscle_group}</span>
                  )}
                  {exercise.difficulty && (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                      style={{
                        background: `${config.color}20`,
                        color: config.color,
                        border: `1px solid ${config.color}40`,
                      }}
                    >
                      {exercise.difficulty}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{exercise.name}</h1>
                {exercise.description && (
                  <p className="text-[#94A3B8] leading-relaxed">{exercise.description}</p>
                )}
              </div>

              {/* Difficulty Level */}
              <div className="rounded-xl bg-[#0f172a] border border-[#1e293b] p-4">
                <h4 className="text-sm font-medium text-[#64748B] mb-2 flex items-center gap-2">
                  <BarChart3 size={14} /> Difficulty Level
                </h4>
                <DifficultyIndicator difficulty={exercise.difficulty} />
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-3">
                {exercise.muscle_group && (
                  <div className="rounded-xl bg-[#0f172a] border border-[#1e293b] p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={14} className="text-[#22C55E]" />
                      <span className="text-xs text-[#64748B]">Body Part</span>
                    </div>
                    <p className="text-white font-medium capitalize">{exercise.muscle_group}</p>
                  </div>
                )}
                {exercise.equipment && (
                  <div className="rounded-xl bg-[#0f172a] border border-[#1e293b] p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield size={14} className="text-[#3B82F6]" />
                      <span className="text-xs text-[#64748B]">Equipment</span>
                    </div>
                    <p className="text-white font-medium capitalize">{exercise.equipment}</p>
                  </div>
                )}
              </div>

              {/* CTA */}
              <Link
                to="/exercises"
                className="block text-center py-3 rounded-xl font-semibold hero-btn-secondary"
              >
                Browse More Exercises
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Instructions Section */}
        {instructions.length > 0 && (
          <Reveal className="mt-12">
            <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <BookOpen size={20} className="text-[#22C55E]" />
                Instructions
              </h3>
              <ol className="space-y-4">
                {instructions.map((step, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-4"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] text-sm font-bold">
                      {i + 1}
                    </div>
                    <p className="text-[#94A3B8] leading-relaxed pt-1">{step}</p>
                  </motion.li>
                ))}
              </ol>
            </div>
          </Reveal>
        )}

        {/* Full Description */}
        {!instructions.length && exercise.description && (
          <Reveal className="mt-12">
            <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Info size={20} className="text-[#22C55E]" />
                About This Exercise
              </h3>
              <p className="text-[#94A3B8] leading-relaxed whitespace-pre-line">{exercise.description}</p>
            </div>
          </Reveal>
        )}

        {/* Related Exercises */}
        {relatedExercises.length > 0 && (
          <Reveal className="mt-12">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Dumbbell size={20} className="text-[#22C55E]" />
              Related Exercises
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedExercises.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/exercises/${rel.id}`}
                  className="group rounded-xl bg-[#0f172a] border border-[#1e293b] overflow-hidden hover:border-[#22C55E]/40 hover:shadow-lg hover:shadow-[#22C55E]/5 transition-all duration-300"
                >
                  <div className="relative aspect-[4/3] bg-[#0a1628]">
                    <ImageWithFallback
                      src={rel.thumbnail_url || ''}
                      alt={rel.name}
                      className="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-white group-hover:text-[#22C55E] transition-colors line-clamp-1">
                      {rel.name}
                    </h4>
                    <p className="text-xs text-[#64748B] mt-1 capitalize">{rel.muscle_group} • {rel.equipment}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
