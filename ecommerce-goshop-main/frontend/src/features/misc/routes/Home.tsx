import { Link } from "react-router-dom";
import { FaDumbbell, FaHeartbeat, FaAppleAlt, FaUsers, FaBlog, FaCalendarCheck } from "react-icons/fa";

export const Home = () => {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white py-24 px-4">
                <div className="container mx-auto max-w-6xl text-center">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <FaDumbbell className="text-5xl text-emerald-400" />
                        <h1 className="text-5xl md:text-7xl font-bold">GymFit</h1>
                    </div>
                    <p className="text-xl md:text-2xl text-gray-300 mb-4">
                        Transform Your Body. Transform Your Life.
                    </p>
                    <p className="text-gray-400 mb-10 max-w-2xl mx-auto">
                        Your all-in-one fitness platform with expert coaches, personalized workouts, 
                        nutrition plans, and a supportive community.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/membership"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-8 rounded-lg transition text-lg"
                        >
                            Get Started
                        </Link>
                        <Link
                            to="/coaches"
                            className="border border-white/30 hover:bg-white/10 text-white font-semibold py-3 px-8 rounded-lg transition text-lg"
                        >
                            Meet Our Coaches
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4 bg-gray-50">
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-900">
                        Everything You Need to Succeed
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
                            <FaUsers className="text-4xl text-emerald-500 mb-4" />
                            <h3 className="text-xl font-semibold mb-3 text-gray-900">Expert Coaches</h3>
                            <p className="text-gray-600">
                                Book sessions with certified fitness professionals who create personalized training programs.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
                            <FaDumbbell className="text-4xl text-emerald-500 mb-4" />
                            <h3 className="text-xl font-semibold mb-3 text-gray-900">Workout Library</h3>
                            <p className="text-gray-600">
                                Access hundreds of workouts with detailed instructions and track your progress.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
                            <FaAppleAlt className="text-4xl text-emerald-500 mb-4" />
                            <h3 className="text-xl font-semibold mb-3 text-gray-900">Diet Plans</h3>
                            <p className="text-gray-600">
                                Get customized nutrition plans designed to complement your fitness goals.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
                            <FaHeartbeat className="text-4xl text-emerald-500 mb-4" />
                            <h3 className="text-xl font-semibold mb-3 text-gray-900">Health Tracking</h3>
                            <p className="text-gray-600">
                                Monitor your progress with our comprehensive dashboard and analytics.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
                            <FaCalendarCheck className="text-4xl text-emerald-500 mb-4" />
                            <h3 className="text-xl font-semibold mb-3 text-gray-900">Easy Booking</h3>
                            <p className="text-gray-600">
                                Schedule coach sessions and classes with our simple booking system.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
                            <FaBlog className="text-4xl text-emerald-500 mb-4" />
                            <h3 className="text-xl font-semibold mb-3 text-gray-900">Fitness Blog</h3>
                            <p className="text-gray-600">
                                Stay motivated with articles, tips, and stories from our fitness community.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-[#0f172a] text-white py-20 px-4">
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Ready to Start Your Journey?
                    </h2>
                    <p className="text-gray-400 mb-10 text-lg">
                        Join GymFit today and get access to world-class coaches, personalized workouts, and nutrition plans.
                    </p>
                    <Link
                        to="/membership"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-4 px-10 rounded-lg transition text-lg inline-block"
                    >
                        View Membership Plans
                    </Link>
                </div>
            </section>
        </div>
    );
};