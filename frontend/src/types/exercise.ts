export interface ExerciseDBExercise {
  id: number;
  name: string;
  slug: string;
  description: string;
  difficulty: string;
  equipment: string;
  instructions: string;
  muscle_group: string;
  thumbnail_url: string | null;
  video_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bodyPart?: string;
  media?: Array<{ thumbnailUrl?: string; imageUrl?: string }>;
}

export interface ExerciseFilter {
  search?: string;
  category?: string;
  difficulty?: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  page?: number;
  limit?: number;
}

export interface ExerciseListResponse {
  exercises: ExerciseDBExercise[];
  total: number;
  page: number;
  totalPages: number;
}

export interface WorkoutProgramExercise {
  exerciseId: number;
  sets?: number;
  reps?: number;
  duration?: number;
  restTime?: number;
  notes?: string;
  order: number;
}

export interface WorkoutProgram {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  estimatedDuration: number;
  exercises: WorkoutProgramExercise[];
  tags: string[];
  createdBy: number;
  createdAt: string;
}
