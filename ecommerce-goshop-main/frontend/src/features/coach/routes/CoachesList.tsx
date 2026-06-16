import { Link } from "react-router-dom";
import { useGetCoaches } from "../api/getCoaches";
import { Spinner } from "../../../components/Elements/Spinner";

const CoachesList = () => {
    const { data: coaches, isLoading } = useGetCoaches();

    if (isLoading) return <Spinner />;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">Our Coaches</h1>
                    <p className="text-xl text-blue-100">Meet our professional fitness trainers</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-3 gap-8">
                    {coaches?.map((coach: any) => (
                        <Link key={coach.id} to={`/coaches/${coach.id}`} className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform">
                            <img src={coach.photoURL || "https://via.placeholder.com/400x300"} alt={coach.name} className="w-full h-48 object-cover" />
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-800">{coach.name}</h3>
                                <p className="text-gray-500 mt-2">{coach.specialization || "Personal Trainer"}</p>
                                <p className="text-gray-400 text-sm mt-3 line-clamp-2">{coach.bio}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CoachesList;