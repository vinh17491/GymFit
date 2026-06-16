import { Link } from "react-router-dom";
import { useGetWorkouts } from "../api/getWorkouts";
import { Spinner } from "../../../components/Elements/Spinner";

const Workouts = () => {
    const { data: workouts, isLoading } = useGetWorkouts();

    if (isLoading) return <Spinner />;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-purple-500 to-purple-700 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">Workouts</h1>
                    <p className="text-xl text-purple-100">Find your perfect training program</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-3 gap-8">
                    {workouts?.map((workout: any) => (
                        <Link key={workout.id} to={`/workouts/${workout.id}`} className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:scale-105 transition">
                            <img src={workout.imageUrl || "https://via.placeholder.com/400x300"} alt={workout.name} className="w-full h-48 object-cover" />
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-800">{workout.name}</h3>
                                <p className="text-gray-500 mt-2">{workout.category}</p>
                                <p className="text-gray-400 text-sm mt-3">{workout.duration} min</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Workouts;