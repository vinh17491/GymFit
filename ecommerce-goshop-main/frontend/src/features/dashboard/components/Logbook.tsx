import { useState, useEffect } from 'react';
import { api } from '../../../app/api';

interface WorkoutLog {
  Id: number;
  Title?: string;
  DurationMin?: number;
  ExercisesCount?: number;
}

interface DietLog {
  Id: number;
  FoodName?: string;
  Calories?: number;
  MealType?: string;
}

export const Logbook = () => {
  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout');
  const [logs, setLogs] = useState<(WorkoutLog | DietLog)[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'workout' ? '/dashboard/workout-logs' : '/dashboard/diet-logs';
      const res = await api.get(endpoint);
      setLogs(res.data || []);
    } catch (err) {
      console.error(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('workout')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'workout' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Workout Log
        </button>
        <button
          onClick={() => setActiveTab('diet')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'diet' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Nutrition Log
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No logs found for today.</p>
        ) : (
          logs.map((log) => (
            <div key={log.Id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-gray-900">
                    {activeTab === 'workout' ? (log as WorkoutLog).Title || 'Workout Session' : (log as DietLog).FoodName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {activeTab === 'workout'
                      ? `${(log as WorkoutLog).DurationMin || 0} mins • ${(log as WorkoutLog).ExercisesCount || 0} exercises`
                      : `${(log as DietLog).Calories} kcal • ${(log as DietLog).MealType}`}
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  Completed
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <button className="w-full mt-6 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
        View Full History
      </button>
    </div>
  );
};