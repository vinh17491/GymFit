import { useGetFreeTrial, useStartFreeTrial } from "../api/healthApi";
import { toast } from "react-toastify";

export const TrialManager = () => {
    const { data: trialData, isLoading } = useGetFreeTrial();
    const startTrialMutation = useStartFreeTrial();

    const handleStartTrial = async () => {
        try {
            await startTrialMutation.mutateAsync();
            toast.success("14-Day Premium Trial Started!");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to start trial");
        }
    };

    if (isLoading) return <div>Loading trial info...</div>;

    if (!trialData?.hasTrial) {
        return (
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 rounded-lg shadow-md text-white text-center mt-6">
                <h2 className="text-2xl font-bold mb-2">Unlock Premium for Free</h2>
                <p className="mb-4">Get 14 days of full access to workout plans, meal plans, and premium videos.</p>
                <button
                    onClick={handleStartTrial}
                    disabled={startTrialMutation.isLoading}
                    className="bg-white text-indigo-600 font-bold py-2 px-6 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                    {startTrialMutation.isLoading ? "Starting..." : "Start 14-Day Free Trial"}
                </button>
            </div>
        );
    }

    if (trialData?.isActive) {
        return (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg mt-6">
                <h3 className="text-green-800 font-bold">Premium Trial Active</h3>
                <p className="text-green-600 text-sm">
                    Ends on: {new Date(trialData.endDate).toLocaleDateString()} ({trialData.daysRemaining} days left)
                </p>
            </div>
        );
    }

    if (trialData?.hasTrial && !trialData?.isActive) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mt-6">
                <h3 className="text-yellow-800 font-bold">Trial Expired</h3>
                <p className="text-yellow-600 text-sm">
                    Your 14-day trial ended on {new Date(trialData.endDate).toLocaleDateString()}. Upgrade to Premium to continue access.
                </p>
            </div>
        );
    }

    return null;
};