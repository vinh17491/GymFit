import { useState } from "react";
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
    const [confirmSchedule, setConfirmSchedule] = useState<any>(null);

    const handleBook = async (scheduleId: number) => {
        if (!currentUser) {
            toast.error("Please login first");
            return;
        }
        try {
            await bookSession({ coachId: parseInt(id!), scheduleId });
            toast.success("Booking confirmed!");
            setConfirmSchedule(null);
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
                                                onClick={() => setConfirmSchedule(schedule)}
                                                disabled={booking}
                                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                            >
                                                Book
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Booking Confirmation Modal */}
            {confirmSchedule && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Booking</h3>
                        <p className="text-gray-600 mb-2">Coach: <span className="font-semibold">{coach.name}</span></p>
                        <p className="text-gray-600 mb-2">
                            Date: <span className="font-semibold">{new Date(confirmSchedule.startTime).toLocaleDateString()}</span>
                        </p>
                        <p className="text-gray-600 mb-6">
                            Time: <span className="font-semibold">
                                {new Date(confirmSchedule.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {" - "}
                                {new Date(confirmSchedule.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmSchedule(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleBook(confirmSchedule.id)}
                                disabled={booking}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {booking ? "Booking..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoachDetail;
