import { useGetAdminDashboard, useGetCoachDashboard, useGetMemberDashboard } from "../api/getDashboard";
import { Spinner } from "../../../components/Elements/Spinner";
import { Logbook } from "../components/Logbook";
import { Link } from "react-router-dom";
import { FaDumbbell, FaApple, FaUsers, FaCalendar, FaVideo, FaBook, FaRobot, FaCog } from "react-icons/fa";

const QuickLink = ({ to, icon: Icon, label, color }: { to: string; icon: any; label: string; color: string }) => (
    <Link to={to} className={"flex items-center gap-3 p-4 rounded-xl border hover:shadow-md transition " + color}>
        <Icon className="text-xl" />
        <span className="font-medium text-sm">{label}</span>
    </Link>
);

const AdminDashboard = () => {
    const { data, isLoading } = useGetAdminDashboard();

    if (isLoading) return <Spinner />;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>
                    <p className="text-xl text-purple-200">Manage your gym platform</p>
                    <Link to="/" className="inline-block mt-4 text-purple-200 hover:text-white text-sm">&larr; Back to Home</Link>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-4 gap-6 mb-8">
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
                <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickLink to="/membership" icon={FaCog} label="Manage Plans" color="bg-purple-50 border-purple-200 text-purple-700" />
                    <QuickLink to="/coaches" icon={FaUsers} label="Manage Coaches" color="bg-blue-50 border-blue-200 text-blue-700" />
                    <QuickLink to="/workouts" icon={FaDumbbell} label="Workouts" color="bg-green-50 border-green-200 text-green-700" />
                    <QuickLink to="/blogs" icon={FaBook} label="Blog" color="bg-yellow-50 border-yellow-200 text-yellow-700" />
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
                    <Link to="/" className="inline-block mt-4 text-green-200 hover:text-white text-sm">&larr; Back to Home</Link>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-3 gap-6 mb-8">
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
                <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickLink to="/chat" icon={FaUsers} label="Messages" color="bg-blue-50 border-blue-200 text-blue-700" />
                    <QuickLink to="/videos" icon={FaVideo} label="Videos" color="bg-purple-50 border-purple-200 text-purple-700" />
                    <QuickLink to="/workouts" icon={FaDumbbell} label="Workouts" color="bg-green-50 border-green-200 text-green-700" />
                    <QuickLink to="/community" icon={FaUsers} label="Community" color="bg-yellow-50 border-yellow-200 text-yellow-700" />
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
                    <Link to="/" className="inline-block mt-4 text-blue-200 hover:text-white text-sm">&larr; Back to Home</Link>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-3 gap-6 mb-8">
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
                <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <QuickLink to="/workouts" icon={FaDumbbell} label="Workouts" color="bg-purple-50 border-purple-200 text-purple-700" />
                    <QuickLink to="/diet" icon={FaApple} label="Diet Plans" color="bg-yellow-50 border-yellow-200 text-yellow-700" />
                    <QuickLink to="/coaches" icon={FaUsers} label="Book Coach" color="bg-blue-50 border-blue-200 text-blue-700" />
                    <QuickLink to="/videos" icon={FaVideo} label="Videos" color="bg-green-50 border-green-200 text-green-700" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Today's Activity</h2>
                <Logbook />
            </div>
        </div>
    );
};

export { AdminDashboard, CoachDashboard, MemberDashboard };
