import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export interface Video {
  id: number;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  difficulty: string;
  thumbnailUrl: string;
  videoUrl: string;
  instructor_id: number;
  instructor_name: string;
  isFree: boolean;
  isActive: boolean;
  created_at?: string;
}

function mapWorkoutToVideo(w: any): Video {
  return {
    id: w.id,
    title: w.title || w.name,
    description: w.description || '',
    category: w.category || w.plan_type || 'General',
    duration_minutes: w.duration_minutes || 30,
    difficulty: w.difficulty || 'Beginner',
    thumbnailUrl: '',
    videoUrl: '',
    instructor_id: w.instructor_id || w.coach_id || 0,
    instructor_name: w.instructor_name || w.coach_name || 'Instructor',
    isFree: w.is_free ?? (w.is_active === 1),
    isActive: w.is_active === 1,
    created_at: w.created_at,
  };
}

export async function getVideos(params?: {
  category?: string;
  search?: string;
  limit?: number;
}): Promise<Video[]> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.category && params.category !== 'All') queryParams.set('category', params.category);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.limit) queryParams.set('limit', String(params.limit));
    
    const res = await axios.get(`${API_BASE}/videos/public?${queryParams}`);
    const data = res.data?.data ?? [];
    return Array.isArray(data) ? data.map(mapWorkoutToVideo).filter(v => v.isActive) : [];
  } catch {
    return [];
  }
}
