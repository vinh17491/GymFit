import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Dumbbell,
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Zap,
  BarChart3,
  X,
  Search,
  CheckCircle,
  Star,
} from 'lucide-react';
import { getExercises } from '../../services/exercises';
import type { ExerciseDBExercise } from '../../types/exercise';
import { ImageWithFallback } from '../../components/MediaPlayer';

/* ──────────── TYPES ──────────── */
interface ProgramExercise {
  exercise: ExerciseDBExercise;
  sets: number;
  reps: number;
  restTime: number;
  notes: string;
}

interface Program {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  exercises: ProgramExercise[];
  createdAt: string;
}

/* ──────────── REUSABLE REVEAL ──────────── */
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

/* ──────────── SAMPLE PROGRAMS ──────────── */
const samplePrograms: Program[] = [
  {
    id: '1',
    name: 'Full Body Strength',
    description: 'A comprehensive full body workout targeting all major muscle groups.',
    difficulty: 'intermediate',
    exercises: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Push Day',
    description: 'Chest, shoulders, and triceps focused workout.',
    difficulty: 'intermediate',
    exercises: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'HIIT Cardio Blast',
    description: 'High intensity interval training for maximum calorie burn.',
    difficulty: 'advanced',
    exercises: [],
    createdAt: new Date().toISOString(),
  },
];

