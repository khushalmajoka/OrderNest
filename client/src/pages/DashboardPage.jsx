import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import OrderList from "../components/OrderList";
import EditOrderModal from "../components/EditOrderModal";
import toast from "react-hot-toast";
import CreateOrderModal from "../components/CreateOrderModal";
import { Plus } from "lucide-react";

const Dashboard = () => {
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [editOrder, setEditOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) {
        navigate("/shop");
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [shopRes, ordersRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_BASE_URL}/api/shop/${userId}`, {
            headers,
          }),
          axios.get(`${process.env.REACT_APP_BASE_URL}/api/orders/${userId}`, {
            headers,
          }),
        ]);

        setShop(shopRes.data.shop);
        setOrders(ordersRes.data.orders);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        toast.error("Session expired or invalid token. Please login again.");
        localStorage.clear();
        navigate("/shop");
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("shopId");
    navigate("/shop");
  };

  const handleDeleteOrder = async (id) => {
    try {
      const token = localStorage.getItem("token");

      await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/orders/${id}`, {
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
        `${process.env.REACT_APP_BASE_URL}/api/orders/${updatedOrder._id}`,
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

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    return (
      order.customerName?.toLowerCase().includes(query) ||
      order.orderId?.toLowerCase().includes(query) ||
      order.item?.toLowerCase().includes(query) ||
      order.phone?.toLowerCase().includes(query)
    );
  });

  if (!shop)
    return (
      <div className="text-center mt-10 text-gray-600 text-lg animate-pulse">
        Loading your shop...
      </div>
    );

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      {/* Navbar */}
      <nav className="backdrop-blur-lg bg-white/30 border-b border-orange-200 shadow-md px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img
            src={shop.logo}
            alt="Shop Logo"
            className="w-10 h-10 rounded-full border border-orange-400"
          />
          <span className="text-xl font-semibold text-orange-800">
            {shop.name || "Your Shop"}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium shadow"
        >
          Logout
        </button>
      </nav>

      {/* Main Content */}
      <div className="p-8 ">
        <div className="flex flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <span className="text-orange-500 text-3xl">📦</span> Orders
            Dashboard
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-72">
              <input
                type="text"
                placeholder="Search by name, ID, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-4 py-2 bg-orange-500 text-white rounded-md shadow hover:bg-orange-600 transition"
            >
              <Plus /> Create Order
            </button>
          </div>
        </div>

        <OrderList
          orders={filteredOrders}
          onEdit={(order) => setEditOrder(order)}
          onDelete={handleDeleteOrder}
        />

        {showCreateModal && (
          <CreateOrderModal
            onClose={() => setShowCreateModal(false)}
            onOrderCreated={(newOrder) => {
              setOrders((prev) => [newOrder, ...prev]);
            }}
          />
        )}

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
