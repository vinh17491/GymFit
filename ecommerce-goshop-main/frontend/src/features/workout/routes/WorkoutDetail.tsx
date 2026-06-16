import { useParams } from "react-router-dom";
import { useGetWorkoutById, useSaveWorkout } from "../index";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/Elements/Spinner";
import { toast } from "react-toastify";
import { IoFitness } from "react-icons/io5";
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
                    <p className="text-xl text-purple-100">{workout.category} - {workout.duration} min</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12">
                <img src={workout.imageUrl || "https://via.placeholder.com/800x400"} alt={workout.name} className="w-full rounded-2xl shadow-lg mb-8" />

                <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Description</h2>
                    <p className="text-gray-600 leading-relaxed">{workout.description}</p>
                </div>

                {workout.exercises && (
                    <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Exercises</h2>
                        <div className="space-y-4">
                            {workout.exercises.map((exercise: any, i: number) => (
                                <div key={i} className="border-b pb-4 last:border-b-0">
                                    <h3 className="font-semibold text-gray-800">{exercise.name}</h3>
                                    <p className="text-gray-500 text-sm">{exercise.sets} sets x {exercise.reps} reps</p>
                                </div>
                            ))}
                        </div>
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
            </div>
        </div>
    );
};

export default WorkoutDetail;