import axios from 'axios';
import type {
  ExerciseDBExercise,
  ExerciseFilter,
  ExerciseListResponse,
} from '../types/exercise';

const API_BASE = 'http://localhost:5000/api';

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

  const response = await axios.get(`${API_BASE}/exercises?${params}`);
  const { data, pagination } = response.data;
  return {
    exercises: data ?? [],
    total: pagination?.total ?? 0,
    page: pagination?.page ?? 1,
    totalPages: pagination?.pages ?? 1
  };
}

export async function getExercise(id: number): Promise<ExerciseDBExercise> {
  const response = await axios.get(`${API_BASE}/exercises/${id}`);
  return response.data.data;
}

export async function getCategories(): Promise<string[]> {
  const response = await axios.get(`${API_BASE}/exercises/categories`);
  return response.data.data;
}

export async function getDifficulties(): Promise<string[]> {
  const response = await axios.get(`${API_BASE}/exercises/difficulties`);
  return response.data.data;
}

export async function getBodyParts(): Promise<string[]> {
  const response = await axios.get(`${API_BASE}/exercises/bodyParts`);
  return response.data.data;
}

export async function getTargetMuscles(): Promise<string[]> {
  const response = await axios.get(`${API_BASE}/exercises/muscles`);
  return response.data.data;
}

export async function getEquipment(): Promise<string[]> {
  const response = await axios.get(`${API_BASE}/exercises/equipment`);
  return response.data.data;
}
