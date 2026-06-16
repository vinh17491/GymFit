import { useGetAdminDashboard, useGetCoachDashboard, useGetMemberDashboard } from "../api/getDashboard";
import { Spinner } from "../../../components/Elements/Spinner";

const AdminDashboard = () => {
    const { data, isLoading } = useGetAdminDashboard();

    if (isLoading) return <Spinner />;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>
                    <p className="text-xl text-purple-200">Manage your gym platform</p>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-600">Total Members</h3>
                        <p className="text-3xl font-bold text-purple-700 mt-2">{data?.totalMembers || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-600">Active Coaches</h3>
                        <p className="text-3xl font-bold text-purple-700 mt-2">{data?.activeCoaches || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-600">Total Revenue</h3>
                        <p className="text-3xl font-bold text-purple-700 mt-2">${data?.totalRevenue || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-600">Active Plans</h3>
                        <p className="text-3xl font-bold text-purple-700 mt-2">{data?.activePlans || 0}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CoachDashboard = () => {
    const { data, isLoading } = useGetCoachDashboard();

    if (isLoading) return <Spinner />;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-green-600 to-green-800 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">Coach Dashboard</h1>
                    <p className="text-xl text-green-200">Manage your sessions</p>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-600">Upcoming Sessions</h3>
                        <p className="text-3xl font-bold text-green-700 mt-2">{data?.upcomingSessions || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-600">Total Clients</h3>
                        <p className="text-3xl font-bold text-green-700 mt-2">{data?.totalClients || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-600">Completed Sessions</h3>
                        <p className="text-3xl font-bold text-green-700 mt-2">{data?.completedSessions || 0}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MemberDashboard = () => {
    const { data, isLoading } = useGetMemberDashboard();

    if (isLoading) return <Spinner />;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">My Dashboard</h1>
                    <p className="text-xl text-blue-200">Track your fitness journey</p>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-600">Active Plan</h3>
                        <p className="text-xl font-bold text-blue-700 mt-2">{data?.activePlan || "No active plan"}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-600">Workouts Completed</h3>
                        <p className="text-3xl font-bold text-blue-700 mt-2">{data?.workoutsCompleted || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-600">Booked Sessions</h3>
                        <p className="text-3xl font-bold text-blue-700 mt-2">{data?.bookedSessions || 0}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { AdminDashboard, CoachDashboard, MemberDashboard };