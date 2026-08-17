import type {
  ExerciseDBExercise,
  ExerciseFilter,
  ExerciseListResponse,
} from '../types/exercise';
import api from '../api/axios';

export async function getExercises(filter: ExerciseFilter = {}): Promise<ExerciseListResponse> {
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  if (filter.category) params.set('category', filter.category);
  if (filter.difficulty) params.set('difficulty', filter.difficulty);
  if (filter.bodyPart) params.set('bodyPart', filter.bodyPart);
  if (filter.target) params.set('target', filter.target);
  if (filter.equipment) params.set('equipment', filter.equipment);
  if (filter.page) params.set('page', String(filter.page));
  if (filter.limit) params.set('limit', String(filter.limit));

  const response = await api.get(`/exercises?${params}`);
  const { data, pagination } = response.data;
  return {
    exercises: data ?? [],
    total: pagination?.total ?? 0,
    page: pagination?.page ?? 1,
    totalPages: pagination?.pages ?? 1
  };
}

export async function getExercise(id: number): Promise<ExerciseDBExercise> {
  const response = await api.get(`/exercises/${id}`);
  return response.data.data;
}

export async function getCategories(): Promise<string[]> {
  const response = await api.get('/exercises/categories');
  return response.data.data;
}

export async function getDifficulties(): Promise<string[]> {
  const response = await api.get('/exercises/difficulties');
  return response.data.data;
}

export async function getBodyParts(): Promise<string[]> {
  const response = await api.get('/exercises/bodyParts');
  return response.data.data;
}

export async function getTargetMuscles(): Promise<string[]> {
  const response = await api.get('/exercises/muscles');
  return response.data.data;
}

export async function getEquipment(): Promise<string[]> {
  const response = await api.get('/exercises/equipment');
  return response.data.data;
}
