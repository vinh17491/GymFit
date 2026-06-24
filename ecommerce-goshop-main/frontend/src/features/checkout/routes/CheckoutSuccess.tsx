import { FaCircleCheck } from "react-icons/fa6";
import { Link, useSearchParams } from "react-router-dom";

// Trang này dùng sau khi user xác nhận chuyển khoản từ QRPaymentPage
export const CheckoutSuccess = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get("orderId");

    return (
        <div className="bg-white rounded-xl shadow-2xl mt-10 mx-auto p-10 flex flex-col justify-center items-center w-full min-[550px]:w-[500px]">
            <div className="bg-[#23A26D1F] bg-opacity-[12%] rounded-[50%] w-24 h-24 flex items-center justify-center mb-6">
                <FaCircleCheck className="text-[#23A26D] w-11 h-11 animate-pulse" />
            </div>
            <h6 className="text-2xl mb-3.5">Payment Submitted!</h6>
            <p className="text-gray-500 text-center mb-4">
                Cảm ơn bạn! Đơn hàng {orderId && `#${orderId}`} đang chờ xác nhận.
                <br />Admin sẽ kiểm tra và xác nhận trong thời gian sớm nhất.
            </p>
            <Link to="/dashboard" className="text-blue-600 hover:underline mt-4">
                Back to Dashboard
            </Link>
        </div>
    );
};

export default CheckoutSuccess;