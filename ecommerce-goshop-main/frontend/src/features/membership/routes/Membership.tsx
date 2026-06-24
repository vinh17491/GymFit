import { useState } from "react";
import { useGetPlans } from "../api/getPlans";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";
import { Spinner } from "../../../components/Elements/Spinner";
import { IoFitness } from "react-icons/io5";
import { FaCheck, FaQrcode } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Membership = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { data: plans, isLoading } = useGetPlans();
  const [purchasingId, setPurchasingId] = useState<number | null>(null);

  const handlePurchase = async (planId: number) => {
    if (!currentUser) {
      toast.error("Please login first");
      return;
    }
    try {
      setPurchasingId(planId);
      const { default: { api } } = await import("../../../app/api");
      const { data } = await api.post("/api/payment/membership/purchase", { planId });
      navigate(`/checkout/order/${data.membership.Id}`, {
        state: { qrInfo: data.qrInfo, order: { Id: data.membership.Id, TotalAmount: data.payment.Amount } },
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Purchase failed");
    } finally {
      setPurchasingId(null);
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
            <div key={plan.Id || plan.id} className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform">
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.Name || plan.name}</h3>
                <p className="text-gray-500 mb-6">{plan.Description || plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-green-600">
                    {Number(plan.Price || plan.price).toLocaleString("vi-VN")} VND
                  </span>
                  <span className="text-gray-400">/{plan.DurationDays || plan.duration_days} days</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center text-gray-600">
                    <FaCheck className="text-green-500 mr-3 flex-shrink-0" />
                    {plan.MaxSessionsPerWeek || plan.max_sessions_per_week || "Unlimited"} sessions/week
                  </li>
                  <li className="flex items-center text-gray-600">
                    <FaCheck className="text-green-500 mr-3 flex-shrink-0" />
                    {plan.IncludesPersonalTraining ? "Personal Training" : "Self-guided"}
                  </li>
                  <li className="flex items-center text-gray-600">
                    <FaCheck className="text-green-500 mr-3 flex-shrink-0" />
                    {plan.IncludesDietPlan ? "Diet Plan" : "Basic nutrition guide"}
                  </li>
                </ul>
                <button
                  onClick={() => handlePurchase(plan.Id || plan.id)}
                  disabled={purchasingId !== null}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {purchasingId === (plan.Id || plan.id) ? (
                    "Processing..."
                  ) : (
                    <>
                      <FaQrcode /> Pay with QR
                    </>
                  )}
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