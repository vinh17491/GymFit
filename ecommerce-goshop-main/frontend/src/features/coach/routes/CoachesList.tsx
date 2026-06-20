import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useGetCoaches } from "../api/getCoaches";
import { Spinner } from "../../../components/Elements/Spinner";

const CoachesList = () => {
    const { data: coaches, isLoading } = useGetCoaches();
    const [search, setSearch] = useState("");
    const [specialization, setSpecialization] = useState("");

    const specializations = useMemo(() => {
        if (!coaches) return [];
        const set = new Set<string>();
        coaches.forEach((c: any) => { if (c.specialization) set.add(c.specialization); });
        return Array.from(set);
    }, [coaches]);

    const filtered = useMemo(() => {
        if (!coaches) return [];
        return coaches.filter((coach: any) => {
            const matchSearch = !search || coach.name?.toLowerCase().includes(search.toLowerCase()) || coach.specialization?.toLowerCase().includes(search.toLowerCase());
            const matchSpec = !specialization || coach.specialization === specialization;
            return matchSearch && matchSpec;
        });
    }, [coaches, search, specialization]);

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
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <input
                        type="text"
                        placeholder="Search coaches by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Specializations</option>
                        {specializations.map((spec) => (
                            <option key={spec} value={spec}>{spec}</option>
                        ))}
                    </select>
                </div>

                {filtered.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">No coaches found matching your criteria.</p>
                ) : (
                <div className="grid md:grid-cols-3 gap-8">
                    {filtered.map((coach: any) => (
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
                )}
            </div>
        </div>
    );
};

export default CoachesList;