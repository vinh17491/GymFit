import { useState } from 'react';
import { aiApi } from '../api/aiApi';

export const AIPage = () => {
  const [activeTab, setActiveTab] = useState<'workout' | 'meal'>('workout');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [workoutForm, setWorkoutForm] = useState({
    goal: '', level: '', duration: 30, equipment: ''
  });
  const [mealForm, setMealForm] = useState({
    goal: '', preferences: '', calories: 2000, restrictions: ''
  });

  const generateWorkout = async () => {
    setLoading(true);
    try {
      const res = await aiApi.generateWorkout(workoutForm);
      setResult(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const generateMeal = async () => {
    setLoading(true);
    try {
      const res = await aiApi.generateMeal(mealForm);
      setResult(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">AI Assistant</h1>
      <div className="flex border-b mb-6">
        <button 
          onClick={() => setActiveTab('workout')}
          className={`px-4 py-2 ${activeTab === 'workout' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          Workout Generator
        </button>
        <button 
          onClick={() => setActiveTab('meal')}
          className={`px-4 py-2 ${activeTab === 'meal' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          Meal Planner
        </button>
      </div>

      {activeTab === 'workout' && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-4">Generate AI Workout</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input 
              placeholder="Fitness goal" 
              value={workoutForm.goal}
              onChange={e => setWorkoutForm({...workoutForm, goal: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <input 
              placeholder="Fitness level" 
              value={workoutForm.level}
              onChange={e => setWorkoutForm({...workoutForm, level: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <input 
              type="number" 
              placeholder="Duration (minutes)" 
              value={workoutForm.duration}
              onChange={e => setWorkoutForm({...workoutForm, duration: Number(e.target.value)})}
              className="border rounded px-3 py-2"
            />
            <input 
              placeholder="Equipment available" 
              value={workoutForm.equipment}
              onChange={e => setWorkoutForm({...workoutForm, equipment: e.target.value})}
              className="border rounded px-3 py-2"
            />
          </div>
          <button 
            onClick={generateWorkout}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Workout'}
          </button>
        </div>
      )}

      {activeTab === 'meal' && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-4">Generate AI Meal Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input 
              placeholder="Dietary goal" 
              value={mealForm.goal}
              onChange={e => setMealForm({...mealForm, goal: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <input 
              placeholder="Food preferences" 
              value={mealForm.preferences}
              onChange={e => setMealForm({...mealForm, preferences: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <input 
              type="number" 
              placeholder="Target calories" 
              value={mealForm.calories}
              onChange={e => setMealForm({...mealForm, calories: Number(e.target.value)})}
              className="border rounded px-3 py-2"
            />
            <input 
              placeholder="Dietary restrictions" 
              value={mealForm.restrictions}
              onChange={e => setMealForm({...mealForm, restrictions: e.target.value})}
              className="border rounded px-3 py-2"
            />
          </div>
          <button 
            onClick={generateMeal}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Meal Plan'}
          </button>
        </div>
      )}

      {result && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold mb-3">AI Generated {activeTab === 'workout' ? 'Workout' : 'Meal Plan'}</h3>
          <div className="whitespace-pre-wrap text-gray-700">{result.content || result.plan || JSON.stringify(result, null, 2)}</div>
        </div>
      )}
    </div>
  );
};