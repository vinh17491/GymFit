import { useParams } from "react-router-dom";
import { useGetCoachById, useGetCoachSchedules, useCreateBooking } from "../index";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/Elements/Spinner";
import { toast } from "react-toastify";
import { IoFitness } from "react-icons/io5";

const CoachDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { currentUser } = useAuth();
    const { data: coach, isLoading } = useGetCoachById(id!);
    const { data: schedules, isLoading: schedulesLoading } = useGetCoachSchedules(id!);
    const { mutateAsync: bookSession, isLoading: booking } = useCreateBooking();

    const handleBook = async (scheduleId: number) => {
        if (!currentUser) {
            toast.error("Please login first");
            return;
        }
        try {
            await bookSession({ coachId: parseInt(id!), scheduleId });
            toast.success("Booking confirmed!");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Booking failed");
        }
    };

    if (isLoading) return <Spinner />;
    if (!coach) return <div className="text-center py-20 text-gray-500">Coach not found</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <IoFitness className="text-6xl mx-auto mb-4" />
                    <h1 className="text-4xl font-bold mb-4">{coach.name}</h1>
                    <p className="text-xl text-blue-100">{coach.specialization || "Personal Trainer"}</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-2 gap-12">
                    <div>
                        <img src={coach.photoURL || "https://via.placeholder.com/600x400"} alt={coach.name} className="w-full rounded-2xl shadow-lg" />
                        <div className="mt-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">About</h2>
                            <p className="text-gray-600 leading-relaxed">{coach.bio || "Experienced fitness professional dedicated to helping you achieve your goals."}</p>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Sessions</h2>
                        {schedulesLoading ? (
                            <Spinner />
                        ) : schedules?.length === 0 ? (
                            <p className="text-gray-500">No available sessions at the moment.</p>
                        ) : (
                            <div className="space-y-4">
                                {schedules?.map((schedule: any) => (
                                    <div key={schedule.id} className="bg-white rounded-xl p-6 shadow-md">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-lg font-semibold text-gray-800">
                                                    {new Date(schedule.startTime).toLocaleDateString()} 
                                                    {" - "}
                                                    {new Date(schedule.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <p className="text-gray-500 text-sm mt-1">
                                                    to {new Date(schedule.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                {schedule.maxCapacity && (
                                                    <p className="text-gray-400 text-xs mt-1">
                                                        {schedule.bookedCount || 0}/{schedule.maxCapacity} booked
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleBook(schedule.id)}
                                                disabled={booking}
                                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                            >
                                                {booking ? "Booking..." : "Book"}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoachDetail;