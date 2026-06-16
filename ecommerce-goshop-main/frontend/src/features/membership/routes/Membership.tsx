import { useGetPlans } from "../api/getPlans";
import { usePurchasePlan } from "../api/purchasePlan";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";
import { Spinner } from "../../../components/Elements/Spinner";
import { IoFitness } from "react-icons/io5";
import { FaCheck } from "react-icons/fa";

const Membership = () => {
    const { currentUser } = useAuth();
    const { data: plans, isLoading } = useGetPlans();
    const { mutateAsync: purchase, isLoading: purchasing } = usePurchasePlan();

    const handlePurchase = async (planId: number) => {
        if (!currentUser) {
            toast.error("Please login first");
            return;
        }
        try {
            const result = await purchase(planId);
            if (result?.url) {
                window.location.href = result.url;
            } else if (result?.message) {
                toast.success(result.message);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Purchase failed");
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-green-500 to-green-700 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <IoFitness className="text-6xl mx-auto mb-4" />
                    <h1 className="text-4xl font-bold mb-4">Membership Plans</h1>
                    <p className="text-xl text-green-100">Choose the perfect plan for your fitness journey</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-3 gap-8">
                    {plans?.map((plan: any) => (
                        <div key={plan.id} className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform">
                            <div className="p-8">
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                                <p className="text-gray-500 mb-6">{plan.description}</p>
                                <div className="mb-6">
                                    <span className="text-4xl font-bold text-green-600">${plan.price}</span>
                                    <span className="text-gray-400">/{plan.duration_months || 1}mo</span>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {(plan.features || []).map((feature: string, i: number) => (
                                        <li key={i} className="flex items-center text-gray-600">
                                            <FaCheck className="text-green-500 mr-3 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => handlePurchase(plan.id)}
                                    disabled={purchasing}
                                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                                >
                                    {purchasing ? "Processing..." : "Get Started"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Membership;