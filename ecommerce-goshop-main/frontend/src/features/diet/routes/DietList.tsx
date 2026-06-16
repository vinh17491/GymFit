import { Link } from "react-router-dom";
import { useGetDiets } from "../api/getDiets";
import { Spinner } from "../../../components/Elements/Spinner";

const DietList = () => {
    const { data: diets, isLoading } = useGetDiets();

    if (isLoading) return <Spinner />;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">Diet Plans</h1>
                    <p className="text-xl text-yellow-100">Nutrition plans tailored to your goals</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-3 gap-8">
                    {diets?.map((diet: any) => (
                        <Link key={diet.id} to={`/diet/${diet.id}`} className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:scale-105 transition">
                            <img src={diet.imageUrl || "https://via.placeholder.com/400x300"} alt={diet.name} className="w-full h-48 object-cover" />
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-800">{diet.name}</h3>
                                <p className="text-gray-500 mt-2">{diet.category}</p>
                                <p className="text-gray-400 text-sm mt-3">{diet.calories} cal/day</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DietList;