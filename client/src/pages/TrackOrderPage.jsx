import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import OrderNestLogo from "../assets/OrderNestLogoWithoutBg.png";

const TrackOrderPage = () => {
  const [input, setInput] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!input.trim())
      return toast.error("Please enter Order ID or Phone number");

    try {
      setLoading(true);
      setSearched(false);
      const res = await axios.get(
        `${process.env.REACT_APP_BASE_URL}/api/orders/track?query=${input}`
      );
      if (res.data.orders.length === 0) {
        toast.error("No orders found.");
      }

      setOrders(res.data.orders || []);
      setSearched(true);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      toast.error("Failed to track order. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 to-white flex justify-evenly px-4 py-10">
      {orders.length > 0 && searched && (
        <div className="mt-10 w-1/3 max-w-2xl max-h-[600px] overflow-auto" style={{scrollbarWidth: "none", msOverflowStyle: "none"}}>
          {loading && <p className="text-center text-gray-500">Searching...</p>}
          {!loading && searched && (
            <div className="space-y-4 overflow-auto scrollbar-hidden">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white p-4 rounded shadow border border-orange-100"
                >
                  <p>
                    <strong>Order ID:</strong> {order.orderId}
                  </p>
                  <p>
                    <strong>Customer:</strong> {order.customerName}
                  </p>
                  <p>
                    <strong>Phone:</strong> {order.phone}
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div>
        <div className="mb-6 mt-10">
          <img
            src={OrderNestLogo}
            alt="OrderNest Logo"
            className="w-48 h-auto mx-auto"
          />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg border-t-4 border-orange-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            Track Your Order
          </h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Enter your Order ID or phone number below to check your order
            status.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Order ID or Phone"
              className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-orange-400 focus:outline-none"
            />

            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition"
            >
              Track
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrderPage;