/* ──────────── EXERCISE PICKER MODAL ──────────── */
function ExercisePicker({
  isOpen,
  onClose,
  onSelect,
  excludeIds,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseDBExercise) => void;
  excludeIds: Set<number>;
}) {
  const [exercises, setExercises] = useState<ExerciseDBExercise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getExercises({ search, limit: 20 })
      .then((data) => setExercises(data.exercises || []))
      .catch(() => setExercises([]))
      .finally(() => setLoading(false));
  }, [isOpen, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl max-h-[80vh] bg-[#0f172a] border border-[#1e293b] rounded-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#1e293b]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Add Exercise</h3>
            <button onClick={onClose} className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors">
              <X size={18} className="text-[#94A3B8]" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} />
            <input
              type="text"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a1628] border border-[#1e293b] rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#64748B] focus:outline-none focus:border-[#22C55E] transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="text-center py-8 text-[#64748B]">Loading exercises...</div>
          )}
          {!loading && exercises.length === 0 && (
            <div className="text-center py-8 text-[#64748B]">No exercises found</div>
          )}
          {!loading &&
            exercises.map((ex) => (
              <button
                key={ex.id}
                disabled={excludeIds.has(ex.id)}
                onClick={() => {
                  onSelect(ex);
                  onClose();
                }}
                className={`w-full flex items-center gap-4 p-3 rounded-xl border border-[#1e293b] text-left transition-all ${
                  excludeIds.has(ex.id)
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:border-[#22C55E]/40 hover:bg-[#0a1628] cursor-pointer'
                }`}
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#0a1628] flex-shrink-0">
                  <ImageWithFallback
                    src={ex.media?.[0]?.thumbnailUrl || ex.media?.[0]?.imageUrl || ''}
                    alt={ex.name}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{ex.name}</p>
                  <p className="text-xs text-[#64748B] capitalize">
                    {ex.bodyPart} • {ex.equipment}
                  </p>
                </div>
                {!excludeIds.has(ex.id) && (
                  <Plus size={18} className="text-[#22C55E] flex-shrink-0" />
                )}
              </button>
            ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ──────────── PROGRAM CARD ──────────── */
function ProgramCard({
  program,
  onDelete,
  onUpdate,
}: {
  program: Program;
  onDelete: (id: string) => void;
  onUpdate: (id: string, exercises: ProgramExercise[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const excludeIds = new Set(program.exercises.map((pe) => pe.exercise.id));

  const handleAddExercise = (exercise: ExerciseDBExercise) => {
    const newEx: ProgramExercise = {
      exercise,
      sets: 3,
      reps: 10,
      restTime: 60,
      notes: '',
    };
    onUpdate(program.id, [...program.exercises, newEx]);
    setExpanded(true);
  };

  const handleRemoveExercise = (idx: number) => {
    const updated = program.exercises.filter((_, i) => i !== idx);
    onUpdate(program.id, updated);
  };

  const handleUpdateExercise = (idx: number, field: keyof ProgramExercise, value: number | string) => {
    const updated = [...program.exercises];
    updated[idx] = { ...updated[idx], [field]: value };
    onUpdate(program.id, updated);
  };

  const diffColors: Record<string, string> = {
    beginner: '#22C55E',
    intermediate: '#FB923C',
    advanced: '#EF4444',
    expert: '#A855F7',
  };
  const diffColor = diffColors[program.difficulty] || '#94A3B8';

  const estimatedMinutes = program.exercises.reduce((acc, pe) => {
    const sets = pe.sets || 3;
    const restSec = pe.restTime || 60;
    return acc + sets * 45 + (sets - 1) * restSec;
  }, 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-[#0f172a] border border-[#1e293b] overflow-hidden hover:border-[#22C55E]/30 transition-all duration-300"
      >
        {/* Header */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full"
                  style={{ background: `${diffColor}20`, color: diffColor }}
                >
                  {program.difficulty}
                </span>
                <span className="text-xs text-[#64748B]">
                  {program.exercises.length} exercises
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{program.name}</h3>
            </div>
            <button
              onClick={() => onDelete(program.id)}
              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
            >
              <Trash2 size={16} className="text-[#64748B] group-hover:text-red-400" />
            </button>
          </div>
          <p className="text-sm text-[#64748B] mb-4 line-clamp-2">{program.description}</p>

          <div className="flex items-center gap-4 text-xs text-[#64748B]">
            <span className="flex items-center gap-1">
              <Clock size={12} /> ~{estimatedMinutes > 0 ? `${Math.ceil(estimatedMinutes / 60)} min` : '--'}
            </span>
            <span className="flex items-center gap-1">
              <Target size={12} /> {program.exercises.reduce((a, pe) => a + (pe.sets || 3), 0)} total sets
            </span>
          </div>
        </div>

        {/* Exercise List */}
        {expanded && program.exercises.length > 0 && (
          <div className="border-t border-[#1e293b]">
            <div className="p-4 space-y-2">
              {program.exercises.map((pe, idx) => (
                <div
                  key={`${pe.exercise.id}-${idx}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#0a1628] border border-[#1e293b]"
                >
                  <GripVertical size={16} className="text-[#334155] flex-shrink-0" />
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#0f172a] flex-shrink-0">
                    <ImageWithFallback
                      src={pe.exercise.media?.[0]?.thumbnailUrl || ''}
                      alt={pe.exercise.name}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{pe.exercise.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <label className="flex items-center gap-1 text-xs text-[#64748B]">
                        Sets
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={pe.sets}
                          onChange={(e) => handleUpdateExercise(idx, 'sets', parseInt(e.target.value) || 1)}
                          className="w-10 bg-[#0f172a] border border-[#1e293b] rounded px-1.5 py-0.5 text-white text-xs text-center focus:outline-none focus:border-[#22C55E]"
                        />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-[#64748B]">
                        Reps
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={pe.reps}
                          onChange={(e) => handleUpdateExercise(idx, 'reps', parseInt(e.target.value) || 1)}
                          className="w-10 bg-[#0f172a] border border-[#1e293b] rounded px-1.5 py-0.5 text-white text-xs text-center focus:outline-none focus:border-[#22C55E]"
                        />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-[#64748B]">
                        Rest(s)
                        <input
                          type="number"
                          min={0}
                          max={300}
                          step={15}
                          value={pe.restTime}
                          onChange={(e) => handleUpdateExercise(idx, 'restTime', parseInt(e.target.value) || 0)}
                          className="w-12 bg-[#0f172a] border border-[#1e293b] rounded px-1.5 py-0.5 text-white text-xs text-center focus:outline-none focus:border-[#22C55E]"
                        />
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveExercise(idx)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                  >
                    <X size={14} className="text-[#64748B] hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-[#1e293b] flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-[#64748B] hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? 'Collapse' : `${program.exercises.length} exercises`}
          </button>
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#22C55E] hover:text-[#16A34A] transition-colors"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </motion.div>

      <ExercisePicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddExercise}
        excludeIds={excludeIds}
      />
    </>
  );
}

/* ──────────── MAIN PAGE ──────────── */
export default function WorkoutPrograms() {
  const [programs, setPrograms] = useState<Program[]>(samplePrograms);
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramDesc, setNewProgramDesc] = useState('');
  const [newProgramDiff, setNewProgramDiff] = useState('intermediate');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateProgram = () => {
    if (!newProgramName.trim()) return;
    const newProg: Program = {
      id: Date.now().toString(),
      name: newProgramName.trim(),
      description: newProgramDesc.trim() || 'Custom workout program',
      difficulty: newProgramDiff,
      exercises: [],
      createdAt: new Date().toISOString(),
    };
    setPrograms((prev) => [newProg, ...prev]);
    setNewProgramName('');
    setNewProgramDesc('');
    setNewProgramDiff('intermediate');
    setShowCreateForm(false);
  };

  const handleDeleteProgram = (id: string) => {
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateExercises = (id: string, exercises: ProgramExercise[]) => {
    setPrograms((prev) => prev.map((p) => (p.id === id ? { ...p, exercises } : p)));
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#0a1628] to-[#020617]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#3B82F6]/8 rounded-full blur-[128px]" />

        <div className="premium-container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <span className="premium-badge mb-4 inline-flex">
              <BarChart3 size={14} /> Workout Programs
            </span>
            <h1 className="heading-2 mb-4">
              Build Your <span className="text-gradient">Perfect Program</span>
            </h1>
            <p className="text-[#94A3B8] text-lg max-w-2xl mx-auto mb-8">
              Create custom workout programs by combining exercises with sets, reps, and rest periods.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="hero-btn-primary inline-flex items-center gap-2"
              >
                <Plus size={20} /> Create New Program
              </button>
              <Link to="/exercises" className="hero-btn-secondary inline-flex items-center gap-2">
                Browse Exercises <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Create Program Form */}
      {showCreateForm && (
        <div className="premium-container mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-[#0f172a] border border-[#22C55E]/30 p-6 md:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Dumbbell size={20} className="text-[#22C55E]" /> New Program
              </h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors"
              >
                <X size={18} className="text-[#64748B]" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-2">Program Name</label>
                <input
                  type="text"
                  placeholder="e.g., Upper Body Day"
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  className="w-full bg-[#0a1628] border border-[#1e293b] rounded-xl px-4 py-3 text-white placeholder-[#64748B] focus:outline-none focus:border-[#22C55E] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-2">Difficulty</label>
                <select
                  value={newProgramDiff}
                  onChange={(e) => setNewProgramDiff(e.target.value)}
                  className="w-full bg-[#0a1628] border border-[#1e293b] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22C55E] transition-all appearance-none"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">Description</label>
              <textarea
                placeholder="Describe this program..."
                value={newProgramDesc}
                onChange={(e) => setNewProgramDesc(e.target.value)}
                rows={3}
                className="w-full bg-[#0a1628] border border-[#1e293b] rounded-xl px-4 py-3 text-white placeholder-[#64748B] focus:outline-none focus:border-[#22C55E] transition-all resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2.5 rounded-xl border border-[#1e293b] text-[#94A3B8] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProgram}
                disabled={!newProgramName.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#22C55E] text-white font-medium hover:bg-[#16A34A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create Program
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Programs Grid */}
      <div className="premium-container pb-20">
        {programs.length === 0 ? (
          <Reveal className="text-center py-20">
            <Dumbbell size={48} className="text-[#334155] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Programs Yet</h3>
            <p className="text-[#64748B] mb-6">Create your first workout program to get started.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="hero-btn-primary inline-flex items-center gap-2"
            >
              <Plus size={20} /> Create Program
            </button>
          </Reveal>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onDelete={handleDeleteProgram}
                onUpdate={handleUpdateExercises}
              />
            ))}
          </div>
        )}

        {/* Coach Content */}
        <Reveal className="mt-16">
          <div className="rounded-2xl bg-gradient-to-r from-[#22C55E]/10 to-[#16A34A]/10 border border-[#22C55E]/20 p-8 md:p-12 text-center">
            <Star size={32} className="text-[#22C55E] mx-auto mb-4" />
            <h3 className="heading-3 mb-3">Need Help with Programming?</h3>
            <p className="text-[#94A3B8] max-w-xl mx-auto mb-6">
              Our certified coaches can design personalized workout programs tailored to your goals and experience level.
            </p>
            <Link to="/coaches" className="hero-btn-primary inline-flex items-center gap-2">
              <Zap size={18} /> Find a Coach
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
