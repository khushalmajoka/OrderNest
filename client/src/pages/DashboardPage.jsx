import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import OrderList from "../components/OrderList";
import EditOrderModal from "../components/EditOrderModal";
import toast from "react-hot-toast";

const Dashboard = () => {
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [editOrder, setEditOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) {
        navigate("/");
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [shopRes, ordersRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/shop/${userId}`, { headers }),
          axios.get(`http://localhost:5000/api/orders/${userId}`, { headers }),
        ]);

        setShop(shopRes.data.shop);
        setOrders(ordersRes.data.orders);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        toast.error("Session expired or invalid token. Please login again.");
        localStorage.clear();
        navigate("/");
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("shopId");
    navigate("/");
  };

  const handleDeleteOrder = async (id) => {
    try {
      const token = localStorage.getItem("token");

      await axios.delete(`http://localhost:5000/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOrders((prev) => prev.filter((order) => order._id !== id));
    } catch (err) {
      console.error("Failed to delete order:", err);
      toast.error("Failed to delete order. Try again.");
    }
  };

  const handleUpdateOrder = async (updatedOrder) => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.put(
        `http://localhost:5000/api/orders/${updatedOrder._id}`,
        updatedOrder,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updated = res.data.order;

      // Replace in UI
      setOrders((prev) =>
        prev.map((order) => (order._id === updated._id ? updated : order))
      );

      setEditOrder(null); // Close modal
    } catch (err) {
      console.error("Failed to update order:", err);
      toast.error("Failed to update order. Try again.");
    }
  };

  if (!shop)
    return (
      <div className="text-center mt-10 text-gray-600 text-lg animate-pulse">
        Loading your shop...
      </div>
    );

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white shadow-md">
        <div className="flex items-center space-x-4">
          {shop.logo && (
            <img
              src={shop.logo}
              alt="Shop Logo"
              className="w-12 h-12 rounded-full object-cover border"
            />
          )}
          <h1 className="text-2xl font-semibold text-gray-800">{shop.name}</h1>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Logout
        </button>
      </nav>

      {/* Main Content */}
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-700">Orders</h2>
          <button
            onClick={() => navigate("/create-order")}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            + Create Order
          </button>
        </div>

        <OrderList
          orders={orders}
          onEdit={(order) => setEditOrder(order)}
          onDelete={handleDeleteOrder}
        />

        {editOrder && (
          <EditOrderModal
            order={editOrder}
            onClose={() => setEditOrder(null)}
            onSave={handleUpdateOrder}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;