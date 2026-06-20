import { useParams } from "react-router-dom";
import { useGetWorkoutById, useSaveWorkout } from "../index";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/Elements/Spinner";
import { toast } from "react-toastify";
import { IoFitness, IoTime, IoFlame, IoBarbell } from "react-icons/io5";
import { FaHeart } from "react-icons/fa";

const WorkoutDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { currentUser } = useAuth();
    const { data: workout, isLoading } = useGetWorkoutById(id!);
    const { mutateAsync: saveWorkout, isLoading: saving } = useSaveWorkout();

    const handleSave = async () => {
        if (!currentUser) { toast.error("Please login first"); return; }
        try {
            await saveWorkout(parseInt(id!));
            toast.success("Workout saved!");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to save");
        }
    };

    if (isLoading) return <Spinner />;
    if (!workout) return <div className="text-center py-20 text-gray-500">Workout not found</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-purple-500 to-purple-700 text-white py-16">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <IoFitness className="text-6xl mx-auto mb-4" />
                    <h1 className="text-4xl font-bold mb-4">{workout.name}</h1>
                    <p className="text-xl text-purple-100">{workout.category}</p>
                    <div className="flex items-center justify-center gap-4 mt-3 text-purple-100">
                        {workout.duration && <span className="flex items-center gap-1"><IoTime /> {workout.duration} min</span>}
                        {workout.difficulty && (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                workout.difficulty === "easy" ? "bg-green-200 text-green-800" :
                                workout.difficulty === "medium" ? "bg-yellow-200 text-yellow-800" :
                                workout.difficulty === "hard" ? "bg-red-200 text-red-800" :
                                "bg-white/20"
                            }`}>{workout.difficulty}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12">
                <img src={workout.imageUrl || "https://via.placeholder.com/800x400"} alt={workout.name} className="w-full rounded-2xl shadow-lg mb-8" />

                <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Description</h2>
                    <p className="text-gray-600 leading-relaxed">{workout.description}</p>
                </div>

                {workout.exercises && workout.exercises.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Exercises ({workout.exercises.length})</h2>
                        <div className="space-y-4">
                            {workout.exercises.map((exercise: any, i: number) => (
                                <div key={i} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition">
                                    <div className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-800">{exercise.name}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                {exercise.sets && <span className="flex items-center gap-1"><IoBarbell className="text-xs" /> {exercise.sets} sets</span>}
                                                {exercise.reps && <span>x {exercise.reps} reps</span>}
                                                {exercise.duration && <span className="flex items-center gap-1"><IoTime className="text-xs" /> {exercise.duration}s</span>}
                                                {exercise.rest && <span className="text-gray-400">Rest: {exercise.rest}s</span>}
                                            </div>
                                            {exercise.instructions && <p className="text-gray-400 text-sm mt-2">{exercise.instructions}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {workout.equipment && (
                    <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Equipment Needed</h2>
                        <p className="text-gray-600">{workout.equipment}</p>
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                >
                    <FaHeart />
                    {saving ? "Saving..." : "Save Workout"}
                </button>

                {workout.tips && (
                    <div className="mt-8 bg-purple-50 rounded-2xl p-6 border border-purple-100">
                        <h3 className="font-bold text-purple-800 mb-2">💡 Tips</h3>
                        <p className="text-purple-700 text-sm">{workout.tips}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkoutDetail;