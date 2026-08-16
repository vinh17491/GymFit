import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Zap,
  Target,
  ArrowRight,
  Loader2,
  AlertTriangle,
  RefreshCw,
  X,
  ChevronDown,
  Layers,
  Shield,
  BarChart3,
} from 'lucide-react';
import {
  getExercises,
  getCategories,
  getDifficulties,
  getBodyParts,
  getTargetMuscles,
  getEquipment,
} from '../../services/exercises';
import type { ExerciseDBExercise, ExerciseFilter } from '../../types/exercise';
import { ImageWithFallback } from '../../components/MediaPlayer';

/* ──────────── Section Reveal ──────────── */
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
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ──────────── FILTER SIDEBAR ──────────── */
interface FilterSidebarProps {
  filter: ExerciseFilter;
  setFilter: (f: ExerciseFilter) => void;
  categories: string[];
  difficulties: string[];
  bodyParts: string[];
  targetMuscles: string[];
  equipment: string[];
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

function FilterSidebar({
  filter,
  setFilter,
  categories,
  difficulties,
  bodyParts,
  targetMuscles,
  equipment,
  mobileOpen,
  setMobileOpen,
}: FilterSidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    category: true,
    difficulty: true,
    bodyPart: true,
    target: false,
    equipment: false,
  });

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleFilter = (key: keyof ExerciseFilter, value: string) => {
    setFilter({ ...filter, [key]: filter[key] === value ? undefined : value, page: 1 });
  };

  const activeCount = [
    filter.category,
    filter.difficulty,
    filter.bodyPart,
    filter.target,
    filter.equipment,
  ].filter(Boolean).length;

  const clearAll = () => {
    setFilter({ ...filter, category: undefined, difficulty: undefined, bodyPart: undefined, target: undefined, equipment: undefined, page: 1 });
  };

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Filter size={18} className="text-[#22C55E]" />
          Filters
          {activeCount > 0 && (
            <span className="text-xs bg-[#22C55E]/20 text-[#22C55E] px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </h3>
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs text-[#64748B] hover:text-white transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      <FilterSection
        title="Category"
        icon={<Layers size={16} />}
        isOpen={openSections.category}
        onToggle={() => toggleSection('category')}
      >
        {categories.map((cat) => (
          <FilterChip
            key={cat}
            label={cat}
            active={filter.category === cat}
            onClick={() => handleFilter('category', cat)}
          />
        ))}
      </FilterSection>

      {/* Difficulty */}
      <FilterSection
        title="Difficulty"
        icon={<BarChart3 size={16} />}
        isOpen={openSections.difficulty}
        onToggle={() => toggleSection('difficulty')}
      >
        {difficulties.map((diff) => (
          <FilterChip
            key={diff}
            label={diff}
            active={filter.difficulty === diff}
            onClick={() => handleFilter('difficulty', diff)}
            color={
              diff === 'beginner' ? '#22C55E' : diff === 'intermediate' ? '#FB923C' : '#EF4444'
            }
          />
        ))}
      </FilterSection>

      {/* Body Part */}
      <FilterSection
        title="Body Part"
        icon={<Target size={16} />}
        isOpen={openSections.bodyPart}
        onToggle={() => toggleSection('bodyPart')}
      >
        {bodyParts.map((part) => (
          <FilterChip
            key={part}
            label={part}
            active={filter.bodyPart === part}
            onClick={() => handleFilter('bodyPart', part)}
          />
        ))}
      </FilterSection>

      {/* Target Muscle */}
      <FilterSection
        title="Target Muscle"
        icon={<Dumbbell size={16} />}
        isOpen={openSections.target}
        onToggle={() => toggleSection('target')}
      >
        {targetMuscles.map((m) => (
          <FilterChip
            key={m}
            label={m}
            active={filter.target === m}
            onClick={() => handleFilter('target', m)}
          />
        ))}
      </FilterSection>

      {/* Equipment */}
      <FilterSection
        title="Equipment"
        icon={<Shield size={16} />}
        isOpen={openSections.equipment}
        onToggle={() => toggleSection('equipment')}
      >
        {equipment.map((eq) => (
          <FilterChip
            key={eq}
            label={eq}
            active={filter.equipment === eq}
            onClick={() => handleFilter('equipment', eq)}
          />
        ))}
      </FilterSection>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0 sticky top-24 self-start">
        <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6">{content}</div>
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#0f172a] border-r border-[#1e293b] p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-white">Filters</h3>
              <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors">
                <X size={20} className="text-[#94A3B8]" />
              </button>
            </div>
            {content}
          </motion.div>
        </div>
      )}
    </>
  );
}

function FilterSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#1e293b] pb-4 last:border-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left mb-3"
      >
        <span className="text-sm font-medium text-white flex items-center gap-2">
          <span className="text-[#22C55E]">{icon}</span>
          {title}
        </span>
        <ChevronDown
          size={16}
          className={`text-[#64748B] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  const activeStyle = color
    ? { background: `${color}20`, borderColor: `${color}50`, color }
    : { background: '#22C55E20', borderColor: '#22C55E50', color: '#22C55E' };

  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 capitalize"
      style={active ? activeStyle : { background: 'transparent', borderColor: '#1e293b', color: '#94A3B8' }}
    >
      {label}
    </button>
  );
}

/* ──────────── EXERCISE CARD ──────────── */
function ExerciseCard({ exercise }: { exercise: ExerciseDBExercise }) {
  const difficultyColor: Record<string, string> = {
    beginner: '#22C55E',
    intermediate: '#FB923C',
    advanced: '#EF4444',
    expert: '#A855F7',
  };

  const diffColor = difficultyColor[exercise.difficulty?.toLowerCase()] || '#94A3B8';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.5 }}
    >
      <Link
        to={`/exercises/${exercise.id}`}
        className="block group rounded-2xl bg-[#0f172a] border border-[#1e293b] overflow-hidden hover:border-[#22C55E]/40 hover:shadow-lg hover:shadow-[#22C55E]/5 transition-all duration-300"
      >
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] bg-[#0a1628] overflow-hidden">
          <ImageWithFallback
            src={exercise.thumbnail_url || ''}
            alt={exercise.name}
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />

          {/* Category Badge */}
          {exercise.muscle_group && (
            <div className="absolute top-3 left-3">
              <span className="premium-badge text-[10px] capitalize">{exercise.muscle_group}</span>
            </div>
          )}

          {/* Difficulty Badge */}
          <div className="absolute top-3 right-3">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
              style={{
                background: `${diffColor}20`,
                color: diffColor,
                border: `1px solid ${diffColor}40`,
              }}
            >
              {exercise.difficulty}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-5">
          <h3 className="font-semibold text-white group-hover:text-[#22C55E] transition-colors mb-2 line-clamp-1">
            {exercise.name}
          </h3>
          {exercise.description && (
            <p className="text-sm text-[#64748B] line-clamp-2 mb-3">{exercise.description}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-[#64748B]">
              {exercise.muscle_group && (
                <span className="flex items-center gap-1">
                  <Target size={12} className="text-[#22C55E]" />
                  {exercise.muscle_group}
                </span>
              )}
              {exercise.equipment && (
                <span className="flex items-center gap-1">
                  <Shield size={12} className="text-[#3B82F6]" />
                  {exercise.equipment}
                </span>
              )}
            </div>
            <ArrowRight
              size={16}
              className="text-[#64748B] group-hover:text-[#22C55E] group-hover:translate-x-1 transition-all duration-300"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ──────────── PAGINATION ──────────── */
function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-lg bg-[#0f172a] border border-[#1e293b] text-[#94A3B8] hover:text-white hover:border-[#22C55E]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft size={18} />
      </button>
      {pages.map((p, i) =>
        typeof p === 'string' ? (
          <span key={`dots-${i}`} className="px-2 text-[#64748B]">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
              p === page
                ? 'bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/25'
                : 'bg-[#0f172a] border border-[#1e293b] text-[#94A3B8] hover:text-white hover:border-[#22C55E]/40'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-2 rounded-lg bg-[#0f172a] border border-[#1e293b] text-[#94A3B8] hover:text-white hover:border-[#22C55E]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

/* ──────────── MAIN PAGE ──────────── */
export default function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState<ExerciseDBExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filter, setFilter] = useState<ExerciseFilter>({ page: 1, limit: 18 });
  const [searchInput, setSearchInput] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [targetMuscles, setTargetMuscles] = useState<string[]>([]);
  const [equipmentList, setEquipmentList] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch filter options once
  useEffect(() => {
    Promise.allSettled([
      getCategories(),
      getDifficulties(),
      getBodyParts(),
      getTargetMuscles(),
      getEquipment(),
    ]).then((results) => {
      if (results[0].status === 'fulfilled') setCategories(results[0].value);
      if (results[1].status === 'fulfilled') setDifficulties(results[1].value);
      if (results[2].status === 'fulfilled') setBodyParts(results[2].value);
      if (results[3].status === 'fulfilled') setTargetMuscles(results[3].value);
      if (results[4].status === 'fulfilled') setEquipmentList(results[4].value);
    });
  }, []);

  // Fetch exercises
  const fetchExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExercises(filter);
      setExercises(data.exercises || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load exercises';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  // Search debounce
  const handleSearch = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilter((prev) => ({ ...prev, search: value || undefined, page: 1 }));
    }, 400);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    setFilter((prev) => ({ ...prev, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#0a1628] to-[#020617]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#22C55E]/8 rounded-full blur-[128px]" />

        <div className="premium-container relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center">
            <span className="premium-badge mb-4 inline-flex">
              <Dumbbell size={14} /> Exercise Library
            </span>
            <h1 className="heading-2 mb-4">
              Master Every <span className="text-gradient">Movement</span>
            </h1>
            <p className="text-[#94A3B8] text-lg max-w-2xl mx-auto mb-8">
              Browse our comprehensive library of exercises with detailed instructions, target muscles, and video demonstrations.
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={20} />
              <input
                type="text"
                placeholder="Search exercises by name, muscle, or equipment..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded-2xl pl-12 pr-4 py-4 text-white placeholder-[#64748B] focus:outline-none focus:border-[#22C55E] focus:bg-[#111827] transition-all duration-300"
              />
              {searchInput && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filter Toggle (Mobile) */}
      <div className="premium-container mb-4 lg:hidden">
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e293b] text-[#94A3B8] hover:text-white hover:border-[#22C55E]/40 transition-all"
        >
          <Filter size={18} />
          <span className="text-sm font-medium">Filters</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="premium-container pb-20">
        <div className="flex gap-8">
          {/* Sidebar */}
          <FilterSidebar
            filter={filter}
            setFilter={setFilter}
            categories={categories}
            difficulties={difficulties}
            bodyParts={bodyParts}
            targetMuscles={targetMuscles}
            equipment={equipmentList}
            mobileOpen={mobileFiltersOpen}
            setMobileOpen={setMobileFiltersOpen}
          />

          {/* Grid */}
          <div className="flex-1 min-w-0">
            {/* Results Info */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-[#64748B]">
                {loading ? 'Loading...' : `${total.toLocaleString()} exercises found`}
              </p>
              {total > 0 && (
                <span className="text-xs text-[#64748B]">
                  Page {page} of {totalPages}
                </span>
              )}
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={40} className="animate-spin text-[#22C55E] mb-4" />
                <p className="text-[#64748B]">Loading exercises...</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <AlertTriangle size={40} className="text-red-400 mb-4" />
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={fetchExercises}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#22C55E] px-6 py-3 text-sm font-medium text-white hover:bg-[#16A34A] transition-colors"
                >
                  <RefreshCw size={16} /> Retry
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && exercises.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <Dumbbell size={48} className="text-[#334155] mb-4" />
                <p className="text-[#94A3B8] text-lg mb-2">No exercises found</p>
                <p className="text-[#64748B] text-sm mb-6">Try adjusting your search or filters</p>
                <button
                  onClick={() => {
                    setFilter({ page: 1, limit: 18 });
                    setSearchInput('');
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#1e293b] text-[#94A3B8] hover:text-white hover:border-[#22C55E]/40 transition-all"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Exercise Grid */}
            {!loading && !error && exercises.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {exercises.map((exercise) => (
                    <ExerciseCard key={exercise.id} exercise={exercise} />
                  ))}
                </div>

                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#22C55E]/15 to-[#16A34A]/15" />
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#22C55E]/8 rounded-full blur-[128px]" />
        </div>
        <div className="premium-container relative z-10 text-center">
          <Reveal>
            <span className="premium-badge mb-4 inline-flex">
              <Zap size={14} /> Start Training
            </span>
            <h2 className="heading-2 mb-4">
              Ready to <span className="text-gradient">Level Up</span>?
            </h2>
            <p className="text-[#94A3B8] text-lg max-w-xl mx-auto mb-8">
              Create custom workout programs and track your progress with our smart training tools.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="hero-btn-primary inline-flex items-center gap-2">
                <Dumbbell size={20} /> Get Started Free
              </Link>
              <Link to="/videos" className="hero-btn-secondary inline-flex items-center gap-2">
                Watch Tutorials <ArrowRight size={18} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
