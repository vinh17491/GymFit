import api from '../api/axios';

export interface Video {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  duration_minutes: number | null;
  difficulty: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  instructor_id: number | null;
  instructor_name: string | null;
  isActive: boolean;
  created_at?: string;
}

type RawVideo = Record<string, unknown>;

function asObject(value: unknown): RawVideo {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('VIDEO_RESPONSE_INVALID');
  return value as RawVideo;
}

function requiredNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('VIDEO_RESPONSE_INVALID');
  return value;
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('VIDEO_RESPONSE_INVALID');
  return value;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error('VIDEO_RESPONSE_INVALID');
  return value;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('VIDEO_RESPONSE_INVALID');
  return value;
}

function activeFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  throw new Error('VIDEO_RESPONSE_INVALID');
}

function mapExerciseToVideo(value: unknown): Video {
  const raw = asObject(value);
  return {
    id: requiredNumber(raw.id),
    title: requiredString(raw.title),
    description: nullableString(raw.description),
    category: nullableString(raw.category),
    duration_minutes: nullableNumber(raw.duration_minutes),
    difficulty: nullableString(raw.difficulty),
    thumbnailUrl: nullableString(raw.thumbnail_url),
    videoUrl: nullableString(raw.video_url),
    instructor_id: nullableNumber(raw.instructor_id),
    instructor_name: nullableString(raw.instructor_name),
    isActive: activeFlag(raw.is_active),
    created_at: nullableString(raw.created_at) ?? undefined,
  };
}

export async function getVideos(params?: {
  category?: string;
  search?: string;
  limit?: number;
}): Promise<Video[]> {
  const queryParams = new URLSearchParams();
  if (params?.category && params.category !== 'All') queryParams.set('category', params.category);
  if (params?.search) queryParams.set('search', params.search);
  if (params?.limit) queryParams.set('limit', String(params.limit));

  const res = await api.get(`/videos/public?${queryParams}`);
  const payload = asObject(res.data?.data);
  if (!Array.isArray(payload.videos)) throw new Error('VIDEO_RESPONSE_INVALID');
  return payload.videos.map(mapExerciseToVideo).filter(video => video.isActive);
}
