import { Route, Routes } from "react-router-dom";
import CheckoutSuccess from "./CheckoutSuccess";
import QRPaymentPage from "./QRPaymentPage";

export const CheckoutRoutes = () => {
  return (
    <Routes>
      <Route path="order/:id" element={<QRPaymentPage />} />
      <Route path="success" element={<CheckoutSuccess />} />
    </Routes>
  );
};