import { useParams } from "react-router-dom";
import { useGetDietById } from "../api/getDiets";
import { Spinner } from "../../../components/Elements/Spinner";

const DietDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { data: diet, isLoading } = useGetDietById(id!);

    if (isLoading) return <Spinner />;
    if (!diet) return <div className="text-center py-20 text-gray-500">Diet plan not found</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-16">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">{diet.name}</h1>
                    <p className="text-xl text-yellow-100">{diet.category} - {diet.calories} cal/day</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12">
                <img src={diet.imageUrl || "https://via.placeholder.com/800x400"} alt={diet.name} className="w-full rounded-2xl shadow-lg mb-8" />

                <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Description</h2>
                    <p className="text-gray-600 leading-relaxed">{diet.description}</p>
                </div>

                {diet.meals && (
                    <div className="bg-white rounded-2xl shadow-md p-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Meal Plan</h2>
                        <div className="space-y-6">
                            {diet.meals.map((meal: any, i: number) => (
                                <div key={i} className="border-b pb-4 last:border-b-0">
                                    <h3 className="font-semibold text-gray-800">{meal.mealTime}</h3>
                                    <p className="text-gray-600">{meal.foods}</p>
                                    <p className="text-gray-400 text-sm">{meal.calories} cal</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DietDetail;