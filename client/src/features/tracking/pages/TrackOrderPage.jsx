import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import OrderNestLogo from "../../../assets/OrderNestLogoWithoutBg.png";
import { Bar, SkeletonRegion } from "../../../common/components/Skeleton";

const TrackOrderPage = () => {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!orderId.trim() || phone.replace(/\D/g, "").length < 10)
      return toast.error("Please enter your Order ID and 10-digit phone number");

    try {
      setLoading(true);
      setSearched(false);
      const res = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/orders/track`,
        { orderId: orderId.trim(), phone }
      );
      if (res.data.orders.length === 0) {
        toast.error("No order found. Check your Order ID and phone number.");
      }

      setOrders(res.data.orders || []);
      setSearched(true);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      toast.error(
        err.response?.data?.message || "Failed to track order. Try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 to-white flex flex-col lg:flex-row items-center lg:items-start lg:justify-evenly gap-6 px-4 py-6 md:py-10">
      {(loading || (orders.length > 0 && searched)) && (
        <div className="order-2 lg:order-1 lg:mt-10 w-full lg:w-1/3 max-w-2xl lg:max-h-[600px] overflow-auto" style={{scrollbarWidth: "none", msOverflowStyle: "none"}}>
          {loading && (
            <SkeletonRegion label="Looking for your order">
              <div className="bg-white p-4 rounded shadow border border-orange-100 space-y-3">
                <Bar className="h-4 w-1/2" />
                <Bar className="h-4 w-3/5" />
                <Bar className="h-4 w-2/3" />
                <Bar className="h-4 w-1/2" />
                <Bar className="h-4 w-3/5" />
              </div>
            </SkeletonRegion>
          )}
          {!loading && searched && (
            <div className="space-y-4 overflow-auto scrollbar-hidden">
              {orders.map((order, index) => (
                <div
                  key={`${order.orderId}-${order.shopName}-${index}`}
                  className="bg-white p-4 rounded shadow border border-orange-100"
                >
                  <p>
                    <strong>Shop:</strong> {order.shopName}
                  </p>
                  <p>
                    <strong>Order ID:</strong> {order.orderId}
                  </p>
                  <p>
                    <strong>Customer:</strong> {order.customerName}
                  </p>
                  <p>
                    <strong>Item:</strong> {order.item}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span className="text-orange-600 font-medium">
                      {order.status}
                    </span>
                  </p>
                  <p>
                    <strong>Order Executive:</strong> {order.orderExecutive}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="order-1 lg:order-2 w-full max-w-lg">
        <div className="mb-6 mt-4 md:mt-10">
          <img
            src={OrderNestLogo}
            alt="OrderNest Logo"
            className="w-48 h-auto mx-auto"
          />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5 sm:p-8 w-full max-w-lg border-t-4 border-orange-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            Track Your Order
          </h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Enter your Order ID and the phone number you gave the shop to check
            your order status.
          </p>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Order ID"
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-orange-400 focus:outline-none"
            />

            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Phone number"
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-orange-400 focus:outline-none"
            />

            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition disabled:opacity-60"
            >
              {loading ? "Searching..." : "Track"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrderPage;
