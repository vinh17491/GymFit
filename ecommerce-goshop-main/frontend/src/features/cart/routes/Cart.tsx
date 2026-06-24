import Navbar from "../../../components/Elements/Navbar";
import { useSelector } from "react-redux";
import { selectCartItems } from "../cartSlice";
import { useMemo, useState } from "react";
import { FaArrowRightLong, FaQrcode } from "react-icons/fa6";
import CheckoutTotalPrice from "../components/CheckoutTotalPrice";
import CartProductsList from "../components/CartProductsList";
import { api } from "../../../app/api";
import { useAuth } from "../../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

const Cart = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const cartItems = useSelector(selectCartItems);
  const [loading, setLoading] = useState(false);

  const cartTotalPrice = useMemo(() => {
    return Number(
      cartItems
        .reduce((accumulator, currentValue) => {
          return (
            accumulator + currentValue.quantity * currentValue.product.price
          );
        }, 0)
        .toFixed(2)
    );
  }, [cartItems]);

  const handleCheckout = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const items = cartItems.map((ci) => ({
        productId: ci.product.id,
        quantity: ci.quantity,
      }));
      const { data } = await api.post("/checkout/create-order", { items });
      navigate(`/checkout/order/${data.order.Id}`, {
        state: { order: data.order, payment: data.payment, qrInfo: data.qrInfo },
      });
    } catch (err: any) {
      alert(err?.response?.data?.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Navbar />
      <h3 className="font-semibold text-3xl mb-8">Cart</h3>
      <div className="flex flex-col md:flex-row items-start">
        <CartProductsList context="cart" />
        {cartItems.length > 0 && (
          <>
            <hr className="my-8 bg-customGradient h-px w-full block md:hidden" />
            <CheckoutTotalPrice amount={cartTotalPrice}>
              <>
                <button
                  className="mt-4 mb-2 text-white rounded-md w-full text-center py-3 text-sm transition hover:bg-opacity-90 font-semibold bg-primary disabled:opacity-50 flex items-center justify-center gap-2"
                  onClick={handleCheckout}
                  disabled={loading}
                >
                  <FaQrcode />
                  {loading ? "Processing..." : "Pay with QR"}
                </button>
                <Link to="/products" className="flex font-medium hover:underline items-center">
                  <span className="mr-2">Continue</span>
                  <FaArrowRightLong />
                </Link>
              </>
            </CheckoutTotalPrice>
          </>
        )}
      </div>
    </div>
  );
};

export default Cart;