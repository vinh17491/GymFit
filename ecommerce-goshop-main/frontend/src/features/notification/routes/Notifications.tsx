import { useGetNotifications, useMarkNotificationRead, useMarkAllRead } from "../api/getNotifications";
import { Spinner } from "../../../components/Elements/Spinner";
import { toast } from "react-toastify";

const Notifications = () => {
    const { data: notifications, isLoading, refetch } = useGetNotifications();
    const { mutateAsync: markRead } = useMarkNotificationRead();
    const { mutateAsync: markAllRead } = useMarkAllRead();

    const handleMarkRead = async (id: number) => {
        try {
            await markRead(id);
            refetch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed");
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllRead();
            refetch();
            toast.success("All notifications marked as read");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed");
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white py-16">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold mb-4">Notifications</h1>
                            <p className="text-red-100">Stay updated with your gym activity</p>
                        </div>
                        <button onClick={handleMarkAllRead} className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition">
                            Mark All Read
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12">
                {notifications?.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 text-lg">No notifications yet</div>
                ) : (
                    <div className="space-y-4">
                        {notifications?.map((notif: any) => (
                            <div key={notif.id} className={`bg-white rounded-xl shadow-md p-6 flex justify-between items-center ${!notif.read ? "border-l-4 border-red-500" : ""}`}>
                                <div className="flex-1">
                                    <p className="text-gray-800">{notif.message}</p>
                                    <p className="text-gray-400 text-sm mt-1">{new Date(notif.createdAt).toLocaleDateString()}</p>
                                </div>
                                {!notif.read && (
                                    <button onClick={() => handleMarkRead(notif.id)} className="text-red-500 hover:text-red-600 text-sm font-semibold">
                                        Mark Read
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;