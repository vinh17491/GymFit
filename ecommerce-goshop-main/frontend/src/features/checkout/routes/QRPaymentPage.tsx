import { useLocation, useParams, Link } from "react-router-dom";
import { useState } from "react";
import { FaQrcode, FaCheck, FaCopy } from "react-icons/fa6";
import { api } from "../../../app/api";
import { useAuth } from "../../../context/AuthContext";

interface QRInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  content: string;
  qrImageUrl: string;
}

const QRPaymentPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { token } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [copying, setCopying] = useState("");

  // Use state from cart navigation, or fetch from API
  const qrInfo: QRInfo | undefined = (location.state as any)?.qrInfo;
  const orderId = id || (location.state as any)?.order?.Id;
  const amount = qrInfo?.amount || (location.state as any)?.order?.TotalAmount;

  const handleConfirm = async () => {
    try {
      await api.post(
        "/api/payment/confirm",
        { orderId: Number(orderId) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConfirmed(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to confirm");
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopying(label);
    setTimeout(() => setCopying(""), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <FaQrcode className="text-5xl text-blue-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-800">QR Payment</h1>
          <p className="text-gray-500 mt-1">Chuyển khoản đến Techcombank</p>
        </div>

        {/* QR Image */}
        <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 mb-6 flex justify-center">
          <img
            src={qrInfo?.qrImageUrl}
            alt="QR Code thanh toán Techcombank"
            className="w-64 h-64 object-contain"
          />
        </div>

        {/* Bank Info */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Ngân hàng</span>
            <span className="font-semibold">{qrInfo?.bankName || "Techcombank"}</span>
          </div>
          <div
            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
            onClick={() => copyText(qrInfo?.accountNumber || "01101749880417", "stk")}
          >
            <span className="text-gray-600">Số tài khoản</span>
            <span className="font-semibold flex items-center gap-2">
              {qrInfo?.accountNumber || "01101749880417"}
              <FaCopy className={`text-sm ${copying === "stk" ? "text-green-500" : "text-gray-400"}`} />
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Chủ tài khoản</span>
            <span className="font-semibold">{qrInfo?.accountHolder || "CỔNG GIAO DỊCH"}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg font-bold">
            <span className="text-blue-700">Số tiền</span>
            <span className="text-blue-700 text-xl">
              {Number(amount || 0).toLocaleString("vi-VN")} VND
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Nội dung CK</span>
            <span className="font-semibold text-sm">{qrInfo?.content || `GYMFIT-${orderId}`}</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Hướng dẫn:</h3>
          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
            <li>Mở app Techcombank (hoặc ngân hàng bất kỳ)</li>
            <li>Quét mã QR hoặc nhập số tài khoản</li>
            <li>Nhập đúng số tiền và nội dung chuyển khoản</li>
            <li>Nhấn "Đã chuyển khoản" bên dưới sau khi chuyển</li>
          </ol>
        </div>

        {/* Confirm button */}
        {!confirmed ? (
          <button
            onClick={handleConfirm}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
            aria-label="Xác nhận đã chuyển khoản"
          >
            <FaCheck aria-hidden="true" />
            Đã chuyển khoản
          </button>
        ) : (
          <div className="text-center">
            <div className="bg-green-100 text-green-700 p-4 rounded-xl mb-4">
              <FaCheck className="inline mr-2" />
              Đã xác nhận! Đơn hàng đang được xử lý.
            </div>
            <Link
              to="/dashboard"
              className="text-blue-600 hover:underline"
            >
              Về Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRPaymentPage;
